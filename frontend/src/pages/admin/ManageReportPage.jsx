import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { getReports, deleteReport } from '../../api/admin';
import client from '../../api/client';
import ConfirmModal from '../../components/ui/ConfirmModal';

export default function ManageReportPage() {
  const { showToast } = useToast();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState(null);
  const [viewImage, setViewImage] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getReports();
      setReports(res.data || []);
    } catch {
      showToast('Error', 'Failed to load reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleStatusChange = async (id, is_done) => {
    try {
      await client.put(`/api/admin/reports/${id}/status`, { is_done, managed_by: 'admin', management_note: '' });
      showToast('Updated', 'Status updated', 'success');
      load();
    } catch {
      showToast('Error', 'Update failed', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteReport(confirmId);
      showToast('Deleted', 'Report deleted', 'success');
      setConfirmId(null);
      load();
    } catch {
      showToast('Error', 'Delete failed', 'error');
    }
  };

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
        <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>Bug Reports</span>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: 'linear-gradient(135deg, #fee2e2, #fecaca)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(239,68,68,0.2)', flexShrink: 0 }}>
              <i className="fa-solid fa-flag" style={{ color: '#dc2626', fontSize: '1.1rem' }}></i>
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>Bug Reports</h1>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                {reports.length} reports · review and resolve issues
              </p>
            </div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 16px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', flexShrink: 0 }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#dc2626', lineHeight: 1 }}>{reports.length}</div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>Total</div>
          </div>
        </div>

        {/* Report list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading ? (
            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, gap: 12, color: '#94a3b8' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.4rem' }}></i>
              <span style={{ fontSize: '0.9rem' }}>Loading reports...</span>
            </div>
          ) : reports.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', padding: 48, textAlign: 'center', color: '#94a3b8' }}>
              <i className="fa-solid fa-flag" style={{ fontSize: '2rem', marginBottom: 12, display: 'block', color: '#cbd5e1' }}></i>
              No reports yet.
            </div>
          ) : reports.map((r) => {
            const done = r.is_done;
            const sc = done
              ? { label: 'Resolved', bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' }
              : { label: 'Pending',  bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' };
            return (
              <div key={r.id} style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <i className="fa-solid fa-bug" style={{ color: '#ef4444', fontSize: '0.85rem' }}></i>
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>{r.title || 'Bug'}</span>
                        <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                          {sc.label}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>
                        by <strong style={{ color: '#64748b' }}>{r.username || 'Unknown'}</strong> · {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      {r.description && (
                        <p style={{ margin: '8px 0 0', color: '#475569', fontSize: '0.875rem', lineHeight: 1.55 }}>{r.description}</p>
                      )}
                      {r.image && (
                        <div style={{ marginTop: 10 }}>
                          <img
                            src={r.image}
                            alt="report screenshot"
                            onClick={() => setViewImage(r.image)}
                            style={{ height: 72, borderRadius: 8, border: '1.5px solid #e2e8f0', objectFit: 'cover', cursor: 'pointer', transition: 'opacity 0.15s' }}
                            onMouseEnter={(e) => e.target.style.opacity = 0.8}
                            onMouseLeave={(e) => e.target.style.opacity = 1}
                          />
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 3 }}>คลิกเพื่อดูรูปเต็ม</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                    <select value={done ? 'resolved' : 'pending'} onChange={(e) => handleStatusChange(r.id, e.target.value === 'resolved')}
                      style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '0.8rem', fontFamily: 'inherit', fontWeight: 600, color: sc.color, background: sc.bg, cursor: 'pointer', outline: 'none' }}>
                      <option value="pending">Pending</option>
                      <option value="resolved">Resolved</option>
                    </select>
                    <button onClick={() => setConfirmId(r.id)}
                      style={{ background: '#fef2f2', color: '#ef4444', border: '1.5px solid #fecaca', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className="fa-solid fa-trash" style={{ fontSize: '0.7rem' }}></i> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Image lightbox */}
      {viewImage && (
        <div onClick={() => setViewImage(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img src={viewImage} alt="full screenshot" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain', display: 'block' }} />
            <button onClick={() => setViewImage(null)}
              style={{ position: 'absolute', top: -12, right: -12, width: 32, height: 32, borderRadius: '50%', background: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', color: '#475569', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      )}

      <ConfirmModal open={confirmId != null} title="Delete Report?" message="This cannot be undone." onConfirm={handleDelete} onCancel={() => setConfirmId(null)} />
    </div>
  );
}
