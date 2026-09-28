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

        // Update DB online status if DB helper functions exist
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

        // Broadcast updated online users list to all connected clients
        io.emit('online_users_update', Array.from(new Set(onlineUsers.values())));
      }
    });

    // 2. Join Room (New users get empty history)
    socket.on('join_room', (room) => {
      socket.leaveAll();
      socket.join(room);
      socket.currentRoom = room;

      // Send empty history for fresh room joins
      socket.emit('room_history', []);
    });

    // 3. Send Message (Supports 15-Second Auto-Destruct in VIP Room)
    socket.on('send_message', (data) => {
      const room = socket.currentRoom || 'General';
      const senderName = socket.username || (socket.user ? socket.user.username : 'Anonymous');
      const isVipRoom = room.toLowerCase().includes('vip') || room.toLowerCase().includes('burn');
      const messageId = Date.now().toString() + Math.random().toString(36).substring(2, 5);

      const messageData = {
        id: messageId,
        sender: senderName,
        text: data.text,
        room: room,
        isVip: isVipRoom,
        ttl: isVipRoom ? 15 : null, // 15 Seconds Time-To-Live
        timestamp: new Date().toISOString()
      };

      // Broadcast new message to everyone in the current room
      io.to(room).emit('new_message', messageData);

      // VIP Room Auto-Destruct Timer (Server / DB Cleanup after 15 Seconds)
      if (isVipRoom) {
        setTimeout(() => {
          if (db.deleteMessage) {
            try {
              db.deleteMessage(messageId);
            } catch (e) {
              console.log('Error deleting message from DB:', e.message);
            }
          }
          io.to(room).emit('message_deleted', { id: messageId });
        }, 15000); // 15 seconds = 15000ms
      }
    });

    // 4. Delete Message (Manual deletion in real-time)
    socket.on('delete_message', (messageId) => {
      const room = socket.currentRoom || 'General';
      if (db.deleteMessage) {
        try {
          db.deleteMessage(messageId);
        } catch (e) {
          console.log('Error deleting message from DB:', e.message);
        }
      }
      io.to(room).emit('message_deleted', { id: messageId });
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