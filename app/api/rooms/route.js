import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Room from '@/lib/models/Room';
import { requireAuth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Create a new room
export async function POST(request) {
  try {
    await dbConnect();
    const user = requireAuth(request);

    const { name } = await request.json().catch(() => ({}));

    let code;
    let attempts = 0;
    do {
      code = generateRoomCode();
      attempts++;
      if (attempts > 10) {
        return NextResponse.json({ error: 'Could not generate room code' }, { status: 500 });
      }
    } while (await Room.exists({ code }));

    const room = await Room.create({
      code,
      name: name || `Room ${code}`,
      createdBy: user?.userId || null,
      members: user?.userId ? [user.userId] : [],
    });

    return NextResponse.json({ room }, { status: 201 });
  } catch (error) {
    console.error('Create room error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Get room info by code
export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.toUpperCase();

    if (!code) {
      return NextResponse.json({ error: 'Room code required' }, { status: 400 });
    }

    const room = await Room.findOne({ code });
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({ room });
  } catch (error) {
    console.error('Get room error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
