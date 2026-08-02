const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Board title is required'],
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      // Every board-view load queries Board.find({ workspace: ... }) —
      // indexed so it stays fast as boards grow.
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Lists (columns) inside the board
    lists: [
      {
        title: { type: String, required: true },
        cards: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card' }],
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Board', boardSchema);