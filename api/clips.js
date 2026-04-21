const express = require('express');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');
const { requireAuth, optionalAuth } = require('../lib/auth');
const { deleteFromR2 } = require('../lib/storage');
const { deleteDriveFile } = require('../lib/googleDrive');
const { deleteFromCloudinary } = require('../lib/cloudinary');

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
          { expiresAt: null },                          // pinned/important clips
          { expiresAt: { gt: new Date() } },            // not yet expired
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

// GET /api/clips/dashboard  → get current user's saved clips
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const soloRoomCode = `SOLO_${req.user.id}`;
    let soloRoom = await prisma.room.findUnique({ where: { code: soloRoomCode } });
    if (!soloRoom) {
      soloRoom = await prisma.room.create({
        data: { code: soloRoomCode, name: 'Personal Workspace', ownerId: req.user.id }
      });
    }

    const clips = await prisma.clip.findMany({
      where: {
        userId: req.user.id,
        OR: [
          { expiresAt: null },                          // pinned/important clips
          { expiresAt: { gt: new Date() } },            // not yet expired
        ],
      },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    });

    return res.json({ clips, soloRoomCode });
  } catch (err) {
    console.error('[clips/dashboard GET]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/clips  → create a clip
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { roomCode, type, content, comment, fileName, fileSize, fileKey, mimeType } = req.body;

    if (!roomCode || !type) {
      return res.status(400).json({ error: 'roomCode and type are required' });
    }

    // Verify room exists
    const room = await prisma.room.findUnique({ where: { code: roomCode } });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const isLargeFile = (fileSize || 0) > LARGE_FILE_THRESHOLD;
    // ALL clips expire in 30 minutes — pin to make Important (no expiry)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const clip = await prisma.clip.create({
      data: {
        roomCode,
        userId: req.user?.id || null,
        username: req.user?.username || 'Anonymous',
        type,
        content: content || '',
        comment: comment || null,
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
    const { content, comment } = req.body;

    const clip = await prisma.clip.findUnique({ where: { id } });
    if (!clip) return res.status(404).json({ error: 'Clip not found' });
    if (clip.userId !== req.user.id) return res.status(403).json({ error: 'Not your clip' });

    // We used to only allow text/link edits, but now we allow editing comments on ALL clips!
    // So we only update content if it's text/link, but we can always update comment.
    const updateData = { editedAt: new Date() };
    if (content !== undefined && ['text', 'link'].includes(clip.type)) {
      updateData.content = content;
    }
    if (comment !== undefined) {
      updateData.comment = comment;
    }

    const updated = await prisma.clip.update({
      where: { id },
      data: updateData,
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

    // Delete from storage based on clip type
    if (clip.fileKey) {
      if (clip.type === 'image' && clip.fileKey.startsWith('clipdrop/')) {
        // Pasted image stored in Cloudinary
        await deleteFromCloudinary(clip.fileKey);
      } else if (clip.userId) {
        // Large file on Google Drive
        await deleteDriveFile(clip.userId, clip.fileKey);
      } else {
        // Legacy R2 file
        await deleteFromR2(clip.fileKey).catch((e) =>
          console.warn('[clips DELETE] R2 delete failed:', e.message)
        );
      }
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

    const newPinned = !clip.pinned;
    const updated = await prisma.clip.update({
      where: { id },
      data: {
        pinned: newPinned,
        // Pinned = Important = no expiry. Unpinned = 30 min from now.
        expiresAt: newPinned ? null : new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    return res.json({ clip: updated });
  } catch (err) {
    console.error('[clips PATCH pin]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
