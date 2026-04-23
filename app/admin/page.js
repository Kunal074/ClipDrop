'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import Link from 'next/link';

const ADMIN_EMAILS = ['clipdrop79@gmail.com', 'kunalsahu232777@gmail.com'];

// CSS Pie Chart Component
function PieChart({ data, total }) {
  if (!total) return <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>No data yet.</p>;
  const colors = ['#00d4ff', '#10b981', '#a78bfa', '#f59e0b', '#fb7185', '#34d399', '#60a5fa', '#f472b6'];
  let cumulative = 0;
  const slices = data.map((d, i) => {
    const pct = (d.count / total) * 100;
    const start = cumulative;
    cumulative += pct;
    return { ...d, pct, start, color: colors[i % colors.length] };
  });

  const gradientParts = slices.map(s => `${s.color} ${s.start.toFixed(1)}% ${(s.start + s.pct).toFixed(1)}%`).join(', ');

  return (
    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{
        width: 160, height: 160, borderRadius: '50%', flexShrink: 0,
        background: `conic-gradient(${gradientParts})`,
        boxShadow: '0 0 30px rgba(0,212,255,0.15)',
      }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {slices.map(s => (
          <div key={s.toolName} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--text-2)', textTransform: 'capitalize' }}>{s.toolName.replace(/-/g, ' ')}</span>
            <span style={{ color: 'var(--text-3)', marginLeft: 'auto' }}>{s.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [tools, setTools] = useState([]);
  const [activity, setActivity] = useState([]);
  const [rooms, setRooms] = useState({ rooms: [], topRooms: [], soloRooms: 0, sharedRooms: 0 });
  const [activeTab, setActiveTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase())) router.replace('/dashboard');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase())) return;
    const token = localStorage.getItem('clipdrop_token');
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch('/api/admin/stats', { headers: h }).then(r => r.json()),
      fetch('/api/admin/users', { headers: h }).then(r => r.json()),
      fetch('/api/admin/tools', { headers: h }).then(r => r.json()),
      fetch('/api/admin/activity', { headers: h }).then(r => r.json()),
      fetch('/api/admin/rooms', { headers: h }).then(r => r.json()),
    ]).then(([s, u, t, a, rm]) => {
      setStats(s);
      setUsers(u.users || []);
      setTools(t.tools || []);
      setActivity(a.clips || []);
      setRooms(rm);
      setDataLoading(false);
    }).catch(() => setDataLoading(false));
  }, [user]);

  if (loading || !user) return null;
  if (!ADMIN_EMAILS.includes(user.email?.toLowerCase())) return null;

  const maxToolCount = tools[0]?.count || 1;
  const totalToolUses = tools.reduce((s, t) => s + t.count, 0);
  const top6Tools = tools.slice(0, 6);

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const typeIcon = { text: '📝', image: '🖼️', file: '📁', link: '🔗' };
  const tabs = ['overview', 'users', 'tools', 'rooms', 'activity'];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text-1)' }}>
      {/* Top Bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 2rem', background: 'oklch(0.10 0.02 260 / 0.95)',
        borderBottom: '1px solid var(--border)', backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/dashboard" style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>← Back</Link>
          <span style={{ color: 'var(--border)' }}>|</span>
          <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>
            🛡️ <span style={{ background: 'linear-gradient(135deg,#00d4ff,#10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Admin Panel</span>
          </span>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
          Logged as <span style={{ color: '#00d4ff' }}>{user.email}</span>
        </span>
      </div>

      <div style={{ paddingTop: 80, padding: '80px 2rem 3rem', maxWidth: 1300, margin: '0 auto' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '8px 20px', borderRadius: 999, border: 'none', cursor: 'pointer',
              fontSize: '0.875rem', fontWeight: 500, textTransform: 'capitalize', transition: 'all 0.15s',
              background: activeTab === tab ? 'var(--primary)' : 'var(--bg-3)',
              color: activeTab === tab ? '#fff' : 'var(--text-2)',
            }}>{tab}</button>
          ))}
        </div>

        {dataLoading ? (
          <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-3)' }}>Loading analytics…</div>
        ) : (
          <>
            {/* ── OVERVIEW ── */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Stat Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                  {[
                    { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: '👥', color: '#00d4ff' },
                    { label: 'Total Clips', value: stats?.totalClips ?? 0, icon: '📋', color: '#10b981' },
                    { label: 'Total Rooms', value: stats?.totalRooms ?? 0, icon: '🚪', color: '#a78bfa' },
                    { label: 'Tool Uses', value: stats?.totalToolUses ?? 0, icon: '🛠️', color: '#f59e0b' },
                    { label: 'New Users (7d)', value: stats?.newUsersThisWeek ?? 0, icon: '🆕', color: '#fb7185' },
                    { label: 'Clips Today', value: stats?.clipsToday ?? 0, icon: '⚡', color: '#34d399' },
                    { label: 'Active Rooms (24h)', value: stats?.activeRooms ?? 0, icon: '🟢', color: '#60a5fa' },
                  ].map(card => (
                    <div key={card.label} style={{
                      background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 16,
                      padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem',
                    }}>
                      <span style={{ fontSize: '1.6rem' }}>{card.icon}</span>
                      <span style={{ fontSize: '1.75rem', fontWeight: 700, color: card.color }}>{card.value.toLocaleString()}</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>{card.label}</span>
                    </div>
                  ))}
                </div>

                {/* Two-column: Pie Chart + Clip Breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  {/* Pie Chart */}
                  <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>🥧 Tool Usage Share</h3>
                    <PieChart data={top6Tools} total={totalToolUses} />
                  </div>

                  {/* Clip Type Breakdown */}
                  <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>📊 Clip Types</h3>
                    {stats?.clipBreakdown && Object.keys(stats.clipBreakdown).length > 0 ? (() => {
                      const totalClips = Object.values(stats.clipBreakdown).reduce((a, b) => a + b, 0);
                      const clipColors = { text: '#00d4ff', image: '#10b981', file: '#a78bfa', link: '#f59e0b' };
                      const clipIcons = { text: '📝', image: '🖼️', file: '📁', link: '🔗' };
                      return Object.entries(stats.clipBreakdown).map(([type, count]) => (
                        <div key={type} style={{ marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.85rem' }}>
                            <span>{clipIcons[type]} {type}</span>
                            <span style={{ color: 'var(--text-3)' }}>{count} ({((count / totalClips) * 100).toFixed(1)}%)</span>
                          </div>
                          <div style={{ height: 8, background: 'var(--bg-3)', borderRadius: 999, overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 999, width: `${(count / totalClips) * 100}%`, background: clipColors[type] || '#888' }} />
                          </div>
                        </div>
                      ));
                    })() : <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>No clip data yet.</p>}
                  </div>
                </div>

                {/* Top Tools Bar */}
                <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1.5rem' }}>🔥 Most Used Tools</h3>
                  {tools.slice(0, 6).map(t => (
                    <div key={t.toolName} style={{ marginBottom: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.85rem' }}>
                        <span style={{ textTransform: 'capitalize' }}>{t.toolName.replace(/-/g, ' ')}</span>
                        <span style={{ color: 'var(--text-3)' }}>{t.count} uses</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--bg-3)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 999, width: `${(t.count / maxToolCount) * 100}%`, background: 'linear-gradient(90deg,#00d4ff,#10b981)', transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  ))}
                  {tools.length === 0 && <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>No tool usage yet.</p>}
                </div>
              </div>
            )}

            {/* ── USERS ── */}
            {activeTab === 'users' && (
              <div>
                <input type="text" placeholder="Search by username or email…" value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ padding: '10px 16px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-1)', fontSize: '0.9rem', width: '100%', maxWidth: 400, outline: 'none', fontFamily: 'inherit', marginBottom: '1rem' }}
                />
                <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-3)', textAlign: 'left' }}>
                          {['Username', 'Email', 'Verified', 'Clips', 'Rooms', 'Joined'].map(h => (
                            <th key={h} style={{ padding: '12px 16px', color: 'var(--text-3)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u, i) => (
                          <tr key={u.id} style={{ borderTop: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'oklch(0.15 0.02 260 / 0.3)' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 500 }}>@{u.username}</td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{u.email}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, background: u.emailVerified ? 'oklch(0.65 0.18 150/0.2)' : 'oklch(0.72 0.18 65/0.2)', color: u.emailVerified ? '#10b981' : '#f59e0b' }}>
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
                    {filteredUsers.length === 0 && <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-3)' }}>No users found.</div>}
                  </div>
                </div>
                <p style={{ color: 'var(--text-3)', fontSize: '0.8rem', marginTop: '0.5rem' }}>Showing {filteredUsers.length} of {users.length} users</p>
              </div>
            )}

            {/* ── TOOLS ── */}
            {activeTab === 'tools' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1.5rem' }}>🥧 Tool Usage Pie Chart</h3>
                  <PieChart data={top6Tools} total={totalToolUses} />
                </div>
                <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1.5rem' }}>📊 All Tool Usage Rankings</h3>
                  {tools.length === 0 && <p style={{ color: 'var(--text-3)' }}>No tool usage data yet.</p>}
                  {tools.map((t, i) => (
                    <div key={t.toolName} style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ width: 28, textAlign: 'right', color: 'var(--text-3)', fontSize: '0.85rem', fontWeight: 600, flexShrink: 0 }}>#{i + 1}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: '0.875rem' }}>
                          <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{t.toolName.replace(/-/g, ' ')}</span>
                          <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{t.count.toLocaleString()}</span>
                        </div>
                        <div style={{ height: 8, background: 'var(--bg-3)', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 999, width: `${(t.count / maxToolCount) * 100}%`, background: `linear-gradient(90deg, hsl(${(i * 40) % 360},80%,55%), hsl(${(i * 40 + 60) % 360},80%,55%))` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── ROOMS ── */}
            {activeTab === 'rooms' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Room stat mini-cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                  {[
                    { label: 'Total Rooms', value: (rooms.soloRooms || 0) + (rooms.sharedRooms || 0), icon: '🚪', color: '#a78bfa' },
                    { label: 'Personal (Solo)', value: rooms.soloRooms || 0, icon: '👤', color: '#00d4ff' },
                    { label: 'Shared Rooms', value: rooms.sharedRooms || 0, icon: '👥', color: '#10b981' },
                  ].map(c => (
                    <div key={c.label} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <span style={{ fontSize: '1.6rem' }}>{c.icon}</span>
                      <span style={{ fontSize: '1.75rem', fontWeight: 700, color: c.color }}>{c.value}</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>{c.label}</span>
                    </div>
                  ))}
                </div>

                {/* Top Rooms by Clips */}
                <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1.5rem' }}>🏆 Most Active Rooms</h3>
                  {(rooms.topRooms || []).length === 0 && <p style={{ color: 'var(--text-3)' }}>No room data yet.</p>}
                  {(rooms.topRooms || []).map((r, i) => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ width: 24, color: 'var(--text-3)', fontWeight: 700, fontSize: '0.85rem' }}>#{i + 1}</span>
                      <code style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.08em' }}>{r.code}</code>
                      <span style={{ flex: 1, color: 'var(--text-3)', fontSize: '0.8rem' }}>by @{r.owner?.username || 'unknown'}</span>
                      <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.875rem' }}>{r._count.clips} clips</span>
                      <span style={{ color: 'var(--text-3)', fontSize: '0.78rem' }}>{new Date(r.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>
                  ))}
                </div>

                {/* All Rooms Table */}
                <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <h3>📋 All Rooms (last 50)</h3>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-3)', textAlign: 'left' }}>
                          {['Code', 'Owner', 'Type', 'Clips', 'Created'].map(h => (
                            <th key={h} style={{ padding: '12px 16px', color: 'var(--text-3)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(rooms.rooms || []).map((r, i) => (
                          <tr key={r.id} style={{ borderTop: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'oklch(0.15 0.02 260 / 0.3)' }}>
                            <td style={{ padding: '10px 16px' }}><code style={{ color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.08em' }}>{r.code}</code></td>
                            <td style={{ padding: '10px 16px', color: 'var(--text-2)' }}>@{r.owner?.username}</td>
                            <td style={{ padding: '10px 16px' }}>
                              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 999, background: r.code.startsWith('SOLO_') ? 'oklch(0.65 0.20 250/0.2)' : 'oklch(0.70 0.18 160/0.2)', color: r.code.startsWith('SOLO_') ? '#00d4ff' : '#10b981' }}>
                                {r.code.startsWith('SOLO_') ? 'Personal' : 'Shared'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 16px', color: 'var(--text-2)' }}>{r._count.clips}</td>
                            <td style={{ padding: '10px 16px', color: 'var(--text-3)', fontSize: '0.8rem' }}>{new Date(r.createdAt).toLocaleDateString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── ACTIVITY ── */}
            {activeTab === 'activity' && (
              <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>⚡ Recent Platform Activity</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {activity.map(clip => (
                    <div key={clip.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px 16px', background: 'var(--bg-3)', borderRadius: 10, border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{typeIcon[clip.type] || '📋'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ color: '#00d4ff', fontSize: '0.85rem', fontWeight: 600 }}>@{clip.username}</span>
                          <span style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>in</span>
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
                  {activity.length === 0 && <p style={{ color: 'var(--text-3)' }}>No activity yet.</p>}
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
