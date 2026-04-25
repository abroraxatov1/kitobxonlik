const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticate, requireAdmin, optionalAuth } = require('../middleware/auth');

// Get all books with search, filter, sort
router.get('/', optionalAuth, (req, res) => {
  const { q, genre, sort = 'newest', page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  
  let where = [];
  let params = [];

  if (q) {
    where.push('(b.title LIKE ? OR b.author LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  if (genre) {
    where.push('b.genre = ?');
    params.push(genre);
  }

  const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const orderMap = {
    newest: 'b.created_at DESC',
    popular: 'likes DESC',
    rating: 'avg_rating DESC',
    most_reviewed: 'review_count DESC',
    title: 'b.title ASC'
  };
  const orderBy = orderMap[sort] || 'b.created_at DESC';

  const books = db.prepare(`
    SELECT 
      b.*,
      COUNT(DISTINCT ub.id) FILTER (WHERE ub.status='favorite') as likes,
      COUNT(DISTINCT r.id) as review_count,
      ROUND(AVG(r.rating), 1) as avg_rating
    FROM books b
    LEFT JOIN user_books ub ON b.id = ub.book_id
    LEFT JOIN reviews r ON b.id = r.book_id
    ${whereSQL}
    GROUP BY b.id
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM books b ${whereSQL}`).get(...params);

  res.json({ books, total: total.cnt, page: parseInt(page), limit: parseInt(limit) });
});

// Get featured/popular books for home page
router.get('/featured', (req, res) => {
  const featured = db.prepare(`
    SELECT b.*, 
      COUNT(DISTINCT ub.id) FILTER (WHERE ub.status='favorite') as likes,
      COUNT(DISTINCT r.id) as review_count,
      ROUND(AVG(r.rating), 1) as avg_rating
    FROM books b
    LEFT JOIN user_books ub ON b.id = ub.book_id
    LEFT JOIN reviews r ON b.id = r.book_id
    GROUP BY b.id
    ORDER BY likes DESC, avg_rating DESC
    LIMIT 6
  `).all();

  const mostLiked = db.prepare(`
    SELECT b.*, COUNT(ub.id) as likes
    FROM books b
    LEFT JOIN user_books ub ON b.id = ub.book_id AND ub.status='favorite'
    GROUP BY b.id ORDER BY likes DESC LIMIT 8
  `).all();

  const mostReviewed = db.prepare(`
    SELECT b.*, COUNT(r.id) as review_count, ROUND(AVG(r.rating),1) as avg_rating
    FROM books b
    LEFT JOIN reviews r ON b.id = r.book_id
    GROUP BY b.id ORDER BY review_count DESC LIMIT 8
  `).all();

  const newest = db.prepare(`
    SELECT b.*, COUNT(r.id) as review_count, ROUND(AVG(r.rating),1) as avg_rating
    FROM books b
    LEFT JOIN reviews r ON b.id = r.book_id
    GROUP BY b.id ORDER BY b.created_at DESC LIMIT 8
  `).all();

  const genres = db.prepare('SELECT DISTINCT genre FROM books WHERE genre IS NOT NULL ORDER BY genre').all();

  res.json({ featured, mostLiked, mostReviewed, newest, genres });
});

// Get single book
router.get('/:id', optionalAuth, (req, res) => {
  const book = db.prepare(`
    SELECT b.*,
      COUNT(DISTINCT ub.id) FILTER (WHERE ub.status='favorite') as likes,
      COUNT(DISTINCT ub2.id) FILTER (WHERE ub2.status='reading') as reading_count,
      COUNT(DISTINCT ub3.id) FILTER (WHERE ub3.status='read') as read_count,
      COUNT(DISTINCT r.id) as review_count,
      ROUND(AVG(r.rating), 1) as avg_rating
    FROM books b
    LEFT JOIN user_books ub ON b.id = ub.book_id
    LEFT JOIN user_books ub2 ON b.id = ub2.book_id
    LEFT JOIN user_books ub3 ON b.id = ub3.book_id
    LEFT JOIN reviews r ON b.id = r.book_id
    WHERE b.id = ?
    GROUP BY b.id
  `).get(req.params.id);

  if (!book) return res.status(404).json({ error: 'Kitob topilmadi' });

  // User's relation to this book
  let userStatus = null;
  if (req.user) {
    userStatus = db.prepare('SELECT status, rating FROM user_books WHERE user_id=? AND book_id=?').all(req.user.id, book.id);
  }

  const reviews = db.prepare(`
    SELECT r.*, u.name as user_name, u.avatar as user_avatar
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.book_id = ?
    ORDER BY r.created_at DESC
    LIMIT 20
  `).all(req.params.id);

  res.json({ ...book, userStatus, reviews });
});

// Create book (admin)
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { title, author, genre, description, cover_url, pdf_url, pages, year, language, publisher } = req.body;
  if (!title || !author) return res.status(400).json({ error: 'Sarlavha va muallif talab etiladi' });

  const result = db.prepare(`
    INSERT INTO books (title, author, genre, description, cover_url, pdf_url, pages, year, language, publisher)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, author, genre || null, description || null, cover_url || null, pdf_url || null, pages || 0, year || null, language || "O'zbekcha", publisher || null);

  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid);
  res.json(book);
});

// Update book (admin)
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const { title, author, genre, description, cover_url, pdf_url, pages, year, language, publisher } = req.body;
  const book = db.prepare('SELECT id FROM books WHERE id = ?').get(req.params.id);
  if (!book) return res.status(404).json({ error: 'Kitob topilmadi' });

  db.prepare(`
    UPDATE books SET 
      title=COALESCE(?,title), author=COALESCE(?,author), genre=COALESCE(?,genre),
      description=COALESCE(?,description), cover_url=COALESCE(?,cover_url),
      pdf_url=?, pages=COALESCE(?,pages), year=COALESCE(?,year),
      language=COALESCE(?,language), publisher=COALESCE(?,publisher)
    WHERE id=?
  `).run(title, author, genre, description, cover_url, pdf_url || null, pages, year, language, publisher, req.params.id);

  res.json(db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id));
});

// Delete book (admin)
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const book = db.prepare('SELECT id FROM books WHERE id = ?').get(req.params.id);
  if (!book) return res.status(404).json({ error: 'Kitob topilmadi' });
  db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
