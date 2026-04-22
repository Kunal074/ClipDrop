import { NextResponse } from 'next/server';
import sharp from 'sharp';
import ImageTracer from 'imagetracerjs';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('image');
    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Use sharp to get raw RGBA pixel data
    const { data, info } = await sharp(inputBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Build an ImageData-like object that imagetracerjs understands
    const imgData = {
      width: info.width,
      height: info.height,
      data: new Uint8ClampedArray(data),
    };

    // Trace to SVG string
    const svgString = ImageTracer.imagedataToSVG(imgData, { scale: 1 });

    return new NextResponse(svgString, {
      status: 200,
      headers: { 'Content-Type': 'image/svg+xml' },
    });

  } catch (error) {
    console.error('Image to SVG API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
