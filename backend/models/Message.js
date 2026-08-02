const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: [true, 'Message cannot be empty'],
      trim: true,
    },
    fileUrl: { type: String }, // for future file sharing
  },
  { timestamps: true }
);

// load-messages does `Message.find({ workspace }).sort({ createdAt: 1 })` —
// every chat tab open ran this unindexed. Compound index covers both the
// filter and the sort in one pass.
messageSchema.index({ workspace: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);