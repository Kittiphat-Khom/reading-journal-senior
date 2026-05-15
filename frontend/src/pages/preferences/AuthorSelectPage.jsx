import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import '../../styles/manage-pre-author.css';

const MIN_SELECT = 3;
const ITEMS_PER_PAGE = 20;

const FALLBACK_AUTHORS = [
  // Trending 2024-2025
  "Han Kang", "Jon Fosse", "Samantha Harvey", "Percival Everett", "Sally Rooney",
  "Haruki Murakami", "Rebecca Yarros", "Sarah J. Maas", "Brandon Sanderson", "Emily Henry",
  "Colleen Hoover", "Freida McFadden", "R.F. Kuang", "Kristin Hannah", "James Clear",
  "Morgan Housel", "Toshikazu Kawaguchi", "Matt Haig", "Walter Isaacson", "Salman Rushdie",
  "David Nicholls", "Leigh Bardugo", "Holly Jackson", "Taylor Jenkins Reid", "Bonnie Garmus",
  "Gabrielle Zevin", "V.E. Schwab", "Olivie Blake", "Hernan Diaz", "Abraham Verghese",
  // Modern Legends
  "J.K. Rowling", "Stephen King", "George R.R. Martin", "Neil Gaiman", "Margaret Atwood",
  "Kazuo Ishiguro", "Paulo Coelho", "Dan Brown", "John Grisham", "James Patterson",
  "Danielle Steel", "Nora Roberts", "Ken Follett", "Cormac McCarthy", "Toni Morrison",
  "Gabriel García Márquez", "Milan Kundera", "Orhan Pamuk", "Yuval Noah Harari", "Khaled Hosseini",
  "Alice Walker", "Donna Tartt", "Hanya Yanagihara", "Malcolm Gladwell", "Rick Riordan",
  "Michael Connelly", "David Baldacci", "Nicholas Sparks", "Gillian Flynn", "Elena Ferrante",
  // All-Time Classics
  "William Shakespeare", "Jane Austen", "Charles Dickens", "Leo Tolstoy", "Fyodor Dostoevsky",
  "George Orwell", "Mark Twain", "Ernest Hemingway", "F. Scott Fitzgerald", "Virginia Woolf",
  "Franz Kafka", "Victor Hugo", "Alexandre Dumas", "Charlotte Brontë", "Emily Brontë",
  "Oscar Wilde", "James Joyce", "Homer", "Dante Alighieri", "Miguel de Cervantes",
  "Albert Camus", "Vladimir Nabokov", "John Steinbeck", "J.D. Salinger", "Marcel Proust",
  // Genre Legends
  "J.R.R. Tolkien", "Agatha Christie", "Arthur Conan Doyle", "C.S. Lewis", "Frank Herbert",
  "Isaac Asimov", "Arthur C. Clarke", "H.P. Lovecraft", "Edgar Allan Poe", "Roald Dahl",
  "Dr. Seuss", "Ursula K. Le Guin", "Terry Pratchett", "H.G. Wells", "Jules Verne",
];

export default function AuthorSelectPage() {
  const navigate = useNavigate();
  const [allAuthors, setAllAuthors] = useState(FALLBACK_AUTHORS);
  const [selected, setSelected] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('pref_authors') || '[]')); } catch { return new Set(); }
  });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    client.get('/api/admin/featured-authors')
      .then((res) => {
        const names = (Array.isArray(res.data) ? res.data : []).map((f) => f.name).filter(Boolean);
        if (names.length > 0) {
          const merged = [...new Set([...names, ...FALLBACK_AUTHORS])];
          setAllAuthors(merged);
        }
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? allAuthors.filter((a) => a.toLowerCase().includes(q)) : allAuthors;
  }, [search, allAuthors]);

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
    if (selected.size > 0 && selected.size < MIN_SELECT) return;
    localStorage.setItem('pref_authors', JSON.stringify([...selected]));
    navigate('/preferences/books');
  };

  const handleSkip = () => {
    localStorage.removeItem('pref_authors');
    navigate('/preferences/books');
  };

  const handleSearch = (e) => { setSearch(e.target.value); setPage(0); };

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
                <span className="total-count-badge">({allAuthors.length} authors)</span>
              </h2>
              <p className="author-desc">Please select at least {MIN_SELECT} authors or skip this step.</p>
            </div>
            <div className="search-right">
              <label className="search-label-text">Search Author:</label>
              <div className="search-box">
                <i className="fa-solid fa-magnifying-glass"></i>
                <input type="text" placeholder="e.g. J.K. Rowling" value={search} onChange={handleSearch} />
              </div>
            </div>
          </div>
        </div>

        <div className="author-grid">
          {pageItems.map((name) => (
            <button
              key={name}
              className={`author-button${selected.has(name) ? ' selected' : ''}`}
              onClick={() => toggle(name)}
            >
              <span>{name}</span>
            </button>
          ))}
          {pageItems.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#888' }}>No authors found.</div>
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
          <button className="unselect-all-btn" onClick={() => setSelected(new Set())}>Deselect All</button>
          <div className="footer-center">
            <span className="selection-status">Selected: {selected.size}</span>
            <button className="back-footer-btn" onClick={() => navigate('/preferences/genres')}>Back</button>
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
