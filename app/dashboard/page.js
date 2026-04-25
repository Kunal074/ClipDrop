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
  const [textComment, setTextComment] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageComment, setImageComment] = useState('');
  const [fileComment, setFileComment] = useState('');
  const [sending, setSending] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const socketRef = useRef(null);
  const feedRef = useRef(null);
  const dropZoneRef = useRef(null);
  const mobileImgRef = useRef(null); // hidden file input for mobile image pick
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

            if (res.status === 429) {
              const data = await res.json();
              toast.error(data.message || 'Image limit reached. Delete an image first.');
              return;
            }

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
            toast.error('Image upload failed. Try again.');
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

  // ─── Mobile image upload (gallery / camera picker) ───
  const uploadImageFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    try {
      const formData = new FormData();
      formData.append('image', file, file.name || `photo_${Date.now()}.jpg`);
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (res.status === 429) {
        const d = await res.json();
        toast.error(d.message || 'Image limit reached. Delete an image first.');
        return;
      }
      if (!res.ok) throw new Error('Upload failed');
      const { url, key } = await res.json();
      await sendClipRef.current?.({
        type: 'image',
        content: url,
        fileName: file.name || `photo_${Date.now()}.jpg`,
        fileSize: file.size,
        fileKey: key,
        mimeType: file.type,
        isLargeFile: false,
      });
      toast.success('Image uploaded!');
    } catch (err) {
      console.error('[mobile img upload]', err);
      toast.error('Image upload failed. Try again.');
    }
  };

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
    await sendClip({ type: isLink ? 'link' : 'text', content: textInput.trim(), comment: textComment.trim() || null });
    setTextInput('');
    setTextComment('');
  };

  const handleFileUpload = useCallback((uploadResult) => {
    // Use the functional form to access the latest state if needed, or just pass the ref.
    // However, to avoid dependency issues with useCallback, let's just use the state directly.
    sendClip({ ...uploadResult, comment: window.__fileComment || null });
    setFileComment('');
    window.__fileComment = '';
  }, [sendClip]);

  // Keep window.__fileComment in sync for the callback
  useEffect(() => {
    window.__fileComment = fileComment;
  }, [fileComment]);

  const handleImageUrlSubmit = async (e) => {
    e.preventDefault();
    if (!imageUrlInput.trim()) return;
    await sendClip({ type: 'image', content: imageUrlInput.trim(), comment: imageComment.trim() || null });
    setImageUrlInput('');
    setImageComment('');
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

  const handleEdit = async (id, updates) => {
    const token = localStorage.getItem('clipdrop_token');
    const roomCode = soloRoomCodeRef.current;
    try {
      const res = await fetch(`/api/clips/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates),
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

  const acceptClip = async (id) => {
    try {
      const token = localStorage.getItem('clipdrop_token');
      const res = await fetch(`/api/clips/${id}/accept`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setClips(prev => prev.map(c => c.id === id ? data.clip : c));
      toast.success('Clip accepted!');
    } catch (err) {
      toast.error(err.message);
    }
  };


  const createRoom = async () => {
    setCreatingRoom(true);
    try {
      const token = localStorage.getItem('clipdrop_token');
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ name: 'Quick Share' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/room/${data.room.code}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreatingRoom(false);
    }
  };

  const getToken = () => localStorage.getItem('clipdrop_token');

  const activeClips = clips.filter(c => !c.isPending);
  const pendingClips = clips.filter(c => c.isPending);

  const FILTERS = ['all', 'text', 'image', 'file', 'link'];
  const filtered = activeClips.filter(c => {
    const matchFilter = filter === 'all' || c.type === filter;
    const matchSearch = !search ||
      c.content?.toLowerCase().includes(search.toLowerCase()) ||
      c.fileName?.toLowerCase().includes(search.toLowerCase()) ||
      c.comment?.toLowerCase().includes(search.toLowerCase());
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
            onClick={createRoom}
            disabled={creatingRoom}
            title="Create a temporary 6-digit room to share clips with others"
          >
            {creatingRoom ? <span className="spinner" style={{width: 14, height: 14, marginRight: 6}} /> : '✦ '}
            {creatingRoom ? 'Creating...' : 'Share a Drop Room'}
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
                placeholder="Type or press Ctrl+V to paste (desktop)..."
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                style={{ resize: 'vertical', minHeight: 80, marginBottom: 10 }}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Add a comment (optional)..."
                value={textComment}
                onChange={e => setTextComment(e.target.value)}
                style={{ marginBottom: 10 }}
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

          {/* Hidden file input for mobile gallery/camera */}
          <input
            ref={mobileImgRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) uploadImageFile(file);
              e.target.value = ''; // reset so same file can be picked again
            }}
          />
          <button
            type="button"
            onClick={() => mobileImgRef.current?.click()}
            className="btn btn-secondary btn-full"
            style={{ marginBottom: 10 }}
          >
            📷 Upload Image from Gallery
          </button>
          <input
            type="text"
            className="form-input"
            placeholder="Add a comment before dropping (optional)..."
            value={fileComment}
            onChange={e => setFileComment(e.target.value)}
            style={{ marginBottom: 10 }}
          />
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
            <input
              type="text"
              className="form-input"
              placeholder="Add a comment (optional)..."
              value={imageComment}
              onChange={e => setImageComment(e.target.value)}
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
          {pendingClips.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1rem', color: '#f59e0b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📥 Inbox ({pendingClips.length} pending)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {pendingClips.map(clip => (
                  <div key={clip.id} style={{ 
                    background: 'rgba(245,158,11,0.05)', 
                    border: '1px solid rgba(245,158,11,0.2)', 
                    padding: '1rem', 
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.9rem', color: '#fff' }}>
                        <strong>@{clip.username}</strong> sent you a {clip.type} clip.
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => acceptClip(clip.id)} className="btn btn-primary btn-sm" style={{ background: '#10b981', color: '#fff' }}>Accept</button>
                        <button onClick={() => handleDelete(clip.id)} className="btn btn-secondary btn-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>Reject</button>
                      </div>
                    </div>
                    {/* Minimal preview */}
                    {clip.type === 'text' && <div style={{ fontSize: '0.8rem', color: '#9ca3af', background: '#111', padding: '0.5rem', borderRadius: '4px' }}>{clip.content.substring(0, 100)}{clip.content.length > 100 ? '...' : ''}</div>}
                    {clip.type === 'image' && <img src={clip.content} alt="preview" style={{ height: 60, width: 'auto', borderRadius: '4px' }} />}
                  </div>
                ))}
              </div>
            </div>
          )}

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
