import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { getGenres, createGenre, updateGenre, deleteGenre } from '../../api/admin';
import ConfirmModal from '../../components/ui/ConfirmModal';

const DEFAULT_GENRES = [
  "Fiction","Fantasy","Young Adult","Adventure","Science Fiction","Classics","Comics","Romance",
  "History","LGBTQ","Action","Comedy","Drama","Horror","Thriller","Crime","Mystery",
  "Family","War","Art and Design","Photography","Biography","Business","True Crime",
  "Economics","Finance and Investment","Children's Books","Graphic Novels","Manga","Light Novels",
  "Programming Languages","Parenting","Relationships","Food and Drink","Health and Medicine",
  "World History","Political Science","Crafts","Literature","Poetry","Travel Literature",
  "Military and War","Paranormal","Film and TV","Music","Self Help","Science","Mathematics",
  "Astronomy","Sports","Travel","Religion","Buddhism","Christianity","Self-Enrichment",
];

export default function ManageGenrePage() {
  const { showToast } = useToast();
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '' });
  const [editId, setEditId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const load = async () => {
    setLoading(true);
    try { const res = await getGenres(); setGenres(res.data || []); }
    catch { showToast('Error', 'Failed to load', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      if (editId) { await updateGenre(editId, form); showToast('Updated', 'Genre updated', 'success'); }
      else { await createGenre(form); showToast('Created', 'Genre added', 'success'); }
      setForm({ name: '' }); setEditId(null); load();
    } catch { showToast('Error', 'Save failed', 'error'); }
  };

  const handleDelete = async () => {
    try { await deleteGenre(confirmId); showToast('Deleted', 'Genre deleted', 'success'); setConfirmId(null); load(); }
    catch { showToast('Error', 'Delete failed', 'error'); }
  };

  const handleImportDefaults = async () => {
    const existing = new Set(genres.map((g) => g.name.toLowerCase()));
    const toAdd = DEFAULT_GENRES.filter((g) => !existing.has(g.toLowerCase()));
    if (!toAdd.length) { showToast('Info', 'All defaults already exist', 'info'); return; }
    try {
      await Promise.all(toAdd.map((name) => createGenre({ name })));
      showToast('Imported', `${toAdd.length} genres added`, 'success');
      load();
    } catch { showToast('Error', 'Import failed', 'error'); }
  };

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 30;

  const filtered = useMemo(
    () => genres.filter((g) => g.name.toLowerCase().includes(search.toLowerCase())),
    [genres, search]
  );
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const pageItems = filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  const handleSearch = (e) => { setSearch(e.target.value); setPage(0); };

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
        <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>Manage Genres</span>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px' }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(16,185,129,0.2)', flexShrink: 0 }}>
              <i className="fa-solid fa-tags" style={{ color: '#059669', fontSize: '1.1rem' }}></i>
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>Genre Library</h1>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                {genres.length} genres · displayed in user preference setup
              </p>
            </div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 16px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', flexShrink: 0 }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#059669', lineHeight: 1 }}>{genres.length}</div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>Total</div>
          </div>
        </div>

        {/* Add / Edit card */}
        <div style={{ background: '#fff', borderRadius: 18, padding: '20px 24px', border: '1px solid #e2e8f0', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: editId ? '#f59e0b' : '#10b981' }}></div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {editId ? 'Editing genre' : 'Add new genre'}
            </span>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="e.g. Science Fiction, Horror, Romance..."
              value={form.name}
              onChange={(e) => setForm({ name: e.target.value })}
              style={{ flex: 1, minWidth: 200, padding: '11px 16px', borderRadius: 11, border: '1.5px solid #e2e8f0', fontSize: '0.92rem', outline: 'none', fontFamily: 'inherit', color: '#1e293b', transition: 'border-color 0.2s' }}
              onFocus={(e) => e.target.style.borderColor = '#10b981'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
            <button type="submit" style={{ padding: '11px 22px', background: editId ? '#f59e0b' : '#10b981', color: '#fff', border: 'none', borderRadius: 11, cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', transition: 'opacity 0.2s', whiteSpace: 'nowrap' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
              {editId ? <><i className="fa-solid fa-check" style={{ marginRight: 6 }}></i>Update</> : <><i className="fa-solid fa-plus" style={{ marginRight: 6 }}></i>Add Genre</>}
            </button>
            {editId && (
              <button type="button" style={{ padding: '11px 16px', background: '#f8fafc', color: '#64748b', border: '1.5px solid #e2e8f0', borderRadius: 11, cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}
                onClick={() => { setEditId(null); setForm({ name: '' }); }}>
                Cancel
              </button>
            )}
          </form>
        </div>

        {/* Search + grid */}
        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.88rem', whiteSpace: 'nowrap' }}>All Genres</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', borderRadius: 10, padding: '6px 12px', border: '1px solid #e2e8f0' }}>
              <i className="fa-solid fa-magnifying-glass" style={{ color: '#94a3b8', fontSize: '0.75rem' }}></i>
              <input
                type="text"
                placeholder="Filter..."
                value={search}
                onChange={handleSearch}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.83rem', color: '#334155', width: 110, fontFamily: 'inherit' }}
              />
            </div>
          </div>

          <div style={{ padding: '18px 20px' }}>
            {loading ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: 32 }}>⏳ Loading...</p>
            ) : filtered.length === 0 ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: 32 }}>{search ? 'No match.' : 'No genres yet.'}</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {pageItems.map((g) => (
                  <div key={g.id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '6px 8px 6px 12px',
                    borderRadius: 20,
                    background: editId === g.id ? '#ecfdf5' : '#f8fafc',
                    border: `1.5px solid ${editId === g.id ? '#6ee7b7' : '#e2e8f0'}`,
                    transition: 'all 0.15s',
                  }}>
                    <span style={{ fontSize: '0.845rem', color: '#334155', fontWeight: 500 }}>{g.name}</span>
                    <button onClick={() => { setEditId(g.id); setForm({ name: g.name }); }}
                      title="Edit"
                      style={{ width: 22, height: 22, borderRadius: 6, background: '#eff6ff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#3b82f6', fontSize: '0.68rem', transition: 'all 0.15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#dbeafe'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#eff6ff'}>
                      <i className="fa-solid fa-pen"></i>
                    </button>
                    <button onClick={() => setConfirmId(g.id)}
                      title="Delete"
                      style={{ width: 22, height: 22, borderRadius: 6, background: '#fef2f2', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444', fontSize: '0.68rem', transition: 'all 0.15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#fef2f2'}>
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Page {page + 1} of {totalPages} · {filtered.length} genres
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 0}
                  style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e2e8f0', background: page === 0 ? '#f8fafc' : '#fff', color: page === 0 ? '#cbd5e1' : '#475569', cursor: page === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', transition: 'all 0.15s' }}
                >
                  <i className="fa-solid fa-chevron-left"></i>
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages - 1}
                  style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e2e8f0', background: page >= totalPages - 1 ? '#f8fafc' : '#fff', color: page >= totalPages - 1 ? '#cbd5e1' : '#475569', cursor: page >= totalPages - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', transition: 'all 0.15s' }}
                >
                  <i className="fa-solid fa-chevron-right"></i>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      <ConfirmModal open={confirmId != null} title="Delete Genre?" message="This cannot be undone." onConfirm={handleDelete} onCancel={() => setConfirmId(null)} />
    </div>
  );
}
