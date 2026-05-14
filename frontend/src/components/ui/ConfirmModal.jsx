export default function ConfirmModal({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="add-modal-overlay" style={{ display: 'flex', zIndex: 9999 }}>
      <div className="confirm-box">
        <div className="confirm-icon"><i className="fa-solid fa-circle-exclamation"></i></div>
        <h3>{title || 'Are you sure?'}</h3>
        {message && <p dangerouslySetInnerHTML={{ __html: message }} />}
        <div className="confirm-actions">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}
