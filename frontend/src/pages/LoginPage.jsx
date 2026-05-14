import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [errs, setErrs] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errs[name]) setErrs(p => ({ ...p, [name]: null }));
  };

  const validate = () => {
    const v = {};
    if (!form.username) v.username = 'Please enter your username or email.';
    if (!form.password) v.password = 'Please enter your password.';
    return v;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) { setErrs(v); return; }
    setLoading(true);
    try {
      const res = await client.post('/api/users/login', form);
      const data = res.data;
      const role = (data.role || data.user?.role || '').toLowerCase();
      localStorage.setItem('role', role);
      const redirect = role === 'admin' ? '/admin'
        : data.has_preferences ? '/dashboard'
        : '/preferences/genres';
      login(data.token, data.user, navigate, redirect);
    } catch (err) {
      setErrs({ password: err.response?.data?.message || 'Invalid username or password.' });
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
        <button className="auth-back" onClick={() => navigate('/')}>
          ← Back
        </button>
      </div>
      <div className="auth-frame">
        <LeftPanel />
        <div className="auth-right">
          <div className="auth-head">
            <h1>Log <em>in</em></h1>
            <p>Welcome back to your reading journal.</p>
          </div>

          <div className="auth-seg">
            <button type="button" className="active">Log in</button>
            <button type="button" onClick={() => navigate('/signup')}>Sign up</button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className={`auth-field${errs.username ? ' has-error' : ''}`}>
              <label>Username or Email</label>
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="e.g. johndoe"
                autoComplete="username"
              />
              <span className="auth-err">{errs.username}</span>
            </div>

            <div className={`auth-field${errs.password ? ' has-error' : ''}`}>
              <label>Password</label>
              <input
                type={showPass ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Your password"
                autoComplete="current-password"
              />
              <button type="button" className="show-btn" onClick={() => setShowPass(p => !p)}>
                {showPass ? 'Hide' : 'Show'}
              </button>
              <span className="auth-err">{errs.password}</span>
            </div>

            <div className="auth-opts">
              <label className="auth-check">
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                Remember me
              </label>
              <a className="auth-forgot" href="/forgot-password">Forgot password?</a>
            </div>

            <div className="auth-actions">
              <button type="submit" className="auth-btn" disabled={loading}>
                {loading
                  ? <><i className="fa-solid fa-spinner fa-spin"></i> Signing in…</>
                  : 'Log In'}
              </button>
            </div>
          </form>

          <div className="auth-switch">
            Don't have an account?{' '}
            <button type="button" onClick={() => navigate('/signup')}>Sign up</button>
          </div>
        </div>
      </div>
    </div>
  );
}
