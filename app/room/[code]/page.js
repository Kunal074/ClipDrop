'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import { ToastProvider, ToastContainer, useToast } from '@/components/Toast';
import Navbar from '@/components/Navbar';
import ClipCard from '@/components/ClipCard';
import DropZone from '@/components/DropZone';

function RoomContent() {
  const { code } = useParams();
  const { user, loading, getToken } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [room, setRoom] = useState(null);
  const [clips, setClips] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [onlineCount, setOnlineCount] = useState(1);
  const [typingUser, setTypingUser] = useState('');
  const [textInput, setTextInput] = useState('');
  const [sending, setSending] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const socketRef = useRef(null);
  const typingTimer = useRef(null);
  const feedRef = useRef(null);

  const roomCode = code?.toUpperCase();

  // ─── Fetch room ────────────────────────────
  useEffect(() => {
    if (!roomCode) return;
    fetch(`/api/rooms/${roomCode}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setNotFound(true); return; }
        setRoom(data.room);
        setClips(data.room.clips || []);
      })
      .catch(() => setNotFound(true))
      .finally(() => setFetching(false));
  }, [roomCode]);

  // ─── Socket.io ─────────────────────────────
  useEffect(() => {
    if (!roomCode || fetching) return;

    const socket = io(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
      transports: ['websocket'],
    });

    socketRef.current = socket;
    const username = user?.username || `Guest-${Math.random().toString(36).slice(2, 6)}`;

    socket.on('connect', () => {
      socket.emit('join-room', { roomCode, username });
    });

    socket.on('user-joined', ({ onlineCount }) => setOnlineCount(onlineCount));
    socket.on('user-left', ({ onlineCount }) => setOnlineCount(onlineCount));

    socket.on('clip-received', (clip) => {
      setClips(prev => [clip, ...prev]);
      scrollFeed();
    });

    socket.on('clip-deleted', ({ clipId }) => {
      setClips(prev => prev.filter(c => c.id !== clipId));
    });

    socket.on('clip-edited', ({ clip }) => {
      setClips(prev => prev.map(c => c.id === clip.id ? clip : c));
    });

    socket.on('user-typing', ({ username }) => {
      setTypingUser(username);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTypingUser(''), 2500);
    });

    return () => {
      socket.disconnect();
      clearTimeout(typingTimer.current);
    };
  }, [roomCode, fetching, user]);

  // ─── Paste anywhere on page ──────────────
  useEffect(() => {
    const handlePaste = async (e) => {
      const items = e.clipboardData?.items || [];
      for (const item of items) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) { handleFileUpload(file); return; }
        }
      }
      const text = e.clipboardData?.getData('text');
      if (text?.trim()) {
        setTextInput(text.trim());
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const scrollFeed = () => {
    setTimeout(() => {
      if (feedRef.current) feedRef.current.scrollTop = 0;
    }, 50);
  };

  // ─── Send clip ──────────────────────────
  const sendClip = useCallback(async (clipData) => {
    const token = getToken();
    setSending(true);
    try {
      const res = await fetch('/api/clips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ roomCode, ...clipData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setClips(prev => [data.clip, ...prev]);
      socketRef.current?.emit('new-clip', { ...data.clip, roomCode });
      scrollFeed();
      return data.clip;
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  }, [roomCode, getToken, toast]);

  const sendText = async (e) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    const isLink = /^https?:\/\//.test(textInput.trim());
    await sendClip({ type: isLink ? 'link' : 'text', content: textInput.trim() });
    setTextInput('');
  };

  const handleFileUpload = async (uploadResult) => {
    await sendClip(uploadResult);
  };

  // ─── Delete ─────────────────────────────
  const handleDelete = async (id) => {
    const token = getToken();
    try {
      const res = await fetch(`/api/clips/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setClips(prev => prev.filter(c => c.id !== id));
      socketRef.current?.emit('delete-clip', { clipId: id, roomCode });
      toast.success('Clip deleted');
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ─── Edit ───────────────────────────────
  const handleEdit = async (id, content) => {
    const token = getToken();
    try {
      const res = await fetch(`/api/clips/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setClips(prev => prev.map(c => c.id === id ? data.clip : c));
      socketRef.current?.emit('clip-updated', { clip: data.clip, roomCode });
      toast.success('Updated');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleTyping = () => {
    if (!user) return;
    socketRef.current?.emit('typing', { roomCode, username: user.username });
  };

  const copyRoomCode = async () => {
    await navigator.clipboard.writeText(roomCode).catch(() => {});
    toast.success('Room code copied!');
  };

  // ─── Not Found ──────────────────────────
  if (notFound) {
    return (
      <div className="room-page">
        <Navbar />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 16, padding: '4rem 2rem' }}>
          <div style={{ fontSize: '3rem' }}>🚫</div>
          <h2>Room not found</h2>
          <p>Room <strong>{roomCode}</strong> doesn&apos;t exist or has been deleted.</p>
          <button className="btn btn-primary" onClick={() => router.push('/')}>← Back Home</button>
        </div>
      </div>
    );
  }

  if (fetching || loading) {
    return (
      <div className="room-page">
        <Navbar />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <span className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="room-page">
      <Navbar />

      {/* Room Header */}
      <div className="room-header">
        <div className="room-code-display">
          <button onClick={copyRoomCode} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            title="Click to copy room code" id="btn-copy-room-code">
            <div className="room-code-label">Drop Room</div>
            <div className="room-code-value">{roomCode}</div>
          </button>
        </div>

        <div className="room-status">
          <div className="online-badge">
            <span className="online-dot" />
            {onlineCount} online
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => router.push('/')} id="btn-leave-room">
            ← Leave
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="room-body">
        {/* Sidebar — inputs */}
        <aside className="room-sidebar">
          <p className="room-sidebar__title">Add to room</p>

          {/* Text / Link input */}
          <div className="paste-area">
            <form onSubmit={sendText} id="form-send-text">
              <div className="form-group">
                <label className="form-label" htmlFor="text-input">Text or Link</label>
                <textarea
                  id="text-input"
                  className="form-input"
                  rows={4}
                  placeholder="Paste or type here..."
                  value={textInput}
                  onChange={e => { setTextInput(e.target.value); handleTyping(); }}
                  style={{ resize: 'vertical', minHeight: 80 }}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-full"
                style={{ marginTop: 10 }}
                disabled={sending || !textInput.trim()}
                id="btn-send-text"
              >
                {sending ? <><span className="spinner" /> Sending...</> : '✦ Drop it'}
              </button>
            </form>
          </div>

          {/* Paste hint */}
          <div className="paste-hint">
            <kbd>Ctrl</kbd>+<kbd>V</kbd> anywhere to paste instantly
          </div>

          {/* DropZone */}
          <p className="room-sidebar__title">File Upload</p>
          <DropZone
            onUploadComplete={handleFileUpload}
            roomCode={roomCode}
            token={getToken()}
          />

          {/* Typing indicator */}
          <div className="typing-indicator" aria-live="polite">
            {typingUser && `${typingUser} is typing...`}
          </div>
        </aside>

        {/* Feed — clips */}
        <main className="room-feed" ref={feedRef} id="clips-feed">
          {clips.length === 0 ? (
            <div className="paste-hint" style={{ margin: 'auto' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
              <p style={{ fontWeight: 500, marginBottom: 6 }}>Room is empty</p>
              <p style={{ fontSize: '0.8rem' }}>Drop something in the sidebar or press <kbd>Ctrl</kbd>+<kbd>V</kbd></p>
            </div>
          ) : (
            clips.map(clip => (
              <ClipCard
                key={clip.id}
                clip={clip}
                onDelete={user && (user.id === clip.userId || user.id === room?.ownerId) ? handleDelete : null}
                onEdit={user && user.id === clip.userId ? handleEdit : null}
              />
            ))
          )}
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}

export default function RoomPage() {
  return (
    <AuthProvider>
      <ToastProvider>
        <RoomContent />
      </ToastProvider>
    </AuthProvider>
  );
}
