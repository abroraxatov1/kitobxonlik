const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticate } = require('../middleware/auth');

// Get user's books by status
router.get('/books', authenticate, (req, res) => {
  const { status } = req.query;
  
  let where = 'ub.user_id = ?';
  let params = [req.user.id];
  
  if (status) {
    where += ' AND ub.status = ?';
    params.push(status);
  }

  const books = db.prepare(`
    SELECT b.*, ub.status, ub.rating as user_rating, ub.started_at, ub.finished_at, ub.created_at as added_at
    FROM user_books ub
    JOIN books b ON ub.book_id = b.id
    WHERE ${where}
    ORDER BY ub.created_at DESC
  `).all(...params);

  res.json(books);
});

// Add or update book status
router.post('/books', authenticate, (req, res) => {
  const { book_id, status, rating, started_at, finished_at } = req.body;
  
  if (!book_id || !status)
    return res.status(400).json({ error: 'Kitob va holat talab etiladi' });
    
  const validStatuses = ['reading', 'read', 'want_to_read', 'favorite'];
  if (!validStatuses.includes(status))
    return res.status(400).json({ error: 'Noto\'g\'ri holat' });

  const book = db.prepare('SELECT id FROM books WHERE id = ?').get(book_id);
  if (!book) return res.status(404).json({ error: 'Kitob topilmadi' });

  // Check existing
  const existing = db.prepare('SELECT id FROM user_books WHERE user_id=? AND book_id=? AND status=?')
    .get(req.user.id, book_id, status);

  if (existing) {
    db.prepare('UPDATE user_books SET rating=COALESCE(?,rating), started_at=COALESCE(?,started_at), finished_at=COALESCE(?,finished_at) WHERE id=?')
      .run(rating || null, started_at || null, finished_at || null, existing.id);
  } else {
    db.prepare('INSERT INTO user_books (user_id, book_id, status, rating, started_at, finished_at) VALUES (?,?,?,?,?,?)')
      .run(req.user.id, book_id, status, rating || null, started_at || null, finished_at || null);
  }

  res.json({ success: true });
});

// Remove book from shelf
router.delete('/books', authenticate, (req, res) => {
  const { book_id, status } = req.body;
  if (!book_id || !status) return res.status(400).json({ error: 'Kitob va holat talab etiladi' });

  db.prepare('DELETE FROM user_books WHERE user_id=? AND book_id=? AND status=?')
    .run(req.user.id, book_id, status);

  res.json({ success: true });
});

// Get user profile (public)
router.get('/:id', (req, res) => {
  const user = db.prepare('SELECT id, name, avatar, telegram_username, created_at FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });

  const stats = {
    reading: db.prepare('SELECT COUNT(*) as c FROM user_books WHERE user_id=? AND status=?').get(req.params.id, 'reading').c,
    read: db.prepare('SELECT COUNT(*) as c FROM user_books WHERE user_id=? AND status=?').get(req.params.id, 'read').c,
    want_to_read: db.prepare('SELECT COUNT(*) as c FROM user_books WHERE user_id=? AND status=?').get(req.params.id, 'want_to_read').c,
    favorites: db.prepare('SELECT COUNT(*) as c FROM user_books WHERE user_id=? AND status=?').get(req.params.id, 'favorite').c,
    reviews: db.prepare('SELECT COUNT(*) as c FROM reviews WHERE user_id=?').get(req.params.id).c
  };

  res.json({ ...user, stats });
});

module.exports = router;
