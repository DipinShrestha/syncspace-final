// backend/signalingServer.js
const http = require('http');
const socketIo = require('socket.io');

function initSignalingServer(server) {
  const io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('A user connected for signaling:', socket.id);

    // Join a meeting room
    socket.on('join-room', (roomId, userId) => {
      socket.join(roomId);
      socket.to(roomId).emit('user-connected', userId);
    });

    // Forward call offer to the other user in the room
    socket.on('offer', (data) => {
      socket.to(data.roomId).emit('offer', data.offer, data.userId);
    });

    // Forward call answer to the other user in the room
    socket.on('answer', (data) => {
      socket.to(data.roomId).emit('answer', data.answer, data.userId);
    });

    // Forward ICE candidates to the other user in the room
    socket.on('ice-candidate', (data) => {
      socket.to(data.roomId).emit('ice-candidate', data.candidate, data.userId);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
}

module.exports = initSignalingServer;