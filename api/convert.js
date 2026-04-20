const express = require('express');
const multer = require('multer');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { requireAuth } = require('../lib/auth');

const router = express.Router();

// Use memory storage for small files, temp file for large
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

// ─── Helper: detect if LibreOffice is available ───
function hasLibreOffice() {
  try {
    const cmd = process.platform === 'win32'
      ? 'where soffice'
      : 'which libreoffice || which soffice';
    execSync(cmd, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// ─── Helper: convert Office docs using LibreOffice ───
async function convertWithLibreOffice(buffer, inputExt) {
  const os = require('os');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clipdrop-'));
  const inputFile = path.join(tmpDir, `input.${inputExt}`);
  const outputFile = path.join(tmpDir, 'input.pdf');

  fs.writeFileSync(inputFile, buffer);

  const soffice = process.platform === 'win32' ? 'soffice' : 'libreoffice';
  execSync(`"${soffice}" --headless --convert-to pdf --outdir "${tmpDir}" "${inputFile}"`, {
    timeout: 60000,
  });

  const pdfBuffer = fs.readFileSync(outputFile);

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
  return pdfBuffer;
}

// ─── POST /api/convert ───
// Accepts: file + action
// Actions: image-to-pdf | merge-pdf | compress-pdf | office-to-pdf | pdf-to-images
router.post('/', requireAuth, upload.array('files', 20), async (req, res) => {
  try {
    const { action } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    // ── Image → PDF ──────────────────────────────────────────────
    if (action === 'image-to-pdf') {
      const pdfDoc = await PDFDocument.create();

      for (const file of files) {
        // Normalize to PNG using sharp for consistent embedding
        const pngBuffer = await sharp(file.buffer).png().toBuffer();
        const img = await pdfDoc.embedPng(pngBuffer);
        const page = pdfDoc.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      }

      const pdfBytes = await pdfDoc.save();
      res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="images.pdf"' });
      return res.send(Buffer.from(pdfBytes));
    }

    // ── Merge PDFs ───────────────────────────────────────────────
    if (action === 'merge-pdf') {
      const mergedPdf = await PDFDocument.create();

      for (const file of files) {
        const srcDoc = await PDFDocument.load(file.buffer);
        const pages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
        pages.forEach(p => mergedPdf.addPage(p));
      }

      const pdfBytes = await mergedPdf.save();
      res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="merged.pdf"' });
      return res.send(Buffer.from(pdfBytes));
    }

    // ── Compress PDF ─────────────────────────────────────────────
    if (action === 'compress-pdf') {
      const file = files[0];
      const srcDoc = await PDFDocument.load(file.buffer);
      // pdf-lib doesn't do deep compression, but this removes redundant metadata
      const pdfBytes = await srcDoc.save({ useObjectStreams: true, addDefaultPage: false });
      res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="compressed.pdf"' });
      return res.send(Buffer.from(pdfBytes));
    }

    // ── Office → PDF (Word, Excel, PPT) ─────────────────────────
    if (action === 'office-to-pdf') {
      if (!hasLibreOffice()) {
        return res.status(501).json({
          error: 'LibreOffice is not installed on this server. Please install it to convert Office files.',
          installUrl: 'https://www.libreoffice.org/download/download/'
        });
      }

      const file = files[0];
      const ext = path.extname(file.originalname).slice(1).toLowerCase();
      const allowed = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'txt', 'csv'];
      if (!allowed.includes(ext)) {
        return res.status(400).json({ error: `Unsupported file type: .${ext}` });
      }

      const pdfBuffer = await convertWithLibreOffice(file.buffer, ext);
      const outName = file.originalname.replace(/\.[^/.]+$/, '.pdf');
      res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${outName}"` });
      return res.send(pdfBuffer);
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });

  } catch (err) {
    console.error('[convert]', err);
    return res.status(500).json({ error: err.message || 'Conversion failed' });
  }
});

// ─── GET /api/convert/status ─── Check LibreOffice availability
router.get('/status', requireAuth, (req, res) => {
  return res.json({ libreOfficeAvailable: hasLibreOffice() });
});

module.exports = router;
