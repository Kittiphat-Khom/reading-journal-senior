export default function BookDetailModal({ book, onClose, onAddJournal, onFavorite, addingId }) {
  if (!book) return null;
  const cover = book.cover || book.image || book.book_image || 'https://placehold.co/140x210?text=No+Image';
  return (
    <div id="bookModal" className="modal" style={{ display: 'flex' }} onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 12, right: 14, width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', color: '#475569', zIndex: 10 }}
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
        <div className="modal-image-box">
          <img
            src={cover}
            alt={book.title}
            onError={(e) => { e.target.src = 'https://placehold.co/140x210?text=Error'; }}
          />
        </div>
        <h2>{book.title}</h2>
        <p className="author">{book.author || 'Unknown Author'}</p>
        {book.genre && (
          <span className="genre-badge" style={{ display: 'inline-block', marginBottom: 8 }}>{book.genre}</span>
        )}
        <h3>Description</h3>
        <p className="description">{book.description || 'No description available.'}</p>
        <div className="button-row">
          <button
            className="add-library-btn"
            onClick={() => onAddJournal(book)}
            disabled={addingId === book.id}
          >
            <i className="fa-solid fa-plus"></i>
            {addingId === book.id ? ' Adding...' : ' Add to Journal'}
          </button>
          <button className="fav-icon-btn" onClick={() => onFavorite(book)}>
            <i className="fa-solid fa-heart"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
