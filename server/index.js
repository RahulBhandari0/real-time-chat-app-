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

// Register API (With Email & SMS Notifications)
app.post('/api/register', async (req, res) => {
  const { username, password, email, phone } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });

  const users = db.getUsers();
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'Username already taken' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = { 
    id: Date.now().toString(), 
    username, 
    password: hashedPassword, 
    email: email || null, 
    phone: phone || null 
  };
  
  db.saveUser(newUser);

  // Send Email & SMS Notifications asynchronously
  if (email) {
    sendWelcomeEmail(email, username);
  }
  if (phone) {
    sendSMSAlert(phone, `Hi ${username}, welcome to Real-Time Chat App! Your account is ready.`);
  }

  const token = signToken(newUser);
  res.json({ token, username: newUser.username });
});

// Login API
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const users = db.getUsers();
  const user = users.find(u => u.username === username);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signToken(user);
  res.json({ token, username: user.username });
});

initSocket(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});