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
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB Cloudinary limit
});

// Helper: upload buffer to Cloudinary
function uploadToCloudinary(buffer, filename) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'clipdrop/paste-images',
        resource_type: 'auto',
        // 'auto' quality/fetch_format only works for images, so don't force them for raw files
        public_id: filename ? filename.replace(/\.[^/.]+$/, "") : undefined
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
}

// POST /api/upload-image — upload pasted file to Cloudinary, return URL + public_id
router.post('/', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const username = (req.user?.username || '').toLowerCase();
    const isOwner = OWNER_USERNAME && username === OWNER_USERNAME;

    // Enforce limit for non-owners (Cloudinary files & images)
    if (!isOwner) {
      const cloudinaryCount = await prisma.clip.count({
        where: {
          userId: req.user.id,
          fileKey: { startsWith: 'clipdrop/' },
          // Only count non-expired ones
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      });

      if (cloudinaryCount >= IMAGE_LIMIT) {
        return res.status(429).json({
          error: `File limit reached`,
          message: `You can only keep ${IMAGE_LIMIT} uploaded files/images at a time. Please delete one before adding more.`,
          count: cloudinaryCount,
          limit: IMAGE_LIMIT,
        });
      }
    }

    const result = await uploadToCloudinary(req.file.buffer, req.file.originalname);

    return res.json({
      url: result.secure_url,   // HTTPS CDN URL stored in clip.content
      key: result.public_id,    // stored in clip.fileKey for deletion later
    });
  } catch (err) {
    console.error('[upload-image cloudinary]', err);
    return res.status(500).json({ error: 'File upload failed' });
  }
});

module.exports = router;
