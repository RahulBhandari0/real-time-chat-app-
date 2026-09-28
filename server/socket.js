const jwt = require('jsonwebtoken');
const { getMessagesByRoom, saveMessage, deleteMessage } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';
let onlineUsers = new Map(); // socket.id -> username

function initSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) return next(new Error('Authentication error'));
      socket.user = decoded;
      next();
    });
  });

  io.on('connection', (socket) => {
    onlineUsers.set(socket.id, socket.user.username);
    
    // Broadcast active user list
    const getUniqueUsers = () => Array.from(new Set(onlineUsers.values()));
    io.emit('onlineUsersList', getUniqueUsers());

    // Join Room (General, VIP, or Private DM Room)
    socket.on('joinRoom', (room) => {
      socket.rooms.forEach(r => {
        if (r !== socket.id) socket.leave(r);
      });
      socket.join(room);
      
      const messages = getMessagesByRoom(room);
      socket.emit('roomHistory', messages);
    });

    // Send Message (Group Rooms & Direct Messages)
    socket.on('sendMessage', ({ room, text }) => {
      const isVIP = room === 'VIP';
      const expiresAt = isVIP ? Date.now() + 15000 : null;

      const message = {
        id: Date.now().toString(),
        room,
        sender: socket.user.username,
        text,
        timestamp: Date.now(),
        expiresAt
      };

      saveMessage(message);
      io.to(room).emit('newMessage', message);

      if (isVIP) {
        setTimeout(() => {
          deleteMessage(message.id);
          io.to(room).emit('messageDeleted', message.id);
        }, 15000);
      }
    });

    // Typing Indicator Events
    socket.on('typing', ({ room }) => {
      socket.to(room).emit('userTyping', { username: socket.user.username, room });
    });

    socket.on('stopTyping', ({ room }) => {
      socket.to(room).emit('userStopTyping', { username: socket.user.username, room });
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(socket.id);
      io.emit('onlineUsersList', getUniqueUsers());
    });
  });
}

module.exports = initSocket;