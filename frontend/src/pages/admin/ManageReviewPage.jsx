import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';

const IconRow = ({ count, icon, activeColor }) =>
  [1,2,3,4,5].map(n => (
    <i key={n} className={`fa-solid ${icon}`} style={{ fontSize: 11, color: n <= count ? activeColor : '#ddd', marginRight: 1 }} />
  ));

export default function ManageReviewPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirmId, setConfirmId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await client.get('/api/reviews/admin/all');
      setReviews(res.data || []);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    try {
      await client.delete(`/api/reviews/${id}`);
      setReviews(prev => prev.filter(r => r.id !== id));
    } catch { /* silent */ }
    setConfirmId(null);
  };

  const filtered = reviews.filter(r =>
    !search || r.book_title?.toLowerCase().includes(search.toLowerCase()) ||
    r.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f5f2ee', fontFamily: "'Prompt', sans-serif" }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '20px 48px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link to="/admin" style={{ textDecoration: 'none', color: '#64748b', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="fa-solid fa-arrow-left"></i> Dashboard
        </Link>
        <span style={{ color: '#cbd5e1' }}>|</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fa-solid fa-star-half-stroke" style={{ color: '#0891b2', fontSize: '1.1rem' }}></i>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>Manage Reviews</h1>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>{reviews.length} total reviews</p>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem' }}></i>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title or user…"
            style={{ paddingLeft: 36, paddingRight: 16, paddingTop: 9, paddingBottom: 9, border: '1px solid #e2e8f0', borderRadius: 10, fontSize: '0.88rem', outline: 'none', width: 240, fontFamily: "'Prompt', sans-serif" }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ padding: '32px 48px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.8rem' }}></i>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', fontSize: '0.95rem' }}>No reviews found.</div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '22%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '75px' }} />
                <col style={{ width: '75px' }} />
                <col style={{ width: '75px' }} />
                <col style={{ width: '55px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '70px' }} />
              </colgroup>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Book', 'Author', 'By', 'Stars', 'Drama', 'Spicy', 'Likes', 'Comments', 'Date', ''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                    <td style={{ padding: '12px 16px', maxWidth: 220 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {r.book_cover && (
                          <img src={r.book_cover} alt="" style={{ width: 32, height: 44, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
                        )}
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{r.book_title}</div>
                          {r.headline && <div style={{ color: '#94a3b8', fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{r.headline}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>{r.book_author || '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#334155', fontWeight: 500, whiteSpace: 'nowrap' }}>{r.username}</td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}><IconRow count={r.star_point || 0} icon="fa-star" activeColor="#f59e0b" /></td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}><IconRow count={r.drama_point || 0} icon="fa-droplet" activeColor="#3b82f6" /></td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}><IconRow count={r.spicy_point || 0} icon="fa-pepper-hot" activeColor="#ef4444" /></td>
                    <td style={{ padding: '12px 16px', color: '#64748b', textAlign: 'center' }}>{r.likes || 0}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b', textAlign: 'center' }}>{r.comments_count || 0}</td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                      {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => setConfirmId(r.id)}
                        style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', fontFamily: "'Prompt', sans-serif", transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm modal */}
      {confirmId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, maxWidth: 360, width: '90%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚠️</div>
            <h3 style={{ margin: '0 0 8px', color: '#1e293b' }}>Delete this review?</h3>
            <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: '0.9rem' }}>This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setConfirmId(null)} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 600, cursor: 'pointer', fontFamily: "'Prompt', sans-serif" }}>Cancel</button>
              <button onClick={() => handleDelete(confirmId)} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 600, cursor: 'pointer', fontFamily: "'Prompt', sans-serif" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
