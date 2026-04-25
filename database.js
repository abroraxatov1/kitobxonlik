const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'kitob.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      telegram_id TEXT UNIQUE,
      telegram_username TEXT,
      password_hash TEXT,
      avatar TEXT DEFAULT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      genre TEXT,
      description TEXT,
      cover_url TEXT,
      pdf_url TEXT,
      pages INTEGER DEFAULT 0,
      year INTEGER,
      language TEXT DEFAULT 'O''zbekcha',
      isbn TEXT,
      publisher TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      book_id INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('reading','read','want_to_read','favorite')),
      rating INTEGER CHECK(rating BETWEEN 1 AND 5),
      started_at DATE,
      finished_at DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      UNIQUE(user_id, book_id, status)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      book_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      UNIQUE(user_id, book_id)
    );
  `);

  // Migration: add pdf_url if not exists (for existing DBs)
  try { db.exec('ALTER TABLE books ADD COLUMN pdf_url TEXT'); } catch(e) {}

  // Seed admin user
  const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@kitob.uz');
  if (!adminExists) {
    const hash = bcrypt.hashSync('Admin123!', 10);
    db.prepare(`INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`).run(
      'Admin', 'admin@kitob.uz', hash, 'admin'
    );
  }

  // Seed demo user
  const demoExists = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@kitob.uz');
  if (!demoExists) {
    const hash = bcrypt.hashSync('Demo123!', 10);
    db.prepare(`INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`).run(
      'Demo Foydalanuvchi', 'demo@kitob.uz', hash, 'user'
    );
  }

  // Seed books
  const bookCount = db.prepare('SELECT COUNT(*) as cnt FROM books').get();
  if (bookCount.cnt === 0) {
    const insertBook = db.prepare(`
      INSERT INTO books (title, author, genre, description, cover_url, pages, year, language, publisher)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const books = [
      ["O'tkan kunlar", "Abdulla Qodiriy", "Roman", "O'zbek adabiyotining durdonasi. Otabek va Kumushning muhabbat qissasi, o'tmish hayotining yorqin tasviri.", "https://upload.wikimedia.org/wikipedia/uz/thumb/c/c4/O%27tkan_kunlar.jpg/220px-O%27tkan_kunlar.jpg", 480, 1925, "O'zbekcha", "O'zbek davlat nashriyoti"],
      ["Mehrobdan chayon", "Abdulla Qodiriy", "Roman", "Anvar va Raʼno sevgisini, eski va yangi dunyoning to'qnashuvini tasvirlovchi asar.", "https://upload.wikimedia.org/wikipedia/uz/thumb/8/8d/Mehrobdan_chayon.jpg/220px-Mehrobdan_chayon.jpg", 320, 1929, "O'zbekcha", "G'afur G'ulom nashriyoti"],
      ["Kecha va kunduz", "Cho'lpon", "Roman", "Miryoqub va Zebining fojeali muhabbati, mustamlakachilik davrining aks etishi.", null, 350, 1935, "O'zbekcha", "O'zbekiston nashriyoti"],
      ["Qutlug' qon", "Oybek", "Roman", "Yo'lchi obrazi orqali o'zbek mehnatkash xalqining ozodlik kurashini tasvirlagan asar.", null, 420, 1940, "O'zbekcha", "Sharq nashriyoti"],
      ["Shum bola", "G'afur G'ulom", "Qissa", "Yosh qahramonning hayot sarguzashtlari, o'zbek xalqining turmushi haqida hazil-mutoyibali asar.", null, 180, 1936, "O'zbekcha", "Yosh gvardiya"],
      ["Sarob", "Abdulla Qahhor", "Qissa", "Zafar Otajonov timsolida ziyoli avlodning orzulari va tushkunligi.", null, 210, 1943, "O'zbekcha", "O'zbekiston nashriyoti"],
      ["Yulduzli tunlar", "Pirimqul Qodirov", "Tarixiy roman", "Bobur Mirzo hayotini, shaxsiyatini va ijodini yorituvchi ulkan tarixiy roman.", null, 560, 1978, "O'zbekcha", "G'afur G'ulom nashriyoti"],
      ["Bobur", "Pirimqul Qodirov", "Tarixiy roman", "Bobur Mirzo siymosini, uning harbiy yurishlari va she'riyatini tasvirlovchi roman.", null, 480, 1988, "O'zbekcha", "Sharq nashriyoti"],
      ["Ikki eshik orasi", "Ulmas Umarbekov", "Roman", "Zamondoshlarimiz hayotini, kichik odamlar taqdirini realistik tasvirlagan asar.", null, 290, 1975, "O'zbekcha", "Yozuvchi nashriyoti"],
      ["Dunyoning ishlari", "Abdulla Qahhor", "Hikoyalar", "Abdulla Qahhorning eng yaxshi hikoyalari to'plami. Teran psixologik tahlil.", null, 250, 1955, "O'zbekcha", "O'zbekiston nashriyoti"],
      ["Ulug'bek xazinasi", "Odil Yoqubov", "Tarixiy roman", "Ulug'bek Mirzo hayoti va ilmiy merosiga bag'ishlangan tarixiy roman.", null, 440, 1973, "O'zbekcha", "G'afur G'ulom nashriyoti"],
      ["Ko'hna dunyo", "Mirmuhsin", "Roman", "Qadimiy tarixni va zamonaviy hayotni qoʻshib tasvirlovchi keng qamrovli roman.", null, 380, 1967, "O'zbekcha", "Yozuvchi nashriyoti"],
      ["Muqaddas", "Tohir Malik", "Detektiv", "O'zbek detektiv adabiyotining eng sara namunalaridan biri. Mashhur Sher Rahimov.", null, 320, 1990, "O'zbekcha", "Sharq nashriyoti"],
      ["Shaytanat", "Tohir Malik", "Detektiv", "Jamiyatdagi yovuzlik va yaxshilik kurashini tasvirlovchi ko'p jildli roman.", null, 680, 1995, "O'zbekcha", "Sharq nashriyoti"],
      ["Baxt qayerda", "Sa'dulla Siyoyev", "Hikoyalar", "Hayotning turli qirralarini aks ettiruvchi ta'sirchan hikoyalar to'plami.", null, 220, 1980, "O'zbekcha", "Yozuvchi nashriyoti"],
      ["Jinlar bazmi", "Nazar Eshonqul", "Qissa", "Fantastik va real olamni uyg'unlashtirgan o'ziga xos uslubdagi asar.", null, 260, 2005, "O'zbekcha", "Akademnashr"],
      ["Moziydan ovoz", "Muxammad Yusuf", "She'riyat", "O'zbek she'riyatining buyuk vakili Muxammad Yusufning eng sara she'rlari.", null, 190, 1998, "O'zbekcha", "G'afur G'ulom nashriyoti"],
      ["Lolazor", "Erkin Vohidov", "She'riyat", "Erkin Vohidovning lirik she'rlari va poemalari to'plami.", null, 200, 1970, "O'zbekcha", "Yozuvchi nashriyoti"],
      ["Otamdan qolgan dalalar", "Xurshid Davron", "She'riyat", "Zamona ruhini va insoniy his-tuyg'ularni chuqur ifodalovchi she'rlar.", null, 170, 2010, "O'zbekcha", "Akademnashr"],
      ["Daftar hoshiyasidagi bitiklar", "Ulug'bek Hamdam", "Hikoyalar", "Zamonaviy o'zbek nasrining yorqin namunasi, insoniy munosabatlar tahlili.", null, 240, 2008, "O'zbekcha", "Akademnashr"]
    ];

    for (const book of books) {
      insertBook.run(...book);
    }

    // Add some user_books and reviews for demo
    const demoUser = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@kitob.uz');
    if (demoUser) {
      const statusInsert = db.prepare(`INSERT OR IGNORE INTO user_books (user_id, book_id, status, rating) VALUES (?, ?, ?, ?)`);
      statusInsert.run(demoUser.id, 1, 'read', 5);
      statusInsert.run(demoUser.id, 2, 'read', 4);
      statusInsert.run(demoUser.id, 3, 'reading', null);
      statusInsert.run(demoUser.id, 4, 'want_to_read', null);
      statusInsert.run(demoUser.id, 5, 'favorite', 5);
      statusInsert.run(demoUser.id, 7, 'favorite', 5);

      const reviewInsert = db.prepare(`INSERT OR IGNORE INTO reviews (user_id, book_id, content, rating) VALUES (?, ?, ?, ?)`);
      reviewInsert.run(demoUser.id, 1, "O'zbek adabiyotining eng buyuk asarlaridan biri. Abdulla Qodiriy ustoz tilning go'zalligi va hikoyaning teranligini ajoyib uyg'unlashtirgan. Otabek va Kumush muhabbati qalbimga chuqur joylashib qoldi. Har bir o'zbek o'qishi shart!", 5);
      reviewInsert.run(demoUser.id, 2, "Mehrobdan chayon ham O'tkan kunlardan qolishmaydi. Anvar va Ra'noning taqdiri juda ta'sirchan. Muallif o'sha davr jamiyatini nihoyatda real tasvirlagan.", 4);
      reviewInsert.run(demoUser.id, 5, "Shum bola - bolalikning eng yorqin tasviri. G'afur G'ulom hazil-mutoyibali uslubi bilan o'quvchini oxirigacha band etadi. Bir necha marta o'qidim!", 5);
    }
  }

  console.log('✅ Ma\'lumotlar bazasi muvaffaqiyatli ishga tushirildi');
}

module.exports = { db, initDB };
