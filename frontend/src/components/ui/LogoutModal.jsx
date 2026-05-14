import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function LogoutModal({ open, onClose }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    setLoading(true);
    setTimeout(() => logout(navigate), 800);
  };

  if (!open) return null;
  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon-wrapper">
          <div className="modal-icon"><i className="fa-solid fa-power-off"></i></div>
        </div>
        <div className="modal-text-wrapper">
          <h3>Sign Out?</h3>
          <p>Are you sure you want to end your session?</p>
        </div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-danger" onClick={handleLogout} disabled={loading}>
            {loading ? <><i className="fa-solid fa-spinner fa-spin"></i> Signing out...</> : 'Yes, Sign Out'}
          </button>
        </div>
      </div>
    </div>
  );
}
