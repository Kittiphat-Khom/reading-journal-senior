import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import client from '../api/client';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    client.get(`/api/users/verify-email?token=${token}`)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="form-container" style={{ textAlign: 'center', padding: '40px 20px' }}>
      {status === 'loading' && <p>Verifying...</p>}
      {status === 'success' && (
        <>
          <div style={{ color: '#4CAF50', fontSize: 60, marginBottom: 20 }}>
            <i className="fa-solid fa-circle-check"></i>
          </div>
          <h2>Email Verified!</h2>
          <p>Your account is ready.</p>
          <Link to="/login" className="button primary">Go to Login</Link>
        </>
      )}
      {status === 'error' && (
        <>
          <div style={{ color: '#ef4444', fontSize: 60, marginBottom: 20 }}>
            <i className="fa-solid fa-circle-xmark"></i>
          </div>
          <h2>Verification Failed</h2>
          <p>Link is invalid or expired.</p>
          <Link to="/login" className="button secondary">Back to Login</Link>
        </>
      )}
    </div>
  );
}
