const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { db } = require('../database');
const { authenticate } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'kitob_uz_secret_key';

function generateToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
}

// Register with email
router.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Barcha maydonlarni to\'ldiring' });

  if (name.trim().length < 2)
    return res.status(400).json({ error: 'Ism kamida 2 ta harf bo\'lishi kerak' });

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'Email manzil noto\'g\'ri' });

  if (password.length < 6)
    return res.status(400).json({ error: 'Parol kamida 6 ta belgi bo\'lishi kerak' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.status(400).json({ error: 'Bu email allaqachon ro\'yxatdan o\'tgan' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)'
  ).run(name.trim(), email.toLowerCase(), hash);

  const user = db.prepare('SELECT id, name, email, role, avatar FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = generateToken(user);

  res.json({ token, user });
});

// Login with email
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email va parolni kiriting' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) return res.status(400).json({ error: 'Email yoki parol noto\'g\'ri' });

  if (!user.password_hash)
    return res.status(400).json({ error: 'Bu akkaunt Telegram orqali ro\'yxatdan o\'tgan' });

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) return res.status(400).json({ error: 'Email yoki parol noto\'g\'ri' });

  const token = generateToken(user);
  const { password_hash, ...safeUser } = user;

  res.json({ token, user: safeUser });
});

// Telegram auth
router.post('/telegram', (req, res) => {
  const { id, first_name, last_name, username, photo_url, auth_date, hash } = req.body;
  
  if (!id || !hash || !auth_date)
    return res.status(400).json({ error: 'Telegram ma\'lumotlari to\'liq emas' });

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  
  // Verify hash if bot token is set
  if (BOT_TOKEN && BOT_TOKEN !== 'your_telegram_bot_token_here') {
    const checkString = Object.keys(req.body)
      .filter(k => k !== 'hash')
      .sort()
      .map(k => `${k}=${req.body[k]}`)
      .join('\n');

    const secretKey = crypto.createHash('sha256').update(BOT_TOKEN).digest();
    const expectedHash = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

    if (hash !== expectedHash)
      return res.status(401).json({ error: 'Telegram autentifikatsiya xatosi' });

    const now = Math.floor(Date.now() / 1000);
    if (now - parseInt(auth_date) > 86400)
      return res.status(401).json({ error: 'Telegram sessiyasi muddati o\'tgan' });
  }

  let user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(String(id));
  
  if (!user) {
    const name = [first_name, last_name].filter(Boolean).join(' ') || username || `TG_${id}`;
    const result = db.prepare(
      'INSERT INTO users (name, telegram_id, telegram_username, avatar) VALUES (?, ?, ?, ?)'
    ).run(name, String(id), username || null, photo_url || null);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  } else {
    // Update user info
    db.prepare('UPDATE users SET name=?, telegram_username=?, avatar=?, updated_at=CURRENT_TIMESTAMP WHERE telegram_id=?')
      .run([first_name, last_name].filter(Boolean).join(' ') || user.name, username || user.telegram_username, photo_url || user.avatar, String(id));
    user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(String(id));
  }

  const token = generateToken(user);
  const { password_hash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// Get current user
router.get('/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, name, email, telegram_username, avatar, role, created_at FROM users WHERE id = ?').get(req.user.id);
  
  const stats = {
    reading: db.prepare('SELECT COUNT(*) as c FROM user_books WHERE user_id=? AND status=?').get(req.user.id, 'reading').c,
    read: db.prepare('SELECT COUNT(*) as c FROM user_books WHERE user_id=? AND status=?').get(req.user.id, 'read').c,
    want_to_read: db.prepare('SELECT COUNT(*) as c FROM user_books WHERE user_id=? AND status=?').get(req.user.id, 'want_to_read').c,
    favorites: db.prepare('SELECT COUNT(*) as c FROM user_books WHERE user_id=? AND status=?').get(req.user.id, 'favorite').c,
    reviews: db.prepare('SELECT COUNT(*) as c FROM reviews WHERE user_id=?').get(req.user.id).c
  };

  res.json({ ...user, stats });
});

// Update profile
router.put('/profile', authenticate, (req, res) => {
  const { name, avatar } = req.body;
  if (name && name.trim().length < 2)
    return res.status(400).json({ error: 'Ism kamida 2 ta harf bo\'lishi kerak' });

  db.prepare('UPDATE users SET name=COALESCE(?,name), avatar=COALESCE(?,avatar), updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .run(name?.trim() || null, avatar || null, req.user.id);

  const user = db.prepare('SELECT id, name, email, telegram_username, avatar, role FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

module.exports = router;
