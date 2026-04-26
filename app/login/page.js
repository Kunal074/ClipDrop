'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import { ToastProvider, ToastContainer, useToast } from '@/components/Toast';
import LoginCharacter from '@/components/LoginCharacter';

// ─── Device OTP Step (Admin only) ──────────────────────────────
function DeviceOtpStep({ email, onSuccess }) {
  const { login } = useAuth();
  const toast = useToast();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputs = useRef([]);

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) { setOtp(text.split('')); inputs.current[5]?.focus(); }
  };

  const verify = async () => {
    const code = otp.join('');
    if (code.length < 6) { toast.error('Please enter all 6 digits'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-device-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: code }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      login(data.token, data.user);
      toast.success('Device verified! Welcome back 🔐');
      onSuccess();
    } catch (err) {
      toast.error(err.message);
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔐</div>
      <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.4rem', color: 'var(--text-1)' }}>New Device Detected</h2>
      <p style={{ margin: '0 0 1.5rem', fontSize: '0.875rem', color: 'var(--text-3)' }}>
        A verification code was sent to<br />
        <strong style={{ color: 'var(--accent)' }}>{email}</strong>
      </p>

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
        id="btn-verify-device-otp"
      >
        {loading ? <><span className="spinner" /> Verifying...</> : 'Verify Device'}
      </button>
      <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-3)' }}>
        This device will be trusted for 1 year.
      </p>
    </div>
  );
}

// ─── Main Login Content ──────────────────────────────────────
function LoginContent() {
  const { login } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState('login'); // 'login' | 'device-otp'
  const [pendingEmail, setPendingEmail] = useState('');

  const validate = () => {
    const e = {};
    if (!identifier) e.identifier = 'Email or username is required';
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
        body: JSON.stringify({ email: identifier, password }),
        credentials: 'include',
      });
      const data = await res.json();

      if (data.requiresDeviceVerification) {
        setPendingEmail(data.email);
        setStep('device-otp');
        return;
      }

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
        <div className="auth-form-side">
          <div className="auth-card">
            <div className="auth-logo">
              <span>📋</span>
              <span>ClipDrop</span>
            </div>

            {step === 'device-otp' ? (
              <>
                <DeviceOtpStep email={pendingEmail} onSuccess={() => router.push('/dashboard')} />
                <p className="auth-footer" style={{ marginTop: '1rem' }}>
                  <button onClick={() => setStep('login')} className="btn btn-ghost btn-sm" style={{ fontSize: '0.85rem' }}>
                    ← Back to Login
                  </button>
                </p>
              </>
            ) : (
              <>
                <h1 className="auth-title">Welcome back</h1>
                <p className="auth-subtitle">Sign in to your account</p>

                <form className="auth-form" onSubmit={handleSubmit} id="form-login" noValidate>
                  {/* Email */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="identifier">Email or Username</label>
                    <div className="input-wrap">
                      <span className="input-icon">👤</span>
                      <input
                        id="identifier"
                        type="text"
                        className={`form-input has-icon ${errors.identifier ? 'input-error' : ''}`}
                        placeholder="you@example.com or @username"
                        value={identifier}
                        onChange={e => setIdentifier(e.target.value)}
                        onFocus={() => setIsPasswordFocused(false)}
                        autoComplete="username"
                      />
                    </div>
                    {errors.identifier && <span className="form-error">{errors.identifier}</span>}
                  </div>

                  {/* Password */}
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="form-label" htmlFor="password">Password</label>
                      <Link href="/forgot-password" id="link-forgot-password" style={{ fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none' }}>
                        Forgot password?
                      </Link>
                    </div>
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
              </>
            )}
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
