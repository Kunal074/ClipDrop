const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function sendOtpEmail(toEmail, otp, username) {
  await transporter.sendMail({
    from: `"ClipDrop" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Your ClipDrop verification code',
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; background: #050508; color: #e0e0e0; max-width: 480px; margin: 0 auto; border-radius: 16px; overflow: hidden; border: 1px solid #1a1a2e;">
        <div style="background: linear-gradient(135deg, #0d0d20, #12122a); padding: 32px 36px 24px; text-align: center; border-bottom: 1px solid #1a1a2e;">
          <div style="font-size: 2rem; margin-bottom: 8px;">📋</div>
          <h1 style="margin: 0; font-size: 1.4rem; color: #00d4ff; letter-spacing: -0.5px;">ClipDrop</h1>
          <p style="margin: 4px 0 0; font-size: 0.85rem; color: #888;">Universal Clipboard & File Sharing</p>
        </div>

        <div style="padding: 32px 36px;">
          <p style="margin: 0 0 8px; color: #bbb;">Hi <strong style="color: #e0e0e0;">${username}</strong>,</p>
          <p style="margin: 0 0 24px; color: #888; font-size: 0.9rem;">Use the code below to verify your email address. It expires in <strong style="color: #e0e0e0;">10 minutes</strong>.</p>

          <div style="background: #0d0d20; border: 2px solid #00d4ff33; border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px;">
            <div style="font-size: 2.8rem; font-weight: 800; letter-spacing: 12px; color: #00d4ff; font-family: 'Courier New', monospace;">
              ${otp}
            </div>
          </div>

          <p style="margin: 0; font-size: 0.8rem; color: #555; text-align: center;">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>

        <div style="padding: 16px 36px; background: #08080f; border-top: 1px solid #1a1a2e; text-align: center;">
          <p style="margin: 0; font-size: 0.75rem; color: #444;">© 2025 ClipDrop — clipdrop79@gmail.com</p>
        </div>
      </div>
    `,
  });
}

module.exports = { sendOtpEmail };
