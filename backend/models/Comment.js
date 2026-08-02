// backend/models/Comment.js
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    card:   { type: mongoose.Schema.Types.ObjectId, ref: 'Card', required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text:   { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Comment', commentSchema);