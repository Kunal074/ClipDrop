import { NextResponse } from 'next/server';
import { getDownloadPresignedUrl } from '@/lib/storage';
import { requireAuth } from '@/lib/auth';

export async function POST(request) {
  try {
    const user = requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { key } = await request.json();
    if (!key) {
      return NextResponse.json({ error: 'File key required' }, { status: 400 });
    }

    const url = await getDownloadPresignedUrl(key, 1800); // 30 min download link
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Download URL error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
