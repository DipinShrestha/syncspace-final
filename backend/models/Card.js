// backend/models/Card.js
const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    startDate: Date,
    dueDate: Date,
    labels: [String],
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
    position: { type: Number, default: 0 },
    // BUG FIX: 'list' field was missing from schema. analyticsController checks
    // card.list === 'done' and boardController saves card.list via updateCard.
    // Without this, Mongoose strict mode silently drops the value on save,
    // making completed task counts always 0.
    list: { type: String, default: 'To Do' },
    code: { type: String, default: '' },
    codeFileUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Card', cardSchema);