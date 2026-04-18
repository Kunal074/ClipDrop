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
  let accessToken = user.googleAccessToken;
  if (user.googleTokenExpiry && new Date() > user.googleTokenExpiry && user.googleRefreshToken) {
    const oauth2Client = getGoogleOAuthClient();
    oauth2Client.setCredentials({ refresh_token: user.googleRefreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();
    accessToken = credentials.access_token;
    
    await prisma.user.update({
      where: { id: user.id },
      data: {
        googleAccessToken: credentials.access_token,
        googleTokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
      }
    });
  }
  return accessToken;
}

// POST /api/upload/presign  → get a Google Drive Resumable upload URL
router.post('/presign', requireAuth, async (req, res) => {
  try {
    const { fileName, fileSize, contentType } = req.body;

    if (!fileName || !fileSize || !contentType) {
      return res.status(400).json({ error: 'fileName, fileSize, and contentType are required' });
    }
    if (fileSize > MAX_FILE_SIZE) {
      return res.status(413).json({ error: 'File too large. Maximum size is 1 GB.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !user.googleAccessToken) {
      return res.status(403).json({ error: 'Google Account not linked. Please connect Google Drive to upload files.', requireGoogleAuth: true });
    }

    const accessToken = await getValidAccessToken(user);

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
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !user.googleAccessToken) return res.status(403).json({ error: 'Unauthorized' });

    const accessToken = await getValidAccessToken(user);

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
    return res.json({ publicUrl: fileData.webViewLink, downloadUrl: fileData.webContentLink });
  } catch (err) {
    console.error('[upload/finalize]', err);
    return res.status(500).json({ error: 'Failed to finalize Drive file' });
  }
});

module.exports = router;
