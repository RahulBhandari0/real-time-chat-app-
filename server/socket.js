const db = require('./db');

module.exports = function (io) {
  io.on('connection', (socket) => {
    let currentUser = null;

    socket.on('authenticate', (userData) => {
      currentUser = userData;
      socket.user = userData;
      
      // Save/Update user online status
      const users = db.getUsers();
      if (users[userData.username]) {
        users[userData.username].online = true;
        db.saveUsers(users);
      }

      io.emit('user_status_change', { username: userData.username, online: true });
    });

    socket.on('join_room', (room) => {
      socket.leaveAll();
      socket.join(room);
      socket.currentRoom = room;

      // New users ko purane messages NA dikhane ke liye:
      // Hum naye join hone wale ko empty history ya zero messages send karenge.
      socket.emit('room_history', []);
    });

    socket.on('send_message', (data) => {
      const messageData = {
        id: Date.now().toString(),
        sender: socket.user ? socket.user.username : 'Anonymous',
        text: data.text,
        room: socket.currentRoom || 'General',
        timestamp: new Date().toISOString()
      };

      // Broadcast message to everyone in the room
      io.to(socket.currentRoom || 'General').emit('new_message', messageData);
    });

    socket.on('delete_message', (messageId) => {
      // Broadcast delete event to everyone in the room
      io.to(socket.currentRoom || 'General').emit('message_deleted', { id: messageId });
    });

    socket.on('typing', (isTyping) => {
      if (socket.currentRoom && socket.user) {
        socket.to(socket.currentRoom).emit('user_typing', {
          username: socket.user.username,
          isTyping: isTyping
        });
      }
    });

    socket.on('disconnect', () => {
      if (currentUser) {
        const users = db.getUsers();
        if (users[currentUser.username]) {
          users[currentUser.username].online = false;
          db.saveUsers(users);
        }
        io.emit('user_status_change', { username: currentUser.username, online: false });
      }
    });
  });
};