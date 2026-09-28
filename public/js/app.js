// State Variables
let socket = null;
let currentRoom = 'General';
let isLoginMode = true;
let currentUser = null;
let typingTimeout = null;

// DOM Elements
const authContainer = document.getElementById('auth-container');
const chatContainer = document.getElementById('chat-container');
const authForm = document.getElementById('auth-form');
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

// 1. Toggle Login / Register Mode
if (toggleAuth) {
  toggleAuth.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    formTitle.innerText = isLoginMode ? 'Login to Chat' : 'Register Account';
    authBtn.innerText = isLoginMode ? 'Login' : 'Register';
    toggleAuth.innerText = isLoginMode ? 'Need an account? Register' : 'Have an account? Login';
  });
}

// 2. Handle Login / Registration Form Submission
if (authForm) {
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';

    if (!username || !password) {
      alert('Please enter username and password');
      return;
    }

    const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        currentUser = { username: data.username };

        // Toggle Views
        if (authContainer) authContainer.style.display = 'none';
        if (chatContainer) chatContainer.style.display = 'flex';

        // Connect Socket & Setup Event Handlers
        socket = io();
        socket.emit('authenticate', currentUser);
        setupSocketListeners();
        socket.emit('join_room', currentRoom);

      } else {
        alert(data.message || 'Authentication failed');
      }
    } catch (err) {
      console.error('Auth error:', err);
      alert('Server error. Please try again.');
    }
  });
}

// 3. Setup Socket Listeners
function setupSocketListeners() {
  if (!socket) return;

  socket.on('room_history', (messages) => {
    messagesList.innerHTML = '';
    messages.forEach(appendMessage);
  });

  socket.on('new_message', (msg) => {
    appendMessage(msg);
  });

  socket.on('message_deleted', (data) => {
    const msgElement = document.getElementById(`msg-${data.id}`);
    if (msgElement) {
      msgElement.remove();
    }
  });

  socket.on('user_typing', (data) => {
    if (typingIndicator) {
      typingIndicator.innerText = data.isTyping ? `${data.username} is typing...` : '';
    }
  });
}

// 4. Message Rendering & Helper Functions
function appendMessage(msg) {
  if (!messagesList) return;

  const isSelf = currentUser && msg.sender === currentUser.username;
  const msgDiv = document.createElement('div');
  msgDiv.id = `msg-${msg.id}`;
  msgDiv.className = `message-bubble ${isSelf ? 'self' : 'other'}`;

  let deleteBtnHtml = '';
  if (isSelf) {
    deleteBtnHtml = `<button class="delete-btn" onclick="deleteMessage('${msg.id}')">🗑️</button>`;
  }

  msgDiv.innerHTML = `
    <div class="msg-header">
      <span class="msg-sender">${msg.sender}</span>
      ${deleteBtnHtml}
    </div>
    <div class="msg-text">${escapeHtml(msg.text)}</div>
  `;

  messagesList.appendChild(msgDiv);
  messagesList.scrollTop = messagesList.scrollHeight;
}

function deleteMessage(msgId) {
  if (socket && confirm('Are you sure you want to delete this message?')) {
    socket.emit('delete_message', msgId);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}

// 5. Send Message
if (messageForm) {
  messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = messageInput ? messageInput.value.trim() : '';
    if (text && socket) {
      socket.emit('send_message', { text });
      if (messageInput) messageInput.value = '';
      socket.emit('typing', false);
    }
  });
}

// 6. Typing Status
if (messageInput) {
  messageInput.addEventListener('input', () => {
    if (!socket) return;
    socket.emit('typing', true);
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit('typing', false);
    }, 2000);
  });
}

// 7. Room Switching
roomBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const selectedRoom = btn.getAttribute('data-room') || btn.innerText;
    if (selectedRoom !== currentRoom) {
      currentRoom = selectedRoom;
      if (currentRoomTitle) currentRoomTitle.innerText = `Room: ${currentRoom}`;
      roomBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      if (socket) {
        socket.emit('join_room', currentRoom);
      }
    }
  });
});

// 8. Logout Handler
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    if (socket) socket.disconnect();
    location.reload();
  });
}