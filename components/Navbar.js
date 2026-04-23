'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

const ADMIN_EMAILS = ['clipdrop79@gmail.com', 'kunalsahu232777@gmail.com'];

export default function Navbar() {
  const { user, loading, logout } = useAuth();
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
        <Link href="/tools" className="navbar-link" id="nav-tools">
          🛠 Tools
        </Link>
        {!loading && (
          <>
            {user ? (
              <>
                <Link href="/dashboard" className="navbar-link" id="nav-dashboard">
                  Dashboard
                </Link>
                {ADMIN_EMAILS.includes(user.email?.toLowerCase()) && (
                  <Link href="/admin" className="navbar-link" id="nav-admin" style={{ color: '#00d4ff', fontWeight: 600 }}>
                    🛡️ Admin
                  </Link>
                )}
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
