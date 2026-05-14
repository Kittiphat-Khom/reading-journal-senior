import { useState, useEffect, useRef } from 'react';
import { useToast } from '../context/ToastContext';
import { useTimer, formatTime, parseDBTime } from '../hooks/useTimer';
import RatingBlock from '../components/ui/RatingBlock';
import ChapterManager from '../components/ui/ChapterManager';
import StatsModal from '../components/ui/StatsModal';
import ShareReviewModal from '../components/ui/ShareReviewModal';
import BookSearchModal from '../components/ui/BookSearchModal';
import { getJournal, createJournal, updateJournal } from '../api/journals';
import '../styles/journal-detail.css';

export default function JournalDetailPage({ journalId, onSaved, onClose }) {
  const { showToast } = useToast();
  const { seconds, running, start, finish } = useTimer();

  const [form, setForm] = useState({
    title: '', author: '', genre: '', review: '',
    startdate: '', enddate: '', platform: '',
    star_point: 0, spicy_point: 0, drama_point: 0,
  });
  const [coverImage, setCoverImage] = useState('');
  const [readingLogs, setReadingLogs] = useState([]);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [lastSessionSec, setLastSessionSec] = useState(0);
  const [saving, setSaving] = useState(false);
  const [chapterOpen, setChapterOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [bookSearchOpen, setBookSearchOpen] = useState(false);
  const [loading, setLoading] = useState(!!journalId);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!journalId) return;
    setLoading(true);
    getJournal(journalId)
      .then((res) => {
        const d = res.data;
        const genreStr = Array.isArray(d.genre)
          ? d.genre.slice(0, 3).join(' / ')
          : String(d.genre || '').replace(/[\[\]"]/g, '');

        setForm({
          title: d.title || '',
          author: d.author || '',
          genre: genreStr,
          review: d.review || '',
          startdate: d.startdate ? d.startdate.split('T')[0] : '',
          enddate: d.enddate ? d.enddate.split('T')[0] : '',
          platform: d.platform || '',
          star_point: d.star_point || 0,
          spicy_point: d.spicy_point || 0,
          drama_point: d.drama_point || 0,
        });
        setCoverImage(d.book_image || d.image || '');
        setTotalSeconds(parseDBTime(d.total_reading_time));

        let logs = [];
        if (d.reading_log) {
          try { logs = typeof d.reading_log === 'string' ? JSON.parse(d.reading_log) : d.reading_log; } catch { logs = []; }
        }
        setReadingLogs(logs);
      })
      .catch(() => showToast('Error', 'Failed to load journal', 'error'))
      .finally(() => setLoading(false));
  }, [journalId, showToast]);

  const handleFinish = () => {
    const elapsed = finish();
    if (elapsed > 0) {
      setLastSessionSec(elapsed);
      setTotalSeconds((t) => t + elapsed);
    }
  };

  const handleCoverUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCoverImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { showToast('Required', 'Please enter book title.', 'error'); return; }

    // Auto-finish timer if still running so elapsed seconds aren't lost
    let finalTotal = totalSeconds;
    let finalLastSec = lastSessionSec;
    if (running) {
      const elapsed = finish();
      if (elapsed > 0) {
        finalTotal += elapsed;
        finalLastSec = elapsed;
      }
    }

    let logs = [...readingLogs];
    if (finalLastSec > 0) {
      logs.push({ date: new Date().toISOString().split('T')[0], time: finalLastSec });
    }

    const h = String(Math.floor(finalTotal / 3600)).padStart(2, '0');
    const m = String(Math.floor((finalTotal % 3600) / 60)).padStart(2, '0');
    const s = String(finalTotal % 60).padStart(2, '0');

    const payload = {
      ...form,
      book_image: coverImage || null,
      image: coverImage || null,
      total_reading_time: `${h}:${m}:${s}`,
      reading_log: JSON.stringify(logs),
    };

    setSaving(true);
    try {
      if (journalId) {
        await updateJournal(journalId, payload);
      } else {
        await createJournal(payload);
      }
      setLastSessionSec(0);
      setReadingLogs(logs);
      showToast('Saved!', journalId ? 'Journal updated.' : 'Journal created.', 'success');
      if (onSaved) onSaved(journalId);
    } catch (err) {
      showToast('Error', err.response?.data?.message || 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const setField = (name, val) => setForm((p) => ({ ...p, [name]: val }));

  const handleBookSelect = (book) => {
    setForm((p) => ({
      ...p,
      title: book.title || p.title,
      author: book.author || p.author,
      genre: book.genre || p.genre,
    }));
    if (book.image) setCoverImage(book.image);
  };

  if (loading) {
    return (
      <div className="loading-overlay" style={{ display: 'flex' }}>
        <div className="spinner-icon"><i className="fa-solid fa-spinner fa-spin"></i></div>
      </div>
    );
  }

  const ttH = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const ttM = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const ttS = String(totalSeconds % 60).padStart(2, '0');

  return (
    <div className="journal-wrapper">
      {/* Topbar */}
      <header className="topbar-detail">
        <div className="topbar-left">
          {onClose && (
            <button className="btn-icon-back" onClick={onClose}>
              <i className="fa-solid fa-arrow-left"></i>
            </button>
          )}
        </div>
        <div className="topbar-right" style={{ display: 'flex', gap: 8 }}>
          {form.review && (
            <button className="btn" onClick={() => setShareOpen(true)}
              style={{ background: '#e6f1f3', color: '#2c6b75', border: '1.5px solid #cfe7ea', fontWeight: 700, fontSize: '0.82rem', padding: '8px 14px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Prompt', sans-serif" }}>
              <i className="fa-solid fa-share-nodes"></i> Share Review
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setChapterOpen(true)}>
            Add Chapter &amp; See All
          </button>
        </div>
      </header>

      <main className="journal-container">
        {/* Book Entry Form */}
        <section className="book-entry-form">
          {/* Cover */}
          <div className="form-col cover-col">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div className="book-cover" onClick={() => coverImage ? fileInputRef.current?.click() : setBookSearchOpen(true)}>
                {coverImage
                  ? <img src={coverImage} alt="Cover" onError={() => setCoverImage('')} />
                  : <span className="add-icon">+</span>
                }
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverUpload} />
              <button className="btn-upload-cover" style={{ background: '#94a3b8' }} onClick={() => fileInputRef.current?.click()}>Upload Photo</button>
            </div>
          </div>

          {/* Info */}
          <div className="form-col info-col">
            <div className="form-group">
              <input type="text" placeholder="Book Title" value={form.title} onChange={(e) => setField('title', e.target.value)} />
            </div>
            <div className="form-group">
              <input type="text" placeholder="Author" value={form.author} onChange={(e) => setField('author', e.target.value)} />
            </div>
            <div className={`form-group${form.genre && form.genre.split(/[\/,|]/).filter(Boolean).length > 1 ? ' genre-form-group' : ''}`}>
              {(() => {
                const genres = form.genre
                  ? form.genre.split(/[\/,|]/).map(g => g.trim()).filter(Boolean)
                  : [];
                if (genres.length > 1) {
                  const visible = genres.slice(0, 2);
                  const extra = genres.length - 2;
                  return (
                    <div className="genre-chips-field">
                      {visible.map((g, i) => <span key={i} className="genre-chip">{g}</span>)}
                      {extra > 0 && <span className="genre-chip genre-chip-more">+{extra} more</span>}
                      <button type="button" className="genre-chip-clear" onClick={() => setField('genre', '')}>✕</button>
                    </div>
                  );
                }
                return <input type="text" placeholder="Genre (e.g. Fantasy / Sci-Fi)" value={form.genre} onChange={(e) => setField('genre', e.target.value)} />;
              })()}
            </div>
            <div className="form-group">
              <input
                type="text"
                placeholder="Start date (dd/mm/yyyy)"
                value={form.startdate}
                onFocus={(e) => (e.target.type = 'date')}
                onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
                onChange={(e) => setField('startdate', e.target.value)}
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                placeholder="End date (dd/mm/yyyy)"
                value={form.enddate}
                onFocus={(e) => (e.target.type = 'date')}
                onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
                onChange={(e) => setField('enddate', e.target.value)}
              />
            </div>
          </div>

          {/* Review */}
          <div className="form-col review-col">
            <textarea
              placeholder="Write your thoughts..."
              value={form.review}
              onChange={(e) => setField('review', e.target.value)}
            />
          </div>
        </section>

        <hr className="divider" />

        {/* Stats Section */}
        <section className="stats-section">

          {/* Col 1: Ratings */}
          <div className="stats-col ratings-col">
            <p className="stats-col-label">Rating</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <RatingBlock type="stars" value={form.star_point} onChange={(v) => setField('star_point', v)} />
              <RatingBlock type="drama" value={form.drama_point} onChange={(v) => setField('drama_point', v)} />
              <RatingBlock type="spicy" value={form.spicy_point} onChange={(v) => setField('spicy_point', v)} />
            </div>
          </div>

          {/* Col 2: Platform */}
          <div className="stats-col platform-col">
            <p className="stats-col-label">Format</p>
            <div className="platform-options">
              {[
                { label: 'Paper', icon: 'fa-book' },
                { label: 'E-Book', icon: 'fa-tablet-screen-button' },
                { label: 'Audio', icon: 'fa-headphones' },
              ].map(({ label, icon }) => (
                <button
                  key={label}
                  className={`plat-btn${form.platform === label ? ' active' : ''}`}
                  onClick={() => setField('platform', form.platform === label ? '' : label)}
                >
                  <i className={`fa-solid ${icon}`} style={{ marginRight: 6, fontSize: '0.8rem' }}></i>{label}
                </button>
              ))}
            </div>
          </div>

          {/* Col 3: Timer */}
          <div className="stats-col time-col">
            <p className="stats-col-label">Reading Timer</p>
            <div className="tracking-box">
              <div className="live-timer">{formatTime(seconds)}</div>
              <div className="timer-controls">
                <button className="t-btn start-btn" onClick={start} disabled={running}>Start</button>
                <button className="t-btn finish-btn" onClick={handleFinish} disabled={!running}>Finish</button>
              </div>
            </div>
            <div className="total-time-wrapper">
              <h3>Total Reading Time</h3>
              <div className="digital-clock">
                <span className="time-digit">{ttH}</span>
                <span className="colon">:</span>
                <span className="time-digit">{ttM}</span>
                <span className="colon">:</span>
                <span className="time-digit">{ttS}</span>
              </div>
            </div>
          </div>

          {/* Col 4: Log + Save */}
          <div className="stats-col log-save-col">
            <div className="log-col" style={{ flex: 1 }}>
              <div className="log-header">
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>Reading Log</span>
                <button className="see-all" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => { if (lastSessionSec > 0) { showToast('Warning', 'Please save first!', 'error'); return; } setStatsOpen(true); }}>
                  See all &gt;
                </button>
              </div>
              <ul className="log-list">
                {[...readingLogs].reverse().slice(0, 5).map((log, i) => (
                  <li key={i} className="log-item">{formatTime(log.time)}</li>
                ))}
                {lastSessionSec > 0 && <li className="log-item" style={{ color: '#3b82f6' }}>{formatTime(lastSessionSec)} (unsaved)</li>}
              </ul>
            </div>
            <button className="btn btn-primary save-bottom-btn" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Journal'}
            </button>
          </div>

        </section>
      </main>

      <ChapterManager open={chapterOpen} onClose={() => setChapterOpen(false)} journalId={journalId} />
      <StatsModal open={statsOpen} onClose={() => setStatsOpen(false)} readingLogs={readingLogs} />
      <ShareReviewModal open={shareOpen} onClose={() => setShareOpen(false)} prefill={{ book_title: form.title, book_author: form.author, book_cover: coverImage, book_genre: form.genre, body: form.review, star_point: form.star_point, drama_point: form.drama_point, spicy_point: form.spicy_point }} />
      <BookSearchModal open={bookSearchOpen} onClose={() => setBookSearchOpen(false)} onSelect={handleBookSelect} />
    </div>
  );
}
