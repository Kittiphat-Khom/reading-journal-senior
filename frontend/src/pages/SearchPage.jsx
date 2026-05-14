import { useState, useCallback, useRef, useEffect } from 'react';
import SidebarPageLayout from '../components/layout/SidebarPageLayout';
import BookDetailModal from '../components/ui/BookDetailModal';
import SearchBookCard from '../components/ui/SearchBookCard';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { addJournalFromSearch, toggleFavorite, logSearch } from '../api/search';
import client from '../api/client';
import '../styles/search-page.css';

const SEARCH_QUERY = `query SearchBooks($keyword: String!, $page: Int!) {
  search(query: $keyword, query_type: Book, page: $page) { results }
}`;

const GENRE_QUERY = `query GetBooksByGenre($tagSlug: String!, $limit: Int!, $offset: Int!) {
  books(
    where: { image_id: { _is_null: false }, taggings: { tag: { slug: { _eq: $tagSlug } } } }
    order_by: { users_read_count: desc }
    limit: $limit
    offset: $offset
  ) {
    id title description
    image { url }
    contributions(limit: 1) { author { name } }
  }
}`;

const CATEGORIES = [
  { id: 'fantasy',    label: 'Fantasy',            tagSlug: 'fantasy'            },
  { id: 'scifi',      label: 'Sci-Fi',              tagSlug: 'science-fiction'    },
  { id: 'mystery',    label: 'Mystery & Thriller',  tagSlug: 'mystery'            },
  { id: 'romance',    label: 'Romance',             tagSlug: 'romance'            },
  { id: 'horror',     label: 'Horror',              tagSlug: 'horror'             },
  { id: 'historical', label: 'Historical Fiction',  tagSlug: 'historical-fiction' },
  { id: 'ya',         label: 'Young Adult',         tagSlug: 'young-adult'        },
  { id: 'adventure',  label: 'Adventure',           tagSlug: 'adventure'          },
  { id: 'manga',      label: 'Comic & Manga',       tagSlug: 'manga'              },
];

function mapBook(b, defaultGenre) {
  const author = b.contributions?.[0]?.author?.name || 'Unknown';
  const cover = b.image?.url || '';
  return { id: b.id, title: b.title || 'Untitled', author, cover, genre: defaultGenre || 'General', description: b.description || '' };
}


export default function SearchPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [categories, setCategories] = useState({});
  const [loadingCat, setLoadingCat] = useState(
    Object.fromEntries(CATEGORIES.map((c) => [c.id, true]))
  );
  const [selectedBook, setSelectedBook] = useState(null);
  const [seeAllModal, setSeeAllModal] = useState(null);
  const gridRefs = useRef({});

  useEffect(() => {
    const buffer = new Array(CATEGORIES.length).fill(undefined);
    const globalSeen = new Set();
    let flushedUpTo = -1;

    const flush = () => {
      while (flushedUpTo + 1 < CATEGORIES.length && buffer[flushedUpTo + 1] !== undefined) {
        flushedUpTo++;
        const cat = CATEGORIES[flushedUpTo];
        let books = buffer[flushedUpTo].filter((b) => !globalSeen.has(b.id));
        if (books.length < 8) books = buffer[flushedUpTo];
        books.forEach((b) => globalSeen.add(b.id));
        setCategories((p) => ({ ...p, [cat.id]: books }));
        setLoadingCat((p) => ({ ...p, [cat.id]: false }));
      }
    };

    const baseOffset = Math.floor(Math.random() * 60);
    CATEGORIES.forEach(async (cat, i) => {
      try {
        const res = await client.post('/api/search', {
          query: GENRE_QUERY,
          variables: { tagSlug: cat.tagSlug, limit: 40, offset: baseOffset + i * 5 },
        });
        const raw = res.data?.data?.books ?? [];
        const authorSeen = new Set();
        const books = [];
        for (const b of raw) {
          const author = b.contributions?.[0]?.author?.name || 'Unknown';
          if (authorSeen.has(author)) continue;
          authorSeen.add(author);
          books.push({ id: b.id, title: b.title || 'Untitled', author, cover: b.image?.url || '', genre: cat.label, description: b.description || '' });
          if (books.length >= 20) break;
        }
        buffer[i] = books;
      } catch {
        buffer[i] = [];
      }
      flush();
    });
  }, []);

  const runSearch = useCallback(async (q) => {
    if (!q.trim()) return;
    setSearching(true);
    try {
      const res = await client.post('/api/search', { query: SEARCH_QUERY, variables: { keyword: q, page: 1 } });
      const hits = res.data?.data?.search?.results?.hits ?? [];
      const books = hits
        .filter((h) => h.document?.image?.url)
        .map((h) => mapBook(h.document, 'Search'));
      setSearchResults(books);
      logSearch(q, '');
    } catch {
      showToast('Error', 'Search failed', 'error');
    } finally {
      setSearching(false);
    }
  }, [showToast]);

  const scrollGrid = (id, dir) => {
    const el = gridRefs.current[id];
    if (el) el.scrollLeft += dir === 'left' ? -400 : 400;
  };

  const handleAddJournal = async (book) => {
    try {
      await addJournalFromSearch({ title: book.title, author: book.author, book_image: book.cover, genre: book.genre });
      showToast('Added', `"${book.title}" added to journals`, 'success');
      setSelectedBook(null);
    } catch (err) {
      showToast('Error', err.response?.data?.message || 'Failed to add', 'error');
    }
  };

  const handleFavorite = async (book) => {
    try {
      const res = await toggleFavorite({ user_id: user?.user_id, title: book.title, author: book.author, book_image: book.cover, genre: book.genre, description: book.description });
      showToast('Done', res.data?.message || 'Toggled favorite', 'success');
    } catch {
      showToast('Error', 'Failed', 'error');
    }
  };

  return (
    <SidebarPageLayout
      title="Search Book"
      icon="fa-magnifying-glass"
      accentColor="#8b5cf6"
    >
      <main className="content">
        <div className="search-hero">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search by title or author..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch(query)}
            />
            <button onClick={() => runSearch(query)}>
              <i className="fa-solid fa-magnifying-glass"></i>
            </button>
          </div>
        </div>
        {(searching || searchResults.length > 0) && (
          <section className="book-section" id="search-result-section">
            <div className="section-header">
              <h2>Search Results</h2>
            </div>
            {searching ? (
              <p style={{ color: '#555', padding: '10px 5px' }}>⏳ Searching...</p>
            ) : searchResults.length === 0 ? (
              <p style={{ color: '#555' }}>No results found.</p>
            ) : (
              <div className="scroll-container">
                <button className="scroll-btn left" onClick={() => scrollGrid('search-results', 'left')}>&#10094;</button>
                <div className="search-results-grid" ref={(el) => { gridRefs.current['search-results'] = el; }}>
                  {searchResults.map((book) => (
                    <SearchBookCard key={book.id} book={book} onClick={() => setSelectedBook(book)} />
                  ))}
                </div>
                <button className="scroll-btn right" onClick={() => scrollGrid('search-results', 'right')}>&#10095;</button>
              </div>
            )}
          </section>
        )}

        {!searching && CATEGORIES.map((cat) => (
          <CategorySection
            key={cat.id}
            cat={cat}
            books={categories[cat.id]}
            loading={loadingCat[cat.id]}
            onSelect={setSelectedBook}
            onSeeAll={(books) => setSeeAllModal({ title: cat.label, books })}
            gridRef={(el) => { gridRefs.current[cat.id] = el; }}
            onScroll={(dir) => scrollGrid(cat.id, dir)}
          />
        ))}
      </main>

      <BookDetailModal
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
        onAddJournal={handleAddJournal}
        onFavorite={handleFavorite}
      />

      {seeAllModal && (
        <div className="modal" style={{ display: 'flex' }} onClick={() => setSeeAllModal(null)}>
          <div className="modal-content see-all-content" onClick={(e) => e.stopPropagation()}>
            <span className="close-btn" onClick={() => setSeeAllModal(null)}>&times;</span>
            <h2>{seeAllModal.title}</h2>
            <div className="see-all-grid">
              {seeAllModal.books.map((book) => (
                <SearchBookCard key={book.id} book={book} onClick={() => { setSelectedBook(book); setSeeAllModal(null); }} />
              ))}
            </div>
          </div>
        </div>
      )}
    </SidebarPageLayout>
  );
}

function CategorySection({ cat, books, loading, onSelect, onSeeAll, gridRef, onScroll }) {
  return (
    <section className="book-section">
      <div className="section-header">
        <h2>{cat.label}</h2>
        {books?.length > 0 && (
          <button className="see-all" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => onSeeAll(books)}>
            See all &gt;
          </button>
        )}
      </div>
      {loading ? (
        <p style={{ color: '#555', padding: '10px 5px' }}>⏳ Loading...</p>
      ) : (
        <div className="scroll-container">
          <button className="scroll-btn left" onClick={() => onScroll('left')}>&#10094;</button>
          <div className="book-grid" ref={gridRef}>
            {(books || []).map((book) => (
              <SearchBookCard key={book.id} book={book} onClick={() => onSelect(book)} />
            ))}
          </div>
          <button className="scroll-btn right" onClick={() => onScroll('right')}>&#10095;</button>
        </div>
      )}
    </section>
  );
}
