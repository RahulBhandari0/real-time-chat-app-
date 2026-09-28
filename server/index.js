require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const bcrypt = require('bcryptjs');

const db = require('./db');
const { signToken } = require('./auth');
const initSocket = require('./socket');
const { sendWelcomeEmail, sendSMSAlert } = require('./notifications');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Register API (Both /api/register AND /api/auth/register support)
const handleRegister = async (req, res) => {
  const { username, password, email, phone } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required', message: 'Username and password are required' });
  }

  const users = db.getUsers ? db.getUsers() : [];
  const userList = Array.isArray(users) ? users : Object.values(users);

  if (userList.find(u => u.username === username)) {
    return res.status(400).json({ error: 'Username already taken', message: 'Username already taken' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = { 
    id: Date.now().toString(), 
    username, 
    password: hashedPassword, 
    email: email || null, 
    phone: phone || null 
  };
  
  if (db.saveUser) db.saveUser(newUser);

  // Send Email & SMS Notifications asynchronously
  if (email && typeof sendWelcomeEmail === 'function') {
    sendWelcomeEmail(email, username);
  }
  if (phone && typeof sendSMSAlert === 'function') {
    sendSMSAlert(phone, `Hi ${username}, welcome to Real-Time Chat App! Your account is ready.`);
  }

  const token = signToken ? signToken(newUser) : 'dummy-token';
  res.json({ token, username: newUser.username });
};

// Login API (Both /api/login AND /api/auth/login support)
const handleLogin = async (req, res) => {
  const { username, password } = req.body;
  const users = db.getUsers ? db.getUsers() : [];
  const userList = Array.isArray(users) ? users : Object.values(users);
  
  const user = userList.find(u => u.username === username);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials', message: 'Invalid credentials' });
  }

  const token = signToken ? signToken(user) : 'dummy-token';
  res.json({ token, username: user.username });
};

// Routes
app.post('/api/register', handleRegister);
app.post('/api/auth/register', handleRegister);

app.post('/api/login', handleLogin);
app.post('/api/auth/login', handleLogin);

// Setup Socket.IO
if (typeof initSocket === 'function') {
  initSocket(io);
} else {
  require('./socket')(io);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});