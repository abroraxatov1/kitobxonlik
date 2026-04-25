# 📚 Kitob.UZ — O'zbek Kitobxonlar Platformasi

> O'zbek kitobxonlar hamjamiyati: kitoblarni kuzatib boring, taqrizlar yozing, sevimli kitoblarni saqlang.

---

## 🚀 Tez Boshlash

### 1. Node.js o'rnatish
https://nodejs.org/en/download/ sahifasidan **Node.js 18+** versiyasini yuklab o'rnating.

Tekshirish:
```bash
node --version   # v18.0.0 yoki yuqori bo'lishi kerak
npm --version
```

### 2. Loyihani sozlash
```bash
# Loyiha papkasiga o'ting
cd kitob-uz

# Kutubxonalarni o'rnatish
npm install

# .env faylini yaratish
cp .env.example .env
```

### 3. .env faylini tahrirlash
`.env` faylini oching va quyidagilarni o'zgartiring:
```env
PORT=3000
JWT_SECRET=o'zingiz_uchun_maxfiy_kalit_yozing_bu_yerga
TELEGRAM_BOT_TOKEN=your_telegram_bot_token   # ixtiyoriy
TELEGRAM_BOT_NAME=your_bot_username          # ixtiyoriy
```

### 4. Serverni ishga tushirish
```bash
# Oddiy ishga tushirish
npm start

# Yoki ishlab chiqarish uchun (nodemon bilan - avtomatik yangilanish)
npm run dev
```

### 5. Brauzerda ochish
```
http://localhost:3000
```

---

## 🔐 Kirish Ma'lumotlari (boshlang'ich)

| Tur | Email | Parol | Rol |
|-----|-------|-------|-----|
| Admin | admin@kitob.uz | Admin123! | Admin |
| Demo | demo@kitob.uz | Demo123! | Foydalanuvchi |

---

## 📱 Telegram Kirish Sozlash (ixtiyoriy)

Telegram orqali kirish funksiyasini faollashtirish uchun:

### Bot yaratish:
1. Telegramda [@BotFather](https://t.me/BotFather) ga yozing
2. `/newbot` buyrug'ini yuboring
3. Bot nomini kiriting (masalan: `KitobUZ Bot`)
4. Bot username kiriting (masalan: `kitobuz_bot`)
5. BotFather sizga **TOKEN** beradi — uni `.env` ga yozing

### Domenni bot uchun ruxsatlash:
```
/setdomain → your_bot → http://localhost:3000
```
> Eslatma: Telegram Widget faqat HTTPS domenida to'liq ishlaydi. Mahalliy test uchun ngrok ishlatishingiz mumkin.

### .env ni yangilang:
```env
TELEGRAM_BOT_TOKEN=1234567890:AAF...your_token
TELEGRAM_BOT_NAME=kitobuz_bot
```

---

## 📁 Fayl Tuzilmasi

```
kitob-uz/
├── server.js              # Asosiy server fayli
├── database.js            # SQLite ma'lumotlar bazasi
├── package.json           # Loyiha sozlamalari
├── .env                   # Muhit o'zgaruvchilari (yarating!)
├── .env.example           # .env namunasi
├── kitob.db               # SQLite bazasi (avtomatik yaratiladi)
│
├── middleware/
│   └── auth.js            # JWT autentifikatsiya
│
├── routes/
│   ├── auth.js            # Ro'yxatdan o'tish / Kirish
│   ├── books.js           # Kitoblar CRUD
│   ├── users.js           # Foydalanuvchi javonlari
│   ├── reviews.js         # Taqrizlar
│   └── admin.js           # Admin funksiyalari
│
└── public/
    ├── index.html         # Asosiy HTML sahifasi (SPA)
    ├── css/
    │   └── style.css      # Barcha dizayn stillari
    └── js/
        ├── api.js         # API so'rovlari
        └── app.js         # Asosiy frontend mantiq
```

---

## ⚙️ API Endpointlar

### Auth
| Method | URL | Tavsif |
|--------|-----|--------|
| POST | /api/auth/register | Ro'yxatdan o'tish |
| POST | /api/auth/login | Email orqali kirish |
| POST | /api/auth/telegram | Telegram orqali kirish |
| GET | /api/auth/me | Joriy foydalanuvchi |
| PUT | /api/auth/profile | Profilni yangilash |

### Kitoblar
| Method | URL | Tavsif |
|--------|-----|--------|
| GET | /api/books | Barcha kitoblar (filter, sort, page) |
| GET | /api/books/featured | Bosh sahifa uchun kitoblar |
| GET | /api/books/:id | Bitta kitob |
| POST | /api/books | Kitob qo'shish (admin) |
| PUT | /api/books/:id | Kitob yangilash (admin) |
| DELETE | /api/books/:id | Kitob o'chirish (admin) |

### Javon (Shelf)
| Method | URL | Tavsif |
|--------|-----|--------|
| GET | /api/users/books | Mening kitoblarim |
| POST | /api/users/books | Javonga qo'shish |
| DELETE | /api/users/books | Javondan olib tashlash |

### Taqrizlar
| Method | URL | Tavsif |
|--------|-----|--------|
| GET | /api/reviews/book/:id | Kitob taqrizlari |
| GET | /api/reviews/my | Mening taqrizlarim |
| GET | /api/reviews/recent | So'nggi taqrizlar |
| POST | /api/reviews | Taqriz yozish |
| DELETE | /api/reviews/:id | Taqriz o'chirish |

### Admin
| Method | URL | Tavsif |
|--------|-----|--------|
| GET | /api/admin/stats | Umumiy statistika |
| GET | /api/admin/users | Barcha foydalanuvchilar |
| PUT | /api/admin/users/:id/role | Rol o'zgartirish |
| DELETE | /api/admin/users/:id | Foydalanuvchi o'chirish |
| GET | /api/admin/books | Barcha kitoblar (statistika bilan) |
| DELETE | /api/admin/reviews/:id | Taqriz o'chirish |

---

## 🌐 Ishlab Chiqarish Uchun (Production)

### PM2 bilan (tavsiya etiladi):
```bash
npm install -g pm2
pm2 start server.js --name kitob-uz
pm2 startup
pm2 save
```

### Nginx konfiguratsiyasi:
```nginx
server {
    listen 80;
    server_name kitob.uz www.kitob.uz;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 📦 Ishlatilgan Texnologiyalar

| Texnologiya | Maqsad |
|-------------|--------|
| **Node.js + Express** | Backend server |
| **better-sqlite3** | Ma'lumotlar bazasi (engil, tez) |
| **bcryptjs** | Parol shifrlash |
| **jsonwebtoken** | JWT autentifikatsiya |
| **Vanilla JS (SPA)** | Frontend (framework kerak emas) |
| **CSS Variables** | Dizayn tizimi |
| **Playfair Display** | Asosiy shrift (serif, adabiy) |
| **Nunito** | Yordamchi shrift (sans-serif) |

---

## 🆘 Muammo va Yechimlar

**Port band bo'lsa:**
```bash
# .env da portni o'zgartiring
PORT=3001
```

**"better-sqlite3" o'rnatilmasa:**
```bash
npm install better-sqlite3 --build-from-source
```

**Ma'lumotlar bazasini tozalash:**
```bash
rm kitob.db
npm start   # Yangi baza yaratiladi
```

---

## 📞 Qo'llab-quvvatlash

Muammolar uchun `issues` bo'limida yozing yoki admin@kitob.uz ga murojaat qiling.

---

*Kitob.UZ — O'zbek adabiyotini sevuvchilar uchun, sevuvchilar tomonidan* 📚
