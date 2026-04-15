'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import { ToastProvider, ToastContainer, useToast } from '@/components/Toast';
import Navbar from '@/components/Navbar';
import ClipCard from '@/components/ClipCard';

const FILTERS = ['all', 'text', 'image', 'file', 'link'];

function DashboardContent() {
  const { user, loading, getToken } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [clips, setClips] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchClips = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch('/api/clips/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setClips(data.clips || []);
    } catch (err) {
      toast.error('Failed to load clips');
    } finally {
      setFetching(false);
    }
  }, [getToken, toast]);

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return; }
    if (!loading && user) fetchClips();
  }, [loading, user, router, fetchClips]);

  const handleDelete = async (id) => {
    const token = getToken();
    try {
      const res = await fetch(`/api/clips/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setClips(prev => prev.filter(c => c.id !== id));
      toast.success('Clip deleted');
    } catch (err) {
      toast.error(err.message);
    }
  };

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
      toast.success('Clip updated');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handlePin = async (id) => {
    const token = getToken();
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

  const filtered = clips.filter(c => {
    const matchFilter = filter === 'all' || c.type === filter;
    const matchSearch = !search || c.content?.toLowerCase().includes(search.toLowerCase()) ||
      c.fileName?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const counts = FILTERS.reduce((acc, f) => {
    acc[f] = f === 'all' ? clips.length : clips.filter(c => c.type === f).length;
    return acc;
  }, {});

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
    <div className="dashboard-page">
      <Navbar />

      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-inner">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 className="dashboard-title">My Clips</h1>
              <p className="dashboard-subtitle">
                {clips.length} clip{clips.length !== 1 ? 's' : ''} saved · Welcome, @{user?.username}
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => router.push('/')}
              id="btn-create-room-dash"
            >
              ✦ New Drop Room
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="dashboard-toolbar">
        {/* Search */}
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            id="search-clips"
            type="text"
            className="search-input"
            placeholder="Search clips..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="filter-tabs" role="tablist">
          {FILTERS.map(f => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              className={`filter-tab ${filter === f ? 'filter-tab--active' : ''}`}
              onClick={() => setFilter(f)}
              id={`filter-${f}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {counts[f] > 0 && (
                <span style={{ marginLeft: 4, opacity: 0.7, fontSize: '0.7rem' }}>
                  {counts[f]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Clips Grid */}
      <div className="clips-grid">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">📭</div>
            <p className="empty-state__title">
              {search ? 'No clips match your search' : filter !== 'all' ? `No ${filter} clips yet` : 'No clips yet'}
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-3)', marginTop: 6 }}>
              {!search && 'Create a Drop Room and start pasting!'}
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
              showRoom
            />
          ))
        )}
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
