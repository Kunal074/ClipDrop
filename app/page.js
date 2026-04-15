'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import Navbar from '@/components/Navbar';
import { ToastProvider, ToastContainer, useToast } from '@/components/Toast';

function HomeContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [roomCode, setRoomCode] = useState('');
  const [creating, setCreating] = useState(false);

  const createRoom = async () => {
    if (!user) { router.push('/login'); return; }
    setCreating(true);
    try {
      const token = localStorage.getItem('clipdrop_token');
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/room/${data.room.code}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const joinRoom = (e) => {
    e.preventDefault();
    const code = roomCode.trim().toUpperCase();
    if (code.length < 4) { toast.error('Enter a valid room code'); return; }
    router.push(`/room/${code}`);
  };

  return (
    <div className="home-page">
      <Navbar />

      <main>
        {/* Hero */}
        <section className="hero">
          <div className="hero-badge">✦ Cross-Device Clipboard · 1 GB Files · Real-time Sync</div>
          <h1>
            Your clipboard,{' '}
            <span className="gradient-text">everywhere</span>
          </h1>
          <p>
            Paste text, images, and files up to 1&nbsp;GB — instantly accessible from any device.
            Large files auto-delete in 30 minutes. Everything else is saved forever.
          </p>

          <div className="hero-actions">
            <button
              id="btn-create-room"
              className="btn btn-primary btn-lg"
              onClick={createRoom}
              disabled={creating}
            >
              {creating ? <span className="spinner" /> : '✦'}
              {creating ? 'Creating...' : 'Create a Drop Room'}
            </button>
            {!loading && !user && (
              <Link href="/register" className="btn btn-secondary btn-lg" id="btn-hero-register">
                Sign up free
              </Link>
            )}
          </div>

          <form className="room-quick" onSubmit={joinRoom} id="form-join-room">
            <input
              id="input-room-code"
              type="text"
              placeholder="Enter room code to join..."
              maxLength={8}
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase())}
            />
            <button type="submit" className="btn btn-primary" id="btn-join-room">
              Join →
            </button>
          </form>
        </section>

        {/* Feature Grid */}
        <section className="features" aria-label="Features">
          {[
            { icon: '⚡', title: 'Instant Paste', desc: 'Press Ctrl+V anywhere in a room. Text and images sync across devices in under 100ms via WebSocket.' },
            { icon: '📦', title: '1 GB File Drops', desc: 'Drop any file up to 1 GB. Uploaded directly to Cloudflare R2 — never touches our server.' },
            { icon: '⏱', title: '30‑Min Large File Expiry', desc: 'Files over 10 MB auto-delete after 30 minutes. Smaller clips and text are saved permanently.' },
            { icon: '🔗', title: 'Drop Rooms', desc: 'Share a 6-character code. Any device that joins sees every clip in real-time.' },
            { icon: '💾', title: 'Persistent Dashboard', desc: 'All your clips saved to your account. Edit text, pin favourites, delete what you don&apos;t need.' },
            { icon: '🌍', title: 'No Install Needed', desc: '100% browser-based. Works on any device with a modern browser — phone, tablet, desktop.' },
          ].map(f => (
            <div key={f.title} className="card feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <ToastContainer />
    </div>
  );
}

export default function HomePage() {
  return (
    <AuthProvider>
      <ToastProvider>
        <HomeContent />
      </ToastProvider>
    </AuthProvider>
  );
}
