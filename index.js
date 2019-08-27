const fetch = require('node-fetch');
const express = require('express');
const app = express();



const TOKEN = 'тут токен от вк'; 
const SECRET_KEY = 'тут секретный ключ';


const API_VERSION = '5.101'; 
const API_URL = 'https://api.vk.com/method/';
const CHAT_PEER = 2000000000;


function queryParams(params) {
  return Object.entries(params).map(([key, value]) => {
    return encodeURIComponent(key) + '=' + encodeURIComponent(value);
  }).join('&');
} 


async function sendRequest(method, params = {}) {
  const response = await fetch(API_URL + method + '?' + queryParams({
    access_token: TOKEN, 
    v: API_VERSION,
    ...params
  }));

  return await response.json();
}


function addFriend(object) {
  return sendRequest('friends.add', {
    user_id: object.user_id
  });
}


function deleteFriend(object) {
  return sendRequest('friends.delete', {
    user_id: object.user_id
  });
}


function inviteUser(object) {
  return sendRequest('messages.addChatUser', {
    chat_id: object.chat_id, 
    user_id: object.user_id
  });
}


async function deleteMessages(object) {
  const data = await sendRequest('messages.getByConversationMessageId', {
    peer_id: CHAT_PEER + object.chat_id,
    conversation_message_ids: object.conversation_msg_ids
  }); 

  if (data.error) {
    throw new Error();
  }

  return await sendRequest('messages.delete', {
    message_ids: data.response.items.map((msg) => msg.id), 
    delete_for_all: 1
  });
}


async function pinMessage(object) {
  const data = await sendRequest('messages.getByConversationMessageId', {
    peer_id: CHAT_PEER + object.chat_id,
    conversation_message_ids: object.conversation_msg_ids
  }); 

  if (data.error) {
    throw new Error();
  }
  
  return await sendRequest('messages.pin', {
    peer_id: CHAT_PEER + object.chat_id, 
    message_id: data.response.items[0].id
  })
}



app.use(express.json());


app.post('/', (req, res) => {
  const {
    secret_key, 
    task, 
    object
  } = req.body;

  if (secret_key !== SECRET_KEY) {
    res.status(403).end();
    return;
  }

  const success = () => res.json({response: 1});
  const error = () => res.json({response: 0});
  const handle = (data) => data.error ? error() : success();

  if (task === 'confirm_bot') {
    return success();
  }

  const handlers = {
    'invite_user': inviteUser, 
    'add_friend': addFriend, 
    'del_friend': deleteFriend, 
    'delete_msg': deleteMessages, 
    'pin_msg': pinMessage
  }; 
  
  if (handlers[task]) {
    handlers[task](object).then(handle).catch(error);
  } else {
    error();
  }
});


app.listen(process.env.PORT || 3000);