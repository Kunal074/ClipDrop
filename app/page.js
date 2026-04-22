'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
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
          <div className="hero-badge">✦ Cross-Device Clipboard · Unlimited Files · Real-time Sync</div>
          <h1>
            Your clipboard,{' '}
            <span className="gradient-text">everywhere</span>
          </h1>
          <p>
            Paste text, images, and massive files — instantly accessible from any device. 
            Connect your Google Drive for unlimited cloud file storage. Over 15+ free utility tools included!
          </p>

          <div className="hero-actions">
            {user ? (
              <Link href="/dashboard" className="btn btn-primary btn-lg" id="btn-go-dashboard">
                ✦ Go to Personal Workspace
              </Link>
            ) : (
              <Link href="/register" className="btn btn-primary btn-lg" id="btn-get-started">
                ✦ Start Syncing Free
              </Link>
            )}
            
            <button
              id="btn-create-room"
              className="btn btn-secondary btn-lg"
              onClick={createRoom}
              disabled={creating}
              title="Create a 6-digit room to share with others"
            >
              {creating ? <span className="spinner" /> : '✦'}
              {creating ? 'Creating Room...' : 'Share a Drop Room'}
            </button>
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
            { icon: '⚡', title: 'Instant Sync', desc: 'Press Ctrl+V anywhere in a room. Text and images sync across devices in under 100ms via WebSocket.' },
            { icon: '📦', title: 'Unlimited File Size', desc: 'Drop massive files. Uploaded directly to your personal Google Drive — never touches our server, zero limits.' },
            { icon: '🛠️', title: 'PDF & Image Tools', desc: 'Merge, split, compress, or convert documents to PDF instantly right in your browser for free.' },
            { icon: '🔗', title: 'Drop Rooms', desc: 'Share a 6-character code. Any device that joins sees every clip in real-time instantly.' },
            { icon: '💾', title: 'Persistent Dashboard', desc: 'All your clips saved to your account. Edit text, pin favourites, delete what you don\'t need.' },
            { icon: '🎨', title: 'Vector & Raster Edits', desc: 'Convert SVGs to PNGs, resize images, or even turn raster images into vector SVG files.' },
            { icon: '🌍', title: 'Browser Native', desc: '100% web-based. Works on any device with a modern browser — phone, tablet, or desktop.' },
          ].map(f => (
            <div key={f.title} className="card feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <Footer />
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
