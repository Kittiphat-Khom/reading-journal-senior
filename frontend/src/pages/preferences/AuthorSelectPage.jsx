import { useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import client from '../../api/client';
import '../../styles/manage-pre-author.css';

const MIN_SELECT = 3;
const ITEMS_PER_PAGE = 20;

const AUTHOR_QUERY = `query SearchAuthors($keyword: String!, $page: Int!) {
  search(query: $keyword, query_type: Author, page: $page) { results }
}`;

const STATIC_AUTHORS = [
  "Han Kang", "Jon Fosse", "Samantha Harvey", "Percival Everett", "Sally Rooney",
  "Haruki Murakami", "Rebecca Yarros", "Sarah J. Maas", "Brandon Sanderson", "Emily Henry",
  "Colleen Hoover", "Freida McFadden", "R.F. Kuang", "Kristin Hannah", "James Clear",
  "Morgan Housel", "Toshikazu Kawaguchi", "Matt Haig", "Walter Isaacson", "Salman Rushdie",
  "David Nicholls", "Leigh Bardugo", "Holly Jackson", "Taylor Jenkins Reid", "Bonnie Garmus",
  "Gabrielle Zevin", "V.E. Schwab", "Olivie Blake", "Hernan Diaz", "Abraham Verghese",
  "J.K. Rowling", "Stephen King", "George R.R. Martin", "Neil Gaiman", "Margaret Atwood",
  "Kazuo Ishiguro", "Paulo Coelho", "Dan Brown", "John Grisham", "James Patterson",
  "Danielle Steel", "Nora Roberts", "Ken Follett", "Cormac McCarthy", "Toni Morrison",
  "Gabriel García Márquez", "Milan Kundera", "Orhan Pamuk", "Yuval Noah Harari", "Khaled Hosseini",
  "Alice Walker", "Donna Tartt", "Hanya Yanagihara", "Malcolm Gladwell", "Rick Riordan",
  "Michael Connelly", "David Baldacci", "Nicholas Sparks", "Gillian Flynn", "Elena Ferrante",
  "William Shakespeare", "Jane Austen", "Charles Dickens", "Leo Tolstoy", "Fyodor Dostoevsky",
  "George Orwell", "Mark Twain", "Ernest Hemingway", "F. Scott Fitzgerald", "Virginia Woolf",
  "Franz Kafka", "Victor Hugo", "Alexandre Dumas", "Charlotte Brontë", "Emily Brontë",
  "Oscar Wilde", "James Joyce", "Homer", "Dante Alighieri", "Miguel de Cervantes",
  "Albert Camus", "Vladimir Nabokov", "John Steinbeck", "J.D. Salinger", "Marcel Proust",
  "J.R.R. Tolkien", "Agatha Christie", "Arthur Conan Doyle", "C.S. Lewis", "Frank Herbert",
  "Isaac Asimov", "Arthur C. Clarke", "H.P. Lovecraft", "Edgar Allan Poe", "Roald Dahl",
  "Dr. Seuss", "Ursula K. Le Guin", "Terry Pratchett", "H.G. Wells", "Jules Verne",
];

export default function AuthorSelectPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = location.state?.isEdit ?? false;
  const [selected, setSelected] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('pref_authors') || '[]')); } catch { return new Set(); }
  });
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const debounceRef = useRef(null);

  // Static list pagination (no search)
  const totalPages = Math.ceil(STATIC_AUTHORS.length / ITEMS_PER_PAGE);
  const pageItems = STATIC_AUTHORS.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  const searchAPI = useCallback(async (keyword) => {
    if (!keyword.trim()) { setSearchResults([]); return; }
    setLoading(true);
    try {
      const res = await client.post('/api/search', { query: AUTHOR_QUERY, variables: { keyword, page: 1 } });
      const hits = res.data?.data?.search?.results?.hits ?? [];
      const filtered = hits
        .map((h) => h.document?.name)
        .filter((name) => name && name.trim().length >= 2 && name.trim().length <= 60)
        .filter((name) => !/\b(Congress|Senate|Committee|Assembly|University|Institute)\b/i.test(name));
      setSearchResults([...new Set(filtered)]);
    } catch {
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchAPI(val), 400);
  };

  const toggle = (name) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const handleNext = () => {
    if (selected.size > 0 && selected.size < MIN_SELECT) return;
    localStorage.setItem('pref_authors', JSON.stringify([...selected]));
    navigate('/preferences/books', { state: { isEdit } });
  };

  const handleSkip = () => {
    localStorage.removeItem('pref_authors');
    navigate('/preferences/books', { state: { isEdit } });
  };

  const displayItems = search.trim() ? searchResults : pageItems;

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
                  onChange={handleSearchChange}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="author-grid">
          {loading && (
            <div className="author-empty-state" style={{ gridColumn: '1 / -1' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.8rem', color: '#94a3b8' }}></i>
              <p>Searching…</p>
            </div>
          )}
          {!loading && search && searchResults.length === 0 && (
            <div className="author-empty-state">
              <i className="fa-solid fa-user-slash" style={{ fontSize: '2rem', color: '#cbd5e1' }}></i>
              <p>No authors found for "<strong>{search}</strong>"</p>
            </div>
          )}
          {!loading && displayItems.map((name) => (
            <button
              key={name}
              className={`author-button${selected.has(name) ? ' selected' : ''}`}
              onClick={() => toggle(name)}
            >
              <span>{name}</span>
            </button>
          ))}
        </div>

        {!search && (
          <div className="pagination-bar">
            <button className="nav-arrow" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
              <i className="fa-solid fa-chevron-left"></i>
            </button>
            <span className="page-indicator">Page {page + 1} of {totalPages}</span>
            <button className="nav-arrow" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}>
              <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        )}

        <div className="action-footer">
          <button className="unselect-all-btn" onClick={() => setSelected(new Set())}>Deselect All</button>
          <div className="footer-center">
            <span className="selection-status">Selected: {selected.size}</span>
            <button className="back-footer-btn" onClick={() => navigate('/preferences/genres', { state: { isEdit } })}>Back</button>
            {isEdit
              ? <button className="back-footer-btn" onClick={() => navigate('/dashboard')}>Cancel</button>
              : <button className="skip-btn" onClick={handleSkip}>Skip</button>
            }
            <button className="next-btn" onClick={handleNext} disabled={selected.size > 0 && selected.size < MIN_SELECT}>
              Next Step
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
