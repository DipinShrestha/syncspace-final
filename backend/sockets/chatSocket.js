// backend/sockets/chatSocket.js
const Message = require('../models/Message');
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const Notification = require('../models/Notification');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('🟢 New client connected:', socket.id);

    // Personal room — kept separate from workspace rooms (and never left on
    // workspace switch) so a user can be pushed a notification no matter
    // which workspace/screen they currently have open.
    socket.on('join-user', (userId) => {
      socket.join(`user-${userId}`);
    });

    // Join a workspace room
    socket.on('join-workspace', async (workspaceId, userId, callback) => {
      try {
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) return callback({ error: 'Workspace not found' });
        const isMember = workspace.members.some(m => m.user.toString() === userId);
        const isOwner = workspace.owner.toString() === userId;
        if (!isMember && !isOwner) return callback({ error: 'Not authorized' });

        // Leave previous workspace rooms (but keep the personal user-* room)
        const rooms = Array.from(socket.rooms);
        rooms.forEach(room => {
          if (room !== socket.id && !room.startsWith('user-')) socket.leave(room);
        });
        socket.join(workspaceId);
        socket.workspaceId = workspaceId;
        socket.userId = userId;
        console.log(`User ${userId} joined workspace ${workspaceId}`);
        callback({ success: true });
      } catch (err) {
        callback({ error: err.message });
      }
    });

    // Load previous messages
    socket.on('load-messages', async (workspaceId, callback) => {
      try {
        const messages = await Message.find({ workspace: workspaceId })
          .sort({ createdAt: 1 })
          .populate('sender', 'name email avatar')
          .limit(100);
        callback(messages);
      } catch (err) {
        callback({ error: err.message });
      }
    });

    // Send a new message
    socket.on('send-message', async (data, callback) => {
      try {
        const { workspaceId, text } = data;
        if (socket.workspaceId !== workspaceId) {
          return callback({ error: 'Not in correct workspace room' });
        }
        const message = await Message.create({
          workspace: workspaceId,
          sender: socket.userId,
          text,
        });
        const populated = await Message.findById(message._id).populate('sender', 'name email avatar');
        io.to(workspaceId).emit('new-message', populated);
        callback({ success: true, message: populated });
      } catch (err) {
        callback({ error: err.message });
      }
    });

    // BUG FIX: was registered twice (once outside this connection handler).
    // Now correctly registered once, scoped to the connected socket.
    // ALSO FIXED: this used to broadcast to the entire workspace room, so
    // every member saw "You have been assigned" even when it wasn't them.
    // Now it's persisted for, and pushed only to, the assigned user.
    // data = { assignedTo, cardTitle, workspaceId, cardId }
    socket.on('task-assigned', async (data) => {
      try {
        const notification = await Notification.create({
          recipient: data.assignedTo,
          type: 'task_assigned',
          message: `You were assigned to "${data.cardTitle}"`,
          workspace: data.workspaceId,
          card: data.cardId,
        });
        io.to(`user-${data.assignedTo}`).emit('notification', notification);
      } catch (err) {
        console.error('Failed to create task-assigned notification:', err.message);
      }
    });

    // ── Video call (WebRTC) signaling ─────────────────────────────────────
    // BUG FIX: VideoCall.tsx has always emitted these events, but the handlers
    // only existed in backend/signalingServer.js, which was never mounted on
    // the running `io` instance (server.js only ever called chatSocket(io)).
    // Result: join-room/offer/answer/ice-candidate went nowhere, so peers
    // never connected — video calling was completely non-functional.
    // Moved here (the socket server that's actually running) and the dead
    // signalingServer.js file has been removed.

    // Join a video-call room (separate from the chat workspace room so
    // joining a call doesn't disturb the chat 'join-workspace' room state).
    socket.on('join-room', (roomId, userId) => {
      socket.join(`call-${roomId}`);
      socket.to(`call-${roomId}`).emit('user-connected', userId);

      // Let the other party know when this user leaves the call.
      socket.on('disconnect', () => {
        socket.to(`call-${roomId}`).emit('user-disconnected', userId);
      });
    });

    // Forward call offer to the other user in the room
    socket.on('offer', (data) => {
      socket.to(`call-${data.roomId}`).emit('offer', data.offer, data.userId);
    });

    // Forward call answer to the other user in the room
    socket.on('answer', (data) => {
      socket.to(`call-${data.roomId}`).emit('answer', data.answer, data.userId);
    });

    // Forward ICE candidates to the other user in the room
    socket.on('ice-candidate', (data) => {
      socket.to(`call-${data.roomId}`).emit('ice-candidate', data.candidate, data.userId);
    });

    socket.on('disconnect', () => {
      console.log('🔴 Client disconnected:', socket.id);
    });
  });
};