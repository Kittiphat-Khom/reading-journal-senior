import { useState, useCallback } from 'react';
import client from '../../api/client';

const SEARCH_QUERY = `
  query Search($query: String!, $page: Int!) {
    search(query: $query, query_type: "Book", per_page: 20, page: $page) {
      results
    }
  }
`;

export default function BookSearchModal({ open, onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const search = useCallback(async (term, pg = 1) => {
    if (!term.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await client.post('/api/search', {
        query: SEARCH_QUERY,
        variables: { query: term.trim(), page: pg },
      });
      const raw = res.data?.data?.search?.results;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const hits = parsed?.hits || [];

      const books = hits
        .filter((h) => h.document?.image?.url)
        .map((h) => {
          const doc = h.document;
          return {
            title: doc.title || 'Untitled',
            author: doc.author_names?.[0] || doc.contributions?.find((c) => c.contribution === 'Author')?.author?.name || 'Unknown',
            genre: (() => {
              const all = [
                ...(doc.genres || []),
                ...(doc.subjects || []).slice(0, 6),
                ...(doc.genre ? [doc.genre] : []),
              ].filter(Boolean);
              const unique = [...new Set(all)].slice(0, 8);
              return unique.join(' / ');
            })(),
            image: doc.image.url,
          };
        })
        .slice(0, 10);

      setResults(books);
      setPage(pg);
      setHasMore(hits.length === 20);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = () => search(query, 1);

  const handleSelect = (book) => {
    onSelect(book);
    onClose();
    setQuery('');
    setResults([]);
    setPage(1);
  };

  if (!open) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={(e) => { if (e.target === e.currentTarget) { onClose(); setQuery(''); setResults([]); } }}
    >
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '90%', maxWidth: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: '#1e293b' }}>Search Books</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>×</button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Type book title..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{ flex: 1, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '1rem' }}
            autoFocus
          />
          <button
            onClick={handleSearch}
            style={{ padding: '10px 18px', background: '#1b6f8e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
          >
            <i className="fa-solid fa-magnifying-glass"></i>
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading && <p style={{ textAlign: 'center', color: '#888' }}>⏳ Searching...</p>}
          {!loading && results.length === 0 && query && <p style={{ textAlign: 'center', color: '#888' }}>No results found.</p>}
          {results.map((book, i) => (
            <div
              key={i}
              onClick={() => handleSelect(book)}
              style={{ display: 'flex', gap: 12, padding: 10, borderRadius: 8, cursor: 'pointer', border: '1px solid #e2e8f0', transition: 'background 0.15s' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
            >
              <img src={book.image} alt={book.title} style={{ width: 48, height: 68, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} onError={(e) => e.target.style.display = 'none'} />
              <div>
                <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }}>{book.title}</div>
                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{book.author}</div>
                {book.genre && <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: 2 }}>{book.genre}</div>}
              </div>
            </div>
          ))}
        </div>

        {(page > 1 || hasMore) && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <button onClick={() => search(query, page - 1)} disabled={page <= 1} style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer', background: page <= 1 ? '#f8fafc' : '#fff' }}>Prev</button>
            <span style={{ lineHeight: '34px', color: '#64748b', fontSize: '0.9rem' }}>Page {page}</span>
            <button onClick={() => search(query, page + 1)} disabled={!hasMore} style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer', background: !hasMore ? '#f8fafc' : '#fff' }}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
