const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Get reviews for a book
router.get('/book/:bookId', (req, res) => {
  const reviews = db.prepare(`
    SELECT r.*, u.name as user_name, u.avatar as user_avatar, u.telegram_username
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.book_id = ?
    ORDER BY r.created_at DESC
  `).all(req.params.bookId);
  res.json(reviews);
});

// Get reviews by current user
router.get('/my', authenticate, (req, res) => {
  const reviews = db.prepare(`
    SELECT r.*, b.title as book_title, b.author as book_author, b.cover_url
    FROM reviews r
    JOIN books b ON r.book_id = b.id
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC
  `).all(req.user.id);
  res.json(reviews);
});

// Create or update review
router.post('/', authenticate, (req, res) => {
  const { book_id, content, rating } = req.body;
  
  if (!book_id || !content || !rating)
    return res.status(400).json({ error: 'Barcha maydonlarni to\'ldiring' });

  if (content.trim().length < 10)
    return res.status(400).json({ error: 'Taqriz kamida 10 ta belgi bo\'lishi kerak' });

  if (rating < 1 || rating > 5)
    return res.status(400).json({ error: 'Baho 1 dan 5 gacha bo\'lishi kerak' });

  const book = db.prepare('SELECT id FROM books WHERE id = ?').get(book_id);
  if (!book) return res.status(404).json({ error: 'Kitob topilmadi' });

  const existing = db.prepare('SELECT id FROM reviews WHERE user_id=? AND book_id=?').get(req.user.id, book_id);

  if (existing) {
    db.prepare('UPDATE reviews SET content=?, rating=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
      .run(content.trim(), rating, existing.id);
  } else {
    db.prepare('INSERT INTO reviews (user_id, book_id, content, rating) VALUES (?,?,?,?)')
      .run(req.user.id, book_id, content.trim(), rating);
  }

  const review = db.prepare(`
    SELECT r.*, u.name as user_name, u.avatar as user_avatar
    FROM reviews r JOIN users u ON r.user_id = u.id
    WHERE r.user_id=? AND r.book_id=?
  `).get(req.user.id, book_id);

  res.json(review);
});

// Delete review
router.delete('/:id', authenticate, (req, res) => {
  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id);
  if (!review) return res.status(404).json({ error: 'Taqriz topilmadi' });

  if (review.user_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Ruxsat yo\'q' });

  db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Get recent reviews (for home page)
router.get('/recent', (req, res) => {
  const reviews = db.prepare(`
    SELECT r.*, u.name as user_name, u.avatar as user_avatar,
           b.title as book_title, b.author as book_author, b.cover_url
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    JOIN books b ON r.book_id = b.id
    ORDER BY r.created_at DESC
    LIMIT 6
  `).all();
  res.json(reviews);
});

module.exports = router;
