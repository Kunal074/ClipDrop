'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import Link from 'next/link';

const ADMIN_EMAILS = ['clipdrop79@gmail.com', 'kunalsahu232777@gmail.com'];

function AdminContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [tools, setTools] = useState([]);
  const [activity, setActivity] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase())) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase())) return;
    const token = localStorage.getItem('clipdrop_token');
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch('/api/admin/stats', { headers }).then(r => r.json()),
      fetch('/api/admin/users', { headers }).then(r => r.json()),
      fetch('/api/admin/tools', { headers }).then(r => r.json()),
      fetch('/api/admin/activity', { headers }).then(r => r.json()),
    ]).then(([s, u, t, a]) => {
      setStats(s);
      setUsers(u.users || []);
      setTools(t.tools || []);
      setActivity(a.clips || []);
      setDataLoading(false);
    }).catch(() => setDataLoading(false));
  }, [user]);

  if (loading || !user) return null;
  if (!ADMIN_EMAILS.includes(user.email?.toLowerCase())) return null;

  const maxToolCount = tools[0]?.count || 1;

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const typeIcon = { text: '📝', image: '🖼️', file: '📁', link: '🔗' };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text-1)' }}>
      {/* Top Bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 2rem',
        background: 'oklch(0.10 0.02 260 / 0.95)',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/dashboard" style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>← Back</Link>
          <span style={{ color: 'var(--border)', fontSize: '0.8rem' }}>|</span>
          <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>
            🛡️ <span style={{ background: 'linear-gradient(135deg,#00d4ff,#10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Admin Panel</span>
          </span>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Logged as <span style={{ color: '#00d4ff' }}>{user.email}</span></span>
      </div>

      <div style={{ paddingTop: 80, padding: '80px 2rem 3rem', maxWidth: 1300, margin: '0 auto' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {['overview', 'users', 'tools', 'activity'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '8px 20px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
              background: activeTab === tab ? 'var(--primary)' : 'var(--bg-3)',
              color: activeTab === tab ? '#fff' : 'var(--text-2)',
              textTransform: 'capitalize', transition: 'all 0.15s',
            }}>{tab}</button>
          ))}
        </div>

        {dataLoading ? (
          <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-3)' }}>Loading analytics…</div>
        ) : (
          <>
            {/* ─── OVERVIEW ─── */}
            {activeTab === 'overview' && (
              <div>
                {/* Stats Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                  {[
                    { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: '👥', color: '#00d4ff' },
                    { label: 'Total Clips', value: stats?.totalClips ?? 0, icon: '📋', color: '#10b981' },
                    { label: 'Total Rooms', value: stats?.totalRooms ?? 0, icon: '🚪', color: '#a78bfa' },
                    { label: 'Tool Uses', value: stats?.totalToolUses ?? 0, icon: '🛠️', color: '#f59e0b' },
                    { label: 'New Users (7d)', value: stats?.newUsersThisWeek ?? 0, icon: '🆕', color: '#fb7185' },
                    { label: 'Clips Today', value: stats?.clipsToday ?? 0, icon: '⚡', color: '#34d399' },
                  ].map(card => (
                    <div key={card.label} style={{
                      background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 16,
                      padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
                    }}>
                      <span style={{ fontSize: '1.8rem' }}>{card.icon}</span>
                      <span style={{ fontSize: '2rem', fontWeight: 700, color: card.color }}>{card.value.toLocaleString()}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{card.label}</span>
                    </div>
                  ))}
                </div>

                {/* Quick Tool Preview */}
                <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-1)' }}>🔥 Most Used Tools</h3>
                  {tools.slice(0, 6).map(t => (
                    <div key={t.toolName} style={{ marginBottom: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-1)', textTransform: 'capitalize' }}>{t.toolName.replace(/-/g, ' ')}</span>
                        <span style={{ color: 'var(--text-3)' }}>{t.count} uses</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--bg-3)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 999,
                          width: `${(t.count / maxToolCount) * 100}%`,
                          background: 'linear-gradient(90deg,#00d4ff,#10b981)',
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                    </div>
                  ))}
                  {tools.length === 0 && <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>No tool usage recorded yet. Tools will appear once users start visiting them.</p>}
                </div>
              </div>
            )}

            {/* ─── USERS ─── */}
            {activeTab === 'users' && (
              <div>
                <div style={{ marginBottom: '1rem' }}>
                  <input
                    type="text" placeholder="Search by username or email…"
                    value={search} onChange={e => setSearch(e.target.value)}
                    style={{
                      padding: '10px 16px', background: 'var(--bg-2)', border: '1px solid var(--border)',
                      borderRadius: 10, color: 'var(--text-1)', fontSize: '0.9rem', width: '100%', maxWidth: 400,
                      outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                </div>
                <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-3)', textAlign: 'left' }}>
                          {['Username', 'Email', 'Verified', 'Clips', 'Rooms', 'Joined'].map(h => (
                            <th key={h} style={{ padding: '12px 16px', color: 'var(--text-3)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u, i) => (
                          <tr key={u.id} style={{ borderTop: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'oklch(0.15 0.02 260 / 0.3)' }}>
                            <td style={{ padding: '12px 16px', color: 'var(--text-1)', fontWeight: 500 }}>@{u.username}</td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{u.email}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600,
                                background: u.emailVerified ? 'oklch(0.65 0.18 150/0.2)' : 'oklch(0.72 0.18 65/0.2)',
                                color: u.emailVerified ? '#10b981' : '#f59e0b' }}>
                                {u.emailVerified ? '✓ Yes' : '✗ No'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{u._count.clips}</td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{u._count.rooms}</td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-3)', fontSize: '0.8rem' }}>{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredUsers.length === 0 && (
                      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-3)' }}>No users found.</div>
                    )}
                  </div>
                </div>
                <p style={{ color: 'var(--text-3)', fontSize: '0.8rem', marginTop: '0.75rem' }}>Showing {filteredUsers.length} of {users.length} users</p>
              </div>
            )}

            {/* ─── TOOLS ─── */}
            {activeTab === 'tools' && (
              <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>📊 All Tool Usage</h3>
                {tools.length === 0 && (
                  <p style={{ color: 'var(--text-3)' }}>No tool usage data yet. Tools are tracked when users visit a tool page.</p>
                )}
                {tools.map((t, i) => (
                  <div key={t.toolName} style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ width: 28, textAlign: 'right', color: 'var(--text-3)', fontSize: '0.85rem', fontWeight: 600, flexShrink: 0 }}>#{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: '0.875rem' }}>
                        <span style={{ color: 'var(--text-1)', fontWeight: 500, textTransform: 'capitalize' }}>{t.toolName.replace(/-/g, ' ')}</span>
                        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{t.count.toLocaleString()}</span>
                      </div>
                      <div style={{ height: 8, background: 'var(--bg-3)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 999,
                          width: `${(t.count / maxToolCount) * 100}%`,
                          background: `linear-gradient(90deg, hsl(${(i * 40) % 360},80%,55%), hsl(${(i * 40 + 60) % 360},80%,55%))`,
                        }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ─── ACTIVITY ─── */}
            {activeTab === 'activity' && (
              <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>⚡ Recent Platform Activity</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {activity.map(clip => (
                    <div key={clip.id} style={{
                      display: 'flex', alignItems: 'center', gap: '1rem',
                      padding: '12px 16px', background: 'var(--bg-3)', borderRadius: 10,
                      border: '1px solid var(--border)',
                    }}>
                      <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{typeIcon[clip.type] || '📋'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ color: '#00d4ff', fontSize: '0.85rem', fontWeight: 600 }}>@{clip.username}</span>
                          <span style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>in room</span>
                          <code style={{ color: 'var(--accent)', fontSize: '0.78rem', background: 'var(--bg)', padding: '1px 6px', borderRadius: 4 }}>{clip.roomCode}</code>
                        </div>
                        <p style={{ color: 'var(--text-2)', fontSize: '0.8rem', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {clip.type === 'text' ? (clip.content?.slice(0, 80) || '—') : clip.fileName || `[${clip.type}]`}
                        </p>
                      </div>
                      <span style={{ color: 'var(--text-3)', fontSize: '0.75rem', flexShrink: 0 }}>
                        {new Date(clip.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                  {activity.length === 0 && <p style={{ color: 'var(--text-3)' }}>No activity recorded yet.</p>}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AuthProvider>
      <AdminContent />
    </AuthProvider>
  );
}
