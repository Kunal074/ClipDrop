import { NextResponse } from 'next/server';
import potrace from 'potrace';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('image');
    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Potrace setup
    return new Promise((resolve) => {
      potrace.trace(buffer, (err, svg) => {
        if (err) {
          console.error('Potrace error:', err);
          return resolve(NextResponse.json({ error: 'Failed to trace image: ' + err.message }, { status: 500 }));
        }

        // Return the SVG as a plain text response
        resolve(new NextResponse(svg, {
          status: 200,
          headers: {
            'Content-Type': 'image/svg+xml',
          },
        }));
      });
    });
  } catch (error) {
    console.error('Image to SVG API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
