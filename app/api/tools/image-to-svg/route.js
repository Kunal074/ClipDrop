import { NextResponse } from 'next/server';
import potrace from 'potrace';
import sharp from 'sharp';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('image');
    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Normalize the image to PNG using sharp — potrace needs a clean raster input
    const pngBuffer = await sharp(inputBuffer).png().toBuffer();

    return new Promise((resolve) => {
      potrace.trace(pngBuffer, { type: 'png' }, (err, svg) => {
        if (err) {
          console.error('Potrace error:', err);
          return resolve(
            NextResponse.json({ error: 'Tracing failed: ' + (err.message || 'Unknown error') }, { status: 500 })
          );
        }

        resolve(new NextResponse(svg, {
          status: 200,
          headers: { 'Content-Type': 'image/svg+xml' },
        }));
      });
    });
  } catch (error) {
    console.error('Image to SVG API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
