import { useState, useEffect } from 'react';
import client from '../../api/client';
import { useToast } from '../../context/ToastContext';

function emptyChapter(num) {
  return { id: Date.now(), num: parseInt(num), review: '', stars: 0, drama: 0, spicy: 0, favPages: [], quotes: [], annotations: [] };
}

const RATING_CFG = {
  stars: { icon: 'fa-star',      filledClass: 'filled'      },
  drama: { icon: 'fa-droplet',   filledClass: 'active-drop' },
  spicy: { icon: 'fa-pepper-hot',filledClass: 'active-fire' },
};

function RatingIcons({ type, value, onChange }) {
  const { icon, filledClass } = RATING_CFG[type] || RATING_CFG.stars;
  return (
    <div className="chap-icons">
      {[1, 2, 3, 4, 5].map((n) => (
        <i
          key={n}
          className={`fa-solid ${icon}${value >= n ? ` ${filledClass}` : ''}`}
          onClick={() => onChange(n === value ? 0 : n)}
        />
      ))}
    </div>
  );
}

export default function ChapterManager({ open, onClose, journalId }) {
  const { showToast } = useToast();
  const [chapters, setChapters] = useState([]);
  const [idx, setIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [inputModal, setInputModal] = useState(null);
  const [seeAll, setSeeAll] = useState(null);
  const [chInput, setChInput] = useState('');
  const [addingCh, setAddingCh] = useState(false);
  const [addInput, setAddInput] = useState('');

  useEffect(() => {
    if (!open) return;
    if (!journalId) {
      setChapters([]);
      setAddingCh(true);
      setAddInput('');
      return;
    }
    client.get(`/api/journals/${journalId}/chapters`)
      .then((res) => {
        const data = res.data;
        if (data.length > 0) {
          setChapters(data);
          setIdx(0);
          setChInput(String(data[0].num));
          setAddingCh(false);
        } else {
          setChapters([]);
          setAddingCh(true);
          setAddInput('');
        }
      })
      .catch(() => { setChapters([]); setAddingCh(true); setAddInput(''); });
  }, [open, journalId]);

  const goToChapter = (numStr) => {
    const n = parseInt(numStr);
    if (!n || n < 1) { setChInput(String(chapters[idx]?.num ?? '')); return; }
    const found = chapters.findIndex(c => c.num === n);
    if (found >= 0) {
      setIdx(found);
      setChInput(String(n));
    } else {
      const newCh = emptyChapter(n);
      const sorted = [...chapters, newCh].sort((a, b) => a.num - b.num);
      const newIdx = sorted.findIndex((c) => c.id === newCh.id);
      setChapters(sorted);
      setIdx(newIdx);
      setChInput(String(n));
    }
  };

  const ch = chapters[idx];

  const updateCh = (patch) =>
    setChapters((prev) => prev.map((c, i) => i === idx ? { ...c, ...patch } : c));

  const confirmAddChapter = (numStr) => {
    const n = parseInt(numStr);
    setAddingCh(false);
    setAddInput('');
    if (!n || n < 1) return;
    const existing = chapters.findIndex(c => c.num === n);
    if (existing >= 0) { setIdx(existing); setChInput(String(n)); return; }
    const newCh = emptyChapter(n);
    const sorted = [...chapters, newCh].sort((a, b) => a.num - b.num);
    const newIdx = sorted.findIndex((c) => c.id === newCh.id);
    setChapters(sorted);
    setIdx(newIdx);
    setChInput(String(n));
  };

  const save = async () => {
    if (!journalId) return;
    setSaving(true);
    try {
      await client.post(`/api/journals/${journalId}/chapters`, { chapters });
      showToast('Saved!', 'Chapter notes saved successfully.', 'success');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const promptInput = (title, placeholder) =>
    new Promise((resolve) => setInputModal({ title, placeholder, resolve }));

  const handleInputConfirm = (val) => {
    inputModal?.resolve(val);
    setInputModal(null);
  };

  if (!open) return null;

  return (
    <>
      <div className="chapter-popup" style={{ display: 'flex' }}>
        <div className="chapter-content">

          {/* Header */}
          <div className="chapter-header">
            <button className="btn-icon-back" onClick={onClose}>
              <i className="fa-solid fa-chevron-left"></i> Manage Reading Journals
            </button>
            <div className="header-right-group">
              <button className="btn-save-chapter" onClick={save} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          {/* Chapter navigation — input + arrows + add */}
          <div className="chapter-nav-section">
            <div className="chapter-title-row">
              <button
                className="ch-arrow-btn"
                disabled={idx <= 0}
                onClick={() => { const ni = idx - 1; setIdx(ni); setChInput(String(chapters[ni].num)); }}
              >
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              <div className="ch-input-wrap">
                <span className="ch-label">Ch.</span>
                <input
                  className="chapter-num-input"
                  type="number"
                  min={1}
                  value={chInput}
                  onChange={e => setChInput(e.target.value)}
                  onBlur={e => goToChapter(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.target.blur(); goToChapter(e.target.value); } }}
                />
                <span className="ch-total">/ {chapters.length}</span>
              </div>
              <button
                className="ch-arrow-btn"
                disabled={idx >= chapters.length - 1}
                onClick={() => { const ni = idx + 1; setIdx(ni); setChInput(String(chapters[ni].num)); }}
              >
                <i className="fa-solid fa-chevron-right"></i>
              </button>
              {addingCh ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f0f7ff', border: '2px solid #3b82f6', borderRadius: 10, padding: '4px 10px', boxShadow: '0 0 0 3px rgba(59,130,246,0.12)' }}>
                  <span style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: 700, whiteSpace: 'nowrap' }}>Ch.</span>
                  <input
                    autoFocus
                    type="number"
                    min={1}
                    value={addInput}
                    onChange={e => setAddInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') confirmAddChapter(addInput);
                      if (e.key === 'Escape' && chapters.length > 0) { setAddingCh(false); setAddInput(''); }
                    }}
                    onBlur={() => { if (addInput.trim()) confirmAddChapter(addInput); else if (chapters.length > 0) { setAddingCh(false); setAddInput(''); } }}
                    placeholder="?"
                    style={{ width: 48, fontFamily: "'Prompt', sans-serif", fontSize: '0.9rem', fontWeight: 700, border: 'none', outline: 'none', textAlign: 'center', background: 'transparent', color: '#1e3a5f' }}
                  />
                </div>
              ) : (
                <>
                  <button className="add-mini-btn" onClick={() => { setAddingCh(true); setAddInput(''); }}>+</button>
                  {ch && (
                    <button
                      onClick={() => {
                        const next = chapters.filter((_, i) => i !== idx);
                        if (next.length === 0) { setChapters([]); setAddingCh(true); setAddInput(''); return; }
                        const newIdx = Math.min(idx, next.length - 1);
                        setChapters(next);
                        setIdx(newIdx);
                        setChInput(String(next[newIdx].num));
                      }}
                      style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: '#fee2e2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}
                      title="Delete this chapter"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Body: left = review, right = ratings + fav pages */}
          {ch && <div className="chapter-body">
            <div className="chapter-left">
              <textarea
                value={ch.review}
                onChange={(e) => updateCh({ review: e.target.value })}
                placeholder="Write review for this chapter..."
              />
            </div>

            <div className="chapter-right">
              <div className="chap-rating-row">
                <span>Stars</span>
                <RatingIcons type="stars" value={ch.stars} onChange={(v) => updateCh({ stars: v })} />
              </div>
              <div className="chap-rating-row">
                <span>Drama</span>
                <RatingIcons type="drama" value={ch.drama} onChange={(v) => updateCh({ drama: v })} />
              </div>
              <div className="chap-rating-row">
                <span>Spicy</span>
                <RatingIcons type="spicy" value={ch.spicy} onChange={(v) => updateCh({ spicy: v })} />
              </div>

              <div className="fav-pages-section">
                <div className="sec-head">
                  <span>Fav Pages</span>
                  <button className="add-mini-btn" onClick={async () => {
                    const val = await promptInput('Add Favourite Page', 'Page number');
                    if (val) updateCh({ favPages: [...(ch.favPages || []), val] });
                  }}>+</button>
                </div>
                <div className="fav-badges">
                  {(ch.favPages || []).map((p, i) => (
                    <span key={i} className="badge" onClick={() => {
                      const arr = [...(ch.favPages || [])]; arr.splice(i, 1); updateCh({ favPages: arr });
                    }}>{p}</span>
                  ))}
                </div>
                <a href="#see" className="see-all-link" onClick={(e) => { e.preventDefault(); setSeeAll({ title: 'Favourite Pages', key: 'favPages' }); }}>See all &gt;</a>
              </div>
            </div>
          </div>}

          {/* Footer lists: Quotes + Annotations */}
          {ch && <div className="chapter-footer-lists">
            <ChapterListBox
              label="Quotes"
              items={(ch.quotes || []).map((q) => (typeof q === 'object' ? q.quote_text || q.text || '' : q))}
              onAdd={async () => {
                const val = await promptInput('Add Quote', 'Enter quote text');
                if (val) updateCh({ quotes: [...(ch.quotes || []), val] });
              }}
              onDelete={(i) => { const arr = [...(ch.quotes || [])]; arr.splice(i, 1); updateCh({ quotes: arr }); }}
              onSeeAll={() => setSeeAll({ title: 'Quotes', key: 'quotes' })}
            />
            <ChapterListBox
              label="Annotations"
              items={(ch.annotations || []).map((a) => (typeof a === 'object' ? a.note_text || a.text || '' : a))}
              onAdd={async () => {
                const val = await promptInput('Add Annotation', 'Enter note text');
                if (val) updateCh({ annotations: [...(ch.annotations || []), val] });
              }}
              onDelete={(i) => { const arr = [...(ch.annotations || [])]; arr.splice(i, 1); updateCh({ annotations: arr }); }}
              onSeeAll={() => setSeeAll({ title: 'Annotations', key: 'annotations' })}
            />
          </div>}

        </div>
      </div>

      {/* Input modal */}
      {inputModal && (
        <div className="popup" style={{ display: 'flex', zIndex: 9000 }}>
          <div className="input-modal-content">
            <h3>{inputModal.title}</h3>
            <input
              type="text"
              placeholder={inputModal.placeholder}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleInputConfirm(e.target.value);
                if (e.key === 'Escape') { inputModal.resolve(null); setInputModal(null); }
              }}
            />
            <div className="input-modal-actions">
              <button className="btn-secondary" onClick={() => { inputModal.resolve(null); setInputModal(null); }}>Cancel</button>
              <button className="btn-primary" onClick={(e) => handleInputConfirm(e.target.closest('.input-modal-content').querySelector('input').value)}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* See all modal */}
      {seeAll && ch && (
        <SeeAllModal
          title={seeAll.title}
          items={(ch[seeAll.key] || []).map((item) => (typeof item === 'object' ? item.quote_text || item.note_text || item.text || '' : item))}
          onClose={() => setSeeAll(null)}
          onDelete={(i) => { const arr = [...(ch[seeAll.key] || [])]; arr.splice(i, 1); updateCh({ [seeAll.key]: arr }); }}
          onAdd={async () => {
            const val = await promptInput(`Add ${seeAll.title}`, 'Enter text');
            if (val) updateCh({ [seeAll.key]: [...(ch[seeAll.key] || []), val] });
          }}
        />
      )}
    </>
  );
}

function ChapterListBox({ label, items, onAdd, onDelete, onSeeAll }) {
  return (
    <div className="list-box">
      <div className="list-head">
        <span>{label}</span>
        <button className="add-mini-btn" onClick={onAdd}>+</button>
      </div>
      <a href="#see" className="see-all-link" onClick={(e) => { e.preventDefault(); onSeeAll(); }}>See all &gt;</a>
      <div className="list-items">
        {(items || []).slice(0, 3).map((item, i) => (
          <div key={i} className="c-item">
            <span>{i + 1}: {item}</span>
            <i className="fa-solid fa-trash del-item" onClick={() => onDelete(i)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SeeAllModal({ title, items, onClose, onDelete, onAdd }) {
  return (
    <div className="popup" style={{ display: 'flex', zIndex: 8000 }}>
      <div className="input-modal-content" style={{ maxWidth: 500, width: '90%', height: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
        </div>
        <div className="list-items" style={{ flex: 1 }}>
          {items.map((item, i) => (
            <div key={i} className="c-item">
              <span>{i + 1}: {item}</span>
              <i className="fa-solid fa-trash del-item" onClick={() => onDelete(i)} />
            </div>
          ))}
        </div>
        <button className="btn-primary" style={{ width: '100%', marginTop: 15 }} onClick={onAdd}>+ Add New</button>
      </div>
    </div>
  );
}
