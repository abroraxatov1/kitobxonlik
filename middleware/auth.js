const jwt = require('jsonwebtoken');
const { db } = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'kitob_uz_secret_key';

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token topilmadi' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, name, email, role, avatar, telegram_username FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.status(401).json({ error: 'Foydalanuvchi topilmadi' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Token yaroqsiz' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin huquqi talab etiladi' });
  }
  next();
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, name, email, role, avatar, telegram_username FROM users WHERE id = ?').get(decoded.id);
    req.user = user || null;
  } catch {
    req.user = null;
  }
  next();
}

module.exports = { authenticate, requireAdmin, optionalAuth };
