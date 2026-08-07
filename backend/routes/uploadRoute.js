// backend/routes/uploadRoute.js
// Handles POST /api/upload — stores the file on Cloudinary (so it survives
// redeploys and is reachable from a stable, correct URL) and returns the
// public URL the frontend saves on the card.
const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const allowedExt = /\.(js|ts|py|java|cpp|c|cs|go|rb|php|html|css|json|txt|md|zip|pdf)$/i;

const storage = new CloudinaryStorage({
  cloudinary,
  params: (_req, file) => {
    // Card attachments are documents/source archives, not images. Store them
    // as public RAW assets so code files, archives, and PDFs are delivered as
    // the original file instead of being treated like transformable images.
    // NOTE: on Cloudinary FREE plans, PDF/ZIP delivery is still blocked until
    // 'Allow delivery of PDF and ZIP files' is enabled in Console > Settings
    // > Security. That account-level switch cannot be changed from this code.
    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]+/g, '_');
    return {
      folder: 'syncspace/card-files',
      resource_type: 'raw',
      type: 'upload',
      access_mode: 'public',
      // Raw Cloudinary assets need the extension kept in the public id.
      public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeOriginalName}`,
    };
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (allowedExt.test(file.originalname)) return cb(null, true);
    cb(new Error('File type not allowed'));
  },
});

// POST /api/upload
router.post('/', protect, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  // req.file.path is the full public Cloudinary URL
  res.json({ url: req.file.path, filename: req.file.originalname });
});

// ── Avatar upload — separate storage config: images only, cropped square ──
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'syncspace/avatars',
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp'],
    transformation: [{ width: 200, height: 200, crop: 'fill', gravity: 'face' }],
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 4 * 1024 * 1024 }, // 4 MB
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpe?g|png|gif|webp)$/i.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  },
});

// POST /api/upload/avatar
router.post('/avatar', protect, uploadAvatar.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  res.json({ url: req.file.path });
});

module.exports = router;
