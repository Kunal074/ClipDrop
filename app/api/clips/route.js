import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Clip from '@/lib/models/Clip';
import { requireAuth } from '@/lib/auth';

// GET clips for a room
export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const roomCode = searchParams.get('room')?.toUpperCase();

    if (!roomCode) {
      return NextResponse.json({ error: 'Room code required' }, { status: 400 });
    }

    const clips = await Clip.find({ roomCode })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ clips });
  } catch (error) {
    console.error('Get clips error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST create a new clip
export async function POST(request) {
  try {
    await dbConnect();
    const user = requireAuth(request);
    const body = await request.json();

    const { roomCode, type, content, fileName, fileSize, fileKey, mimeType } = body;

    if (!roomCode || !type) {
      return NextResponse.json({ error: 'roomCode and type are required' }, { status: 400 });
    }

    const clip = await Clip.create({
      roomCode: roomCode.toUpperCase(),
      userId: user?.userId || null,
      username: user?.username || 'Anonymous',
      type,
      content: content || '',
      fileName: fileName || '',
      fileSize: fileSize || 0,
      fileKey: fileKey || '',
      mimeType: mimeType || '',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    return NextResponse.json({ clip }, { status: 201 });
  } catch (error) {
    console.error('Create clip error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE a clip
export async function DELETE(request) {
  try {
    await dbConnect();
    const user = requireAuth(request);
    const { searchParams } = new URL(request.url);
    const clipId = searchParams.get('id');

    if (!clipId) {
      return NextResponse.json({ error: 'Clip ID required' }, { status: 400 });
    }

    const clip = await Clip.findById(clipId);
    if (!clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
    }

    // Only the creator can delete
    if (user && clip.userId?.toString() !== user.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await Clip.findByIdAndDelete(clipId);

    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    console.error('Delete clip error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
