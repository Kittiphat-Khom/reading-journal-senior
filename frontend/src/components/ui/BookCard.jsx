import { formatDate } from '../../helpers/formatDate';

export default function BookCard({ book, onClick, onDelete, onShare }) {
  const image = book.book_image || book.image || 'https://placehold.co/150x220?text=No+Image';
  const rawGenre = book.genre && book.genre !== 'unknown-genre' ? book.genre : '';
  const genres = rawGenre
    ? rawGenre.split(/[/,|]/).map(g => g.trim()).filter(Boolean)
    : ['Book'];
  const displayGenres = genres.slice(0, 2);
  const hasMore = genres.length > 2;

  return (
    <div className="book-item" onClick={onClick}>
      <div className="book-cover-wrapper">
        <img
          src={image}
          alt={book.title}
          onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/150x220?text=Error'; }}
        />
        {book.enddate && (
          <div className="finished-badge" title="Finished">
            <i className="fa-solid fa-circle-check"></i>
          </div>
        )}
        <div className="action-overlay">
          {onShare && (
            <button
              className="share-btn"
              onClick={(e) => { e.stopPropagation(); onShare(); }}
              title="Share Review"
            >
              <i className="fa-solid fa-share-nodes"></i>
            </button>
          )}
          <button
            className="delete-btn"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <i className="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
      <div className="book-info">
        <h3>{book.title}</h3>
        <p>{book.author || 'Unknown Author'}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {displayGenres.map((g, i) => <span key={i} className="genre-badge">{g}</span>)}
            {hasMore && <span className="genre-badge" style={{ opacity: 0.6 }}>+{genres.length - 2} more</span>}
          </div>
          <div className="book-date">
            <i className="fa-regular fa-clock"></i> Last edited: {formatDate(book.updated_at || book.created_at)}
          </div>
        </div>
      </div>
    </div>
  );
}
