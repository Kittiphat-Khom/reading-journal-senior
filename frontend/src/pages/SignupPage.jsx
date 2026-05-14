import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import '../styles/auth.css';

function LeftPanel() {
  return (
    <div className="auth-left">
      <div className="auth-lead">
        <div className="eyebrow"><span className="dot"></span>Track every book</div>
        <h2>Your shelf, <em>quietly</em> kept.</h2>
        <p>Log what you read, save the lines that stay with you, and pick up where you left off.</p>
      </div>
      <div className="auth-features">
        <div className="auth-feature">
          <div className="ic"><i className="fa-solid fa-book-open"></i></div>
          <div className="txt">
            <b>Log what you read</b>
            <span>Add books, mark your progress, and finish a stack.</span>
          </div>
        </div>
        <div className="auth-feature">
          <div className="ic"><i className="fa-solid fa-star"></i></div>
          <div className="txt">
            <b>Rate and review</b>
            <span>Capture how a book felt — in a sentence or a page.</span>
          </div>
        </div>
        <div className="auth-feature">
          <div className="ic"><i className="fa-solid fa-quote-left"></i></div>
          <div className="txt">
            <b>Save the lines</b>
            <span>Highlight quotes you don't want to forget.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [errs, setErrs] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  const inputRefs = useRef([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errs[name]) setErrs(p => ({ ...p, [name]: null }));
  };

  const validate = () => {
    const v = {};
    if (!form.username) v.username = 'Please enter a username.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) v.email = 'Please enter a valid email.';
    if (form.password.length < 6) v.password = 'Password must be at least 6 characters.';
    return v;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) { setErrs(v); return; }
    setLoading(true);
    try {
      await client.post('/api/users/register', {
        username: form.username,
        email: form.email,
        password: form.password,
      });
      setOtpSent(true);
    } catch (err) {
      setErrs({ email: err.response?.data?.message || 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    setOtpError('');
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setOtp(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) { setOtpError('Please enter all 6 digits.'); return; }
    setOtpLoading(true);
    try {
      await client.post('/api/users/verify-otp', { email: form.email, code });
      setVerified(true);
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Invalid code. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const rightPanel = () => {
    if (verified) {
      return (
        <div className="auth-welcome">
          <div className="star-circle">★</div>
          <h2>You're all <em>set</em></h2>
          <p>Your account is ready. Start logging the books that matter to you.</p>
          <button className="auth-btn" onClick={() => navigate('/login')}>Go to Log In</button>
        </div>
      );
    }

    if (otpSent) {
      return (
        <>
          <div className="auth-head">
            <h1>Check your <em>email</em></h1>
            <p>We sent a 6-digit code to <strong>{form.email}</strong></p>
          </div>

          <form className="auth-form" onSubmit={handleVerify} noValidate>
            <div className="auth-otp-wrap" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => (inputRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  className="auth-otp-box"
                  autoFocus={i === 0}
                />
              ))}
            </div>

            {otpError && (
              <div className="auth-field has-error" style={{ marginTop: 4 }}>
                <span className="auth-err" style={{ opacity: 1, transform: 'none', minHeight: 14 }}>{otpError}</span>
              </div>
            )}

            <div className="auth-actions" style={{ marginTop: 8 }}>
              <button type="submit" className="auth-btn" disabled={otpLoading}>
                {otpLoading
                  ? <><i className="fa-solid fa-spinner fa-spin"></i> Verifying…</>
                  : 'Verify Email'}
              </button>
            </div>
          </form>

          <div className="auth-switch">
            Wrong email?{' '}
            <button type="button" onClick={() => { setOtpSent(false); setOtp(['','','','','','']); }}>Go back</button>
          </div>
        </>
      );
    }

    return (
      <>
        <div className="auth-head">
          <h1>Sign <em>up</em></h1>
          <p>Track every book you read.</p>
        </div>

        <div className="auth-seg">
          <button type="button" onClick={() => navigate('/login')}>Log in</button>
          <button type="button" className="active">Sign up</button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className={`auth-field${errs.username ? ' has-error' : ''}`}>
            <label>Username</label>
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="e.g. johndoe"
              autoComplete="username"
            />
            <span className="auth-err">{errs.username}</span>
          </div>

          <div className={`auth-field${errs.email ? ' has-error' : ''}`}>
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="e.g. john@email.com"
              autoComplete="email"
            />
            <span className="auth-err">{errs.email}</span>
          </div>

          <div className={`auth-field${errs.password ? ' has-error' : ''}`}>
            <label>
              Password
              <span className="hint">At least 6 characters</span>
            </label>
            <input
              type={showPass ? 'text' : 'password'}
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
            <button type="button" className="show-btn" onClick={() => setShowPass(p => !p)}>
              {showPass ? 'Hide' : 'Show'}
            </button>
            <span className="auth-err">{errs.password}</span>
          </div>

          <div className="auth-actions">
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading
                ? <><i className="fa-solid fa-spinner fa-spin"></i> Creating account…</>
                : 'Sign Up'}
            </button>
          </div>
        </form>

        <div className="auth-switch">
          Already have an account?{' '}
          <button type="button" onClick={() => navigate('/login')}>Log in</button>
        </div>
      </>
    );
  };

  return (
    <div className="auth-stage">
      <div className="auth-topbar">
        <div className="auth-brand">
          <div className="mark">★</div>
          <span className="name">Reading Journal</span>
        </div>
        <button className="auth-back" onClick={() => navigate('/')}>
          ← Back
        </button>
      </div>
      <div className="auth-frame">
        <LeftPanel />
        <div className="auth-right">
          {rightPanel()}
        </div>
      </div>
    </div>
  );
}
