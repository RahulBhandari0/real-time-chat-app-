let socket = null;
let currentRoom = 'General';
let isLoginMode = true;
let currentUser = null;
let typingTimeout = null;

const authContainer = document.getElementById('auth-container');
const chatContainer = document.getElementById('chat-container');
const authBtn = document.getElementById('auth-btn');
const toggleAuth = document.getElementById('toggle-auth');
const formTitle = document.getElementById('form-title');
const messagesList = document.getElementById('messages-list');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const roomBtns = document.querySelectorAll('.room-btn');
const currentRoomTitle = document.getElementById('current-room-title');
const typingIndicator = document.getElementById('typing-indicator');
const logoutBtn = document.getElementById('logout-btn');

// Toggle Login / Register
toggleAuth.addEventListener('click', () => {
  isLoginMode = !isLoginMode;
  formTitle.innerText = isLoginMode ? 'Login to Chat' : 'Register Account';
  authBtn.innerText = isLoginMode ? 'Login' : 'Register';
  toggleAuth.innerText = isLoginMode ? 'Need an account? Register' : 'Already have an account? Login';
});

// Authentication Submit
authBtn.addEventListener('click', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  const email = document.getElementById('email') ? document.getElementById('email').value.trim() : '';
  const phone = document.getElementById('phone') ? document.getElementById('phone').value.trim() : '';

  if (!username || !password) {
    alert('Please enter username and password');
    return;
  }

  const endpoint = isLoginMode ? '/api/login' : '/api/register';

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email, phone })
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      initChat(data.token, data.username);
    } else {
      alert(data.error || 'Authentication failed');
    }
  } catch (err) {
    console.error('Auth Error:', err);
    alert('Server connection failed!');
  }
});

// Initialize Socket Chat
function initChat(token, username) {
  currentUser = username;
  authContainer.classList.add('hidden');
  chatContainer.classList.remove('hidden');

  if (socket) socket.disconnect();

  socket = io({ auth: { token } });

  socket.on('connect', () => {
    joinRoom('General');
  });

  // Render Online Users + Private DM Setup
  socket.on('onlineUsersList', (users) => {
    const usersList = document.getElementById('online-users');
    if (usersList) {
      usersList.innerHTML = users.map(user => {
        if (user === currentUser) return `<li style="margin-bottom: 5px; color: #94a3b8;">🟢 ${user} (You)</li>`;
        
        // Private room ID unique string
        const dmRoomId = [currentUser, user].sort().join('_DM_');
        return `<li class="dm-user" data-dm="${dmRoomId}" data-name="${user}" style="margin-bottom: 5px; cursor: pointer; color: #4ade80;">💬 ${user}</li>`;
      }).join('');

      // Add Click Listener for 1-on-1 Direct Messaging
      document.querySelectorAll('.dm-user').forEach(elem => {
        elem.addEventListener('click', () => {
          const dmRoom = elem.dataset.dm;
          const targetUser = elem.dataset.name;
          joinRoom(dmRoom, `Private Chat with ${targetUser}`);
        });
      });
    }
  });

  socket.on('roomHistory', (messages) => {
    messagesList.innerHTML = '';
    messages.forEach(appendMessage);
  });

  socket.on('newMessage', (msg) => {
    appendMessage(msg);
  });

  socket.on('messageDeleted', (msgId) => {
    const elem = document.getElementById(`msg-${msgId}`);
    if (elem) elem.remove();
  });

  // Typing Listeners
  socket.on('userTyping', ({ username, room }) => {
    if (room === currentRoom && username !== currentUser) {
      typingIndicator.innerText = `${username} is typing...`;
    }
  });

  socket.on('userStopTyping', ({ room }) => {
    if (room === currentRoom) {
      typingIndicator.innerText = '';
    }
  });

  socket.on('connect_error', (err) => {
    alert('Socket Connection Error: ' + err.message);
    logout();
  });
}

// Join Room Logic
function joinRoom(room, customTitle = null) {
  currentRoom = room;
  currentRoomTitle.innerText = customTitle || `Room: ${room}`;
  typingIndicator.innerText = '';

  roomBtns.forEach(btn => {
    if (btn.dataset.room === room) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  if (socket) {
    socket.emit('joinRoom', room);
  }
}

// Room Clicks
roomBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    joinRoom(btn.dataset.room);
  });
});

// Typing Event Trigger in Input Field
messageInput.addEventListener('input', () => {
  if (socket) {
    socket.emit('typing', { room: currentRoom });
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit('stopTyping', { room: currentRoom });
    }, 1200);
  }
});

// Send Message
messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();

  if (text && socket) {
    socket.emit('sendMessage', { room: currentRoom, text });
    socket.emit('stopTyping', { room: currentRoom });
    messageInput.value = '';
  }
});

// Render Message
function appendMessage(msg) {
  const div = document.createElement('div');
  const isSelf = msg.sender === currentUser;
  div.id = `msg-${msg.id}`;
  div.className = `message ${isSelf ? 'self' : ''}`;

  let content = `<div class="sender">${msg.sender}</div><div>${msg.text}</div>`;
  
  if (msg.expiresAt) {
    const remainingSecs = Math.max(0, Math.ceil((msg.expiresAt - Date.now()) / 1000));
    content += `<div class="timer-badge" id="timer-${msg.id}">🔥 Auto-destruct in ${remainingSecs}s</div>`;
    
    const interval = setInterval(() => {
      const left = Math.max(0, Math.ceil((msg.expiresAt - Date.now()) / 1000));
      const badge = document.getElementById(`timer-${msg.id}`);
      if (badge) {
        badge.innerText = `🔥 Auto-destruct in ${left}s`;
      }
      if (left <= 0) {
        clearInterval(interval);
        div.remove();
      }
    }, 1000);
  }

  div.innerHTML = content;
  messagesList.appendChild(div);
  messagesList.scrollTop = messagesList.scrollHeight;
}

// Logout
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  if (socket) socket.disconnect();
  chatContainer.classList.add('hidden');
  authContainer.classList.remove('hidden');
}

logoutBtn.addEventListener('click', logout);

window.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');
  if (token && username) {
    initChat(token, username);
  }
});