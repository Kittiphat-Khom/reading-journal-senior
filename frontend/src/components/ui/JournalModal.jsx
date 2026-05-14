import JournalDetailPage from '../../pages/JournalDetailPage';

export default function JournalModal({ open, bookId, onClose, onSaved }) {
  if (!open) return null;
  return (
    <div className="add-modal-overlay show">
      <div className="add-modal">
        <button className="add-modal-close" onClick={onClose}>✕</button>
        <JournalDetailPage
          journalId={bookId}
          onClose={onClose}
          onSaved={onSaved}
        />
      </div>
    </div>
  );
}
