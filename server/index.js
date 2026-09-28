require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const bcrypt = require('bcryptjs');

const db = require('./db');
let signToken;
try {
  signToken = require('./auth').signToken;
} catch (e) {
  signToken = (u) => 'dummy_token';
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Root & Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running live' });
});

// Register Handler
app.post(['/api/register', '/api/auth/register'], async (req, res) => {
  try {
    const { username, password, email, phone } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    const users = db.getUsers ? db.getUsers() : [];
    const userList = Array.isArray(users) ? users : Object.values(users);

    if (userList.find(u => u.username === username)) {
      return res.status(400).json({ message: 'Username already taken' });
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

    const token = signToken(newUser);
    res.json({ token, username: newUser.username });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login Handler
app.post(['/api/login', '/api/auth/login'], async (req, res) => {
  try {
    const { username, password } = req.body;
    const users = db.getUsers ? db.getUsers() : [];
    const userList = Array.isArray(users) ? users : Object.values(users);
    
    const user = userList.find(u => u.username === username);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken(user);
    res.json({ token, username: user.username });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Initialize Socket
try {
  require('./socket')(io);
} catch (err) {
  console.log('Socket init fallback:', err.message);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});