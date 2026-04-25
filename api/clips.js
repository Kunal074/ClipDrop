const express = require('express');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');
const { requireAuth, optionalAuth } = require('../lib/auth');
const { deleteFromR2 } = require('../lib/storage');
const { deleteDriveFile } = require('../lib/googleDrive');
const { deleteFromCloudinary } = require('../lib/cloudinary');

const router = express.Router();

const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024; // 10 MB

// Strip HTML tags to prevent stored XSS
function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/javascript:/gi, '')
    .trim()
    .slice(0, 50000); // max 50k chars per field
}

// Bump lastActivityAt on the room — resets the 3-day expiry window
async function bumpRoomActivity(roomCode) {
  try {
    await prisma.room.update({
      where: { code: roomCode },
      data: { lastActivityAt: new Date() },
    });
  } catch (_) {} // silent — room may already be gone
}

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

    const username = (req.user?.username || '').toLowerCase();
    const OWNER_USERNAME = (process.env.OWNER_USERNAME || '').toLowerCase();
    const isOwner = OWNER_USERNAME && username === OWNER_USERNAME;

    const isLargeFile = (fileSize || 0) > LARGE_FILE_THRESHOLD;
    
    // Large files (temporary cloudinary workaround) expire in 5 minutes for normal users
    // Admins and small files get 30 minutes — pin to make Important (no expiry)
    const expiresMinutes = (isLargeFile && !isOwner) ? 5 : 30;
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

    const clip = await prisma.clip.create({
      data: {
        roomCode,
        userId: req.user?.id || null,
        username: req.user?.username || 'Anonymous',
        type,
        content: sanitize(content || ''),
        comment: comment ? sanitize(comment) : null,
        fileName: fileName ? sanitize(fileName) : '',
        fileSize: fileSize || 0,
        fileKey: fileKey || '',
        mimeType: mimeType || '',
        isLargeFile,
        expiresAt,
      },
    });

    await bumpRoomActivity(roomCode); // reset 3-day expiry window
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
      updateData.content = sanitize(content);
    }
    if (comment !== undefined) {
      updateData.comment = sanitize(comment);
    }

    const updated = await prisma.clip.update({
      where: { id },
      data: updateData,
    });

    await bumpRoomActivity(updated.roomCode); // reset 3-day expiry window
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

    const clip = await prisma.clip.findUnique({
      where: { id },
      include: { room: true }
    });
    if (!clip) return res.status(404).json({ error: 'Clip not found' });
    
    // Allow creator or room owner to delete
    if (clip.userId !== req.user.id && clip.room.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Not your clip' });
    }

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
    await bumpRoomActivity(clip.roomCode); // reset 3-day expiry window
    return res.json({ success: true });
  } catch (err) {
    console.error('[clips DELETE]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/clips/:id/share  → share clip to room or user
router.post('/:id/share', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { target } = req.body;
    if (!target) return res.status(400).json({ error: 'Target is required' });

    const clip = await prisma.clip.findUnique({ where: { id } });
    if (!clip) return res.status(404).json({ error: 'Clip not found' });

    let targetRoomCode = target.trim();
    
    // Check if it's a room code first
    let room = await prisma.room.findUnique({ where: { code: targetRoomCode } });
    
    if (!room) {
      // If not a room, maybe it's a username (strip @ if present)
      const usernameMatch = targetRoomCode.startsWith('@') ? targetRoomCode.substring(1) : targetRoomCode;
      const targetUser = await prisma.user.findUnique({ where: { username: usernameMatch } });
      
      if (targetUser) {
        targetRoomCode = `SOLO_${targetUser.id}`;
        room = await prisma.room.findUnique({ where: { code: targetRoomCode } });
        if (!room) {
          room = await prisma.room.create({
            data: { code: targetRoomCode, name: 'Personal Workspace', ownerId: targetUser.id }
          });
        }
      } else {
        return res.status(404).json({ error: 'Room code or username not found' });
      }
    }

    const sharedClip = await prisma.clip.create({
      data: {
        roomCode: targetRoomCode,
        userId: (targetRoomCode.startsWith('SOLO_') && room?.ownerId) ? room.ownerId : req.user.id,
        username: req.user.username,
        type: clip.type,
        content: clip.content,
        comment: clip.comment,
        fileName: clip.fileName,
        fileSize: clip.fileSize,
        fileKey: clip.fileKey,
        mimeType: clip.mimeType,
        isLargeFile: clip.isLargeFile,
        isPending: targetRoomCode.startsWith('SOLO_'), // Requires accept if sent to user
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // Reset expiry for the new clip
      },
    });

    return res.json({ success: true, sharedClip });
  } catch (err) {
    console.error('[clips SHARE]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/clips/:id/accept  → accept a pending shared clip
router.patch('/:id/accept', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const clip = await prisma.clip.findUnique({
      where: { id },
      include: { room: true }
    });
    
    if (!clip) return res.status(404).json({ error: 'Clip not found' });
    if (clip.room.ownerId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    const updated = await prisma.clip.update({
      where: { id },
      data: { isPending: false }
    });

    return res.json({ success: true, clip: updated });
  } catch (err) {
    console.error('[clips ACCEPT]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

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
