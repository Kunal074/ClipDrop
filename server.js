const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const cron = require('node-cron');

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

// API Routes
const authRouter = require('./api/auth');
const clipsRouter = require('./api/clips');
const roomsRouter = require('./api/rooms');
const uploadRouter = require('./api/upload');
const uploadImageRouter = require('./api/upload-image');
const convertRouter = require('./api/convert');
const aiRouter = require('./api/ai');

nextApp.prepare().then(() => {
  const expressApp = express();

  expressApp.use(cors({
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    credentials: true,
  }));
  expressApp.use(express.json({ limit: '10mb' }));
  expressApp.use(cookieParser());

  // Mount Express API routes
  expressApp.use('/api/auth', authRouter);
  expressApp.use('/api/clips', clipsRouter);
  expressApp.use('/api/rooms', roomsRouter);
  expressApp.use('/api/upload', uploadRouter);
  expressApp.use('/api/upload-image', uploadImageRouter);
  expressApp.use('/api/convert', convertRouter);
  expressApp.use('/api/ai', aiRouter);

  // All other requests go to Next.js
  expressApp.all('*', (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const httpServer = createServer(expressApp);

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    maxHttpBufferSize: 1e6,
  });

  // Track online users per room
  const roomUsers = {};

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on('join-room', ({ roomCode, username }) => {
      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      socket.data.username = username || 'Anonymous';

      if (!roomUsers[roomCode]) roomUsers[roomCode] = new Set();
      roomUsers[roomCode].add(socket.data.username);

      io.to(roomCode).emit('user-joined', {
        username: socket.data.username,
        onlineCount: roomUsers[roomCode].size,
      });
    });

    socket.on('new-clip', (clipData) => {
      const { roomCode } = clipData;
      if (!roomCode) return;
      socket.to(roomCode).emit('clip-received', clipData);
    });

    socket.on('delete-clip', ({ clipId, roomCode }) => {
      socket.to(roomCode).emit('clip-deleted', { clipId });
    });

    socket.on('clip-updated', ({ clip, roomCode }) => {
      socket.to(roomCode).emit('clip-edited', { clip });
    });

    socket.on('typing', ({ roomCode, username }) => {
      socket.to(roomCode).emit('user-typing', { username });
    });

    socket.on('disconnect', () => {
      const { roomCode, username } = socket.data;
      if (roomCode && roomUsers[roomCode]) {
        roomUsers[roomCode].delete(username);
        if (roomUsers[roomCode].size === 0) delete roomUsers[roomCode];
        else {
          io.to(roomCode).emit('user-left', {
            username,
            onlineCount: roomUsers[roomCode]?.size || 0,
          });
        }
      }
      console.log('Socket disconnected:', socket.id);
    });
  });

  // Expose io for use in API routes
  expressApp.set('io', io);

  // ─── CRON: Clean up expired clips every 5 minutes ───
  cron.schedule('*/5 * * * *', async () => {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      const { google } = require('googleapis');
      const cloudinary = require('cloudinary').v2;

      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key:    process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });

      // Find ALL expired clips
      const expired = await prisma.clip.findMany({
        where: { expiresAt: { lt: new Date() }, pinned: false },
        include: { user: true }
      });

      for (const clip of expired) {
        if (clip.fileKey) {
          if (clip.type === 'image' && clip.fileKey.startsWith('clipdrop/')) {
            // Pasted image → delete from Cloudinary
            try {
              await cloudinary.uploader.destroy(clip.fileKey);
            } catch (e) {
              console.warn(`[cron] Cloudinary delete failed for ${clip.fileKey}:`, e.message);
            }
          } else if (clip.user?.googleRefreshToken) {
            // Large file → delete from Google Drive
            try {
              const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET
              );
              oauth2Client.setCredentials({ refresh_token: clip.user.googleRefreshToken });
              const { credentials } = await oauth2Client.refreshAccessToken();
              await fetch(`https://www.googleapis.com/drive/v3/files/${clip.fileKey}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${credentials.access_token}` }
              });
            } catch (driveErr) {
              console.error(`[cron] Drive delete failed for ${clip.fileKey}:`, driveErr.message);
            }
          }
        }
        await prisma.clip.delete({ where: { id: clip.id } });
      }

      if (expired.length > 0) {
        console.log(`[cron] Cleaned up ${expired.length} expired clip(s)`);
      }

      await prisma.$disconnect();
    } catch (err) {
      console.error('[cron] Cleanup error:', err.message);
    }
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  ✦ ClipDrop server → http://0.0.0.0:${PORT}`);
    console.log(`  ✦ Mode: ${dev ? 'development' : 'production'}\n`);
  });
});
