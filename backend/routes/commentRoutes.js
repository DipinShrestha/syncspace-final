// backend/routes/commentRoutes.js  (mounted at /api/cards/:cardId/comments)
const express  = require('express');
const Comment  = require('../models/Comment');
const Card     = require('../models/Card');
const Board    = require('../models/Board');
const Notification = require('../models/Notification');
const { getIO } = require('../socketInstance');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router({ mergeParams: true }); // gives us req.params.cardId

// GET /api/cards/:cardId/comments
router.get('/', protect, async (req, res) => {
  try {
    const comments = await Comment.find({ card: req.params.cardId })
      .sort({ createdAt: 1 })
      .populate('author', 'name email');
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/cards/:cardId/comments
router.post('/', protect, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Comment text required' });
    const comment = await Comment.create({
      card:   req.params.cardId,
      author: req.user.id,
      text,
    });
    const populated = await Comment.findById(comment._id).populate('author', 'name email');
    res.status(201).json(populated);

    // Notify the assignee (if there is one, and it isn't the commenter
    // themselves) that a new comment landed on their card.
    try {
      const card = await Card.findById(req.params.cardId);
      if (card?.assignedTo && card.assignedTo.toString() !== req.user.id) {
        const board = await Board.findById(card.board);
        const notification = await Notification.create({
          recipient: card.assignedTo,
          type: 'new_comment',
          message: `${populated.author.name} commented on "${card.title}"`,
          workspace: board?.workspace,
          card: card._id,
        });
        const io = getIO();
        if (io) io.to(`user-${card.assignedTo}`).emit('notification', notification);
      }
    } catch (notifyErr) {
      console.error('Failed to send new-comment notification:', notifyErr.message);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/cards/:cardId/comments/:commentId  (author only)
router.delete('/:commentId', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (comment.author.toString() !== req.user.id)
      return res.status(403).json({ message: 'Not your comment' });
    await comment.deleteOne();
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;