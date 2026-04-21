import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

export async function POST(req) {
  let tempDir = null;
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Create a temporary directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'office-to-pdf-'));
    
    // Original file path
    const originalExt = path.extname(file.name) || '';
    const inputPath = path.join(tempDir, `input${originalExt}`);
    
    // Write file to disk
    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(inputPath, Buffer.from(arrayBuffer));

    // Run LibreOffice headless conversion
    // This command works in the production Docker container (Debian)
    // It may fail locally on Windows if LibreOffice is not in PATH
    try {
      await execAsync(`libreoffice --headless --convert-to pdf "${inputPath}" --outdir "${tempDir}"`);
    } catch (cmdErr) {
      console.error('LibreOffice Error:', cmdErr);
      throw new Error('LibreOffice is either not installed or failed to convert the file. Note: This feature requires the production Docker environment to work correctly.');
    }

    // The output file should be input.pdf
    const outputPath = path.join(tempDir, 'input.pdf');
    
    // Read the converted PDF
    const pdfBuffer = await fs.readFile(outputPath);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${path.parse(file.name).name}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Office to PDF API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  } finally {
    // Cleanup temporary directory
    if (tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        console.error('Failed to clean up temp dir:', cleanupErr);
      }
    }
  }
}
