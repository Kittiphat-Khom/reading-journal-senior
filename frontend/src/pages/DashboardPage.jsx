import { useState, useEffect, useCallback } from 'react';
import SidebarPageLayout from '../components/layout/SidebarPageLayout';
import BookCard from '../components/ui/BookCard';
import Pagination from '../components/ui/Pagination';
import ConfirmModal from '../components/ui/ConfirmModal';
import JournalModal from '../components/ui/JournalModal';
import ShareReviewModal from '../components/ui/ShareReviewModal';
import { useToast } from '../context/ToastContext';
import { getJournals, deleteJournal } from '../api/journals';
import '../styles/dashboard-page.css';

const ITEMS_PER_PAGE = 10;

function parseSeconds(t) {
  if (!t) return 0;
  const parts = String(t).split(':').map(Number);
  return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
}

export default function DashboardPage() {
  const { showToast } = useToast();
  const [books, setBooks] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState(null);
  const [journalOpen, setJournalOpen] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [shareBook, setShareBook] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getJournals();
      setBooks(res.data);
    } catch {
      showToast('Error', 'Failed to load journals', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.ceil((books.length + 1) / ITEMS_PER_PAGE);
  const start = (page - 1) * ITEMS_PER_PAGE;
  const booksOnPage = books.slice(start, start + ITEMS_PER_PAGE);
  const showAddCard = booksOnPage.length < ITEMS_PER_PAGE;

  const openJournal = (id = null) => {
    setSelectedBookId(id);
    setJournalOpen(true);
  };

  const handleDelete = async () => {
    try {
      await deleteJournal(confirmId);
      showToast('Deleted', 'Journal deleted successfully', 'success');
      setConfirmId(null);
      load();
    } catch {
      showToast('Error', 'Failed to delete journal', 'error');
    }
  };

  const handleJournalSaved = () => {
    setJournalOpen(false);
    load();
  };

  const totalSec = books.reduce((s, b) => s + parseSeconds(b.total_reading_time), 0);
  const totalHours = Math.floor(totalSec / 3600);
  const totalMins = Math.floor((totalSec % 3600) / 60);
  const finished = books.filter(b => b.enddate).length;
  const rated = books.filter(b => b.star_point > 0);
  const avgStar = rated.length ? (rated.reduce((s, b) => s + b.star_point, 0) / rated.length).toFixed(1) : '—';

  const stats = [
    { icon: 'fa-book-open', value: books.length, label: 'Books', color: '#3b82f6', bg: '#eff6ff' },
    { icon: 'fa-clock', value: totalHours > 0 ? `${totalHours}h ${totalMins}m` : `${totalMins}m`, label: 'Total Read', color: '#8b5cf6', bg: '#f5f3ff' },
    { icon: 'fa-circle-check', value: finished, label: 'Finished', color: '#10b981', bg: '#f0fdf4' },
    { icon: 'fa-star', value: avgStar, label: 'Avg Rating', color: '#f59e0b', bg: '#fffbeb' },
  ];

  const headerRight = (
    <button className="action-btn" onClick={() => openJournal()}>
      <i className="fa-solid fa-plus"></i>
    </button>
  );

  return (
    <SidebarPageLayout
      title="Reading Journals"
      icon="fa-book-open"
      accentColor="#3b82f6"
      headerRight={headerRight}
    >
      <main className="content">
        <div className="container">
          {/* Stats Bar */}
          {!loading && (
            <div className="stats-bar">
              {stats.map((s) => (
                <div key={s.label} className="stat-card">
                  <div className="stat-icon" style={{ background: s.bg, color: s.color }}>
                    <i className={`fa-solid ${s.icon}`}></i>
                  </div>
                  <div className="stat-body">
                    <div className="stat-value">{s.value}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {loading ? (
            <p style={{ color: '#555', textAlign: 'center', gridColumn: '1/-1' }}>⏳ Loading...</p>
          ) : books.length === 0 ? (
            <div className="book-grid">
              <div className="book-item placeholder" onClick={() => openJournal()}>
                <div className="placeholder-content">
                  <i className="fa-solid fa-plus placeholder-icon"></i>
                  <h3>Add your first book</h3>
                </div>
              </div>
            </div>
          ) : (
            <div className="book-grid">
              {booksOnPage.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onClick={() => openJournal(book.id)}
                  onDelete={() => setConfirmId(book.id)}
                  onShare={() => setShareBook(book)}
                />
              ))}
              {showAddCard && (
                <div className="book-item placeholder" onClick={() => openJournal()}>
                  <div className="placeholder-content">
                    <i className="fa-solid fa-plus placeholder-icon"></i>
                    <h3>Add New Book</h3>
                  </div>
                </div>
              )}
            </div>
          )}
          <Pagination
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
          />
        </div>
      </main>

      <ConfirmModal
        open={confirmId != null}
        title="Delete Journal?"
        message="Are you sure you want to delete this journal?<br/>This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
      />

      <JournalModal
        open={journalOpen}
        bookId={selectedBookId}
        onClose={() => setJournalOpen(false)}
        onSaved={handleJournalSaved}
      />

      <ShareReviewModal
        open={!!shareBook}
        onClose={() => setShareBook(null)}
        prefill={shareBook ? {
          book_title: shareBook.title,
          book_author: shareBook.author,
          book_cover: shareBook.book_image || shareBook.image,
          book_genre: shareBook.genre,
          body: shareBook.review,
          star_point: shareBook.star_point || 0,
          drama_point: shareBook.drama_point || 0,
          spicy_point: shareBook.spicy_point || 0,
        } : {}}
      />
    </SidebarPageLayout>
  );
}
