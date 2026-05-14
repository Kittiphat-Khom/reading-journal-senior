import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import client from '../../api/client';
import ConfirmModal from '../../components/ui/ConfirmModal';

const BOOK_QUERY = `query SearchBooks($keyword: String!, $page: Int!) {
  search(query: $keyword, query_type: Book, page: $page) { results }
}`;

export default function ManageBookPage() {
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [featured, setFeatured] = useState([]);
  const [confirmId, setConfirmId] = useState(null);
  const [tab, setTab] = useState('featured');

  const loadFeatured = async () => {
    try {
      const res = await client.get('/api/admin/featured-books');
      setFeatured(Array.isArray(res.data) ? res.data : []);
    } catch { /* silent */ }
  };

  useEffect(() => { loadFeatured(); }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await client.post('/api/search', {
        query: BOOK_QUERY,
        variables: { keyword: query.trim(), page: 1 },
      });
      const raw = res.data?.data?.search?.results;
      const seen = new Set();
      const books = [];
      for (const h of raw?.hits ?? []) {
        if (!h.document) continue;
        const b = {
          id: String(h.document.id || h.document.slug),
          title: h.document.title,
          author: h.document.contributions?.[0]?.author?.name || 'Unknown',
          cover: h.document.image?.url || '',
          genre: 'General',
          description: h.document.description || '',
        };
        if (!b.cover || !b.title) continue;
        const key = b.title.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        books.push(b);
        if (books.length === 20) break;
      }
      setResults(books);
      if (books.length === 0) showToast('Info', 'No books found', 'info');
    } catch {
      showToast('Error', 'Search failed — check proxy server', 'error');
    } finally {
      setSearching(false);
    }
  };

  const toggleSelect = (book) => {
    setSelected((prev) =>
      prev.find((b) => b.id === book.id) ? prev.filter((b) => b.id !== book.id) : [...prev, book]
    );
  };

  const handleSave = async () => {
    if (!selected.length) return;
    setSaving(true);
    try {
      await Promise.all(selected.map((b) =>
        client.post('/api/admin/featured-books', {
          book_id: b.id, title: b.title, author: b.author,
          cover: b.cover, genre: b.genre, description: b.description,
        })
      ));
      showToast('Saved', `${selected.length} book(s) added to featured`, 'success');
      setSelected([]);
      loadFeatured();
      setTab('featured');
    } catch {
      showToast('Error', 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await client.delete(`/api/admin/featured-books/${confirmId}`);
      showToast('Removed', 'Book removed from featured', 'success');
      setConfirmId(null);
      loadFeatured();
    } catch {
      showToast('Error', 'Delete failed', 'error');
    }
  };

  const btnStyle = (active) => ({
    padding: '8px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
    fontWeight: 600, fontSize: '0.85rem', fontFamily: 'inherit',
    background: active ? '#3b82f6' : '#f1f5f9',
    color: active ? '#fff' : '#64748b',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f5f2ee', fontFamily: "'Prompt', sans-serif" }}>

      {/* Top bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link to="/admin" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 5, transition: 'color 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#475569'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}>
          <i className="fa-solid fa-arrow-left"></i> Admin
        </Link>
        <i className="fa-solid fa-chevron-right" style={{ color: '#cbd5e1', fontSize: '0.7rem' }}></i>
        <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>Manage Books</span>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(59,130,246,0.2)', flexShrink: 0 }}>
              <i className="fa-solid fa-book" style={{ color: '#2563eb', fontSize: '1.1rem' }}></i>
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>Featured Books</h1>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                {featured.length} books · shown first in preference selection
              </p>
            </div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 16px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', flexShrink: 0 }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#2563eb', lineHeight: 1 }}>{featured.length}</div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>Featured</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button style={btnStyle(tab === 'featured')} onClick={() => setTab('featured')}>
            <i className="fa-solid fa-star" style={{ marginRight: 6 }}></i>Featured List
            {featured.length > 0 && <span style={{ marginLeft: 6, background: 'rgba(255,255,255,0.3)', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: '0.75rem' }}>{featured.length}</span>}
          </button>
          <button style={btnStyle(tab === 'search')} onClick={() => setTab('search')}>
            <i className="fa-solid fa-magnifying-glass" style={{ marginRight: 6 }}></i>Search & Add
          </button>
        </div>

        {tab === 'search' && (
          <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            {/* Search bar */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 10 }}>
              <input
                type="text"
                placeholder="Search books... (e.g. Harry Potter)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                style={{ flex: 1, padding: '10px 16px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit', color: '#1e293b', transition: 'border-color 0.2s' }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
              <button onClick={handleSearch} disabled={searching}
                style={{ padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 10, cursor: searching ? 'default' : 'pointer', fontWeight: 700, fontSize: '0.88rem', opacity: searching ? 0.7 : 1, whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                {searching ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }}></i>Searching...</> : <><i className="fa-solid fa-magnifying-glass" style={{ marginRight: 6 }}></i>Search</>}
              </button>
              {selected.length > 0 && (
                <button onClick={handleSave} disabled={saving}
                  style={{ padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                  {saving ? 'Saving...' : <><i className="fa-solid fa-star" style={{ marginRight: 6 }}></i>Feature {selected.length} books</>}
                </button>
              )}
            </div>

            {/* Results grid */}
            <div style={{ padding: '16px 20px', maxHeight: 600, overflowY: 'auto' }}>
              {results.length === 0 ? (
                <p style={{ color: '#94a3b8', textAlign: 'center', padding: 32 }}>Search for books to add to the featured list.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14 }}>
                  {results.map((book) => {
                    const isSelected = selected.some((b) => b.id === book.id);
                    const alreadyFeatured = featured.some((f) => f.book_id === book.id);
                    return (
                      <div key={book.id} onClick={() => !alreadyFeatured && toggleSelect(book)}
                        style={{ borderRadius: 10, overflow: 'hidden', cursor: alreadyFeatured ? 'default' : 'pointer', border: `2px solid ${isSelected ? '#3b82f6' : alreadyFeatured ? '#a7f3d0' : '#e2e8f0'}`, transition: 'all 0.15s', opacity: alreadyFeatured ? 0.7 : 1, position: 'relative' }}>
                        {book.cover
                          ? <img src={book.cover} alt={book.title} style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', display: 'block' }} />
                          : <div style={{ width: '100%', aspectRatio: '2/3', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fa-solid fa-book" style={{ color: '#cbd5e1', fontSize: '1.5rem' }}></i></div>
                        }
                        <div style={{ padding: '6px 8px' }}>
                          <p style={{ fontWeight: 600, fontSize: '0.72rem', margin: '0 0 2px', color: '#1e293b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{book.title}</p>
                          <p style={{ fontSize: '0.65rem', color: '#64748b', margin: 0 }}>{book.author}</p>
                        </div>
                        {alreadyFeatured && <div style={{ position: 'absolute', top: 4, right: 4, background: '#10b981', color: '#fff', borderRadius: 20, padding: '1px 6px', fontSize: '0.6rem', fontWeight: 700 }}>✓</div>}
                        {isSelected && !alreadyFeatured && <div style={{ background: '#3b82f6', color: '#fff', textAlign: 'center', padding: '3px', fontSize: '0.65rem', fontWeight: 600 }}>✓ Selected</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'featured' && (
          <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.88rem' }}>Books shown first in preference selection</span>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {featured.length === 0 ? (
                <p style={{ color: '#94a3b8', textAlign: 'center', padding: 32 }}>No featured books yet. Search and add some.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
                  {featured.map((book) => (
                    <div key={book.id} style={{ borderRadius: 12, overflow: 'hidden', border: '2px solid #e2e8f0', position: 'relative' }}>
                      {book.cover
                        ? <img src={book.cover} alt={book.title} style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', display: 'block' }} />
                        : <div style={{ width: '100%', aspectRatio: '2/3', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fa-solid fa-book" style={{ color: '#cbd5e1', fontSize: '2rem' }}></i></div>
                      }
                      <div style={{ padding: '8px 10px' }}>
                        <p style={{ fontWeight: 600, fontSize: '0.78rem', margin: '0 0 2px', color: '#1e293b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{book.title}</p>
                        <p style={{ fontSize: '0.7rem', color: '#64748b', margin: 0 }}>{book.author}</p>
                      </div>
                      <button onClick={() => setConfirmId(book.id)}
                        style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 6, background: '#fef2f2', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      <ConfirmModal open={confirmId != null} title="Remove from Featured?" message="This book will no longer appear first in preference selection." onConfirm={handleDelete} onCancel={() => setConfirmId(null)} />
    </div>
  );
}
