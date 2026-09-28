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
if (toggleAuth) {
  toggleAuth.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    formTitle.innerText = isLoginMode ? 'Login to Chat' : 'Register Account';
    authBtn.innerText = isLoginMode ? 'Login' : 'Register';
    toggleAuth.innerText = isLoginMode ? 'Need an account? Register' : 'Have an account? Login';
  });
}

// Socket event listeners helper
function setupSocketListeners() {
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

function appendMessage(msg) {
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

// Send Message
if (messageForm) {
  messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (text && socket) {
      socket.emit('send_message', { text });
      messageInput.value = '';
      socket.emit('typing', false);
    }
  });
}

// Typing status
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