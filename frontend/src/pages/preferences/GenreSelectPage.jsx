import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import client from '../../api/client';
import '../../styles/manage-pre-genre.css';

const MIN_SELECT = 3;
const ITEMS_PER_PAGE = 20;

const FALLBACK_GENRES = [
  "Fiction","Fantasy","Young Adult","Adventure","Science Fiction","Classics","Comics","Romance",
  "History","LGBTQ","Action","Comedy","Drama","Horror","Thriller","Crime","Animation","Mystery",
  "Family","War","Animals and Pets","Other Domestic Pets","Art and Design","Architecture",
  "Fashion Design","Fine Arts","Graphic Design & Product Design","Interior Design","Photography",
  "Biography","Business","Historical & Political","True Crime","Other Biographies",
  "Business and Economics","Accounting","Biographies","Business Management","Economics",
  "Finance and Investment","Sales and Marketing","Children's Books","Babies / Toddlers",
  "Pre-Teens (Ages 7-12)","Activity Books","Comics & Popular Characters","Education & Reference",
  "Comics and Graphic Novels","Graphic Novels","Manga","Light Novels","Computers and Internet",
  "Programming Languages","Software","Family and Relationships","Parenting","Relationships",
  "Food and Drink","Health and Well-Being","Fitness and Diet","Health and Medicine",
  "History and Politics","Ancient & Medieval History","World History","Biographies and Memoirs",
  "Political Science","Hobbies and Collectibles","Crafts","Literature and Fiction",
  "General Fiction","Literature","Crime, Thrillers & Mystery","Poetry","Travel Literature",
  "Military and War","New Age","Meditation & Healing","Paranormal","Performing Arts",
  "Film and TV","Music","Philosophy and Psychology","Self Help","Science","Mathematics",
  "Astronomy","Sports","Travel","Religion","Buddhism","Christianity","Self-Enrichment",
];

export default function GenreSelectPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = location.state?.isEdit ?? false;
  const [allGenres, setAllGenres] = useState(FALLBACK_GENRES);

  useEffect(() => {
    client.get('/api/admin/genres')
      .then((res) => {
        const names = (res.data || []).map((g) => g.name);
        if (names.length > 0) setAllGenres(names);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    client.get('/api/preferences').then((res) => {
      const d = res.data;
      const genres = d.preferred_genres || [];
      const authors = d.preferred_authors || [];
      const books = d.preferred_books || [];
      setSelected(new Set(genres));
      localStorage.setItem('pref_genres', JSON.stringify(genres));
      localStorage.setItem('pref_authors', JSON.stringify(authors));
      localStorage.setItem('pref_books', JSON.stringify(books));
    }).catch(() => {});
  }, [isEdit]);

  const [selected, setSelected] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('pref_genres') || '[]')); } catch { return new Set(); }
  });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? allGenres.filter((g) => g.toLowerCase().includes(q)) : allGenres;
    return [...list].sort((a, b) => Number(selected.has(b)) - Number(selected.has(a)));
  }, [search, allGenres, selected]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const pageItems = filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  const toggle = (name) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const handleNext = () => {
    if (selected.size < MIN_SELECT) return alert(`Please select at least ${MIN_SELECT} genres.`);
    localStorage.setItem('pref_genres', JSON.stringify([...selected]));
    navigate('/preferences/authors', { state: { isEdit } });
  };

  const handleSearch = (e) => { setSearch(e.target.value); setPage(0); };

  return (
    <div className="main-wrapper">
      <div className="genre-container">
        <div className="header-section">
          <div className="header-top">
            <div className="main-title">Manage Preferences</div>
            <div className="step-badge">Step 1 of 3: Select Genres</div>
          </div>
          <div className="search-row">
            <div className="genre-info">
              <h2 className="genre-subtitle">
                Genre Collection
                <span className="total-count-badge">({allGenres.length} genres)</span>
              </h2>
              <p className="genre-desc">Please select at least {MIN_SELECT} genres.</p>
            </div>
            <div className="search-right">
              <label className="search-label-text">Search Genre:</label>
              <div className="search-box">
                <i className="fa-solid fa-magnifying-glass"></i>
                <input type="text" placeholder="e.g. Fantasy" value={search} onChange={handleSearch} />
              </div>
            </div>
          </div>
        </div>

        <div className="genre-grid">
          {pageItems.map((g) => (
            <button
              key={g}
              className={`genre-button${selected.has(g) ? ' selected' : ''}`}
              onClick={() => toggle(g)}
            >
              {g}
            </button>
          ))}
          {pageItems.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#888' }}>No genres found.</div>
          )}
        </div>

        <div className="pagination-bar">
          <button className="nav-arrow" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <span className="page-indicator">Page {page + 1} of {totalPages || 1}</span>
          <button className="nav-arrow" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}>
            <i className="fa-solid fa-chevron-right"></i>
          </button>
        </div>

        <div className="action-footer">
          <button className="unselect-btn" onClick={() => setSelected(new Set())}>Deselect All</button>
          <div className="footer-right">
            <span className="selection-status">Selected: {selected.size}</span>
            {isEdit ? (
              <button className="back-footer-btn" onClick={() => navigate('/dashboard')}>Cancel</button>
            ) : (
              <button className="skip-btn" onClick={() => navigate('/dashboard')}>Skip All</button>
            )}
            <button className="next-btn" onClick={handleNext} disabled={selected.size < MIN_SELECT}>
              Next Step <i className="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
