import express from 'express';
import db from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS admin_featured_authors (id INT AUTO_INCREMENT PRIMARY KEY, author_id VARCHAR(255) NOT NULL UNIQUE, name VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    const [rows] = await db.query('SELECT * FROM admin_featured_authors ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch' }); }
});

router.post('/', async (req, res) => {
  const { author_id, name } = req.body;
  if (!author_id || !name) return res.status(400).json({ error: 'author_id and name required' });
  try {
    await db.query('INSERT IGNORE INTO admin_featured_authors (author_id, name) VALUES (?, ?)', [author_id, name]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to save' }); }
});

router.put('/:id', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const author_id = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  try {
    await db.query('UPDATE admin_featured_authors SET name = ?, author_id = ? WHERE id = ?', [name, author_id, req.params.id]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to update' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM admin_featured_authors WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to delete' }); }
});

export default router;
