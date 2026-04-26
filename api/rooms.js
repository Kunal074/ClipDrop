const express = require('express');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');
const { requireAuth, optionalAuth } = require('../lib/auth');

const router = express.Router();

function generateRoomCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// POST /api/rooms  → create a room (auth required or guest)
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { name } = req.body;

    let code;
    let attempts = 0;
    do {
      code = generateRoomCode();
      attempts++;
      if (attempts > 10) return res.status(500).json({ error: 'Could not generate unique room code' });
    } while (await prisma.room.findUnique({ where: { code } }));

    let ownerId = req.user?.id;
    if (!ownerId) {
      // Find or create the guest system user
      const guestEmail = 'guest_system@clipdrop.local';
      let guestUser = await prisma.user.findUnique({ where: { email: guestEmail } });
      if (!guestUser) {
        // Create the guest system user with dummy credentials
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(Math.random().toString(), 10);
        guestUser = await prisma.user.create({
          data: {
            email: guestEmail,
            username: 'guest_system',
            password: hashedPassword,
          }
        });
      }
      ownerId = guestUser.id;
    }

    const room = await prisma.room.create({
      data: {
        code,
        name: name || null,
        ownerId,
      },
    });

    return res.status(201).json({ room });
  } catch (err) {
    console.error('[rooms POST]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/rooms/:code  → get room info + recent clips
router.get('/:code', optionalAuth, async (req, res) => {
  try {
    const { code } = req.params;
    const room = await prisma.room.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        owner: { select: { id: true, username: true } },
        clips: {
          where: {
            OR: [
              { isLargeFile: false },
              { isLargeFile: true, expiresAt: { gt: new Date() } },
            ],
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!room) return res.status(404).json({ error: 'Room not found' });
    return res.json({ room });
  } catch (err) {
    console.error('[rooms GET]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/rooms  → list current user's rooms
router.get('/', requireAuth, async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      where: { ownerId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { clips: true } },
      },
    });
    return res.json({ rooms });
  } catch (err) {
    console.error('[rooms list GET]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/rooms/:code  → delete room (owner only)
router.delete('/:code', requireAuth, async (req, res) => {
  try {
    const { code } = req.params;
    const room = await prisma.room.findUnique({ where: { code } });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.ownerId !== req.user.id) return res.status(403).json({ error: 'Not your room' });

    await prisma.room.delete({ where: { code } });
    return res.json({ success: true });
  } catch (err) {
    console.error('[rooms DELETE]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
