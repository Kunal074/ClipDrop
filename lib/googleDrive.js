const { google } = require('googleapis');
const prisma = require('./prisma');

function getGoogleOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`
  );
}

async function getValidAccessToken(user) {
  let accessToken = user.googleAccessToken;
  
  // If token is expired (or near expiry) and we have a refresh token, refresh it
  if (user.googleTokenExpiry && new Date() > new Date(user.googleTokenExpiry.getTime() - 60000) && user.googleRefreshToken) {
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

async function deleteDriveFile(fileId) {
  try {
    // Always fetch Master Admin user to delete Google Drive files
    const user = await prisma.user.findUnique({ where: { email: 'kunalsahu232777@gmail.com' } });
    if (!user || !user.googleRefreshToken) {
      console.warn(`[GoogleDrive] Cannot delete file ${fileId}: Admin Drive not connected.`);
      return;
    }

    const accessToken = await getValidAccessToken(user);
    
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!res.ok && res.status !== 404) {
      const err = await res.text();
      console.warn(`[GoogleDrive] Delete failed for ${fileId}:`, err);
    }
  } catch (err) {
    console.error(`[GoogleDrive] Error deleting file ${fileId}:`, err.message);
  }
}

module.exports = { getGoogleOAuthClient, getValidAccessToken, deleteDriveFile };
