import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { forgotPassword, resetPassword } from '../api/auth';
import '../styles/auth.css';

function LeftPanel() {
  return (
    <div className="auth-left">
      <div className="auth-lead">
        <div className="eyebrow"><span className="dot"></span>Account recovery</div>
        <h2>Reset your <em>password</em>.</h2>
        <p>Enter your email and we'll send a one-time code to get you back in.</p>
      </div>
      <div className="auth-features">
        <div className="auth-feature">
          <div className="ic"><i className="fa-solid fa-envelope"></i></div>
          <div className="txt">
            <b>Check your inbox</b>
            <span>A 6-digit code will arrive within seconds.</span>
          </div>
        </div>
        <div className="auth-feature">
          <div className="ic"><i className="fa-solid fa-clock"></i></div>
          <div className="txt">
            <b>Code expires in 10 min</b>
            <span>Request a new one if it runs out.</span>
          </div>
        </div>
        <div className="auth-feature">
          <div className="ic"><i className="fa-solid fa-lock"></i></div>
          <div className="txt">
            <b>Secure reset</b>
            <span>Your new password is hashed and stored safely.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef([]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await forgotPassword(email);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (i, val) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    setError('');
    if (digit && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = [...otp];
    text.split('').forEach((d, i) => { next[i] = d; });
    setOtp(next);
    otpRefs.current[Math.min(text.length, 5)]?.focus();
  };

  const handleReset = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) { setError('Please enter the full 6-digit OTP.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setError('');
    try {
      await resetPassword(email, code, password);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. Check your OTP and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-stage">
      <div className="auth-topbar">
        <div className="auth-brand">
          <div className="mark">★</div>
          <span className="name">Reading Journal</span>
        </div>
        <button className="auth-back" onClick={() => navigate('/login')}>← Back to Login</button>
      </div>
      <div className="auth-frame">
        <LeftPanel />
        <div className="auth-right">
          {step === 1 ? (
            <>
              <div className="auth-head">
                <h1>Forgot <em>password</em></h1>
                <p>Enter your email to receive a one-time code.</p>
              </div>
              <form className="auth-form" onSubmit={handleSendOtp} noValidate>
                <div className={`auth-field${error ? ' has-error' : ''}`}>
                  <label>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                  <span className="auth-err">{error}</span>
                </div>
                <div className="auth-actions">
                  <button type="submit" className="auth-btn" disabled={loading}>
                    {loading ? <><i className="fa-solid fa-spinner fa-spin"></i> Sending…</> : 'Send OTP'}
                  </button>
                </div>
              </form>
              <div className="auth-switch">
                Remember your password?{' '}
                <button type="button" onClick={() => navigate('/login')}>Log in</button>
              </div>
            </>
          ) : (
            <>
              <div className="auth-head">
                <h1>Enter <em>OTP</em></h1>
                <p>Code sent to <strong>{email}</strong> — expires in 10 min.</p>
              </div>
              <form className="auth-form" onSubmit={handleReset} noValidate>
                <div className="auth-field">
                  <label>One-Time Password</label>
                  <div className="auth-otp-wrap" onPaste={handleOtpPaste}>
                    {otp.map((d, i) => (
                      <input
                        key={i}
                        ref={el => otpRefs.current[i] = el}
                        className="auth-otp-box"
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        onChange={e => handleOtpChange(i, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(i, e)}
                        autoFocus={i === 0}
                      />
                    ))}
                  </div>
                </div>

                <div className={`auth-field${error && error.includes('assword') ? ' has-error' : ''}`}>
                  <label>New Password</label>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder="At least 6 characters"
                    required
                  />
                  <button type="button" className="show-btn" onClick={() => setShowPass(p => !p)}>
                    {showPass ? 'Hide' : 'Show'}
                  </button>
                </div>

                <div className={`auth-field${error && error.includes('match') ? ' has-error' : ''}`}>
                  <label>Confirm Password</label>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => { setConfirm(e.target.value); setError(''); }}
                    placeholder="Repeat your password"
                    required
                  />
                  <button type="button" className="show-btn" onClick={() => setShowConfirm(p => !p)}>
                    {showConfirm ? 'Hide' : 'Show'}
                  </button>
                </div>

                {error && (
                  <p style={{ fontSize: 13, color: 'var(--danger)', margin: '-4px 0 0' }}>⚠️ {error}</p>
                )}

                <div className="auth-actions">
                  <button type="submit" className="auth-btn" disabled={loading}>
                    {loading ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving…</> : 'Reset Password'}
                  </button>
                </div>
              </form>
              <div className="auth-switch">
                Wrong email?{' '}
                <button type="button" onClick={() => { setStep(1); setOtp(['','','','','','']); setError(''); }}>
                  Go back
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
