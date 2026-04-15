'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import { ToastProvider, ToastContainer, useToast } from '@/components/Toast';
import LoginCharacter from '@/components/LoginCharacter';

function LoginContent() {
  const { login } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!email) e.email = 'Email is required';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      login(data.token, data.user);
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-wrap">
        {/* Form */}
        <div className="auth-form-side">
          <div className="auth-card">
            <div className="auth-logo">
              <span>📋</span>
              <span>ClipDrop</span>
            </div>

            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-subtitle">Sign in to your account</p>

            <form className="auth-form" onSubmit={handleSubmit} id="form-login" noValidate>
              {/* Email */}
              <div className="form-group">
                <label className="form-label" htmlFor="email">Email</label>
                <div className="input-wrap">
                  <span className="input-icon">✉</span>
                  <input
                    id="email"
                    type="email"
                    className={`form-input has-icon ${errors.email ? 'input-error' : ''}`}
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onFocus={() => setIsPasswordFocused(false)}
                    autoComplete="email"
                  />
                </div>
                {errors.email && <span className="form-error">{errors.email}</span>}
              </div>

              {/* Password */}
              <div className="form-group">
                <label className="form-label" htmlFor="password">Password</label>
                <div className="input-wrap">
                  <span className="input-icon">🔒</span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className={`form-input has-icon has-icon-right ${errors.password ? 'input-error' : ''}`}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="input-icon-right"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
                {errors.password && <span className="form-error">{errors.password}</span>}
              </div>

              <button
                type="submit"
                id="btn-login-submit"
                className="btn btn-primary btn-full"
                disabled={loading}
              >
                {loading ? <><span className="spinner" /> Signing in...</> : 'Sign In'}
              </button>
            </form>

            <p className="auth-footer">
              Don&apos;t have an account?{' '}
              <Link href="/register" id="link-to-register">Sign up free</Link>
            </p>
          </div>
        </div>

        {/* Ghost Character */}
        <div className="auth-char-side">
          <LoginCharacter isPasswordFocused={isPasswordFocused} />
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <ToastProvider>
        <LoginContent />
      </ToastProvider>
    </AuthProvider>
  );
}
