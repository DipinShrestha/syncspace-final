// backend/models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'task_assigned',
        'workspace_invite',
        'invite_accepted',
        'invite_declined',
        'new_message',
        'new_comment',
        'incoming_call',
        'generic',
      ],
      default: 'generic',
    },
    message: { type: String, required: true },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
    card: { type: mongoose.Schema.Types.ObjectId, ref: 'Card' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// getNotifications does `find({ recipient }).sort({ createdAt: -1 })` —
// the field-level index on `recipient` above only covers the filter; this
// compound index covers the filter + sort together.
notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
