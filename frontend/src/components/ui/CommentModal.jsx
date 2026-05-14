import { useState, useEffect, useRef } from 'react';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const AVATAR_COLORS = ['#4d7df1', '#2c6b75', '#d96673', '#7a4dcf', '#e7a93a', '#16a673', '#ef4444', '#64748b'];
function avatarColor(name = '') {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export default function CommentModal({ open, onClose, review, onCountChange }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!open || !review) return;
    setLoading(true);
    client.get(`/api/reviews/${review.id}/comments`)
      .then(res => setComments(Array.isArray(res.data) ? res.data : []))
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [open, review]);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  if (!open || !review) return null;

  const handleSend = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      const res = await client.post(`/api/reviews/${review.id}/comments`, { body });
      setComments(prev => [...prev, res.data]);
      setBody('');
      if (onCountChange) onCountChange(review.id, comments.length + 1);
    } catch { /* silent */ }
    finally { setSending(false); }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 16px 0' }}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 680, maxHeight: '75vh', display: 'flex', flexDirection: 'column', boxShadow: '0 -20px 60px -10px rgba(15,23,42,0.25)', fontFamily: "'Prompt', sans-serif" }}>

        {/* Header */}
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>Comments</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 1 }}>on "{review.book_title}"</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, border: 'none', background: '#f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Comment list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.4rem' }}></i>
            </div>
          ) : comments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
              <i className="fa-regular fa-comment" style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }}></i>
              <div style={{ fontSize: '0.85rem' }}>No comments yet. Be the first!</div>
            </div>
          ) : (
            comments.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: avatarColor(c.username), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {(c.username || '?').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#15303a' }}>{c.username}</span>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.5, background: '#f8fafc', borderRadius: 10, padding: '8px 12px' }}>
                    {c.body}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '12px 20px 20px', borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: avatarColor(user?.username), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {(user?.username || '?').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '8px 12px', display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Write a comment… (Enter to send)"
                rows={1}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: "'Prompt', sans-serif", fontSize: '0.85rem', color: '#1e293b', resize: 'none', lineHeight: 1.5, maxHeight: 100, overflowY: 'auto' }}
                onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
              />
              <button onClick={handleSend} disabled={sending || !body.trim()}
                style={{ width: 32, height: 32, borderRadius: 9, border: 'none', background: body.trim() ? '#2c6b75' : '#e2e8f0', color: body.trim() ? '#fff' : '#94a3b8', cursor: body.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                <i className="fa-solid fa-paper-plane" style={{ fontSize: '0.78rem' }}></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
