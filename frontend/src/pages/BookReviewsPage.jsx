import { useState, useEffect, useMemo } from 'react';
import SidebarPageLayout from '../components/layout/SidebarPageLayout';
import ShareReviewModal from '../components/ui/ShareReviewModal';
import CommentModal from '../components/ui/CommentModal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

const GENRES = ['All', 'Fantasy', 'Sci-Fi', 'Literary', 'Drama', 'Historical', 'Romance', 'Thriller'];
const AVATAR_COLORS = ['#4d7df1', '#2c6b75', '#d96673', '#7a4dcf', '#e7a93a', '#16a673', '#ef4444', '#64748b'];

function avatarColor(name = '') {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function Stars({ value, size = 14 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1,2,3,4,5].map(n => (
        <i key={n} className="fa-solid fa-star" style={{ fontSize: size, color: n <= value ? '#f59e0b' : '#ddd6cc' }} />
      ))}
    </span>
  );
}

function Avatar({ name, size = 32 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: avatarColor(name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

function ReviewCard({ review, isMe, myId, onLike, liked, onDelete, onComment, onFollow, following, onBookmark, bookmarked }) {
  const dateStr = new Date(review.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const isOwner = Number(review.user_id) === myId;

  return (
    <article style={{ background: '#fff', border: '1px solid #e8e2d6', borderRadius: 16, overflow: 'hidden', display: 'grid', gridTemplateColumns: '120px 1fr', transition: 'box-shadow 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 28px -10px rgba(26,52,68,0.18)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>

      {/* Cover */}
      <div style={{ position: 'relative', background: 'linear-gradient(135deg,#1e293b,#334155)', minHeight: 200 }}>
        {review.book_cover
          ? <img src={review.book_cover} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', padding: '10px 8px' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.7rem', lineHeight: 1.3 }}>{review.book_title}</span>
            </div>
        }
      </div>

      {/* Content */}
      <div style={{ display: 'flex', flexDirection: 'column', padding: '14px 16px' }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#15303a', lineHeight: 1.3, marginBottom: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {review.book_title}
        </div>
        <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 8 }}>{review.book_author}</div>

        {/* Ratings */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 7 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>
            Stars <Stars value={review.star_point} />
          </span>
          {review.drama_point > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600 }}>
              Drama {[1,2,3,4,5].map(n => <i key={n} className="fa-solid fa-droplet" style={{ fontSize: 11, color: n <= review.drama_point ? '#3b82f6' : '#ddd' }} />)}
            </span>
          )}
          {review.spicy_point > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>
              Spicy {[1,2,3,4,5].map(n => <i key={n} className="fa-solid fa-pepper-hot" style={{ fontSize: 11, color: n <= review.spicy_point ? '#ef4444' : '#ddd' }} />)}
            </span>
          )}
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
          {review.book_genre && <span style={{ padding: '2px 9px', borderRadius: 999, background: '#eff6ff', color: '#2563eb', fontSize: '0.68rem', fontWeight: 600 }}>{review.book_genre}</span>}
          {isMe && <span style={{ padding: '2px 9px', borderRadius: 999, background: '#cfe7ea', color: '#2c6b75', fontSize: '0.68rem', fontWeight: 600 }}>Your review</span>}
        </div>

        {/* Headline + Body */}
        {review.headline && (
          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#15303a', lineHeight: 1.4, marginBottom: 5 }}>
            "{review.headline}"
          </div>
        )}
        {review.body && (
          <p style={{ margin: '0 0 auto', fontSize: '0.8rem', color: '#4f6672', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {review.body}
          </p>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid #f0ece6' }}>
          {/* Left: avatar + name + follow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
            <Avatar name={review.username} size={28} />
            <div style={{ fontSize: '0.75rem', minWidth: 0 }}>
              <span style={{ fontWeight: 700, color: '#15303a' }}>{review.username}</span>
              <span style={{ color: '#94a3b8' }}> · {dateStr}</span>
            </div>
            {!isOwner && (
              <button
                onClick={() => onFollow(review.user_id)}
                style={{ padding: '2px 8px', borderRadius: 999, border: `1px solid ${following ? '#2c6b75' : '#e2e8f0'}`, background: following ? '#cfe7ea' : 'transparent', color: following ? '#2c6b75' : '#64748b', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                {following ? 'Following' : '+ Follow'}
              </button>
            )}
          </div>

          {/* Right: actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            <button onClick={() => onLike(review.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', color: liked ? '#d96673' : '#8a9aa6', padding: '4px 5px', borderRadius: 6, fontFamily: "'Prompt', sans-serif" }}>
              <i className={`fa-${liked ? 'solid' : 'regular'} fa-heart`} style={{ fontSize: 13 }}></i>
              {review.likes + (liked ? 1 : 0)}
            </button>
            <button onClick={() => onComment(review)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', color: '#8a9aa6', padding: '4px 5px', borderRadius: 6 }}>
              <i className="fa-regular fa-comment" style={{ fontSize: 13 }}></i>
              {review.comments_count || 0}
            </button>
            <button onClick={() => onBookmark(review.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: bookmarked ? '#2c6b75' : '#8a9aa6', padding: '4px 5px', borderRadius: 6, fontSize: 13, transition: 'color 0.15s' }}>
              <i className={`fa-${bookmarked ? 'solid' : 'regular'} fa-bookmark`}></i>
            </button>
            {isMe && (
              <button onClick={() => onDelete(review.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px 5px', borderRadius: 6, fontSize: 13 }}>
                <i className="fa-solid fa-trash"></i>
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function FeaturedReview({ review, liked, following, bookmarked, myId, onLike, onFollow, onBookmark, onComment }) {
  if (!review) return null;
  const dateStr = new Date(review.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const isMe = Number(review.user_id) === myId;
  const btnBase = { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', fontFamily: "'Prompt', sans-serif", padding: '5px 8px', borderRadius: 8, transition: 'background 0.15s' };
  return (
    <section style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 28, background: 'linear-gradient(135deg, #1a3a44 0%, #2c6b75 100%)', color: '#fff', borderRadius: 20, padding: '28px 32px', marginBottom: 28, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 'auto -40px -40px auto', width: 300, height: 300, background: 'radial-gradient(circle, rgba(255,255,255,0.07), transparent 60%)', pointerEvents: 'none' }} />
      <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 16px 32px -10px rgba(0,0,0,0.4)', background: 'linear-gradient(135deg,#3d4a72,#1c2747)', position: 'relative', aspectRatio: '2/3' }}>
        {review.book_cover
          ? <img src={review.book_cover} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', padding: 12 }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.3 }}>{review.book_title}</span>
            </div>
        }
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', padding: '20px 12px 10px' }}>
          <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#fff' }}>{review.book_title}</div>
          <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{review.book_author}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', padding: '5px 12px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14, width: 'fit-content' }}>
          ★ Editor's Pick · This Week
        </span>
        {review.headline && (
          <div style={{ fontStyle: 'italic', fontSize: '1.35rem', fontWeight: 700, lineHeight: 1.3, marginBottom: 6, color: '#fff' }}>
            "{review.headline}"
          </div>
        )}
        <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: 12 }}>on {review.book_title} — by {review.book_author}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <Stars value={review.star_point} size={15} />
          {review.book_genre && <span style={{ background: 'rgba(255,255,255,0.15)', padding: '2px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600 }}>{review.book_genre}</span>}
        </div>
        {review.body && (
          <p style={{ fontStyle: 'italic', fontSize: '0.92rem', lineHeight: 1.65, margin: '0 0 16px', maxWidth: '58ch', color: 'rgba(244,248,251,0.92)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            "{review.body}"
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.82rem' }}>
            {(review.username || '?').charAt(0).toUpperCase()}
          </div>
          <div style={{ fontSize: '0.82rem', flex: 1 }}>
            <strong>{review.username}</strong>
            <span style={{ opacity: 0.6 }}> · reviewed {dateStr}</span>
          </div>
          {!isMe && (
            <button onClick={() => onFollow(review.user_id)}
              style={{ padding: '4px 10px', borderRadius: 999, border: `1px solid ${following ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)'}`, background: following ? 'rgba(255,255,255,0.2)' : 'transparent', color: '#fff', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'Prompt', sans-serif" }}>
              {following ? 'Following' : '+ Follow'}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={() => onLike(review.id)} style={{ ...btnBase, color: liked ? '#f9a8b4' : 'rgba(255,255,255,0.7)' }}>
            <i className={`fa-${liked ? 'solid' : 'regular'} fa-heart`} style={{ fontSize: 14 }}></i>
            {review.likes + (liked ? 1 : 0)}
          </button>
          <button onClick={() => onComment(review)} style={{ ...btnBase, color: 'rgba(255,255,255,0.7)' }}>
            <i className="fa-regular fa-comment" style={{ fontSize: 14 }}></i>
            {review.comments_count || 0}
          </button>
          <button onClick={() => onBookmark(review.id)} style={{ ...btnBase, color: bookmarked ? '#fcd34d' : 'rgba(255,255,255,0.7)' }}>
            <i className={`fa-${bookmarked ? 'solid' : 'regular'} fa-bookmark`} style={{ fontSize: 14 }}></i>
          </button>
        </div>
      </div>
    </section>
  );
}

export default function BookReviewsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [reviews, setReviews] = useState([]);
  const [followingReviews, setFollowingReviews] = useState([]);
  const [savedReviews, setSavedReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [savedLoading, setSavedLoading] = useState(false);
  const [tab, setTab] = useState('discover');
  const [genre, setGenre] = useState('All');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('recent');
  const [liked, setLiked] = useState({});
  const [following, setFollowing] = useState({});
  const [bookmarked, setBookmarked] = useState({});
  const [shareOpen, setShareOpen] = useState(false);
  const [commentReview, setCommentReview] = useState(null);

  const myId = Number(user?.user_id);

  const load = async () => {
    setLoading(true);
    try {
      const res = await client.get('/api/reviews');
      const rows = Array.isArray(res.data) ? res.data : [];
      setReviews(rows);
      const fMap = {};
      const bMap = {};
      rows.forEach(r => {
        if (r.is_following) fMap[r.user_id] = true;
        if (r.is_bookmarked) bMap[r.id] = true;
      });
      setFollowing(fMap);
      setBookmarked(bMap);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFollowing = async () => {
    setFollowingLoading(true);
    try {
      const res = await client.get('/api/reviews/following');
      setFollowingReviews(Array.isArray(res.data) ? res.data : []);
    } catch {
      setFollowingReviews([]);
    } finally {
      setFollowingLoading(false);
    }
  };

  const loadSaved = async () => {
    setSavedLoading(true);
    try {
      const res = await client.get('/api/reviews/bookmarks');
      setSavedReviews(Array.isArray(res.data) ? res.data : []);
    } catch {
      setSavedReviews([]);
    } finally {
      setSavedLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleTabChange = (key) => {
    setTab(key);
    if (key === 'following' && followingReviews.length === 0) loadFollowing();
    if (key === 'saved') loadSaved();
  };

  const handleLike = async (id) => {
    setLiked(p => ({ ...p, [id]: !p[id] }));
    try { await client.post(`/api/reviews/${id}/like`); } catch { /* silent */ }
  };

  const handleDelete = async (id) => {
    try {
      await client.delete(`/api/reviews/${id}`);
      setReviews(prev => prev.filter(r => r.id !== id));
      setFollowingReviews(prev => prev.filter(r => r.id !== id));
      showToast('Deleted', 'Review removed', 'success');
    } catch {
      showToast('Error', 'Failed to delete review', 'error');
    }
  };

  const handleFollow = async (targetUserId) => {
    const targetId = Number(targetUserId);
    const wasFollowing = !!following[targetId];
    setFollowing(p => ({ ...p, [targetId]: !wasFollowing }));
    try {
      await client.post(`/api/reviews/follow/${targetId}`);
      if (!wasFollowing) {
        showToast('Following', 'You are now following this user', 'success');
        if (tab === 'following') loadFollowing();
      } else {
        showToast('Unfollowed', 'You unfollowed this user', 'success');
        if (tab === 'following') setFollowingReviews(prev => prev.filter(r => Number(r.user_id) !== targetId));
      }
    } catch {
      setFollowing(p => ({ ...p, [targetId]: wasFollowing }));
    }
  };

  const handleBookmark = async (id) => {
    const was = !!bookmarked[id];
    setBookmarked(p => ({ ...p, [id]: !was }));
    try {
      await client.post(`/api/reviews/${id}/bookmark`);
      showToast(was ? 'Removed' : 'Saved', was ? 'Bookmark removed' : 'Saved to bookmarks', 'success');
      if (tab === 'saved') {
        if (was) setSavedReviews(prev => prev.filter(r => r.id !== id));
        else loadSaved();
      }
    } catch {
      setBookmarked(p => ({ ...p, [id]: was }));
    }
  };

  const handleCommentCountChange = (reviewId, newCount) => {
    setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, comments_count: newCount } : r));
    setFollowingReviews(prev => prev.map(r => r.id === reviewId ? { ...r, comments_count: newCount } : r));
  };

  const applyFilters = (list) => {
    if (genre !== 'All') list = list.filter(r => (r.book_genre || '').toLowerCase() === genre.toLowerCase());
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(r =>
        (r.book_title || '').toLowerCase().includes(s) ||
        (r.headline || '').toLowerCase().includes(s) ||
        (r.book_author || '').toLowerCase().includes(s)
      );
    }
    if (sort === 'liked') list = [...list].sort((a, b) => b.likes - a.likes);
    return list;
  };

  const filtered = useMemo(() => {
    if (tab === 'mine') return applyFilters(reviews.filter(r => Number(r.user_id) === myId));
    if (tab === 'following') return applyFilters(followingReviews);
    if (tab === 'saved') return applyFilters(savedReviews);
    return applyFilters(reviews);
  }, [reviews, followingReviews, tab, genre, q, sort, myId]);

  const featured = tab === 'discover' ? reviews.find(r => r.star_point >= 4 && r.headline) : null;
  const gridList = featured ? filtered.filter(r => r.id !== featured.id) : filtered;
  const isLoadingTab = tab === 'following' ? followingLoading : tab === 'saved' ? savedLoading : loading;

  const cardProps = (r) => ({
    key: r.id,
    review: r,
    isMe: Number(r.user_id) === myId,
    myId,
    liked: !!liked[r.id],
    following: !!following[Number(r.user_id)],
    bookmarked: !!bookmarked[r.id],
    onLike: handleLike,
    onDelete: handleDelete,
    onComment: setCommentReview,
    onFollow: handleFollow,
    onBookmark: handleBookmark,
  });

  return (
    <SidebarPageLayout title="Book Reviews" icon="fa-star" accentColor="#f97316">
      <main style={{ padding: '28px 32px 60px', maxWidth: 1100, margin: '64px auto 0' }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: '#15303a', letterSpacing: '-0.02em', fontFamily: "'Prompt', sans-serif" }}>
            Book <span style={{ color: '#2c6b75', fontStyle: 'italic' }}>Reviews</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, background: '#e6f1f3', color: '#2c6b75', fontSize: '0.78rem', fontWeight: 600, marginLeft: 14, verticalAlign: 'middle' }}>
              <i className="fa-solid fa-book-open" style={{ fontSize: '0.72rem' }}></i>
              {reviews.length} reviews
            </span>
          </h1>
          <button onClick={() => setShareOpen(true)}
            style={{ padding: '10px 20px', borderRadius: 11, border: 'none', background: '#2c6b75', color: '#fff', fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 6px 14px -6px rgba(44,107,117,0.5)' }}>
            <i className="fa-solid fa-plus"></i> Share a Review
          </button>
        </div>
        <div style={{ fontSize: '0.78rem', color: '#8a9aa6', marginBottom: 20 }}>
          Reading Journal › <strong style={{ color: '#4f6672' }}>Book Reviews</strong>
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 2, background: '#fff', border: '1px solid #e8e2d6', borderRadius: 12, padding: 4 }}>
            {[['discover','Discover'],['following','Following'],['mine','My Reviews'],['saved','Saved']].map(([key, label]) => (
              <button key={key} onClick={() => handleTabChange(key)}
                style={{ padding: '7px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: "'Prompt', sans-serif", fontSize: '0.82rem', fontWeight: tab === key ? 700 : 500, background: tab === key ? '#1e293b' : 'transparent', color: tab === key ? '#fff' : '#4f6672', transition: 'all 0.15s' }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e8e2d6', borderRadius: 11, padding: '8px 14px', flex: 1, maxWidth: 360 }}>
            <i className="fa-solid fa-magnifying-glass" style={{ color: '#8a9aa6', fontSize: '0.82rem' }}></i>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search reviews, books, authors…"
              style={{ border: 'none', outline: 'none', background: 'transparent', flex: 1, fontFamily: "'Prompt', sans-serif", fontSize: '0.82rem', color: '#15303a' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #e8e2d6', borderRadius: 11, padding: '8px 14px' }}>
            <i className="fa-solid fa-bars" style={{ color: '#64748b', fontSize: '0.82rem' }}></i>
            <select value={sort} onChange={e => setSort(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', fontFamily: "'Prompt', sans-serif", fontSize: '0.82rem', color: '#15303a', cursor: 'pointer' }}>
              <option value="recent">Most recent</option>
              <option value="liked">Most liked</option>
            </select>
          </div>
        </div>

        {/* Genre chips */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 24 }}>
          {GENRES.map(g => (
            <button key={g} onClick={() => setGenre(g)}
              style={{ padding: '5px 14px', borderRadius: 999, border: `1.5px solid ${genre === g ? '#1e293b' : '#e8e2d6'}`, background: genre === g ? '#1e293b' : '#fff', color: genre === g ? '#fff' : '#4f6672', fontFamily: "'Prompt', sans-serif", fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}>
              {g}
            </button>
          ))}
        </div>

        {featured && (
          <FeaturedReview
            review={featured}
            liked={!!liked[featured.id]}
            following={!!following[Number(featured.user_id)]}
            bookmarked={!!bookmarked[featured.id]}
            myId={myId}
            onLike={handleLike}
            onFollow={handleFollow}
            onBookmark={handleBookmark}
            onComment={setCommentReview}
          />
        )}

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: '#15303a' }}>
            {tab === 'mine' ? 'Your reviews' : tab === 'following' ? 'From people you follow' : tab === 'saved' ? 'Saved reviews' : 'Latest from the community'}
          </h3>
          <span style={{ fontSize: '0.78rem', color: '#8a9aa6' }}>{filtered.length} results</span>
        </div>

        {isLoadingTab ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#8a9aa6' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.6rem', marginBottom: 12, display: 'block' }}></i>
            Loading reviews…
          </div>
        ) : gridList.length === 0 ? (
          <div style={{ padding: 48, background: '#fff', border: '1px dashed #dfd7c8', borderRadius: 16, textAlign: 'center', color: '#4f6672' }}>
            {tab === 'following' ? (
              <>
                <i className="fa-solid fa-user-group" style={{ fontSize: '2rem', color: '#c4bdb4', marginBottom: 12, display: 'block' }}></i>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#15303a', marginBottom: 6 }}>No reviews from people you follow.</div>
                <div style={{ fontSize: '0.85rem' }}>Follow reviewers using the + Follow button on their reviews.</div>
              </>
            ) : tab === 'saved' ? (
              <>
                <i className="fa-regular fa-bookmark" style={{ fontSize: '2rem', color: '#c4bdb4', marginBottom: 12, display: 'block' }}></i>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#15303a', marginBottom: 6 }}>No saved reviews yet.</div>
                <div style={{ fontSize: '0.85rem' }}>Click the bookmark icon on any review to save it here.</div>
              </>
            ) : (
              <>
                <i className="fa-solid fa-book-open" style={{ fontSize: '2rem', color: '#c4bdb4', marginBottom: 12, display: 'block' }}></i>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#15303a', marginBottom: 6 }}>No reviews yet.</div>
                <div style={{ fontSize: '0.85rem', marginBottom: 16 }}>Be the first to share what you thought.</div>
                <button onClick={() => setShareOpen(true)}
                  style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#2c6b75', color: '#fff', fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <i className="fa-solid fa-plus"></i> Share a Review
                </button>
              </>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 16 }}>
            {gridList.map(r => <ReviewCard {...cardProps(r)} />)}
          </div>
        )}
      </main>

      <ShareReviewModal open={shareOpen} onClose={() => { setShareOpen(false); load(); }} prefill={{}} />
      <CommentModal
        open={!!commentReview}
        onClose={() => setCommentReview(null)}
        review={commentReview}
        onCountChange={handleCommentCountChange}
      />
    </SidebarPageLayout>
  );
}
