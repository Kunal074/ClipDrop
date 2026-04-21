'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { useTheme } from './ThemeProvider';

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <nav className="navbar">
      <Link href="/" className="navbar-logo" style={{ display: 'flex', alignItems: 'center' }}>
        <img src="/ClipDrop%20logo.svg" alt="ClipDrop Logo" style={{ height: '40px', width: 'auto', objectFit: 'contain' }} />
      </Link>

      <div className="navbar-actions">
        {/* Theme toggle — always visible */}
        <button
          onClick={toggle}
          id="btn-theme-toggle"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 8,
            width: 34, height: 34,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem',
            transition: 'all 0.2s',
            color: 'var(--text-2)',
            cursor: 'pointer',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {!loading && (
          <>
            {user ? (
              <>
                <Link href="/dashboard" className="navbar-link" id="nav-dashboard">
                  Dashboard
                </Link>
                <Link href="/convert" className="navbar-link" id="nav-convert">
                  ⚡ Convert
                </Link>
                <span className="navbar-user">@{user.username}</span>
                <button onClick={handleLogout} className="btn btn-ghost btn-sm" id="nav-logout">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="navbar-link" id="nav-login">Login</Link>
                <Link href="/register" className="btn btn-primary btn-sm" id="nav-register">
                  Get Started
                </Link>
              </>
            )}
          </>
        )}
      </div>
    </nav>
  );
}
