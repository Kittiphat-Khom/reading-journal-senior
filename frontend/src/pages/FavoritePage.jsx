import { useState, useEffect, useCallback } from 'react';
import SidebarPageLayout from '../components/layout/SidebarPageLayout';
import ConfirmModal from '../components/ui/ConfirmModal';
import { useToast } from '../context/ToastContext';
import { getFavorites, removeFavorite } from '../api/favorites';
import { addJournalById } from '../api/journals';
import '../styles/favorite-page.css';

export default function FavoritePage() {
  const { showToast } = useToast();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmItem, setConfirmItem] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [addingId, setAddingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFavorites();
      setFavorites(res.data || []);
    } catch {
      showToast('Error', 'Failed to load favorites', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!confirmItem) return;
    try {
      await removeFavorite(confirmItem.id);
      showToast('Removed', `"${confirmItem.title}" removed`, 'success');
      setConfirmItem(null);
      load();
    } catch {
      showToast('Error', 'Failed to remove', 'error');
    }
  };

  const handleAddToLibrary = async (book) => {
    setAddingId(book.id);
    try {
      await addJournalById({
        hardcover_id: book.hardcover_id,
        title: book.title,
        author: book.author,
        book_image: book.book_image || book.image,
        genre: book.genre,
      });
      showToast('Added', `"${book.title}" added to journals`, 'success');
      setSelectedBook(null);
    } catch (err) {
      showToast('Error', err.response?.data?.message || 'Failed to add', 'error');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <SidebarPageLayout
      title="Favorite List"
      icon="fa-heart"
      accentColor="#ec4899"
      headerRight={<span className="count-badge">{favorites.length} books</span>}
    >
      <main className="content">
        <div className="favorite-container">
          {loading ? (
            <p style={{ color: '#555', textAlign: 'center', padding: '40px 0' }}>⏳ Loading...</p>
          ) : favorites.length === 0 ? (
            <div className="empty-message" style={{ display: 'flex' }}>
              <i className="fa-solid fa-heart-crack"></i>
              <p>No favorites yet. Go search for books!</p>
            </div>
          ) : (
            <div className="favorite-grid">
              {favorites.map((book) => (
                <FavCard
                  key={book.id}
                  book={book}
                  onClick={() => setSelectedBook(book)}
                  onDelete={() => setConfirmItem(book)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Confirm delete modal */}
      <ConfirmModal
        open={!!confirmItem}
        title="Remove Favorite?"
        message={`Remove "${confirmItem?.title}" from favorites?<br/>This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmItem(null)}
      />

      {/* Book detail modal */}
      {selectedBook && (
        <div className="modal-overlay active" onClick={() => setSelectedBook(null)}>
          <div className="modal-box book-detail-box" onClick={(e) => e.stopPropagation()}>
            <span className="close-btn-modal" onClick={() => setSelectedBook(null)}>&times;</span>
            <div className="modal-img-container">
              <img
                id="modal-img"
                src={selectedBook.book_image || selectedBook.image || 'https://placehold.co/140x210?text=No+Image'}
                alt={selectedBook.title}
                onError={(e) => { e.target.src = 'https://placehold.co/140x210?text=Error'; }}
              />
            </div>
            <div className="modal-detail-content">
              <h2>{selectedBook.title}</h2>
              <p>{selectedBook.author || 'Unknown Author'}</p>
              {selectedBook.genre && <p style={{ color: '#64748b', fontSize: '0.9rem' }}>{selectedBook.genre}</p>}
              {selectedBook.description && (
                <>
                  <h4>Description</h4>
                  <p style={{ color: '#475569', fontSize: '0.88rem', lineHeight: 1.6 }}>{selectedBook.description}</p>
                </>
              )}
              <div className="modal-actions-centered">
                <button
                  className="btn-add-lib"
                  onClick={() => handleAddToLibrary(selectedBook)}
                  disabled={addingId === selectedBook.id}
                >
                  <i className="fa-solid fa-book-open"></i>
                  {addingId === selectedBook.id ? ' Adding...' : ' Add to Journal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </SidebarPageLayout>
  );
}

function FavCard({ book, onClick, onDelete }) {
  const cover = book.book_image || book.image || 'https://placehold.co/200x280?text=No+Image';
  return (
    <div className="fav-card" onClick={onClick}>
      <div className="fav-img-wrapper">
        <img
          src={cover}
          alt={book.title}
          onError={(e) => { e.target.src = 'https://placehold.co/200x280?text=Error'; }}
        />
        <div className="fav-overlay">
          <button
            className="remove-btn"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <i className="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
      <div className="fav-info">
        <div className="fav-title">{book.title}</div>
        <div className="fav-author">{book.author || 'Unknown Author'}</div>
        {book.genre && (() => {
          const genres = String(book.genre).replace(/[\[\]"]/g, '').split(/[\/,|]/).map(g => g.trim()).filter(Boolean);
          return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
              {genres.slice(0, 2).map((g, i) => (
                <span key={i} className="fav-genre">{g}</span>
              ))}
              {genres.length > 2 && (
                <span style={{ background: '#e0e7ff', color: '#4338ca', borderRadius: 20, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 600 }}>+{genres.length - 2} more</span>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
