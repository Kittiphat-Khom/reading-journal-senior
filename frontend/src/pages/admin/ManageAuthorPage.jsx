import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import client from '../../api/client';
import ConfirmModal from '../../components/ui/ConfirmModal';

const AUTHOR_QUERY = `query SearchAuthors($keyword: String!, $page: Int!) {
  search(query: $keyword, query_type: Author, page: $page) { results }
}`;

export default function ManageAuthorPage() {
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
      const res = await client.get('/api/admin/featured-authors');
      setFeatured(Array.isArray(res.data) ? res.data : []);
    } catch { /* silent */ }
  };

  useEffect(() => { loadFeatured(); }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await client.post('/api/search', {
        query: AUTHOR_QUERY,
        variables: { keyword: query.trim(), page: 1 },
      });
      const raw = res.data?.data?.search?.results;
      const authors = (raw?.hits ?? [])
        .map((h) => ({ id: String(h.document.id), name: h.document.name }))
        .filter((a) => {
          if (!a.name) return false;
          const n = a.name.trim();
          if (n.length < 3 || n.length > 50) return false;
          if (/\b(Congress|Senate|Committee|Assembly|Legislature|University|Institute)\b/i.test(n)) return false;
          return true;
        })
        .slice(0, 30);
      setResults(authors);
      if (authors.length === 0) showToast('Info', 'No authors found', 'info');
    } catch {
      showToast('Error', 'Search failed — check proxy server', 'error');
    } finally {
      setSearching(false);
    }
  };

  const toggleSelect = (author) => {
    setSelected((prev) =>
      prev.find((a) => a.id === author.id) ? prev.filter((a) => a.id !== author.id) : [...prev, author]
    );
  };

  const handleSave = async () => {
    if (!selected.length) return;
    setSaving(true);
    try {
      await Promise.all(selected.map((a) =>
        client.post('/api/admin/featured-authors', { author_id: a.id, name: a.name })
      ));
      showToast('Saved', `${selected.length} author(s) added to featured`, 'success');
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
      await client.delete(`/api/admin/featured-authors/${confirmId}`);
      showToast('Removed', 'Author removed from featured', 'success');
      setConfirmId(null);
      loadFeatured();
    } catch {
      showToast('Error', 'Delete failed', 'error');
    }
  };

  const btnStyle = (active) => ({
    padding: '8px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
    fontWeight: 600, fontSize: '0.85rem', fontFamily: 'inherit',
    background: active ? '#8b5cf6' : '#f1f5f9',
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
        <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>Manage Authors</span>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(139,92,246,0.2)', flexShrink: 0 }}>
              <i className="fa-solid fa-pen-nib" style={{ color: '#7c3aed', fontSize: '1.1rem' }}></i>
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>Featured Authors</h1>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                {featured.length} authors · shown first in preference selection
              </p>
            </div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 16px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', flexShrink: 0 }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#7c3aed', lineHeight: 1 }}>{featured.length}</div>
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
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 10 }}>
              <input
                type="text"
                placeholder="Search authors... (e.g. J.K. Rowling)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                style={{ flex: 1, padding: '10px 16px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit', color: '#1e293b', transition: 'border-color 0.2s' }}
                onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
              <button onClick={handleSearch} disabled={searching}
                style={{ padding: '10px 20px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 10, cursor: searching ? 'default' : 'pointer', fontWeight: 700, fontSize: '0.88rem', opacity: searching ? 0.7 : 1, whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                {searching ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }}></i>Searching...</> : <><i className="fa-solid fa-magnifying-glass" style={{ marginRight: 6 }}></i>Search</>}
              </button>
              {selected.length > 0 && (
                <button onClick={handleSave} disabled={saving}
                  style={{ padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                  {saving ? 'Saving...' : <><i className="fa-solid fa-star" style={{ marginRight: 6 }}></i>Feature {selected.length} authors</>}
                </button>
              )}
            </div>

            <div style={{ padding: '16px 20px', maxHeight: 500, overflowY: 'auto' }}>
              {results.length === 0 ? (
                <p style={{ color: '#94a3b8', textAlign: 'center', padding: 32 }}>Search for authors to add to the featured list.</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {results.map((author) => {
                    const isSelected = selected.some((a) => a.id === author.id);
                    const alreadyFeatured = featured.some((f) => f.author_id === author.id);
                    return (
                      <div key={author.id} onClick={() => !alreadyFeatured && toggleSelect(author)}
                        style={{
                          padding: '8px 16px', borderRadius: 20, cursor: alreadyFeatured ? 'default' : 'pointer',
                          border: `2px solid ${isSelected ? '#8b5cf6' : alreadyFeatured ? '#a7f3d0' : '#e2e8f0'}`,
                          background: isSelected ? '#f5f3ff' : alreadyFeatured ? '#ecfdf5' : '#f8fafc',
                          transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 500, color: '#1e293b' }}>{author.name}</span>
                        {alreadyFeatured && <i className="fa-solid fa-star" style={{ fontSize: '0.65rem', color: '#10b981' }}></i>}
                        {isSelected && !alreadyFeatured && <i className="fa-solid fa-check" style={{ fontSize: '0.65rem', color: '#8b5cf6' }}></i>}
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
              <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.88rem' }}>Authors shown first in preference selection</span>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {featured.length === 0 ? (
                <p style={{ color: '#94a3b8', textAlign: 'center', padding: 32 }}>No featured authors yet. Search and add some.</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {featured.map((a) => (
                    <div key={a.id} style={{ padding: '8px 12px 8px 16px', borderRadius: 20, border: '2px solid #ddd6fe', background: '#f5f3ff', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i className="fa-solid fa-star" style={{ fontSize: '0.65rem', color: '#8b5cf6' }}></i>
                      <span style={{ fontSize: '0.88rem', fontWeight: 500, color: '#1e293b' }}>{a.name}</span>
                      <button onClick={() => setConfirmId(a.id)}
                        style={{ width: 20, height: 20, borderRadius: 6, background: '#fef2f2', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}>
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

      <ConfirmModal open={confirmId != null} title="Remove from Featured?" message="This author will no longer appear first in preference selection." onConfirm={handleDelete} onCancel={() => setConfirmId(null)} />
    </div>
  );
}
