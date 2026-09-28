const db = require('./db');

// Online users map: socket.id -> username
const onlineUsers = new Map();

module.exports = function (io) {
  io.on('connection', (socket) => {

    // 1. Authenticate User & Broadcast Online List
    socket.on('authenticate', (userData) => {
      if (userData && userData.username) {
        socket.user = userData;
        socket.username = userData.username;
        onlineUsers.set(socket.id, userData.username);

        // Update DB if available
        if (db.getUsers && db.saveUsers) {
          try {
            const users = db.getUsers();
            if (users && users[userData.username]) {
              users[userData.username].online = true;
              db.saveUsers(users);
            }
          } catch (e) {
            console.log('DB online status update skipped:', e.message);
          }
        }

        // Broadcast updated online users list to all clients
        io.emit('online_users_update', Array.from(new Set(onlineUsers.values())));
      }
    });

    // 2. Join Room (New users get empty history)
    socket.on('join_room', (room) => {
      socket.leaveAll();
      socket.join(room);
      socket.currentRoom = room;

      // Send empty history so new joins don't see old messages
      socket.emit('room_history', []);
    });

    // 3. Send Message
    socket.on('send_message', (data) => {
      const senderName = socket.username || (socket.user ? socket.user.username : 'Anonymous');
      const messageData = {
        id: Date.now().toString(),
        sender: senderName,
        text: data.text,
        room: socket.currentRoom || 'General',
        timestamp: new Date().toISOString()
      };

      io.to(socket.currentRoom || 'General').emit('new_message', messageData);
    });

    // 4. Delete Message (Real-Time for everyone in the room)
    socket.on('delete_message', (messageId) => {
      io.to(socket.currentRoom || 'General').emit('message_deleted', { id: messageId });
    });

    // 5. Typing Indicator
    socket.on('typing', (isTyping) => {
      if (socket.currentRoom && socket.username) {
        socket.to(socket.currentRoom).emit('user_typing', {
          username: socket.username,
          isTyping: isTyping
        });
      }
    });

    // 6. Disconnect Handler
    socket.on('disconnect', () => {
      if (socket.id) {
        onlineUsers.delete(socket.id);
        io.emit('online_users_update', Array.from(new Set(onlineUsers.values())));
      }

      if (socket.username && db.getUsers && db.saveUsers) {
        try {
          const users = db.getUsers();
          if (users && users[socket.username]) {
            users[socket.username].online = false;
            db.saveUsers(users);
          }
        } catch (e) {
          // ignore error
        }
      }
    });

  });
};