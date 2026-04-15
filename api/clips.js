const express = require('express');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');
const { requireAuth, optionalAuth } = require('../lib/auth');
const { deleteFromR2 } = require('../lib/storage');

const router = express.Router();

const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024; // 10 MB

// GET /api/clips?roomCode=XXX  → get clips for a room
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { roomCode } = req.query;
    if (!roomCode) return res.status(400).json({ error: 'roomCode is required' });

    const clips = await prisma.clip.findMany({
      where: {
        roomCode,
        OR: [
          { isLargeFile: false },
          { isLargeFile: true, expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return res.json({ clips });
  } catch (err) {
    console.error('[clips GET]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/clips/dashboard  → get current user's saved clips (no large-file expiry filter for normal)
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const clips = await prisma.clip.findMany({
      where: {
        userId: req.user.id,
        OR: [
          { isLargeFile: false },
          { isLargeFile: true, expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    });

    return res.json({ clips });
  } catch (err) {
    console.error('[clips/dashboard GET]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/clips  → create a clip
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { roomCode, type, content, fileName, fileSize, fileKey, mimeType } = req.body;

    if (!roomCode || !type) {
      return res.status(400).json({ error: 'roomCode and type are required' });
    }

    // Verify room exists
    const room = await prisma.room.findUnique({ where: { code: roomCode } });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const isLargeFile = (fileSize || 0) > LARGE_FILE_THRESHOLD;
    const expiresAt = isLargeFile ? new Date(Date.now() + 30 * 60 * 1000) : null;

    const clip = await prisma.clip.create({
      data: {
        roomCode,
        userId: req.user?.id || null,
        username: req.user?.username || 'Anonymous',
        type,
        content: content || '',
        fileName: fileName || '',
        fileSize: fileSize || 0,
        fileKey: fileKey || '',
        mimeType: mimeType || '',
        isLargeFile,
        expiresAt,
      },
    });

    return res.status(201).json({ clip });
  } catch (err) {
    console.error('[clips POST]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/clips/:id  → edit clip (owner only, text/link only)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const clip = await prisma.clip.findUnique({ where: { id } });
    if (!clip) return res.status(404).json({ error: 'Clip not found' });
    if (clip.userId !== req.user.id) return res.status(403).json({ error: 'Not your clip' });
    if (!['text', 'link'].includes(clip.type)) {
      return res.status(400).json({ error: 'Only text and link clips can be edited' });
    }

    const updated = await prisma.clip.update({
      where: { id },
      data: { content, editedAt: new Date() },
    });

    return res.json({ clip: updated });
  } catch (err) {
    console.error('[clips PUT]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/clips/:id  → delete clip (owner only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const clip = await prisma.clip.findUnique({ where: { id } });
    if (!clip) return res.status(404).json({ error: 'Clip not found' });
    if (clip.userId !== req.user.id) return res.status(403).json({ error: 'Not your clip' });

    // Delete from R2 if it's a file
    if (clip.fileKey) {
      await deleteFromR2(clip.fileKey).catch((e) =>
        console.warn('[clips DELETE] R2 delete failed:', e.message)
      );
    }

    await prisma.clip.delete({ where: { id } });
    return res.json({ success: true });
  } catch (err) {
    console.error('[clips DELETE]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/clips/:id/pin  → toggle pin
router.patch('/:id/pin', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const clip = await prisma.clip.findUnique({ where: { id } });
    if (!clip) return res.status(404).json({ error: 'Clip not found' });
    if (clip.userId !== req.user.id) return res.status(403).json({ error: 'Not your clip' });

    const updated = await prisma.clip.update({
      where: { id },
      data: { pinned: !clip.pinned },
    });

    return res.json({ clip: updated });
  } catch (err) {
    console.error('[clips PATCH pin]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
