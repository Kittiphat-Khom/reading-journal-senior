import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { resetPassword } from '../api/auth';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await resetPassword(token, form.password);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="header-fixed">
        <div className="book-icon"></div>
        <div className="title-text">Welcome to Reading Journal</div>
      </div>
      <div className="form-container">
        <div className="form-title">Reset Password</div>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>New Password</label>
            <input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required />
          </div>
          <div className="input-group">
            <label>Confirm Password</label>
            <input type="password" value={form.confirm} onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))} required />
          </div>
          {error && <div className="error-message" style={{ display: 'block' }}>⚠️ {error}</div>}
          <div className="button-group">
            <button type="submit" className="button primary" disabled={loading}>
              {loading ? 'Saving...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
