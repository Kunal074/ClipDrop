'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthProvider } from '@/components/AuthProvider';
import { ToastProvider, ToastContainer, useToast } from '@/components/Toast';
import LoginCharacter from '@/components/LoginCharacter';

function ForgotPasswordContent() {
  const router = useRouter();
  const toast = useToast();

  const [step, setStep] = useState('email'); // 'email' | 'otp' | 'success'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputs = useRef([]);

  // ── Step 1: Send OTP ────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email) { toast.error('Please enter your email'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('OTP sent! Check your email 📬');
      setStep('otp');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: OTP input helpers ──────────────────────────────
  const handleOtpChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) { setOtp(text.split('')); inputs.current[5]?.focus(); }
  };

  // ── Step 2: Reset password ─────────────────────────────────
  const handleReset = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) { toast.error('Enter all 6 OTP digits'); return; }
    if (!newPassword || newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase(), otp: code, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Password reset successful!');
      setStep('success');
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

            {/* ── Step: Email ── */}
            {step === 'email' && (
              <>
                <h1 className="auth-title">Forgot Password</h1>
                <p className="auth-subtitle">Enter your email to receive a reset code</p>

                <form className="auth-form" onSubmit={handleSendOtp} noValidate>
                  <div className="form-group">
                    <label className="form-label" htmlFor="fp-email">Email Address</label>
                    <div className="input-wrap">
                      <span className="input-icon">✉</span>
                      <input
                        id="fp-email"
                        type="email"
                        className="form-input has-icon"
                        placeholder="you@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        autoComplete="email"
                        autoFocus
                      />
                    </div>
                  </div>
                  <button type="submit" id="btn-send-reset-otp" className="btn btn-primary btn-full" disabled={loading}>
                    {loading ? <><span className="spinner" /> Sending...</> : 'Send Reset Code'}
                  </button>
                </form>

                <p className="auth-footer">
                  Remember your password?{' '}
                  <Link href="/login" id="link-back-login">Sign in</Link>
                </p>
              </>
            )}

            {/* ── Step: OTP + New Password ── */}
            {step === 'otp' && (
              <>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📬</div>
                  <h1 className="auth-title" style={{ marginBottom: '0.25rem' }}>Check your email</h1>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-3)', margin: 0 }}>
                    We sent a code to <strong style={{ color: 'var(--accent)' }}>{email}</strong>
                  </p>
                </div>

                <form className="auth-form" onSubmit={handleReset} noValidate>
                  {/* OTP boxes */}
                  <div className="form-group">
                    <label className="form-label">Verification Code</label>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '0.5rem' }}>
                      {otp.map((digit, i) => (
                        <input
                          key={i}
                          ref={el => inputs.current[i] = el}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={e => handleOtpChange(i, e.target.value)}
                          onKeyDown={e => handleOtpKeyDown(i, e)}
                          onPaste={handleOtpPaste}
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
                  </div>

                  {/* New Password */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="new-password">New Password</label>
                    <div className="input-wrap">
                      <span className="input-icon">🔒</span>
                      <input
                        id="new-password"
                        type={showPassword ? 'text' : 'password'}
                        className="form-input has-icon has-icon-right"
                        placeholder="Min. 6 characters"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                      <button type="button" className="input-icon-right" onClick={() => setShowPassword(p => !p)} tabIndex={-1}>
                        {showPassword ? '🙈' : '👁'}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="confirm-password">Confirm New Password</label>
                    <div className="input-wrap">
                      <span className="input-icon">🔒</span>
                      <input
                        id="confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        className="form-input has-icon"
                        placeholder="Repeat password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <button type="submit" id="btn-reset-password" className="btn btn-primary btn-full" disabled={loading}>
                    {loading ? <><span className="spinner" /> Resetting...</> : 'Reset Password'}
                  </button>
                </form>

                <p className="auth-footer" style={{ marginTop: '1rem' }}>
                  <button onClick={() => setStep('email')} className="btn btn-ghost btn-sm" style={{ fontSize: '0.85rem' }}>
                    ← Change email
                  </button>
                </p>
              </>
            )}

            {/* ── Step: Success ── */}
            {step === 'success' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                <h1 className="auth-title">Password Reset!</h1>
                <p className="auth-subtitle">Your password has been updated successfully.</p>
                <Link href="/login" className="btn btn-primary btn-full" id="btn-go-login" style={{ display: 'block', marginTop: '1.5rem', textDecoration: 'none', textAlign: 'center' }}>
                  Sign In Now →
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="auth-char-side">
          <LoginCharacter isPasswordFocused={false} />
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ForgotPasswordContent />
      </ToastProvider>
    </AuthProvider>
  );
}
