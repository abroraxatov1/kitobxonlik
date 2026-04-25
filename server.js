require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database
initDB();

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/books', require('./routes/books'));
app.use('/api/users', require('./routes/users'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Kitob.UZ server ishlamoqda', time: new Date().toISOString() });
});

// Serve SPA for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server xatosi:', err.message);
  res.status(500).json({ error: 'Server xatosi yuz berdi' });
});

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║      📚 Kitob.UZ Server              ║
  ║      http://localhost:${PORT}           ║
  ║                                      ║
  ║  Admin: admin@kitob.uz               ║
  ║  Parol: Admin123!                    ║
  ╚══════════════════════════════════════╝
  `);
});
