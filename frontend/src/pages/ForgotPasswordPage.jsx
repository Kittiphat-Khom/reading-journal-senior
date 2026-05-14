import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="form-container" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ color: '#4CAF50', fontSize: 60, marginBottom: 20 }}>
          <i className="fa-regular fa-envelope"></i>
        </div>
        <h2>Check your email</h2>
        <p style={{ color: '#666' }}>Password reset link sent to <strong>{email}</strong></p>
        <Link to="/login" className="button primary">Back to Login</Link>
      </div>
    );
  }

  return (
    <>
      <div className="header-fixed">
        <div className="book-icon"></div>
        <div className="title-text">Welcome to Reading Journal</div>
      </div>
      <div className="form-container">
        <div className="form-title">Forgot Password</div>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} required />
          </div>
          {error && <div className="error-message" style={{ display: 'block' }}>⚠️ {error}</div>}
          <div className="button-group">
            <Link to="/login" className="button secondary">Back</Link>
            <button type="submit" className="button primary" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
