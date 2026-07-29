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
  params: (_req, file) => ({
    folder: 'syncspace/card-files',
    resource_type: 'auto', // let Cloudinary pick image/raw based on the file
    type: 'upload',        // public delivery — avoids 401s on raw/pdf links
    // keep the original filename (plus extension) visible in the URL
    public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname.replace(/\.[^/.]+$/, '')}`,
  }),
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
