const express = require('express');
const prisma = require('../lib/prisma');
const { optionalAuth } = require('../lib/auth');

const router = express.Router();

// POST /api/track/tool — called by each tool page on load
router.post('/tool', optionalAuth, async (req, res) => {
  try {
    const { toolName } = req.body;
    if (!toolName) return res.status(400).json({ error: 'toolName required' });

    await prisma.toolUsage.create({
      data: {
        toolName,
        userId: req.user?.id || null,
      },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
