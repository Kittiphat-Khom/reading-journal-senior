import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SidebarPageLayout from '../components/layout/SidebarPageLayout';
import { useToast } from '../context/ToastContext';
import client from '../api/client';
import '../styles/report-bug.css';

export default function ReportBugPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const filesRef = useRef([]);

  const [form, setForm] = useState({ title: '', description: '' });
  const [imagePreviews, setImagePreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(false);

  const loadHistory = async () => {
    setHistLoading(true);
    try {
      const res = await client.get('/api/reports/history');
      setHistory(res.data || []);
    } catch {
      setHistory([]);
    } finally {
      setHistLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    if (!files.length) return;
    filesRef.current = files;
    const previews = [];
    let loaded = 0;
    files.forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        previews[i] = ev.target.result;
        loaded++;
        if (loaded === files.length) setImagePreviews([...previews]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) { showToast('Required', 'Please describe the issue', 'error'); return; }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      filesRef.current.forEach(f => formData.append('reportImages', f));
      await client.post('/api/reports/add', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSubmitted(true);
    } catch {
      showToast('Error', 'Failed to submit report', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openHistory = () => {
    setHistoryOpen(true);
    loadHistory();
  };

  return (
    <SidebarPageLayout title="Report Bug" icon="fa-bug" accentColor="#64748b">

      <main className="main-content">
        {!submitted ? (
          <div className="report-container fade-in" id="report-form-view">
            <header className="top-nav">
              <span className="back-link" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
                <i className="fa-solid fa-arrow-left-long"></i> Back to Journal
              </span>
              <button className="btn-history" type="button" onClick={openHistory}>
                <i className="fa-solid fa-clock-rotate-left"></i> My Reports
              </button>
            </header>

            <div className="card glass-effect">
              <div className="card-header">
                <h2>Found a bug?</h2>
                <p>Please describe the issue to help us fix it.</p>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="form-content">
                  <div className="upload-section">
                    <label className="section-label">Attachments (up to 5)</label>
                    <label
                      className="upload-box"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ cursor: 'pointer', flexDirection: imagePreviews.length ? 'row' : 'column', flexWrap: 'wrap', alignItems: imagePreviews.length ? 'flex-start' : 'center', gap: 8, padding: imagePreviews.length ? 12 : undefined }}
                    >
                      {imagePreviews.length > 0 ? (
                        <>
                          {imagePreviews.map((src, i) => (
                            <img key={i} src={src} alt={`Preview ${i + 1}`} style={{ height: 80, width: 80, objectFit: 'cover', borderRadius: 8, border: '1.5px solid #e2e8f0', flexShrink: 0 }} />
                          ))}
                          <div style={{ width: '100%', fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                            {imagePreviews.length} / 5 images · click to change
                          </div>
                        </>
                      ) : (
                        <div className="upload-placeholder">
                          <div className="icon-circle">
                            <i className="fa-solid fa-cloud-arrow-up"></i>
                          </div>
                          <span className="main-text">Click to upload images</span>
                          <span className="sub-text">PNG, JPG or GIF · up to 5 files · max 15MB each</span>
                        </div>
                      )}
                    </label>
                    <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/gif" multiple hidden onChange={handleImageChange} />
                  </div>

                  <div className="input-section">
                    <div className="form-group">
                      <label>Report Title</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="e.g., Cannot login via Google"
                        value={form.title}
                        onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        className="input-field textarea-field"
                        placeholder="Tell us more about what happened..."
                        value={form.description}
                        onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-primary" disabled={loading}>
                    <span>{loading ? 'Submitting...' : 'Submit Report'}</span>
                    {!loading && <i className="fa-solid fa-paper-plane"></i>}
                    {loading && <i className="fa-solid fa-spinner fa-spin"></i>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="report-container fade-in" id="report-success-view">
            <div className="success-card">
              <div className="icon-bug-anim">
                <div className="circle-bg"></div>
                <i className="fa-solid fa-check"></i>
              </div>
              <h2>Thank You!</h2>
              <p>Your report has been submitted successfully.<br />We will look into it shortly.</p>
              <button className="btn-primary btn-ok" onClick={() => { setSubmitted(false); setForm({ title: '', description: '' }); setImagePreviews([]); filesRef.current = []; }}>
                Submit Another Report
              </button>
            </div>
          </div>
        )}
      </main>

      {/* History Modal */}
      <div className={`modal-overlay${historyOpen ? ' active' : ''}`} onClick={() => setHistoryOpen(false)}>
        <div className="modal-box modal-box-lg" onClick={(e) => e.stopPropagation()}>
          <div className="history-modal-header">
            <h3><i className="fa-solid fa-clock-rotate-left"></i> My Reports</h3>
            <button className="close-modal-btn" onClick={() => setHistoryOpen(false)}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div className="history-modal-content">
            {histLoading ? (
              <p style={{ textAlign: 'center', color: '#94A3B8' }}>⏳ Loading...</p>
            ) : history.length === 0 ? (
              <div className="empty-state" style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
                <i className="fa-solid fa-inbox" style={{ fontSize: '2rem', marginBottom: 12 }}></i>
                <p>No reports yet.</p>
              </div>
            ) : (
              <div className="history-list">
                {history.map((r) => (
                  <div key={r.id} style={{ padding: '16px', background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>{r.title || r.type || 'Bug'}</span>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem' }}>{r.description}</p>
                    {r.status && (
                      <span style={{ fontSize: '0.75rem', color: r.status === 'resolved' ? '#22c55e' : '#f59e0b', marginTop: 6, display: 'block' }}>
                        Status: {r.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </SidebarPageLayout>
  );
}
