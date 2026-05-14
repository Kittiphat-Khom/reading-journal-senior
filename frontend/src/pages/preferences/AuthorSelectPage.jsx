import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import '../../styles/manage-pre-author.css';

const MIN_SELECT = 3;

const AUTHOR_QUERY = `query SearchAuthors($keyword: String!, $page: Int!) {
  search(query: $keyword, query_type: Author, page: $page) { results }
}`;

export default function AuthorSelectPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(() => {
    try { return new Map(JSON.parse(localStorage.getItem('pref_authors') || '[]')); } catch { return new Map(); }
  });
  const [featuredAuthors, setFeaturedAuthors] = useState([]);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const currentKeyword = search.trim() || 'stephen';

  useEffect(() => {
    client.get('/api/admin/featured-authors')
      .then((res) => {
        const authors = (Array.isArray(res.data) ? res.data : [])
          .map((f) => ({ id: f.author_id, name: f.name, featured: true }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setFeaturedAuthors(authors);
      })
      .catch(() => {});
  }, []);

  const searchAuthors = useCallback(async (keyword, p = 1) => {
    if (!keyword.trim()) return;
    setLoading(true);
    try {
      const res = await client.post('/api/search', { query: AUTHOR_QUERY, variables: { keyword, page: p } });
      const raw = res.data?.data?.search?.results;
      const hits = raw?.hits ?? [];
      const found = raw?.found ?? 0;
      const filtered = hits
        .map((h) => ({ id: h.document.id, name: h.document.name }))
        .filter((a) => {
          if (!a.name) return false;
          const n = a.name.trim();
          if (n.length < 3 || n.length > 50) return false;
          if (/\b(Congress|Senate|Committee|Assembly|Legislature|University|Institute)\b/i.test(n)) return false;
          return true;
        });
      setResults(filtered);
      setTotalPages(Math.max(1, Math.ceil(found / 25)));
    } catch {
      setResults([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { searchAuthors('stephen', 1); }, [searchAuthors]);

  const goToPage = (p) => {
    setPage(p);
    searchAuthors(currentKeyword, p);
  };

  const toggle = (author) => {
    setSelected((prev) => {
      const next = new Map(prev);
      next.has(author.id) ? next.delete(author.id) : next.set(author.id, author.name);
      return next;
    });
  };

  const handleNext = () => {
    localStorage.setItem('pref_authors', JSON.stringify([...selected]));
    navigate('/preferences/books');
  };

  const handleSkip = () => {
    localStorage.removeItem('pref_authors');
    navigate('/preferences/books');
  };

  const handleBack = () => navigate('/preferences/genres');

  return (
    <div className="main-wrapper">
      <div className="author-container">
        <div className="header-section">
          <div className="header-top">
            <div className="main-title">Manage Preferences</div>
            <div className="step-badge">Step 2 of 3: Select Authors</div>
          </div>
          <div className="search-row">
            <div className="author-subtitle-wrap">
              <h2 className="author-subtitle">
                Authors Collection
                <span className="total-count-badge">({selected.size} selected)</span>
              </h2>
              <p className="author-desc">Please select at least {MIN_SELECT} authors or skip this step.</p>
            </div>
            <div className="search-right">
              <label className="search-label-text">Search Author:</label>
              <div className="search-box">
                <i className="fa-solid fa-magnifying-glass"></i>
                <input
                  type="text"
                  placeholder="e.g. J.K. Rowling"
                  value={search}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearch(val);
                    setPage(1);
                    searchAuthors(val.trim() || 'stephen', 1);
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="author-grid" id="authorGrid">
          {loading && (
            <div className="author-empty-state" style={{ gridColumn: '1 / -1' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.8rem', color: '#94a3b8' }}></i>
              <p>Searching…</p>
            </div>
          )}
          {!loading && search && results.length === 0 && (
            <div className="author-empty-state">
              <i className="fa-solid fa-user-slash" style={{ fontSize: '2rem', color: '#cbd5e1' }}></i>
              <p>No authors found for "<strong>{search}</strong>"</p>
            </div>
          )}
          {!loading && (() => {
            const LIMIT = 20;
            const featured = !search ? featuredAuthors.slice((page - 1) * LIMIT, page * LIMIT) : [];
            const apiFiltered = results.filter((a) => !featuredAuthors.some((f) => f.name.toLowerCase() === a.name.toLowerCase()));
            return [...featured, ...apiFiltered].slice(0, LIMIT);
          })().map((a) => (
            <button
              key={a.id}
              className={`author-button${selected.has(a.id) ? ' selected' : ''}`}
              onClick={() => toggle(a)}
              style={{ position: 'relative' }}
            >
              {a.featured && (
                <span style={{ position: 'absolute', top: 4, right: 4, background: '#f59e0b', color: '#fff', borderRadius: 20, padding: '1px 6px', fontSize: '0.6rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <i className="fa-solid fa-star" style={{ fontSize: '0.5rem' }}></i> Recommend
                </span>
              )}
              <span>{a.name}</span>
            </button>
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
          <button className="unselect-all-btn" onClick={() => setSelected(new Map())}>Deselect All</button>
          <div className="footer-center">
            <span className="selection-status">Selected: {selected.size}</span>
            <button className="back-footer-btn" onClick={handleBack}>Back</button>
            <button className="skip-btn" onClick={handleSkip}>Skip</button>
            <button className="next-btn" onClick={handleNext} disabled={selected.size > 0 && selected.size < MIN_SELECT}>
              Next Step
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
