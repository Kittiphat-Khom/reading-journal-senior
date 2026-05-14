import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import client from '../../api/client';
import '../../styles/manage-pre-book.css';

const MIN_SELECT = 3;

const BOOK_QUERY = `query SearchBooks($keyword: String!, $page: Int!) {
  search(query: $keyword, query_type: Book, page: $page) { results }
}`;

export default function BookSelectPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [selected, setSelected] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('pref_books') || '[]')); } catch { return new Set(); }
  });
  const [search, setSearch] = useState('');
  const [featuredBooks, setFeaturedBooks] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const currentKeyword = search.trim() || 'the';

  const PAGES_PER_FETCH = 3;
  const debounceRef = useRef(null);

  useEffect(() => {
    client.get('/api/admin/featured-books')
      .then((res) => {
        const books = (res.data || []).map((f) => ({
          id: f.book_id, title: f.title, author: f.author, cover: f.cover, featured: true,
        }));
        setFeaturedBooks(books);
      })
      .catch(() => {});
  }, []);

  const searchBooks = useCallback(async (keyword, visualPage = 1) => {
    if (!keyword.trim()) return;
    setLoading(true);
    try {
      const startApi = (visualPage - 1) * PAGES_PER_FETCH + 1;
      const responses = await Promise.all(
        [0, 1, 2].map((i) =>
          client.post('/api/search', { query: BOOK_QUERY, variables: { keyword, page: startApi + i } })
        )
      );

      const seen = new Set();
      let totalFound = 0;
      const books = [];

      for (const res of responses) {
        const raw = res.data?.data?.search?.results;
        if (!totalFound) totalFound = raw?.found ?? 0;
        for (const h of raw?.hits ?? []) {
          if (!h.document) continue;
          const b = {
            id: String(h.document.id || h.document.slug),
            title: h.document.title,
            author: h.document.contributions?.[0]?.author?.name || '',
            cover: h.document.image?.url || '',
          };
          if (!b.cover || !b.title) continue;
          const key = b.title.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          books.push(b);
          if (books.length === 12) break;
        }
        if (books.length === 12) break;
      }

      setResults(books);
      const totalApiPages = Math.ceil(totalFound / 12);
      setTotalPages(Math.max(1, Math.min(50, Math.ceil(totalApiPages / PAGES_PER_FETCH))));
    } catch {
      setResults([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { searchBooks('the', 1); }, [searchBooks]);

  const goToPage = (p) => {
    setPage(p);
    searchBooks(currentKeyword, p);
  };

  const toggle = (book) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(book.id) ? next.delete(book.id) : next.add(book.id);
      return next;
    });
  };

  const handleFinish = async () => {
    if (selected.size < MIN_SELECT) return;
    setSaving(true);
    try {
      const genres = JSON.parse(localStorage.getItem('pref_genres') || '[]');
      const authorsRaw = JSON.parse(localStorage.getItem('pref_authors') || '[]');
      const authors = authorsRaw.map(([, name]) => name);

      await client.post('/api/preferences/save', {
        preferred_genres: genres,
        preferred_authors: authors,
        preferred_books: [...selected],
      });

      localStorage.removeItem('pref_genres');
      localStorage.removeItem('pref_authors');
      localStorage.removeItem('pref_books');
      localStorage.setItem('has_preferences', 'true');
      setDone(true);
    } catch {
      showToast('Error', 'Failed to save preferences', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="book-done-wrap">
        <div className="book-done-card">
          <div className="book-done-icon">🎉</div>
          <h2>You're all set!</h2>
          <p>Your preferences have been saved. Let's start your reading journey!</p>
          <button className="book-done-btn" onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="main-wrapper">
      <div className="book-container">
        <div className="header-section">
          <div className="header-top">
            <div className="main-title">Manage Preferences</div>
            <div className="step-badge">Step 3 of 3: Select Books</div>
          </div>
          <div className="search-row">
            <div className="book-subtitle-wrap">
              <h2 className="book-subtitle">
                Books Collection
                <span className="total-count-badge">({selected.size} selected)</span>
              </h2>
              <p className="book-desc">Please select at least {MIN_SELECT} books to finish.</p>
            </div>
            <div className="search-right">
              <label className="search-label-text">Search Book:</label>
              <div className="search-box">
                <i className="fa-solid fa-magnifying-glass"></i>
                <input
                  type="text"
                  placeholder="e.g. Harry Potter"
                  value={search}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearch(val);
                    clearTimeout(debounceRef.current);
                    debounceRef.current = setTimeout(() => {
                      setPage(1);
                      searchBooks(val.trim() || 'the', 1);
                    }, 400);
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="book-grid">
          {loading && (
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 12 }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#94a3b8' }}></i>
              <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem' }}>Loading…</p>
            </div>
          )}
          {!loading && results.length === 0 && featuredBooks.length === 0 && (
            <div className="book-empty-state">
              <i className="fa-solid fa-book-open" style={{ fontSize: '2rem', color: '#cbd5e1' }}></i>
              <p>{search ? `No books found for "${search}"` : 'Search for books above to get started.'}</p>
            </div>
          )}
          {!loading && (() => {
            const LIMIT = 12;
            if (search) return results.slice(0, LIMIT);
            // featured books paginate locally by visual page
            const featuredSlice = featuredBooks.slice((page - 1) * LIMIT, page * LIMIT);
            const apiFiltered = results.filter((b) => !featuredBooks.some((f) => f.title.toLowerCase() === b.title.toLowerCase()));
            return [...featuredSlice, ...apiFiltered].slice(0, LIMIT);
          })().map((b) => (
            <div
              key={b.id}
              className={`book-card${selected.has(b.id) ? ' selected' : ''}`}
              onClick={() => toggle(b)}
              style={{ position: 'relative' }}
            >
              <div className="book-cover" style={b.cover ? { backgroundImage: `url('${b.cover}')` } : {}} />
              {b.featured && (
                <div style={{ position: 'absolute', top: 6, left: 6, background: '#f59e0b', color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <i className="fa-solid fa-star" style={{ fontSize: '0.55rem' }}></i> Recommend
                </div>
              )}
              <div className="book-info">
                <div className="book-title">{b.title}</div>
                <div className="book-author">{b.author}</div>
              </div>
              {selected.has(b.id) && (
                <div className="selected-check"><i className="fa-solid fa-check"></i></div>
              )}
            </div>
          ))}
        </div>

        <div className="pagination-bar">
          <button className="nav-arrow" onClick={() => goToPage(page - 1)} disabled={page <= 1}>
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <span className="page-indicator">Page {page} of {totalPages}</span>
          <button className="nav-arrow" onClick={() => goToPage(page + 1)} disabled={page >= totalPages}>
            <i className="fa-solid fa-chevron-right"></i>
          </button>
        </div>

        <div className="action-footer">
          <button className="back-footer-btn" onClick={() => navigate('/preferences/authors')}>Back</button>
          <div className="footer-right">
            <span className="selection-status">Selected: {selected.size}</span>
            <button
              className="finish-btn"
              onClick={handleFinish}
              disabled={selected.size < MIN_SELECT || saving}
            >
              {saving ? 'Saving…' : 'Finish'} <i className="fa-solid fa-check"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
