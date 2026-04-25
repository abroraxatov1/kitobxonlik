const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Bazaga ulanish
const dbPath = path.resolve(__dirname, 'kitob.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Ustun qo'shish buyrug'i
    db.run("ALTER TABLE books ADD COLUMN pdf_url TEXT", (err) => {
        if (err) {
            if (err.message.includes("duplicate column name")) {
                console.log("⚠️  Eslatma: pdf_url ustuni allaqachon mavjud.");
            } else {
                console.error("❌ Xatolik:", err.message);
            }
        } else {
            console.log("✅ Muvaffaqiyatli: pdf_url ustuni qo'shildi!");
        }
    });
});

db.close();