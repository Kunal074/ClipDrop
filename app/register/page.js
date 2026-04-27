'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import { ToastProvider, ToastContainer, useToast } from '@/components/Toast';
import LoginCharacter from '@/components/LoginCharacter';

// ─── Step 1: Registration Form ────────────────────────────────
function RegisterForm({ onOtpRequired }) {
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
      if (data.requiresVerification) {
        toast.success('OTP sent! Check your email 📬');
        onOtpRequired(form.email);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit} id="form-register" noValidate>
      {/* Username */}
      <div className="form-group">
        <label className="form-label" htmlFor="username">Username</label>
        <div className="input-wrap">
          <span className="input-icon">👤</span>
          <input id="username" type="text"
            className={`form-input has-icon ${errors.username ? 'input-error' : ''}`}
            placeholder="cooluser123" value={form.username} onChange={set('username')}
            onFocus={() => setIsPasswordFocused(false)} autoComplete="username"
          />
        </div>
        {errors.username && <span className="form-error">{errors.username}</span>}
      </div>

      {/* Email */}
      <div className="form-group">
        <label className="form-label" htmlFor="email">Email</label>
        <div className="input-wrap">
          <span className="input-icon">✉</span>
          <input id="email" type="email"
            className={`form-input has-icon ${errors.email ? 'input-error' : ''}`}
            placeholder="you@example.com" value={form.email} onChange={set('email')}
            onFocus={() => setIsPasswordFocused(false)} autoComplete="email"
          />
        </div>
        {errors.email && <span className="form-error">{errors.email}</span>}
      </div>

      {/* Password */}
      <div className="form-group">
        <label className="form-label" htmlFor="password">Password</label>
        <div className="input-wrap">
          <span className="input-icon">🔒</span>
          <input id="password" type={showPassword ? 'text' : 'password'}
            className={`form-input has-icon has-icon-right ${errors.password ? 'input-error' : ''}`}
            placeholder="Min. 6 characters" value={form.password} onChange={set('password')}
            onFocus={() => setIsPasswordFocused(true)} onBlur={() => setIsPasswordFocused(false)}
            autoComplete="new-password"
          />
          <button type="button" className="input-icon-right"
            onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
            {showPassword ? '🙈' : '👁'}
          </button>
        </div>
        {errors.password && <span className="form-error">{errors.password}</span>}
      </div>

      {/* Confirm */}
      <div className="form-group">
        <label className="form-label" htmlFor="confirm">Confirm Password</label>
        <div className="input-wrap">
          <span className="input-icon">🔒</span>
          <input id="confirm" type={showPassword ? 'text' : 'password'}
            className={`form-input has-icon ${errors.confirm ? 'input-error' : ''}`}
            placeholder="Repeat password" value={form.confirm} onChange={set('confirm')}
            onFocus={() => setIsPasswordFocused(true)} onBlur={() => setIsPasswordFocused(false)}
            autoComplete="new-password"
          />
        </div>
        {errors.confirm && <span className="form-error">{errors.confirm}</span>}
      </div>

      <button type="submit" id="btn-register-submit" className="btn btn-primary btn-full" disabled={loading}>
        {loading ? <><span className="spinner" /> Sending OTP...</> : 'Create Account'}
      </button>
    </form>
  );
}

// ─── Step 2: OTP Verification ─────────────────────────────────
function OtpVerify({ email, onSuccess }) {
  const { login } = useAuth();
  const toast = useToast();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputs = useRef([]);

  // Countdown for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      setOtp(text.split(''));
      inputs.current[5]?.focus();
    }
  };

  const verify = async () => {
    const code = otp.join('');
    if (code.length < 6) { toast.error('Please enter all 6 digits'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      login(data.token, data.user);
      toast.success('Email verified! Welcome to ClipDrop 🎉');
      onSuccess();
    } catch (err) {
      toast.error(err.message);
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('New OTP sent! Check your email 📬');
      setCountdown(60);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📬</div>
      <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.4rem', color: 'var(--text-1)' }}>Check your email</h2>
      <p style={{ margin: '0 0 1.5rem', fontSize: '0.875rem', color: 'var(--text-3)' }}>
        We sent a 6-digit code to<br />
        <strong style={{ color: 'var(--accent)' }}>{email}</strong>
      </p>

      {/* OTP input boxes */}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={el => inputs.current[i] = el}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            onPaste={handlePaste}
            autoFocus={i === 0}
            style={{
              width: 44, height: 52, textAlign: 'center',
              fontSize: '1.4rem', fontWeight: 700,
              background: 'var(--glass)', border: `2px solid ${digit ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 10, color: 'var(--text-1)', outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
        ))}
      </div>

      <button
        className="btn btn-primary btn-full"
        onClick={verify}
        disabled={loading || otp.join('').length < 6}
        id="btn-verify-otp"
      >
        {loading ? <><span className="spinner" /> Verifying...</> : 'Verify Email'}
      </button>

      <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-3)' }}>
        Didn't receive it?{' '}
        {countdown > 0 ? (
          <span>Resend in {countdown}s</span>
        ) : (
          <button
            onClick={resend}
            disabled={resending}
            className="btn btn-ghost btn-sm"
            style={{ padding: '2px 8px', fontSize: '0.85rem' }}
            id="btn-resend-otp"
          >
            {resending ? 'Sending...' : 'Resend OTP'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Register Page ───────────────────────────────────────
function RegisterContent() {
  const router = useRouter();
  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [pendingEmail, setPendingEmail] = useState('');
  const [isPasswordFocused] = useState(false);

  const handleOtpRequired = (email) => {
    setPendingEmail(email);
    setStep('otp');
  };

  const handleVerified = () => {
    router.push('/dashboard');
  };

  return (
    <div className="auth-page">
      {/* Page-level gradient heading */}
      <h1 className="auth-heading">
        Don't lose your clips!<br />
        <span>Sign up to save them to your Personal Workspace.</span>
      </h1>

      <div className="auth-wrap">
        <div className="auth-form-side">
          <div className="auth-card">
            {step === 'form' ? (
              <>
                <h2 className="auth-title">Create account</h2>
                <p className="auth-subtitle">Start dropping clips across your devices</p>
                <RegisterForm onOtpRequired={handleOtpRequired} />
                <p className="auth-footer">
                  Already have an account?{' '}
                  <Link href="/login" id="link-to-login">Sign in</Link>
                </p>
              </>
            ) : (
              <>
                <h1 className="auth-title">Verify your email</h1>
                <p className="auth-subtitle">Almost there — one quick step!</p>
                <OtpVerify email={pendingEmail} onSuccess={handleVerified} />
                <p className="auth-footer" style={{ marginTop: '1rem' }}>
                  <button
                    onClick={() => setStep('form')}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.85rem' }}
                  >
                    ← Change email
                  </button>
                </p>
              </>
            )}
          </div>
        </div>

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
