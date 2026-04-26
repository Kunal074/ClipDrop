const express = require('express');
const { google } = require('googleapis');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../lib/auth');

const router = express.Router();

const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1 GB

function getGoogleOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`
  );
}

async function getValidAccessToken(user) {
  // If we have a refresh token and the access token is expired (or expiry unknown), refresh it
  const isExpired = !user.googleTokenExpiry || new Date() > new Date(user.googleTokenExpiry.getTime ? user.googleTokenExpiry.getTime() - 60000 : user.googleTokenExpiry - 60000);
  
  if (user.googleRefreshToken && isExpired) {
    try {
      const oauth2Client = getGoogleOAuthClient();
      oauth2Client.setCredentials({ refresh_token: user.googleRefreshToken });
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          googleAccessToken: credentials.access_token,
          googleTokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        }
      });
      
      return credentials.access_token;
    } catch (refreshErr) {
      console.error('[getValidAccessToken] Token refresh failed:', refreshErr.message);
      // Fall back to stored token
    }
  }
  return user.googleAccessToken;
}

// POST /api/upload/presign  → get a Google Drive Resumable upload URL
router.post('/presign', requireAuth, async (req, res) => {
  try {
    const { fileName, fileSize, contentType } = req.body;

    if (!fileName || !fileSize || !contentType) {
      return res.status(400).json({ error: 'fileName, fileSize, and contentType are required' });
    }
    const ADMIN_EMAILS = ['kunalsahu232777@gmail.com', 'clipdrop79@gmail.com'];
    const isAdmin = req.user?.email && ADMIN_EMAILS.includes(req.user.email.toLowerCase());

    // Per-file size limit: 1GB (admins bypass this)
    if (fileSize > MAX_FILE_SIZE && !isAdmin) {
      return res.status(413).json({ error: 'File too large. Maximum size is 1 GB per file.' });
    }

    // Per-user limits: max 10 files AND max 2 GB total storage (admins bypass this)
    if (!isAdmin) {
      const userFiles = await prisma.clip.findMany({
        where: {
          userId: req.user.id,
          isLargeFile: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: { fileSize: true },
      });

      const fileCount = userFiles.length;
      const totalUsed = userFiles.reduce((sum, f) => sum + (f.fileSize || 0), 0);
      const TOTAL_LIMIT = 2 * 1024 * 1024 * 1024; // 2 GB total per user

      if (fileCount >= 10) {
        return res.status(429).json({
          error: 'File limit reached',
          message: 'You can only keep 10 files at a time. Please delete one before uploading more.',
          count: fileCount,
          limit: 10,
        });
      }

      if (totalUsed + fileSize > TOTAL_LIMIT) {
        const usedGB = (totalUsed / 1024 / 1024 / 1024).toFixed(2);
        return res.status(429).json({
          error: 'Storage limit reached',
          message: `You have used ${usedGB} GB of your 2 GB storage limit. Please delete some files first.`,
        });
      }
    }

    // Fetch the Master Admin user to use their Google Drive storage
    const adminUser = await prisma.user.findUnique({ where: { email: 'kunalsahu232777@gmail.com' } });
    if (!adminUser || !adminUser.googleAccessToken) {
      return res.status(500).json({ error: 'Master Google Drive not configured by admin. Please contact support.', requireGoogleAuth: false });
    }

    const accessToken = await getValidAccessToken(adminUser);

    const metadata = { name: fileName, mimeType: contentType };

    const driveRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Length': fileSize.toString(),
        'X-Upload-Content-Type': contentType,
        'Origin': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      },
      body: JSON.stringify(metadata)
    });

    if (!driveRes.ok) {
       const rawText = await driveRes.text();
       console.error(rawText);
       
       if (driveRes.status === 403 && (rawText.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT') || rawText.includes('insufficientPermissions'))) {
         return res.status(403).json({
           error: 'Missing Google Drive permissions. Please click "Connect Google Drive" and ensure you check the box to allow Drive access.',
           requireGoogleAuth: true
         });
       }
       
       if (driveRes.status === 401) {
         return res.status(401).json({
           error: 'Your Google session expired or the connection was revoked. Please reconnect your account.',
           requireGoogleAuth: true
         });
       }
       
       throw new Error(`Google API ${driveRes.status}: ${rawText}`);
    }

    const resumableUrl = driveRes.headers.get('Location');
    return res.json({ presignedUrl: resumableUrl, isGoogleDrive: true });
  } catch (err) {
    console.error('[upload/presign]', err);
    return res.status(500).json({ error: `Failed to generate upload URL: ${err.message}` });
  }
});

// POST /api/upload/finalize  → make file public after upload
router.post('/finalize', requireAuth, async (req, res) => {
  try {
    const { fileId } = req.body;
    const adminUser = await prisma.user.findUnique({ where: { email: 'kunalsahu232777@gmail.com' } });
    if (!adminUser || !adminUser.googleAccessToken) return res.status(500).json({ error: 'Master Google Drive not configured' });

    const accessToken = await getValidAccessToken(adminUser);

    // Set permissions to anyone with link
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'reader', type: 'anyone' })
    });

    // Get the webViewLink
    const getFileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=webViewLink,webContentLink`,{
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    const fileData = await getFileRes.json();
    // Use uc?export=view for images (embeds inline), webViewLink for everything else
    // webViewLink opens Google Drive viewer in browser — no forced download
    const embedUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
    return res.json({
      publicUrl: fileData.webViewLink || embedUrl,  // viewer link for all files
      embedUrl,                                     // image embed URL (for <img> tags)
      downloadUrl: fileData.webContentLink,
      viewUrl: fileData.webViewLink,
    });
  } catch (err) {
    console.error('[upload/finalize]', err);
    return res.status(500).json({ error: 'Failed to finalize Drive file' });
  }
});

module.exports = router;
