import React, { useState, useEffect } from 'react';
import SidebarPageLayout from '../components/layout/SidebarPageLayout';
import BookDetailModal from '../components/ui/BookDetailModal';
import { useToast } from '../context/ToastContext';
import { addJournalFromSearch, toggleFavorite, getRecommendations } from '../api/search';
import '../styles/recommend.css';

/* ── helpers ── */
const titleGradient = (str = '') => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  const hue = Math.abs(h) % 360;
  return [`hsl(${hue},38%,22%)`, `hsl(${(hue + 40) % 360},48%,38%)`];
};

const parseMatch = (m) => {
  if (!m) return null;
  const n = parseInt(String(m).replace('%', ''), 10);
  return isNaN(n) ? null : String(n);
};

const matchToStars = (m) => {
  const n = parseInt(m, 10);
  if (isNaN(n)) return 3.5;
  if (n >= 92) return 5;
  if (n >= 84) return 4.5;
  if (n >= 76) return 4;
  if (n >= 65) return 3.5;
  return 3;
};

/* ── icons ── */
const Wand = (p) => <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 4V2M15 16v-2M8 9H6M22 9h-2M17.8 11.8 19 13M15 9h.01M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5"/></svg>;
const Sparkle = (p) => <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9.94 14.06 12 22l2.06-7.94L22 12l-7.94-2.06L12 2l-2.06 7.94L2 12l7.94 2.06z"/></svg>;
const Plus = (p) => <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>;
const Check = (p) => <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m5 12 5 5 9-11"/></svg>;
const Heart = (p) => <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
const HeartFill = (p) => <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" {...p}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
const RotateCw = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 2v6h-6"/><path d="M21 13a9 9 0 1 1-3-7.7L21 8"/></svg>;
const ChevL = (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m15 6-6 6 6 6"/></svg>;
const ChevR = (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m9 6 6 6-6 6"/></svg>;

/* ── Stars ── */
function Stars({ match }) {
  const v = matchToStars(match);
  return (
    <span className="rc-stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 24 24" width="11" height="11"
          fill={n <= Math.round(v) ? 'var(--rc-amber)' : '#dcd4c4'}>
          <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
    </span>
  );
}

/* ── Hero ── */
function Hero({ book, added, onAdd, favorited, onFavorite, onOpen }) {
  const [c1, c2] = titleGradient(book.title);
  const img = book.image || book.book_image;
  const match = parseMatch(book.match_percent);

  return (
    <section className="rc-hero" onClick={onOpen}>
      <div className="rc-hero-cover" style={{ background: `linear-gradient(135deg,${c1},${c2})` }}>
        <div className="rc-hero-cover-stripes" />
        {img && <img src={img} alt={book.title} onError={(e) => { e.target.style.display = 'none'; }} />}
        <div className="rc-hero-cover-text">
          <span className="rc-hero-cover-ribbon">Top pick</span>
          <div className="rc-hero-ctitle">{book.title}</div>
          <div className="rc-hero-csub">{book.author}</div>
        </div>
      </div>

      <div className="rc-hero-info">
        {match && (
          <div className="rc-ring" style={{ '--p': parseInt(match) }}>
            <div className="rc-ring-inner">
              <span className="rc-ring-pct">{match}%</span>
              <span className="rc-ring-lbl">match</span>
            </div>
          </div>
        )}

        <span className="rc-ftag"><Sparkle /> Hand-picked for you</span>
        <h2 className="rc-hero-title">{book.title}</h2>
        <div className="rc-hero-author">by {book.author || 'Unknown Author'}</div>

        <div className="rc-hero-stars-row">
          <Stars match={match} />
          {match
            ? <span className="rc-hero-match-pill match">{match}% match</span>
            : book.tier && <span className="rc-hero-match-pill tier">{book.tier}</span>
          }
        </div>

        {book.genre && (() => {
          const genres = String(book.genre).split(/[/,|]/).map(g => g.trim()).filter(Boolean).slice(0, 3);
          return <div className="rc-hero-genres">{genres.map((g, i) => <span key={i} className="rc-gpill">{g}</span>)}</div>;
        })()}

        {book.reason && <div className="rc-hero-reason"><Wand /> {book.reason}</div>}

        <div className="rc-hero-ctas" onClick={(e) => e.stopPropagation()}>
          <button className="rc-btn rc-btn-primary" onClick={onAdd}>
            {added ? <><Check /> Added</> : <><Plus /> Add to shelf</>}
          </button>
          <button className="rc-btn rc-btn-ghost" onClick={onFavorite}>
            {favorited ? <><HeartFill style={{ color: '#d96673' }} /> Saved</> : <><Heart /> Save</>}
          </button>
        </div>
      </div>
    </section>
  );
}

/* ── AlsoPanel ── */
function AlsoPanel({ books, allBooks, startIdx, addedMap, onAdd, favMap, onFav, onOpen }) {
  const [shift, setShift] = React.useState(0);
  const pool = allBooks && allBooks.length > 5 ? allBooks : books;
  const displayBooks = allBooks && allBooks.length > 5
    ? Array.from({ length: 5 }, (_, i) => pool[(startIdx + shift + i) % pool.length])
    : books;
  const canRefresh = pool.length > 5;

  return (
    <section className="rc-alsopanel">
      <div className="rc-alsohead">
        <h3>More picks <em>for you</em></h3>
        {canRefresh && (
          <button className="rc-also-refresh" onClick={() => setShift(s => (s + 5) % pool.length)} title="Show more">
            <RotateCw width={12} height={12} /> More
          </button>
        )}
      </div>
      <div className="rc-alsolist">
        {displayBooks.map((book, i) => {
          const [c1, c2] = titleGradient(book.title);
          const img = book.image || book.book_image;
          const match = parseMatch(book.match_percent);
          const genres = book.genre ? String(book.genre).split(/[/,|]/).map(g => g.trim()).filter(Boolean) : [];
          return (
            <div key={i} className="rc-arow" onClick={() => onOpen(book)}>
              <div className="rc-acov" style={{ background: `linear-gradient(135deg,${c1},${c2})` }}>
                {img ? <img src={img} alt={book.title} onError={(e) => { e.target.style.display = 'none'; }} /> : <span className="rc-acov-text">{book.title}</span>}
              </div>
              <div className="rc-ainfo">
                <div className="rc-at">{book.title}</div>
                <div className="rc-au">by {book.author || 'Unknown'}</div>
                <div className="rc-ameta">
                  {match ? <span className={`rc-mtag ${parseInt(match) < 85 ? 'warm' : ''}`}>● {match}%</span> : <span className="rc-mtag warm">Popular</span>}
                  <Stars match={match} />
                  {genres[0] && <span className="rc-ameta-genre">{genres[0]}</span>}
                </div>
              </div>
              <div className="rc-aact" onClick={(e) => e.stopPropagation()}>
                <button className={`rc-smallAdd ${addedMap[i] ? 'added' : ''}`} onClick={() => onAdd(book)}>
                  {addedMap[i] ? <Check width={11} height={11} /> : <Plus width={11} height={11} />}
                  {addedMap[i] ? 'Added' : 'Add'}
                </button>
                <button className={`rc-savePin ${favMap[i] ? 'on' : ''}`} onClick={() => onFav(book)}>
                  {favMap[i] ? <HeartFill width={13} height={13} style={{ color: '#d96673' }} /> : <Heart width={13} height={13} />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── Extra book card (bottom grid) ── */
function ExtraCard({ book, added, onAdd, onOpen }) {
  const [c1, c2] = titleGradient(book.title);
  const img = book.image || book.book_image;
  const match = parseMatch(book.match_percent);
  const genres = book.genre ? String(book.genre).split(/[/,|]/).map(g => g.trim()).filter(Boolean) : [];
  return (
    <article className="rc-ecard" onClick={onOpen}>
      <div className="rc-ecard-top" style={{ background: `linear-gradient(135deg,${c1},${c2})` }}>
        {img && <img src={img} alt={book.title} onError={(e) => { e.target.style.display = 'none'; }} />}
        {(match || book.tier) && (
          <span className="rc-ecard-badge">{match ? `${match}%` : book.tier}</span>
        )}
      </div>
      <div className="rc-ecard-body">
        <div className="rc-ecard-title">{book.title}</div>
        <div className="rc-ecard-author">by {book.author || '—'}</div>
        <div className="rc-ecard-foot">
          <Stars match={match} />
          {genres[0] && <span className="rc-ecard-genre">{genres[0]}</span>}
          <button
            className={`rc-ecard-add ${added ? 'added' : ''}`}
            onClick={(e) => { e.stopPropagation(); onAdd(); }}
          >
            {added ? <Check width={11} height={11} /> : <Plus width={11} height={11} />}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ── Moods ── */
const MOODS = [
  { key: 'm1', em: '🍂', title: 'Cozy & quiet', sub: 'Slow, comforting reads' },
  { key: 'm2', em: '💔', title: 'Tear me apart', sub: 'Bring tissues' },
  { key: 'm3', em: '🗝️', title: 'Escape reality', sub: 'Fantasy & sci-fi worlds' },
  { key: 'm4', em: '💡', title: 'Make me think', sub: 'Literary & ideas' },
];
function Moods({ active, onPick }) {
  return (
    <section className="rc-moods-row">
      <div className="rc-moods-head">
        <h3>What&apos;s the <em>mood?</em></h3>
        <span className="rc-moods-sub">Pick a feeling — we&apos;ll narrow it down.</span>
      </div>
      <div className="rc-moodgrid">
        {MOODS.map((m) => (
          <button key={m.key} className={`rc-mood ${m.key} ${active === m.key ? 'active' : ''}`}
            onClick={() => onPick(active === m.key ? null : m.key)}>
            <span className="rc-mood-em">{m.em}</span>
            <h5>{m.title}</h5>
            <span>{m.sub}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ── Page ── */
export default function RecommendPage() {
  const { showToast } = useToast();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageIdx, setPageIdx] = useState(0);
  const [selectedBook, setSelectedBook] = useState(null);
  const [added, setAdded] = useState({});
  const [favorited, setFavorited] = useState({});
  const [mood, setMood] = useState(null);

  useEffect(() => {
    getRecommendations()
      .then((res) => setBooks(Array.isArray(res.data) ? res.data : (res.data?.data || [])))
      .catch(() => showToast('Error', 'Failed to load recommendations', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  // Build pages: each page = hero + 5 panel + 4 extra (circular)
  const PANEL = 5;
  const EXTRA = 8;
  const TOTAL_PER_PAGE = 1 + PANEL + EXTRA; // 14
  const rawPages = books.length === 0 ? [] : books.map((hero, i) => {
    const pick = (offset) => books[(i + offset) % books.length];
    return {
      hero,
      list: Array.from({ length: PANEL }, (_, j) => pick(j + 1)),
      extra: Array.from({ length: EXTRA }, (_, j) => pick(j + PANEL + 1)),
    };
  });
  // One page every TOTAL_PER_PAGE books (non-overlapping heroes)
  const filteredPages = rawPages.filter((_, i) => i % TOTAL_PER_PAGE === 0).slice(0, 6);
  const totalPages = filteredPages.length;
  const goPage = (i) => setPageIdx(Math.max(0, Math.min(totalPages - 1, i)));

  const doAdd = async (book, key) => {
    try {
      await addJournalFromSearch({ title: book.title, author: book.author, book_image: book.image || book.book_image, genre: book.genre });
      showToast('Added', `"${book.title}" added to journals`, 'success');
      setAdded((a) => ({ ...a, [key]: true }));
      setSelectedBook(null);
    } catch (err) {
      showToast('Error', err.response?.data?.message || 'Failed', 'error');
    }
  };

  const doFav = async (book, key) => {
    try {
      const res = await toggleFavorite({ title: book.title, author: book.author, book_image: book.image || book.book_image, genre: book.genre });
      showToast('Done', res.data?.message || 'Toggled', 'success');
      setFavorited((f) => ({ ...f, [key]: !f[key] }));
    } catch {
      showToast('Error', 'Failed', 'error');
    }
  };

  return (
    <SidebarPageLayout
      title="Recommended Books"
      icon="fa-lightbulb"
      accentColor="#2c6b75"
      headerRight={<span className="rc-count-badge">{books.length} picks</span>}
    >
      <div className="rc-main">
        {loading ? (
          <div className="rc-empty">
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#2c6b75' }} />
            <p>Searching for books you may like…</p>
          </div>
        ) : books.length === 0 ? (
          <div className="rc-empty">
            <i className="fa-solid fa-robot" style={{ fontSize: '2.5rem', color: '#94a3b8' }} />
            <p>No recommendations yet. Add more journals to get personalized picks!</p>
          </div>
        ) : (
          <div className="rc-pager">
            <button className="rc-pagerNav left" onClick={() => goPage(pageIdx - 1)} disabled={pageIdx === 0}><ChevL /></button>
            <button className="rc-pagerNav right" onClick={() => goPage(pageIdx + 1)} disabled={pageIdx >= totalPages - 1}><ChevR /></button>

            <div className="rc-pagerstage">
              {filteredPages.map((pg, pi) => (
                <div key={pi} className={`rc-pagerframe ${pi === pageIdx ? 'on' : ''}`} aria-hidden={pi !== pageIdx}>

                  {/* col-left row-1: Hero */}
                  <Hero
                    book={pg.hero}
                    added={!!added[`${pi}-h`]}
                    onAdd={() => doAdd(pg.hero, `${pi}-h`)}
                    favorited={!!favorited[`${pi}-h`]}
                    onFavorite={() => doFav(pg.hero, `${pi}-h`)}
                    onOpen={() => setSelectedBook(pg.hero)}
                  />

                  {/* col-right rows-1+2: AlsoPanel (full height) */}
                  <AlsoPanel
                    books={pg.list}
                    allBooks={books}
                    startIdx={books.indexOf(pg.hero) + 1}
                    addedMap={pg.list.reduce((a, _, i2) => { a[i2] = !!added[`${pi}-l${i2}`]; return a; }, {})}
                    onAdd={(b) => doAdd(b)}
                    favMap={pg.list.reduce((a, _, i2) => { a[i2] = !!favorited[`${pi}-l${i2}`]; return a; }, {})}
                    onFav={(b) => doFav(b)}
                    onOpen={setSelectedBook}
                  />

                  {/* col-left row-2: Extra grid */}
                  <div className="rc-extra-grid">
                    {pg.extra.map((book, i2) => (
                      <ExtraCard
                        key={i2} book={book}
                        added={!!added[`${pi}-e${i2}`]}
                        onAdd={() => doAdd(book, `${pi}-e${i2}`)}
                        onOpen={() => setSelectedBook(book)}
                      />
                    ))}
                  </div>

                  {/* row-3 full width: Moods */}
                  <Moods active={mood} onPick={setMood} />
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="rc-pagerdots">
                {filteredPages.map((_, pi) => (
                  <button key={pi} className={`rc-dot ${pi === pageIdx ? 'on' : ''}`} onClick={() => goPage(pi)} />
                ))}
                <span className="rc-pager-lbl"><b>{pageIdx + 1}</b> of {totalPages}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <BookDetailModal
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
        onAddJournal={(b) => doAdd(b, `modal-${b.title}`)}
        onFavorite={(b) => doFav(b, `modal-fav-${b.title}`)}
      />
    </SidebarPageLayout>
  );
}
