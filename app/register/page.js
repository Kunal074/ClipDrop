'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import { ToastProvider, ToastContainer, useToast } from '@/components/Toast';
import LoginCharacter from '@/components/LoginCharacter';

function RegisterContent() {
  const { login } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.username || form.username.length < 2) e.username = 'Username must be at least 2 characters';
    if (!form.email) e.email = 'Email is required';
    if (!form.password || form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      login(data.token, data.user);
      toast.success('Account created! Welcome to ClipDrop 🎉');
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

            <h1 className="auth-title">Create account</h1>
            <p className="auth-subtitle">Start dropping clips across your devices</p>

            <form className="auth-form" onSubmit={handleSubmit} id="form-register" noValidate>
              {/* Username */}
              <div className="form-group">
                <label className="form-label" htmlFor="username">Username</label>
                <div className="input-wrap">
                  <span className="input-icon">👤</span>
                  <input
                    id="username"
                    type="text"
                    className={`form-input has-icon ${errors.username ? 'input-error' : ''}`}
                    placeholder="cooluser123"
                    value={form.username}
                    onChange={set('username')}
                    onFocus={() => setIsPasswordFocused(false)}
                    autoComplete="username"
                  />
                </div>
                {errors.username && <span className="form-error">{errors.username}</span>}
              </div>

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
                    value={form.email}
                    onChange={set('email')}
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
                    placeholder="Min. 6 characters"
                    value={form.password}
                    onChange={set('password')}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    autoComplete="new-password"
                  />
                  <button type="button" className="input-icon-right"
                    onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
                {errors.password && <span className="form-error">{errors.password}</span>}
              </div>

              {/* Confirm Password */}
              <div className="form-group">
                <label className="form-label" htmlFor="confirm">Confirm Password</label>
                <div className="input-wrap">
                  <span className="input-icon">🔒</span>
                  <input
                    id="confirm"
                    type={showPassword ? 'text' : 'password'}
                    className={`form-input has-icon ${errors.confirm ? 'input-error' : ''}`}
                    placeholder="Repeat password"
                    value={form.confirm}
                    onChange={set('confirm')}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    autoComplete="new-password"
                  />
                </div>
                {errors.confirm && <span className="form-error">{errors.confirm}</span>}
              </div>

              <button
                type="submit"
                id="btn-register-submit"
                className="btn btn-primary btn-full"
                disabled={loading}
              >
                {loading ? <><span className="spinner" /> Creating account...</> : 'Create Account'}
              </button>
            </form>

            <p className="auth-footer">
              Already have an account?{' '}
              <Link href="/login" id="link-to-login">Sign in</Link>
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

export default function RegisterPage() {
  return (
    <AuthProvider>
      <ToastProvider>
        <RegisterContent />
      </ToastProvider>
    </AuthProvider>
  );
}
