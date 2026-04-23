const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { signToken, requireAuth } = require('../lib/auth');
const { sendOtpEmail } = require('../lib/mailer');

const router = express.Router();

// ── OTP helpers ───────────────────────────────────────────────
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (username.length < 2 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be 2–30 characters' });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: email.toLowerCase() }, { username }] },
    });
    if (existing) {
      const field = existing.email === email.toLowerCase() ? 'Email' : 'Username';
      // If same email but unverified, allow resend
      if (existing.email === email.toLowerCase() && !existing.emailVerified) {
        const otp = generateOtp();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
        await prisma.user.update({
          where: { id: existing.id },
          data: { otp, otpExpiry },
        });
        await sendOtpEmail(existing.email, otp, existing.username);
        return res.status(200).json({
          requiresVerification: true,
          email: existing.email,
          message: 'A new OTP has been sent to your email.',
        });
      }
      return res.status(409).json({ error: `${field} already in use` });
    }

    const hashed = await bcrypt.hash(password, 12);
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await prisma.user.create({
      data: {
        username,
        email: email.toLowerCase(),
        password: hashed,
        emailVerified: false,
        otp,
        otpExpiry,
      },
    });

    await sendOtpEmail(email.toLowerCase(), otp, username);

    return res.status(201).json({
      requiresVerification: true,
      email: email.toLowerCase(),
      message: 'Check your email for a 6-digit verification code.',
    });
  } catch (err) {
    console.error('[auth/register]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return res.status(404).json({ error: 'Account not found' });
    }
    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email already verified. Please log in.' });
    }
    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP. Please check your email.' });
    }
    if (!user.otpExpiry || new Date() > user.otpExpiry) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Mark verified and clear OTP
    const verified = await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, otp: null, otpExpiry: null },
    });

    const token = signToken({ id: verified.id, username: verified.username, email: verified.email });

    res.cookie('clipdrop_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      token,
      user: { id: verified.id, username: verified.username, email: verified.email },
    });
  } catch (err) {
    console.error('[auth/verify-otp]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/resend-otp
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return res.status(404).json({ error: 'Account not found' });
    if (user.emailVerified) return res.status(400).json({ error: 'Email already verified' });

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({ where: { id: user.id }, data: { otp, otpExpiry } });
    await sendOtpEmail(user.email, otp, user.username);

    return res.json({ message: 'A new OTP has been sent to your email.' });
  } catch (err) {
    console.error('[auth/resend-otp]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email/Username and password are required' });
    }

    // Check if it looks like an email, otherwise treat as username
    const isEmail = email.includes('@');
    const user = await prisma.user.findFirst({
      where: isEmail
        ? { email: email.toLowerCase() }
        : { username: { equals: email, mode: 'insensitive' } }, // case-insensitive username match
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Block unverified users
    if (!user.emailVerified) {
      return res.status(403).json({
        error: 'Please verify your email before logging in.',
        requiresVerification: true,
        email: user.email,
      });
    }

    const token = signToken({ id: user.id, username: user.username, email: user.email });

    res.cookie('clipdrop_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error('[auth/login]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, email: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  } catch (err) {
    console.error('[auth/me]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('clipdrop_token');
  return res.json({ success: true });
});

const { google } = require('googleapis');

function getGoogleOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`
  );
}

// GET /api/auth/google/connect
router.get('/google/connect', requireAuth, (req, res) => {
  const oauth2Client = getGoogleOAuthClient();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/userinfo.profile'],
    prompt: 'consent',
    state: req.user.id,
  });
  res.redirect(authUrl);
});

// GET /api/auth/google/callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state: userId, error } = req.query;

    if (error) {
      console.error('Google returned error:', error);
      return res.redirect(`/?error=google_returned_error_${error}`);
    }

    if (!code || !userId) {
      return res.status(400).send('Missing code or user ID');
    }

    const oauth2Client = getGoogleOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    await prisma.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: tokens.access_token,
        ...(tokens.refresh_token && { googleRefreshToken: tokens.refresh_token }),
        googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    });

    res.redirect('/dashboard?google_connected=true');
  } catch (error) {
    console.error('[auth/google/callback]', error);
    return res.redirect('/dashboard?error=google_auth_failed');
  }
});

module.exports = router;
