const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Workspace name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['admin', 'member'], default: 'member' },
      },
    ],
    // Invited but not yet accepted — kept separate from `members` so an
    // invitee has no workspace access until they explicitly accept.
    // `user` is set right away if the invited email already has a SyncSpace
    // account; otherwise only `email` is set, and `user` gets filled in
    // automatically the moment someone signs up with a matching Google
    // account (see googleAuth in authController.js).
    pendingInvites: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        email: { type: String, lowercase: true, trim: true },
        role: { type: String, enum: ['admin', 'member'], default: 'member' },
        invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        invitedAt: { type: Date, default: Date.now },
      },
    ],
    boards: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Board' }],
    documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
  },
  { timestamps: true }
);

// The dashboard's "get my workspaces" query does
// `Workspace.find({ $or: [{ owner }, { 'members.user': userId }] })` on
// every single dashboard load — without this, every load was a full
// collection scan. `owner` has a field-level index above; this covers the
// array side of that $or.
workspaceSchema.index({ 'members.user': 1 });

module.exports = mongoose.model('Workspace', workspaceSchema);