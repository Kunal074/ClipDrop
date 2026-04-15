import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getUploadPresignedUrl } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';

const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1 GB

export async function POST(request) {
  try {
    const user = requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { fileName, fileSize, contentType, roomCode } = await request.json();

    if (!fileName || !fileSize || !contentType || !roomCode) {
      return NextResponse.json({ error: 'fileName, fileSize, contentType, roomCode are required' }, { status: 400 });
    }

    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds 1 GB limit' }, { status: 413 });
    }

    const extension = fileName.split('.').pop();
    const key = `uploads/${roomCode}/${uuidv4()}.${extension}`;

    const presignedUrl = await getUploadPresignedUrl(key, contentType, 3600);

    return NextResponse.json({ presignedUrl, key });
  } catch (error) {
    console.error('Upload URL error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
