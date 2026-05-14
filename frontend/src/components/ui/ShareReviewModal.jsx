import { useState, useEffect } from 'react';
import client from '../../api/client';
import { useToast } from '../../context/ToastContext';

const COLORS = {
  stars: '#f59e0b',
  drama: '#3b82f6',
  spicy: '#ef4444',
};

function RatingRow({ label, type, icon, value, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>{label}</span>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <i key={n} className={`fa-solid ${icon}`}
            onClick={() => onChange(n === value ? 0 : n)}
            style={{ fontSize: '1.05rem', width: 22, textAlign: 'center', cursor: 'pointer', color: value >= n ? COLORS[type] : '#e2e8f0', transition: 'color 0.15s' }} />
        ))}
      </div>
    </div>
  );
}

export default function ShareReviewModal({ open, onClose, prefill = {} }) {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    headline: '',
    body: '',
    star_point: 0,
    drama_point: 0,
    spicy_point: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        headline: prefill.headline || '',
        body: prefill.body || '',
        star_point: prefill.star_point || 0,
        drama_point: prefill.drama_point || 0,
        spicy_point: prefill.spicy_point || 0,
      });
    }
  }, [open, prefill.book_title]);

  if (!open) return null;

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!prefill.book_title) { showToast('Error', 'Book title required', 'error'); return; }
    setSaving(true);
    try {
      await client.post('/api/reviews', {
        book_title: prefill.book_title,
        book_author: prefill.book_author || '',
        book_cover: prefill.book_cover || '',
        book_genre: prefill.book_genre || '',
        headline: form.headline,
        body: form.body,
        star_point: form.star_point,
        drama_point: form.drama_point,
        spicy_point: form.spicy_point,
        visibility: 'public',
      });
      showToast('Shared!', 'Your review is now live', 'success');
      onClose();
    } catch {
      showToast('Error', 'Failed to share review', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 40px 80px -20px rgba(15,23,42,0.4)', fontFamily: "'Prompt', sans-serif" }}>

        {/* Header */}
        <div style={{ padding: '22px 24px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Share a Review</h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>Your review will appear in the community feed</p>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: '#f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.9rem' }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Book info row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: '#f8fafc', borderRadius: 12, border: '1.5px solid #e2e8f0', marginBottom: 18 }}>
            {prefill.book_cover
              ? <img src={prefill.book_cover} alt="" style={{ width: 44, height: 66, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
              : <div style={{ width: 44, height: 66, borderRadius: 6, background: 'linear-gradient(135deg,#1e293b,#334155)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fa-solid fa-book" style={{ color: '#cbd5e1', fontSize: '1.1rem' }}></i>
                </div>
            }
            <div>
              <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>{prefill.book_title || 'Unknown book'}</div>
              {prefill.book_author && <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>{prefill.book_author}</div>}
              {prefill.book_genre && <span style={{ display: 'inline-block', marginTop: 4, padding: '2px 8px', borderRadius: 6, background: '#eff6ff', color: '#2563eb', fontSize: '0.72rem', fontWeight: 600 }}>{prefill.book_genre}</span>}
            </div>
          </div>

          {/* Headline */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Headline</label>
            <input value={form.headline} onChange={(e) => set('headline', e.target.value)}
              placeholder="A short, vivid line about how it felt…"
              style={{ width: '100%', padding: '10px 13px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: '0.9rem', fontFamily: "'Prompt', sans-serif", color: '#1e293b', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'} />
          </div>

          {/* Review body */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Your review</label>
            <textarea value={form.body} onChange={(e) => set('body', e.target.value)}
              placeholder="What worked? What stayed? Be specific — quotes welcome."
              rows={4}
              style={{ width: '100%', padding: '10px 13px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: '0.875rem', fontFamily: "'Prompt', sans-serif", color: '#1e293b', outline: 'none', background: '#f8fafc', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box' }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'} />
          </div>

          {/* Ratings */}
          <div style={{ padding: '14px 16px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rating</span>
            <RatingRow label="Stars" type="stars" icon="fa-star"       value={form.star_point}  onChange={(v) => set('star_point', v)} />
            <RatingRow label="Drama" type="drama" icon="fa-droplet"    value={form.drama_point} onChange={(v) => set('drama_point', v)} />
            <RatingRow label="Spicy" type="spicy" icon="fa-pepper-hot" value={form.spicy_point} onChange={(v) => set('spicy_point', v)} />
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
            <button onClick={onClose} style={{ padding: '10px 18px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontFamily: "'Prompt', sans-serif", fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={saving}
              style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#2c6b75', color: '#fff', fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: '0.875rem', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fa-solid fa-share-nodes"></i>
              {saving ? 'Sharing...' : 'Share Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
