import express from 'express';
import db from '../db.js';

const router = express.Router();

// Table created lazily on first GET request

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM admin_featured_books ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

router.post('/', async (req, res) => {
  const { book_id, title, author, cover, genre, description } = req.body;
  if (!book_id || !title) return res.status(400).json({ error: 'book_id and title required' });
  try {
    await db.query(
      'INSERT IGNORE INTO admin_featured_books (book_id, title, author, cover, genre, description) VALUES (?, ?, ?, ?, ?, ?)',
      [book_id, title, author || '', cover || '', genre || 'General', description || '']
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM admin_featured_books WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

export default router;
