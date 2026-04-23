const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../lib/auth');

const router = express.Router();

// Admin emails — hardcoded for security
const ADMIN_EMAILS = [
  'clipdrop79@gmail.com',
  'kunalsahu232777@gmail.com',
];

// Middleware: only allow admins
function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!ADMIN_EMAILS.includes(req.user.email?.toLowerCase())) {
    return res.status(403).json({ error: 'Forbidden — Admins only' });
  }
  next();
}

// GET /api/admin/stats — overall platform numbers
router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [totalUsers, totalClips, totalRooms, totalToolUses] = await Promise.all([
      prisma.user.count(),
      prisma.clip.count(),
      prisma.room.count(),
      prisma.toolUsage.count(),
    ]);

    // New users in last 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newUsersThisWeek = await prisma.user.count({
      where: { createdAt: { gte: weekAgo } },
    });

    // Clips created today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const clipsToday = await prisma.clip.count({
      where: { createdAt: { gte: todayStart } },
    });

    // Active rooms (created in last 24h)
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeRooms = await prisma.room.count({
      where: { createdAt: { gte: dayAgo } },
    });

    // Clip type breakdown
    const clipTypes = await prisma.clip.groupBy({
      by: ['type'],
      _count: { type: true },
    });
    const clipBreakdown = clipTypes.reduce((acc, c) => {
      acc[c.type] = c._count.type;
      return acc;
    }, {});

    res.json({ totalUsers, totalClips, totalRooms, totalToolUses, newUsersThisWeek, clipsToday, activeRooms, clipBreakdown });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/users — all users with counts
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        emailVerified: true,
        createdAt: true,
        _count: {
          select: { clips: true, rooms: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/tools — tool usage stats
router.get('/tools', requireAuth, requireAdmin, async (req, res) => {
  try {
    const rawTools = await prisma.toolUsage.groupBy({
      by: ['toolName'],
      _count: { toolName: true },
      orderBy: { _count: { toolName: 'desc' } },
    });

    const tools = rawTools.map(t => ({
      toolName: t.toolName,
      count: t._count.toolName,
    }));

    res.json({ tools });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/activity — recent clips across all users
router.get('/activity', requireAuth, requireAdmin, async (req, res) => {
  try {
    const clips = await prisma.clip.findMany({
      take: 30,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        username: true,
        roomCode: true,
        fileName: true,
        content: true,
        createdAt: true,
      },
    });
    res.json({ clips });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/rooms — rooms analytics
router.get('/rooms', requireAuth, requireAdmin, async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        code: true,
        name: true,
        createdAt: true,
        owner: { select: { username: true, email: true } },
        _count: { select: { clips: true } },
      },
    });

    // Rooms with most clips
    const topRooms = [...rooms].sort((a, b) => b._count.clips - a._count.clips).slice(0, 10);

    // Solo vs shared rooms
    const soloRooms = rooms.filter(r => r.code.startsWith('SOLO_')).length;
    const sharedRooms = rooms.length - soloRooms;

    res.json({ rooms, topRooms, soloRooms, sharedRooms });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
