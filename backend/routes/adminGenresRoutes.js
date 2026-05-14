import express from 'express';
import db from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS admin_genres (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE)`);
    const [rows] = await db.query('SELECT * FROM admin_genres ORDER BY name ASC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  const [result] = await db.query('INSERT INTO admin_genres (name) VALUES (?)', [name.trim()]);
  res.json({ id: result.insertId, name: name.trim() });
});

router.put('/:id', async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  await db.query('UPDATE admin_genres SET name = ? WHERE id = ?', [name.trim(), req.params.id]);
  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  await db.query('DELETE FROM admin_genres WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

export default router;
