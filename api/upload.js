const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getPresignedUploadUrl, getPresignedDownloadUrl, getPublicUrl } = require('../lib/storage');
const { requireAuth, optionalAuth } = require('../lib/auth');

const router = express.Router();

const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1 GB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf', 'application/zip', 'application/x-zip-compressed',
  'application/octet-stream', 'text/plain', 'text/csv',
  'application/json', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav',
];

// POST /api/upload/presign  → get a presigned upload URL
router.post('/presign', optionalAuth, async (req, res) => {
  try {
    const { fileName, fileSize, contentType } = req.body;

    if (!fileName || !fileSize || !contentType) {
      return res.status(400).json({ error: 'fileName, fileSize, and contentType are required' });
    }
    if (fileSize > MAX_FILE_SIZE) {
      return res.status(413).json({ error: 'File too large. Maximum size is 1 GB.' });
    }

    const ext = fileName.split('.').pop() || '';
    const key = `uploads/${uuidv4()}.${ext}`;

    const presignedUrl = await getPresignedUploadUrl(key, contentType, 3600);
    const publicUrl = getPublicUrl(key);

    return res.json({ presignedUrl, key, publicUrl });
  } catch (err) {
    console.error('[upload/presign]', err);
    return res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

// GET /api/upload/download/:key  → get presigned download URL (for private files)
router.get('/download/:key(*)', optionalAuth, async (req, res) => {
  try {
    const { key } = req.params;
    const url = await getPresignedDownloadUrl(key, 3600);
    return res.json({ url });
  } catch (err) {
    console.error('[upload/download]', err);
    return res.status(500).json({ error: 'Failed to generate download URL' });
  }
});

module.exports = router;
