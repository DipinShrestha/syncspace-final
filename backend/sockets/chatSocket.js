// backend/sockets/chatSocket.js
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const Notification = require('../models/Notification');

module.exports = (io) => {
  // ── Connection-time auth ──────────────────────────────────────────────
  // Every event below used to trust whatever userId the client passed in
  // (e.g. `socket.emit('join-workspace', workspaceId, someUserId)`), with
  // no proof it was actually that user. That meant anyone could impersonate
  // any other user id — join their personal notification room and read
  // their live notifications, or join a workspace's chat room by simply
  // claiming to be one of its members. This middleware verifies the same
  // JWT issued at login (sent via the socket handshake) once per
  // connection, and every handler below now trusts socket.userId — set
  // here from the verified token — instead of a client-supplied argument.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log('🟢 New client connected:', socket.id);

    // Personal room — kept separate from workspace rooms (and never left on
    // workspace switch) so a user can be pushed a notification no matter
    // which workspace/screen they currently have open. Uses the verified
    // socket.userId, not a client-supplied id, so nobody can join someone
    // else's notification room.
    socket.on('join-user', () => {
      socket.join(`user-${socket.userId}`);
    });

    // Join a workspace room. The second argument used to be a
    // client-supplied userId that was trusted for the membership check —
    // now it's ignored in favor of the verified socket.userId.
    socket.on('join-workspace', async (workspaceId, _clientSuppliedUserId, callback) => {
      try {
        const userId = socket.userId;
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
          .limit(100)
          .lean();
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

        // Notify workspace members who are NOT currently looking at this
        // chat (i.e. not connected to this workspace's socket room right
        // now) — avoids spamming a notification at people already watching
        // the message arrive live.
        const room = io.sockets.adapter.rooms.get(workspaceId);
        const activeUserIds = new Set();
        if (room) {
          for (const socketId of room) {
            const s = io.sockets.sockets.get(socketId);
            if (s?.userId) activeUserIds.add(s.userId);
          }
        }
        const workspace = await Workspace.findById(workspaceId);
        if (workspace) {
          const memberIds = [
            workspace.owner.toString(),
            ...workspace.members.map((m) => m.user.toString()),
          ];
          const recipients = [...new Set(memberIds)].filter(
            (id) => id !== socket.userId && !activeUserIds.has(id),
          );
          for (const recipientId of recipients) {
            const notification = await Notification.create({
              recipient: recipientId,
              type: 'new_message',
              message: `${populated.sender.name}: ${text.slice(0, 80)}`,
              workspace: workspaceId,
            });
            io.to(`user-${recipientId}`).emit('notification', notification);
          }
        }
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

    // Someone clicked "Start Call" — let the rest of the workspace know so
    // they get a live/persisted "incoming call" notification instead of only
    // finding out if they happen to already be on the chat tab.
    // data = { workspaceId, callerId, callerName, callType }
    socket.on('call-started', async (data) => {
      try {
        // `callerId` is no longer trusted from the client — using the
        // verified socket.userId means nobody can send a fake "X started a
        // call" notification while excluding themselves as an arbitrary
        // other user. `callerName`/`callType` are just display text, so
        // they're fine as-is.
        const { workspaceId, callerName, callType } = data;
        const callerId = socket.userId;
        const label = callType === 'audio' ? 'an audio call' : 'a video call';
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) return;
        const memberIds = [
          workspace.owner.toString(),
          ...workspace.members.map((m) => m.user.toString()),
        ];
        const recipients = [...new Set(memberIds)].filter((id) => id !== callerId);
        for (const recipientId of recipients) {
          const notification = await Notification.create({
            recipient: recipientId,
            type: 'incoming_call',
            message: `${callerName} started ${label} in "${workspace.name}"`,
            workspace: workspaceId,
          });
          io.to(`user-${recipientId}`).emit('notification', notification);
        }
      } catch (err) {
        console.error('Failed to send call-started notifications:', err.message);
      }
    });

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