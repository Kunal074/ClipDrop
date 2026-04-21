'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import { ToastProvider, ToastContainer, useToast } from '@/components/Toast';
import Navbar from '@/components/Navbar';
import ClipCard from '@/components/ClipCard';
import DropZone from '@/components/DropZone';

function DashboardContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [clips, setClips] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [soloRoomCode, setSoloRoomCode] = useState('');
  const [textInput, setTextInput] = useState('');
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');

  const socketRef = useRef(null);
  const feedRef = useRef(null);
  const dropZoneRef = useRef(null);
  // Stable ref to soloRoomCode so callbacks don't need it as a dep
  const soloRoomCodeRef = useRef('');

  const userId = user?.id;
  const username = user?.username;

  // ─── Show toast if redirected back after Google Drive connect ───
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_connected') === 'true') {
      toast.success('✅ Google Drive connected! You can now upload large files.');
      window.history.replaceState({}, '', '/dashboard');
    }
  }, []); // run once on mount

  // ─── Auth guard & initial clip fetch ───
  useEffect(() => {
    if (loading) return;
    if (!userId) { router.push('/login'); return; }

    const token = localStorage.getItem('clipdrop_token');
    if (!token) return;

    setFetching(true);
    fetch('/api/clips/dashboard', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setClips(data.clips || []);
        const code = data.soloRoomCode || `SOLO_${userId}`;
        setSoloRoomCode(code);
        soloRoomCodeRef.current = code;
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [loading, userId, router]); // stable: all primitives

  // ─── Socket connection ───
  useEffect(() => {
    if (!soloRoomCode) return;

    const socket = io(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-room', { roomCode: soloRoomCode, username });
    });
    socket.on('clip-received', (clip) => {
      setClips(prev => [clip, ...prev]);
      setTimeout(() => { if (feedRef.current) feedRef.current.scrollTop = 0; }, 50);
    });
    socket.on('clip-deleted', ({ clipId }) => setClips(prev => prev.filter(c => c.id !== clipId)));
    socket.on('clip-edited', ({ clip }) => setClips(prev => prev.map(c => c.id === clip.id ? clip : c)));

    return () => socket.disconnect();
  }, [soloRoomCode, username]); // stable: soloRoomCode is a string, username is a string

  // ─── Stable ref to sendClip so paste handler can call it without re-registering ───
  const sendClipRef = useRef(null);

  // ─── Paste handler ───
  useEffect(() => {
    const handlePaste = async (e) => {
      const items = e.clipboardData?.items || [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (!file) continue;

          // Upload pasted image to R2 — store URL, not base64 in DB
          try {
            const formData = new FormData();
            formData.append('image', file, `paste_${Date.now()}.png`);
            const res = await fetch('/api/upload-image', {
              method: 'POST',
              body: formData,
              credentials: 'include',
            });
            if (!res.ok) throw new Error('Upload failed');
            const { url, key } = await res.json();

            await sendClipRef.current?.({
              type: 'image',
              content: url,           // R2 public URL — no base64 in DB
              fileName: `screenshot_${Date.now()}.png`,
              fileSize: file.size,
              fileKey: key,            // stored so cron can delete it from R2
              mimeType: file.type,
              isLargeFile: false,
            });
          } catch (err) {
            console.error('[paste image upload]', err);
            // Fallback: still use base64 if R2 fails
            const reader = new FileReader();
            reader.onload = async (ev) => {
              await sendClipRef.current?.({
                type: 'image',
                content: ev.target.result,
                fileName: `screenshot_${Date.now()}.png`,
                fileSize: file.size,
                mimeType: file.type,
                isLargeFile: false,
              });
            };
            reader.readAsDataURL(file);
          }
          return;
        }
        if (item.kind === 'file') return;
      }
      const text = e.clipboardData?.getData('text');
      if (text?.trim()) setTextInput(text.trim());
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []); // stable: only uses refs

  // ─── Send clip ───
  const sendClip = useCallback(async (clipData) => {
    const token = localStorage.getItem('clipdrop_token');
    const roomCode = soloRoomCodeRef.current;
    if (!roomCode) return;
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
      setTimeout(() => { if (feedRef.current) feedRef.current.scrollTop = 0; }, 50);
      return data.clip;
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  }, [toast]);
  // Keep ref in sync so paste handler always calls the latest sendClip
  sendClipRef.current = sendClip;

  const sendText = async (e) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    const isLink = /^https?:\/\//.test(textInput.trim());
    await sendClip({ type: isLink ? 'link' : 'text', content: textInput.trim() });
    setTextInput('');
  };

  const handleFileUpload = useCallback((uploadResult) => sendClip(uploadResult), [sendClip]);

  const handleImageUrlSubmit = async (e) => {
    e.preventDefault();
    if (!imageUrlInput.trim()) return;
    await sendClip({ type: 'image', content: imageUrlInput.trim() });
    setImageUrlInput('');
    toast.success('Image added from URL');
  };

  const handleDelete = async (id) => {
    const token = localStorage.getItem('clipdrop_token');
    const roomCode = soloRoomCodeRef.current;
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

  const handleEdit = async (id, content) => {
    const token = localStorage.getItem('clipdrop_token');
    const roomCode = soloRoomCodeRef.current;
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

  const handlePin = async (id) => {
    const token = localStorage.getItem('clipdrop_token');
    try {
      const res = await fetch(`/api/clips/${id}/pin`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setClips(prev => prev.map(c => c.id === id ? data.clip : c));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const getToken = () => localStorage.getItem('clipdrop_token');

  const FILTERS = ['all', 'text', 'image', 'file', 'link'];
  const filtered = clips.filter(c => {
    const matchFilter = filter === 'all' || c.type === filter;
    const matchSearch = !search ||
      c.content?.toLowerCase().includes(search.toLowerCase()) ||
      c.fileName?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  if (loading || fetching) {
    return (
      <div className="dashboard-page">
        <Navbar />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <span className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page room-page">
      <Navbar />

      <div className="room-header">
        <div className="room-code-display">
          <div className="room-code-label">Personal Workspace</div>
          <div className="room-code-value">@{username}</div>
        </div>

        <div className="room-status" style={{ gap: '1rem', display: 'flex', alignItems: 'center' }}>
          <div className="search-wrap" style={{ margin: 0 }}>
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search clips..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '200px' }}
            />
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => router.push('/')}
            title="Create a temporary 6-digit room to share clips with others"
          >
            ✦ Share a Drop Room
          </button>
        </div>
      </div>

      <div className="room-body">
        <aside className="room-sidebar">
          <p className="room-sidebar__title">Paste Text or URL</p>
          <div className="paste-area">
            <form onSubmit={sendText}>
              <textarea
                className="form-input"
                rows={4}
                placeholder="Type or press Ctrl+V anywhere..."
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                style={{ resize: 'vertical', minHeight: 80, marginBottom: 10 }}
              />
              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={sending || !textInput.trim()}
              >
                {sending ? <><span className="spinner" /> Saving...</> : 'Save Text'}
              </button>
            </form>
          </div>

          <p className="room-sidebar__title" style={{ marginTop: '1.5rem' }}>Drop File or Paste Image</p>
          <DropZone
            ref={dropZoneRef}
            onUploadComplete={handleFileUpload}
            roomCode={soloRoomCode}
            getToken={getToken}
          />

          <p className="room-sidebar__title" style={{ marginTop: '1.5rem' }}>Add Image via URL</p>
          <form onSubmit={handleImageUrlSubmit} className="paste-area">
            <input
              type="url"
              className="form-input"
              placeholder="https://example.com/image.png"
              value={imageUrlInput}
              onChange={e => setImageUrlInput(e.target.value)}
              style={{ marginBottom: 10 }}
            />
            <button
              type="submit"
              className="btn btn-secondary btn-full"
              disabled={sending || !imageUrlInput.trim()}
            >
              Add Image
            </button>
          </form>
        </aside>

        <main className="room-feed" ref={feedRef}>
          <div className="filter-tabs" role="tablist" style={{ marginBottom: '1.5rem' }}>
            {FILTERS.map(f => {
              const count = f === 'all' ? clips.length : clips.filter(c => c.type === f).length;
              return (
                <button
                  key={f}
                  role="tab"
                  aria-selected={filter === f}
                  className={`filter-tab ${filter === f ? 'filter-tab--active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  {count > 0 && <span style={{ marginLeft: 4, opacity: 0.7, fontSize: '0.7rem' }}>{count}</span>}
                </button>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">📭</div>
              <p className="empty-state__title">
                {search ? 'No clips match your search' : filter !== 'all' ? `No ${filter} clips yet` : 'Your workspace is empty'}
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-3)', marginTop: 6 }}>
                {!search && 'Paste something or drop a file in the sidebar to get started!'}
              </p>
            </div>
          ) : (
            filtered.map(clip => (
              <ClipCard
                key={clip.id}
                clip={clip}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onPin={handlePin}
                onNewClip={sendClip}
              />
            ))
          )}
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthProvider>
      <ToastProvider>
        <DashboardContent />
      </ToastProvider>
    </AuthProvider>
  );
}
