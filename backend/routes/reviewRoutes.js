import express from 'express';
import db from '../db.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
const SECRET = process.env.JWT_SECRET || 'your_secret_key';

const verifyToken = (req, res, next) => {
  const token = (req.headers.authorization || '').split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return res.status(err.name === 'TokenExpiredError' ? 401 : 403).json({ message: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token' });
    req.user = decoded;
    next();
  });
};

const uid = (req) => req.user.id || req.user.userId;

const ensureTables = async () => {
  await db.query(`CREATE TABLE IF NOT EXISTS book_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    username VARCHAR(255),
    book_title VARCHAR(500) NOT NULL,
    book_author VARCHAR(255),
    book_cover VARCHAR(1000),
    book_genre VARCHAR(255),
    headline VARCHAR(500),
    body TEXT,
    star_point INT DEFAULT 0,
    drama_point INT DEFAULT 0,
    spicy_point INT DEFAULT 0,
    visibility ENUM('public','friends','private') DEFAULT 'public',
    likes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX(user_id), INDEX(visibility)
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS review_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    review_id INT NOT NULL,
    user_id INT NOT NULL,
    username VARCHAR(255),
    body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX(review_id)
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS review_bookmarks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    review_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_bookmark (user_id, review_id),
    INDEX(user_id)
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS user_follows (
    id INT AUTO_INCREMENT PRIMARY KEY,
    follower_id INT NOT NULL,
    following_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_follow (follower_id, following_id),
    INDEX(follower_id), INDEX(following_id)
  )`);
};
ensureTables();

// GET /api/reviews — public + mine, with comment count
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = uid(req);
    const [rows] = await db.query(
      `SELECT r.*,
        (SELECT COUNT(*) FROM review_comments c WHERE c.review_id = r.id) AS comments_count,
        (SELECT COUNT(*) FROM user_follows f WHERE f.follower_id = ? AND f.following_id = r.user_id) AS is_following,
        (SELECT COUNT(*) FROM review_bookmarks bk WHERE bk.user_id = ? AND bk.review_id = r.id) AS is_bookmarked
       FROM book_reviews r
       WHERE r.visibility='public' OR r.user_id=?
       ORDER BY r.created_at DESC LIMIT 100`,
      [userId, userId, userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reviews/following — reviews from followed users
router.get('/following', verifyToken, async (req, res) => {
  try {
    const userId = uid(req);
    const [rows] = await db.query(
      `SELECT r.*,
        (SELECT COUNT(*) FROM review_comments c WHERE c.review_id = r.id) AS comments_count,
        1 AS is_following
       FROM book_reviews r
       INNER JOIN user_follows f ON f.following_id = r.user_id AND f.follower_id = ?
       WHERE r.visibility='public'
       ORDER BY r.created_at DESC LIMIT 100`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reviews
router.post('/', verifyToken, async (req, res) => {
  try {
    const userId = uid(req);
    const { book_title, book_author, book_cover, book_genre, headline, body, star_point, drama_point, spicy_point, visibility } = req.body;
    if (!book_title) return res.status(400).json({ message: 'book_title required' });
    const [result] = await db.query(
      `INSERT INTO book_reviews (user_id, username, book_title, book_author, book_cover, book_genre, headline, body, star_point, drama_point, spicy_point, visibility)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, req.user.username || req.user.name || 'User', book_title, book_author, book_cover, book_genre, headline, body, star_point || 0, drama_point || 0, spicy_point || 0, visibility || 'public']
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reviews/:id/like
router.post('/:id/like', verifyToken, async (req, res) => {
  try {
    await db.query(`UPDATE book_reviews SET likes = likes + 1 WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reviews/admin/all — admin: all reviews
router.get('/admin/all', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const [rows] = await db.query(
      `SELECT r.*, (SELECT COUNT(*) FROM review_comments c WHERE c.review_id = r.id) AS comments_count
       FROM book_reviews r ORDER BY r.created_at DESC LIMIT 500`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/reviews/:id
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const userId = uid(req);
    const [rows] = await db.query(`SELECT user_id FROM book_reviews WHERE id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    if (rows[0].user_id !== userId && req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    await db.query(`DELETE FROM review_comments WHERE review_id = ?`, [req.params.id]);
    await db.query(`DELETE FROM book_reviews WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reviews/:id/comments
router.get('/:id/comments', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM review_comments WHERE review_id = ? ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reviews/:id/comments
router.post('/:id/comments', verifyToken, async (req, res) => {
  try {
    const userId = uid(req);
    const { body } = req.body;
    if (!body?.trim()) return res.status(400).json({ message: 'body required' });
    const [result] = await db.query(
      `INSERT INTO review_comments (review_id, user_id, username, body) VALUES (?, ?, ?, ?)`,
      [req.params.id, userId, req.user.username || 'User', body.trim()]
    );
    const [[comment]] = await db.query(`SELECT * FROM review_comments WHERE id = ?`, [result.insertId]);
    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reviews/:id/bookmark — toggle bookmark
router.post('/:id/bookmark', verifyToken, async (req, res) => {
  try {
    const userId = uid(req);
    const reviewId = req.params.id;
    const [existing] = await db.query(
      `SELECT id FROM review_bookmarks WHERE user_id = ? AND review_id = ?`,
      [userId, reviewId]
    );
    if (existing.length) {
      await db.query(`DELETE FROM review_bookmarks WHERE user_id = ? AND review_id = ?`, [userId, reviewId]);
      res.json({ bookmarked: false });
    } else {
      await db.query(`INSERT INTO review_bookmarks (user_id, review_id) VALUES (?, ?)`, [userId, reviewId]);
      res.json({ bookmarked: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reviews/bookmarks — my bookmarked reviews
router.get('/bookmarks', verifyToken, async (req, res) => {
  try {
    const userId = uid(req);
    const [rows] = await db.query(
      `SELECT r.*,
        (SELECT COUNT(*) FROM review_comments c WHERE c.review_id = r.id) AS comments_count,
        1 AS is_bookmarked
       FROM book_reviews r
       INNER JOIN review_bookmarks b ON b.review_id = r.id AND b.user_id = ?
       ORDER BY b.created_at DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reviews/follow/:userId — toggle follow
router.post('/follow/:targetId', verifyToken, async (req, res) => {
  try {
    const followerId = uid(req);
    const targetId = Number(req.params.targetId);
    if (followerId === targetId) return res.status(400).json({ message: 'Cannot follow yourself' });

    const [existing] = await db.query(
      `SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ?`,
      [followerId, targetId]
    );
    if (existing.length) {
      await db.query(`DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?`, [followerId, targetId]);
      res.json({ following: false });
    } else {
      await db.query(`INSERT INTO user_follows (follower_id, following_id) VALUES (?, ?)`, [followerId, targetId]);
      res.json({ following: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
