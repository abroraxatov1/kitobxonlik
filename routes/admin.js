const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate, requireAdmin);

// Get overall statistics
router.get('/stats', (req, res) => {
  const stats = {
    users: db.prepare('SELECT COUNT(*) as c FROM users WHERE role != ?').get('admin').c,
    books: db.prepare('SELECT COUNT(*) as c FROM books').get().c,
    reviews: db.prepare('SELECT COUNT(*) as c FROM reviews').get().c,
    reading: db.prepare('SELECT COUNT(*) as c FROM user_books WHERE status=?').get('reading').c,
    read: db.prepare('SELECT COUNT(*) as c FROM user_books WHERE status=?').get('read').c,
    favorites: db.prepare('SELECT COUNT(*) as c FROM user_books WHERE status=?').get('favorite').c,
    want_to_read: db.prepare('SELECT COUNT(*) as c FROM user_books WHERE status=?').get('want_to_read').c,
    newUsersThisMonth: db.prepare("SELECT COUNT(*) as c FROM users WHERE created_at >= date('now', '-30 days') AND role != 'admin'").get().c,
    newReviewsThisMonth: db.prepare("SELECT COUNT(*) as c FROM reviews WHERE created_at >= date('now', '-30 days')").get().c
  };

  const topBooks = db.prepare(`
    SELECT b.id, b.title, b.author, b.genre,
      COUNT(DISTINCT r.id) as review_count,
      COUNT(DISTINCT ub.id) FILTER (WHERE ub.status='favorite') as likes,
      ROUND(AVG(r.rating), 1) as avg_rating
    FROM books b
    LEFT JOIN reviews r ON b.id = r.book_id
    LEFT JOIN user_books ub ON b.id = ub.book_id
    GROUP BY b.id
    ORDER BY review_count DESC, likes DESC
    LIMIT 10
  `).all();

  const topGenres = db.prepare(`
    SELECT genre, COUNT(*) as count
    FROM books WHERE genre IS NOT NULL
    GROUP BY genre ORDER BY count DESC LIMIT 8
  `).all();

  const recentUsers = db.prepare(`
    SELECT id, name, email, telegram_username, role, created_at
    FROM users ORDER BY created_at DESC LIMIT 5
  `).all();

  const recentReviews = db.prepare(`
    SELECT r.*, u.name as user_name, b.title as book_title
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    JOIN books b ON r.book_id = b.id
    ORDER BY r.created_at DESC LIMIT 5
  `).all();

  const monthlyActivity = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as reviews
    FROM reviews
    WHERE created_at >= date('now', '-6 months')
    GROUP BY month ORDER BY month
  `).all();

  res.json({ stats, topBooks, topGenres, recentUsers, recentReviews, monthlyActivity });
});

// Get all users
router.get('/users', (req, res) => {
  const { q, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = '';
  let params = [];
  if (q) {
    where = 'WHERE u.name LIKE ? OR u.email LIKE ?';
    params.push(`%${q}%`, `%${q}%`);
  }

  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.telegram_username, u.avatar, u.role, u.created_at,
      (SELECT COUNT(*) FROM reviews WHERE user_id = u.id) as review_count,
      (SELECT COUNT(*) FROM user_books WHERE user_id = u.id AND status = 'read') as books_read
    FROM users u
    ${where}
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  const total = db.prepare(`SELECT COUNT(*) as c FROM users u ${where}`).get(...params);
  res.json({ users, total: total.c });
});

// Update user role
router.put('/users/:id/role', (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role))
    return res.status(400).json({ error: 'Noto\'g\'ri rol' });

  if (parseInt(req.params.id) === req.user.id)
    return res.status(400).json({ error: 'O\'z rolingizni o\'zgartira olmaysiz' });

  db.prepare('UPDATE users SET role=? WHERE id=?').run(role, req.params.id);
  res.json({ success: true });
});

// Delete user
router.delete('/users/:id', (req, res) => {
  if (parseInt(req.params.id) === req.user.id)
    return res.status(400).json({ error: 'O\'z hisobingizni o\'chira olmaysiz' });

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Get all books with stats
router.get('/books', (req, res) => {
  const books = db.prepare(`
    SELECT b.*,
      COUNT(DISTINCT r.id) as review_count,
      COUNT(DISTINCT ub.id) FILTER (WHERE ub.status='favorite') as likes,
      COUNT(DISTINCT ub2.id) FILTER (WHERE ub2.status='reading') as reading_count,
      ROUND(AVG(r.rating), 1) as avg_rating
    FROM books b
    LEFT JOIN reviews r ON b.id = r.book_id
    LEFT JOIN user_books ub ON b.id = ub.book_id
    LEFT JOIN user_books ub2 ON b.id = ub2.book_id
    GROUP BY b.id
    ORDER BY b.created_at DESC
  `).all();
  res.json(books);
});

// Delete review (admin)
router.delete('/reviews/:id', (req, res) => {
  db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
