const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { requireAuth } = require('../lib/auth');
const prisma = require('../lib/prisma');

const router = express.Router();

const IMAGE_LIMIT = 5; // max pasted images for non-VIP users
// Set OWNER_USERNAME in .env to your username — this user has no limit
const OWNER_USERNAME = (process.env.OWNER_USERNAME || '').toLowerCase();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Memory storage — buffer sent directly to Cloudinary, never touches disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  },
});

// Helper: upload buffer to Cloudinary
function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'clipdrop/paste-images',
        resource_type: 'image',
        quality: 'auto',
        fetch_format: 'auto',
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
}

// POST /api/upload-image — upload pasted image to Cloudinary, return URL + public_id
router.post('/', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' });

    const username = (req.user?.username || '').toLowerCase();
    const isOwner = OWNER_USERNAME && username === OWNER_USERNAME;

    // Enforce image limit for non-owners
    if (!isOwner) {
      const imageCount = await prisma.clip.count({
        where: {
          userId: req.user.id,
          type: 'image',
          // Only count non-expired ones
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      });

      if (imageCount >= IMAGE_LIMIT) {
        return res.status(429).json({
          error: `Image limit reached`,
          message: `You can only keep ${IMAGE_LIMIT} pasted images at a time. Please delete one before adding more.`,
          count: imageCount,
          limit: IMAGE_LIMIT,
        });
      }
    }

    const result = await uploadToCloudinary(req.file.buffer);

    return res.json({
      url: result.secure_url,   // HTTPS CDN URL stored in clip.content
      key: result.public_id,    // stored in clip.fileKey for deletion later
    });
  } catch (err) {
    console.error('[upload-image cloudinary]', err);
    return res.status(500).json({ error: 'Image upload failed' });
  }
});

module.exports = router;
