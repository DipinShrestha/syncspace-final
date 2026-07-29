const express = require('express');
const {
  googleAuth,
  getMe,
  updateProfile,
  deleteAccount,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Sign-in is Google-only — one endpoint handles both first-time sign-up and
// returning login (see googleAuth for how that's decided).
router.post('/google', googleAuth);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.delete('/account', protect, deleteAccount);

module.exports = router;