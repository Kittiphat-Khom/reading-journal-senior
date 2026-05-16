import React, { useState, useEffect } from 'react';
import SidebarPageLayout from '../components/layout/SidebarPageLayout';
import BookDetailModal from '../components/ui/BookDetailModal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
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


const matchToStars = (m, rating) => {
  // If real rating exists (from Hardcover), use it directly (scale 0–5)
  if (rating && typeof rating === 'number' && rating > 0) return Math.min(5, rating);
  // Fallback: derive from match %
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
const ChevL = (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m15 6-6 6 6 6"/></svg>;
const ChevR = (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m9 6 6 6-6 6"/></svg>;

/* ── Stars ── */
function Stars({ match, rating, showScore }) {
  const v = matchToStars(match, rating);
  const label = v.toFixed(1);
  return (
    <span className="rc-stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 24 24" width="11" height="11"
          fill={n <= Math.round(v) ? 'var(--rc-amber)' : '#dcd4c4'}>
          <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
      {showScore && <span className="rc-stars-score">{label}</span>}
    </span>
  );
}

/* ── DualHero: ONE card, 2 books side-by-side ── */
function HalfBook({ book, added, onAdd, favorited, onFavorite, onOpen, ribbon, rank }) {
  const [c1, c2] = titleGradient(book.title);
  const img = book.image || book.book_image;
  const match = parseMatch(book.match_percent);
  const genres = book.genre ? String(book.genre).split(/[/,|]/).map(g => g.trim()).filter(Boolean).slice(0, 2) : [];
  return (
    <div className="rc-dhalf" onClick={onOpen}>
      <div className="rc-dhalf-cover" style={{ background: `linear-gradient(135deg,${c1},${c2})` }}>
        <div className="rc-hero-cover-stripes" />
        {img && <img src={img} alt={book.title} onError={(e) => { e.target.style.display = 'none'; }} />}
        {rank && <span className="rc-dhalf-rank">#{rank}</span>}
        <div className="rc-hero-cover-text">
          <span className="rc-hero-cover-ribbon">{ribbon}</span>
          <div className="rc-hero-ctitle">{book.title}</div>
          <div className="rc-hero-csub">{book.author}</div>
        </div>
      </div>
      <div className="rc-dhalf-info">
        <span className="rc-ftag"><Sparkle /> {ribbon}</span>
        <h2 className="rc-hero-title">{book.title}</h2>
        <div className="rc-hero-author">by {book.author || 'Unknown Author'}</div>
        <div className="rc-hero-stars-row">
          <Stars match={match} rating={book.rating} showScore />
          {match
            ? <span className="rc-hero-match-pill match">{match}% match</span>
            : book.tier && <span className="rc-hero-match-pill tier">{book.tier}</span>
          }
        </div>
        {genres.length > 0 && (
          <div className="rc-hero-genres">{genres.map((g, i) => <span key={i} className="rc-gpill">{g}</span>)}</div>
        )}
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
    </div>
  );
}

function DualHero({ book1, book2, added1, onAdd1, favorited1, onFavorite1, onOpen1, added2, onAdd2, favorited2, onFavorite2, onOpen2 }) {
  return (
    <section className="rc-dual-hero">
      <HalfBook book={book1} added={added1} onAdd={onAdd1} favorited={favorited1} onFavorite={onFavorite1} onOpen={onOpen1} ribbon="Top pick" rank={1} />
      <div className="rc-dual-divider" />
      <HalfBook book={book2} added={added2} onAdd={onAdd2} favorited={favorited2} onFavorite={onFavorite2} onOpen={onOpen2} ribbon="Also for you" rank={2} />
    </section>
  );
}

/* ── AlsoPanel ── */
// eslint-disable-next-line no-unused-vars
function AlsoPanel({ books, poolBooks, addedMap, onAdd, favMap, onFav, onOpen }) {
  const displayBooks = books;

  return (
    <section className="rc-alsopanel">
      <div className="rc-alsohead">
        <h3>Popular <em>picks</em></h3>
      </div>
      <div className="rc-alsolist">
        {displayBooks.map((book, i) => {
          const [c1, c2] = titleGradient(book.title);
          const img = book.image || book.book_image;
          const match = parseMatch(book.match_percent);
          const genres = book.genre ? String(book.genre).split(/[/,|]/).map(g => g.trim()).filter(Boolean) : [];
          const isAdded = addedMap[i];
          const isFav = favMap[i];
          return (
            <div key={i} className="rc-arow" onClick={() => onOpen(book)}>
              <span className="rc-arow-num">{i + 1}</span>
              <div className="rc-acov" style={{ background: `linear-gradient(135deg,${c1},${c2})` }}>
                {img ? <img src={img} alt={book.title} onError={(e) => { e.target.style.display = 'none'; }} /> : <span className="rc-acov-text">{book.title}</span>}
              </div>
              <div className="rc-ainfo">
                <div className="rc-at">{book.title}</div>
                <div className="rc-au">by {book.author || 'Unknown'}</div>
                <div className="rc-ameta">
                  {match
                    ? <span className={`rc-mtag ${parseInt(match) < 85 ? 'warm' : ''}`}>● {match}% match</span>
                    : <span className="rc-mtag warm">{book.tier || 'Popular'}</span>
                  }
                  <Stars match={match} rating={book.rating} showScore />
                  {genres[0] && <span className="rc-ameta-genre">{genres[0]}</span>}
                </div>
              </div>
              <div className="rc-aact" onClick={(e) => e.stopPropagation()}>
                <button className={`rc-smallAdd ${isAdded ? 'added' : ''}`} onClick={() => onAdd(book)}>
                  {isAdded ? <Check width={11} height={11} /> : <Plus width={11} height={11} />}
                  {isAdded ? 'Added' : 'Add to shelf'}
                </button>
                <button className={`rc-savePin ${isFav ? 'on' : ''}`} onClick={() => onFav(book)}>
                  {isFav ? <HeartFill width={11} height={11} style={{ color: '#d96673' }} /> : <Heart width={11} height={11} />}
                  {isFav ? 'Saved' : 'Save'}
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
function ExtraCard({ book, rank, added, onAdd, onOpen }) {
  const [c1, c2] = titleGradient(book.title);
  const img = book.image || book.book_image;
  const match = parseMatch(book.match_percent);
  const genres = book.genre ? String(book.genre).split(/[/,|]/).map(g => g.trim()).filter(Boolean) : [];
  return (
    <article className="rc-ecard" onClick={onOpen}>
      <div className="rc-ecard-top" style={{ background: `linear-gradient(135deg,${c1},${c2})` }}>
        {img && <img src={img} alt={book.title} onError={(e) => { e.target.style.display = 'none'; }} />}
        {rank && <span className="rc-ecard-rank">#{rank}</span>}
        {(match || book.tier) && (
          <span className="rc-ecard-badge">{match ? `${match}%` : book.tier}</span>
        )}
      </div>
      <div className="rc-ecard-body">
        <div className="rc-ecard-title">{book.title}</div>
        <div className="rc-ecard-author">by {book.author || '—'}</div>
        <div className="rc-ecard-foot">
          <Stars match={match} rating={book.rating} showScore />
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
// eslint-disable-next-line no-unused-vars
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
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageIdx, setPageIdx] = useState(0);
  const [selectedBook, setSelectedBook] = useState(null);
  const [added, setAdded] = useState({});
  const [favorited, setFavorited] = useState({});

  useEffect(() => {
    getRecommendations()
      .then((res) => setBooks(Array.isArray(res.data) ? res.data : (res.data?.data || [])))
      .catch(() => showToast('Error', 'Failed to load recommendations', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  // Parse score from book (score field = 0.0–1.0, or 0 if Popular fallback)
  const getScore = (b) => typeof b.score === 'number' ? b.score : 0;

  // Check if user has real preferences (any book scored above Popular threshold)
  const hasPreference = books.some(b => getScore(b) >= 0.10);

  // Build pages
  const filteredPages = React.useMemo(() => {
    if (books.length === 0) return [];

    const sorted = [...books].sort((a, b) => getScore(b) - getScore(a));
    const byRating = [...books].sort((a, b) => (b.rating || 0) - (a.rating || 0));

    const getPopularList = (heroKeys) =>
      byRating.filter(b => !heroKeys.has(b.book_id || b.title)).slice(0, 5);

    if (!hasPreference) {
      const pages = [];
      const pageSize = 15;
      const totalPages = Math.min(6, Math.ceil(byRating.length / pageSize));
      for (let p = 0; p < totalPages; p++) {
        const offset = p * pageSize;
        const pick = (i) => byRating[(offset + i) % byRating.length];
        const hero  = pick(0);
        const hero2 = pick(1);
        const heroKeys = new Set([hero.book_id || hero.title, hero2.book_id || hero2.title]);
        pages.push({
          hero, hero2,
          popularList: getPopularList(heroKeys),
          extra: Array.from({ length: 8 }, (_, i) => pick(i + 7)),
        });
      }
      return pages;
    }

    // Has preference → split by score threshold
    const highBooks = sorted.filter(b => getScore(b) >= 0.80);
    const heroPool  = sorted.slice(0, Math.max(6, sorted.length));
    const heroStep  = Math.ceil(heroPool.length / 6);

    const pages = [];
    const globalUsed = new Set();

    const pickFrom = (pool, n) => {
      const result = [];
      for (const b of pool) {
        if (result.length >= n) break;
        const key = b.book_id || b.title;
        if (!globalUsed.has(key)) { result.push(b); globalUsed.add(key); }
      }
      if (result.length < n) {
        for (const b of sorted) {
          if (result.length >= n) break;
          const key = b.book_id || b.title;
          if (!globalUsed.has(key)) { result.push(b); globalUsed.add(key); }
        }
      }
      return result;
    };

    const extraPool = highBooks.length >= 4 ? highBooks : sorted;

    for (let p = 0; p < Math.min(6, heroPool.length); p++) {
      const hero  = heroPool[p * heroStep] || heroPool[p] || sorted[0];
      const hero2 = heroPool[p * heroStep + 1] || heroPool[p + 1] || sorted[1] || hero;
      globalUsed.add(hero.book_id  || hero.title);
      globalUsed.add(hero2.book_id || hero2.title);
      const heroKeys = new Set([hero.book_id || hero.title, hero2.book_id || hero2.title]);
      const extra = pickFrom(extraPool, 8);
      pages.push({ hero, hero2, popularList: getPopularList(heroKeys), extra });
    }

    return pages;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [books]);
  const totalPages = filteredPages.length;
  const goPage = (i) => setPageIdx(Math.max(0, Math.min(totalPages - 1, i)));

  const pendingAdd = React.useRef(new Set());

  const doAdd = async (book, key) => {
    // Use title as dedup key if no explicit key given
    const trackKey = key ?? `title-${book.title}`;
    // Guard: already added or request in-flight
    if (added[trackKey] || pendingAdd.current.has(trackKey)) return;
    pendingAdd.current.add(trackKey);
    try {
      await addJournalFromSearch({ title: book.title, author: book.author, book_image: book.image || book.book_image, genre: book.genre });
      showToast('Added', `"${book.title}" added to shelf`, 'success');
      setAdded((a) => ({ ...a, [trackKey]: true }));
      setSelectedBook(null);
    } catch (err) {
      if (err.response?.status === 409) {
        setAdded((a) => ({ ...a, [trackKey]: true }));
        showToast('Already added', `"${book.title}" is already in your shelf`, 'info');
      } else {
        showToast('Error', err.response?.data?.message || 'Failed', 'error');
      }
    } finally {
      pendingAdd.current.delete(trackKey);
    }
  };

  const doFav = async (book, key) => {
    try {
      const res = await toggleFavorite({ user_id: user?.user_id, title: book.title, author: book.author, book_image: book.image || book.book_image, genre: book.genre });
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
              {filteredPages.map((pg, pi) => {
                  return (
                <div key={pi} className={`rc-pagerframe ${pi === pageIdx ? 'on' : ''}`} aria-hidden={pi !== pageIdx}>

                  {/* col-left row-1: dual hero (1 card, 2 books split L/R) */}
                  <DualHero
                    book1={pg.hero}
                    added1={!!added[`${pi}-h`]}
                    onAdd1={() => doAdd(pg.hero, `${pi}-h`)}
                    favorited1={!!favorited[`${pi}-h`]}
                    onFavorite1={() => doFav(pg.hero, `${pi}-h`)}
                    onOpen1={() => setSelectedBook(pg.hero)}
                    book2={pg.hero2 || pg.hero}
                    added2={!!added[`${pi}-h2`]}
                    onAdd2={() => doAdd(pg.hero2 || pg.hero, `${pi}-h2`)}
                    favorited2={!!favorited[`${pi}-h2`]}
                    onFavorite2={() => doFav(pg.hero2 || pg.hero, `${pi}-h2`)}
                    onOpen2={() => setSelectedBook(pg.hero2 || pg.hero)}
                  />

                  {/* col-right rows-1+2: AlsoPanel (full height) */}
                  <AlsoPanel
                    key={pi}
                    books={pg.popularList || []}
                    poolBooks={[]}
                    addedMap={(pg.popularList || []).reduce((a, b, i2) => { a[i2] = !!added[`title-${b.title}`]; return a; }, {})}
                    onAdd={(b) => doAdd(b)}
                    favMap={(pg.popularList || []).reduce((a, _, i2) => { a[i2] = !!favorited[`${pi}-l${i2}`]; return a; }, {})}
                    onFav={(b) => doFav(b)}
                    onOpen={setSelectedBook}
                  />

                  {/* col-left row-2: Extra grid */}
                  <div className="rc-extra-grid">
                    {pg.extra.map((book, i2) => (
                      <ExtraCard
                        key={i2} book={book}
                        rank={i2 + 3}
                        added={!!added[`${pi}-e${i2}`]}
                        onAdd={() => doAdd(book, `${pi}-e${i2}`)}
                        onOpen={() => setSelectedBook(book)}
                      />
                    ))}
                  </div>

                </div>
                  );
                })}
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
