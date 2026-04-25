// ============================================
// KITOB.UZ — Main SPA Application
// ============================================

let currentUser = null;
let searchVisible = false;

// ---- INIT ----
window.addEventListener('DOMContentLoaded', async () => {
  // Load user from cache first
  currentUser = API.getUser();
  renderNavUser();

  // Route
  window.addEventListener('hashchange', route);
  route();

  // Auth expiry handler
  window.onAuthExpired = () => {
    currentUser = null;
    API.removeToken(); API.removeUser();
    renderNavUser();
    showToast('Sessiya tugadi. Iltimos qayta kiring.', 'error');
    navigate('/kirish');
  };

  // Refresh user if logged in
  if (API.isLoggedIn()) {
    try {
      currentUser = await API.auth.me();
      API.setUser(currentUser);
      renderNavUser();
    } catch {}
  }

  // Hide loading
  setTimeout(() => {
    document.getElementById('loading-screen').classList.add('hidden');
  }, 800);
});

// ---- ROUTER ----
function route() {
  const fullHash = window.location.hash.slice(1) || '/';
  const hash = fullHash.split('?')[0];
  const app = document.getElementById('app');
  app.innerHTML = '<div style="padding:80px;text-align:center;"><div class="loading-spinner" style="margin:auto;width:44px;height:44px;border-width:4px;"></div></div>';

  // Update active nav link
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  if (hash === '/' || hash === '') renderHome();
  else if (hash === '/kitoblar') renderBooksPage();
  else if (hash === '/top') renderTopPage();
  else if (hash.startsWith('/kitob/')) renderBookDetail(hash.split('/kitob/')[1]);
  else if (hash === '/profil') renderProfilePage();
  else if (hash === '/kirish') renderAuthPage();
  else if (hash === '/admin') renderAdminPage('dashboard');
  else if (hash.startsWith('/admin/')) renderAdminPage(hash.split('/admin/')[1]);
  else if (hash.startsWith('/qidiruv')) renderSearchResults();
  else renderHome();
}

function navigate(path) {
  window.location.hash = path;
}

// ---- NAV ----
function renderNavUser() {
  const sec = document.getElementById('nav-user-section');
  if (!sec) return;

  if (currentUser) {
    const initials = currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : '?';
    const avatarHtml = currentUser.avatar
      ? `<img src="${currentUser.avatar}" alt="${esc(currentUser.name)}">`
      : initials;

    sec.innerHTML = `
      <div class="nav-user" onclick="toggleUserDropdown(this)">
        <div class="nav-user-avatar">${avatarHtml}</div>
        <span class="nav-user-name">${esc(currentUser.name)}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        <div class="user-dropdown" id="user-dropdown">
          <div class="dropdown-item" onclick="navigate('/profil')">👤 Mening profilim</div>
          ${currentUser.role === 'admin' ? '<div class="dropdown-item" onclick="navigate(\'/admin\')">⚙️ Admin panel</div>' : ''}
          <div class="dropdown-item danger" onclick="logout()">🚪 Chiqish</div>
        </div>
      </div>`;
  } else {
    sec.innerHTML = `
      <div class="nav-auth-btns">
        <button class="btn-nav-login" onclick="navigate('/kirish')">Kirish</button>
        <button class="btn-nav-register" onclick="navigate('/kirish')">Ro'yxatdan o'tish</button>
      </div>`;
  }
}

function toggleUserDropdown(el) {
  const dd = document.getElementById('user-dropdown');
  if (dd) dd.classList.toggle('open');
  document.addEventListener('click', function close(e) {
    if (!el.contains(e.target)) { dd?.classList.remove('open'); document.removeEventListener('click', close); }
  }, { once: false });
}

function toggleSearch() {
  const s = document.getElementById('nav-search');
  searchVisible = !searchVisible;
  s.style.display = searchVisible ? 'block' : 'none';
  if (searchVisible) setTimeout(() => document.getElementById('search-input')?.focus(), 50);
}

function performSearch() {
  const q = document.getElementById('search-input')?.value?.trim();
  if (q) { navigate('/qidiruv?q=' + encodeURIComponent(q)); toggleSearch(); }
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && searchVisible) performSearch();
  if (e.key === 'Escape') { toggleSearch(); if (searchVisible) toggleSearch(); }
});

function logout() {
  currentUser = null;
  API.removeToken(); API.removeUser();
  renderNavUser();
  showToast('Muvaffaqiyatli chiqildi', 'success');
  navigate('/');
}

// ---- HELPERS ----
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function stars(rating, max = 5) {
  if (!rating) return '<span style="color:var(--c-muted);font-size:0.8rem;">—</span>';
  let s = '';
  for (let i = 1; i <= max; i++)
    s += `<span class="star${i <= Math.round(rating) ? ' filled' : ''}">★</span>`;
  return `<div class="stars-display">${s}</div>`;
}

function starSmall(rating) {
  return rating ? `<span style="color:var(--c-star)">★</span> ${parseFloat(rating).toFixed(1)}` : '';
}

function fmtDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' });
}

function showToast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type] || ''}</span> ${esc(msg)}`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3100);
}

function getBookCoverHtml(book, big = false) {
  if (book.cover_url) {
    return `<img src="${esc(book.cover_url)}" alt="${esc(book.title)}" onerror="this.parentElement.innerHTML='${bookPlaceholderInner(book)}'">`;
  }
  return `<div class="book-cover-placeholder">${bookPlaceholderInner(book)}</div>`;
}

function bookPlaceholderInner(book) {
  return `<div class='book-icon'>📖</div><div class='book-title-ph'>${esc(book.title)}</div><div class='book-author-ph'>${esc(book.author)}</div>`;
}

function bookCardHtml(book, idx = 0) {
  const pct = idx % 6;
  const colorMap = [
    'linear-gradient(135deg,#1C3D2E,#2D5A45)',
    'linear-gradient(135deg,#4A2545,#7D3C72)',
    'linear-gradient(135deg,#1A3557,#2E6DAD)',
    'linear-gradient(135deg,#5C2B1A,#A0522D)',
    'linear-gradient(135deg,#1A4040,#2E8080)',
    'linear-gradient(135deg,#3A2000,#7A4F00)'
  ];
  const bg = colorMap[pct];
  const coverHtml = book.cover_url
    ? `<img src="${esc(book.cover_url)}" alt="${esc(book.title)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';">`
    : `<div class="book-cover-placeholder"><div class="book-icon">📖</div><div class="book-title-ph">${esc(book.title)}</div><div class="book-author-ph">${esc(book.author)}</div></div>`;

  return `
    <div class="book-card" onclick="navigate('/kitob/${book.id}')">
      <div class="book-cover" style="background:${bg}">${coverHtml}</div>
      <div class="book-info">
        <div class="book-title">${esc(book.title)}</div>
        <div class="book-author">${esc(book.author)}</div>
        <div class="book-meta">
          <span class="book-rating">${book.avg_rating ? `★ ${parseFloat(book.avg_rating).toFixed(1)}` : ''}</span>
          ${book.genre ? `<span class="book-genre-badge">${esc(book.genre)}</span>` : ''}
        </div>
      </div>
    </div>`;
}

// ---- HOME PAGE ----
async function renderHome() {
  document.querySelector('.nav-link[onclick*="kitoblar"]')?.classList.remove('active');
  try {
    const [featured, recentReviews] = await Promise.all([
      API.books.featured(),
      API.reviews.recent()
    ]);

    document.getElementById('app').innerHTML = `
      <!-- Hero -->
      <section class="hero">
        <div class="hero-inner">
          <div class="hero-badge">O'zbek va dunyo adabiyotining eng sevimli kitoblari !</div>
          <h1>Kitoblarni <em>sevish</em> va<br>ulashishning raqamli makoni</h1>
          <p>O'qigan kitoblaringizni kuzatib boring, taqrizlar yozing va minglab kitobsevarlar bilan bog'laning.</p>
          <div class="hero-btns">
            <button class="btn-hero-primary" onclick="navigate('${currentUser ? '/kitoblar' : '/kirish'}')">${currentUser ? '📚 Kitoblarni ko\'rish' : '🚀 Boshlash'}</button>
            <button class="btn-hero-secondary" onclick="navigate('/kitoblar')">Katalogni ko'rish →</button>
          </div>
          <div class="hero-stats">
            <div class="hero-stat"><div class="num">${featured.newest?.length * 10 || '20'}+</div><div class="lbl">Kitoblar</div></div>
            <div class="hero-stat"><div class="num">∞</div><div class="lbl">Taqrizlar</div></div>
            <div class="hero-stat"><div class="num">🌟</div><div class="lbl">Sifatli kontent</div></div>
          </div>
        </div>
      </section>

      <!-- Featured -->
      <div class="container">
        <section class="section">
          <div class="section-header">
            <div class="section-title"><span class="icon">🏆</span> Eng Sara Kitoblar</div>
            <a class="section-link" onclick="navigate('/kitoblar')">Barchasi →</a>
          </div>
          <div class="featured-grid">
            ${featured.featured.map((b, i) => featuredCardHtml(b, i)).join('')}
          </div>
        </section>

        <section class="section" style="padding-top:0">
          <div class="section-header">
            <div class="section-title"><span class="icon">❤️</span> Ko'p Yoqtirilgan</div>
            <a class="section-link" onclick="navigate('/top')">Top →</a>
          </div>
          <div class="books-row">
            ${featured.mostLiked.map((b, i) => bookCardHtml(b, i)).join('')}
          </div>
        </section>

        <section class="section" style="padding-top:0">
          <div class="section-header">
            <div class="section-title"><span class="icon">💬</span> Ko'p Taqriz Olgan</div>
          </div>
          <div class="books-row">
            ${featured.mostReviewed.map((b, i) => bookCardHtml(b, i)).join('')}
          </div>
        </section>

        <section class="section" style="padding-top:0">
          <div class="section-header">
            <div class="section-title"><span class="icon">🆕</span> Yangi Qo'shilgan</div>
          </div>
          <div class="books-row">
            ${featured.newest.map((b, i) => bookCardHtml(b, i)).join('')}
          </div>
        </section>

        ${recentReviews.length > 0 ? `
        <section class="section" style="padding-top:0">
          <div class="section-header">
            <div class="section-title"><span class="icon">✍️</span> So'nggi Taqrizlar</div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px">
            ${recentReviews.map(r => recentReviewCardHtml(r)).join('')}
          </div>
        </section>` : ''}

        ${!currentUser ? `
        <section class="section" style="padding-top:0">
          <div style="background:linear-gradient(135deg,var(--c-primary),var(--c-primary2));border-radius:var(--r-xl);padding:56px 40px;text-align:center;color:white;">
            <div style="font-size:56px;margin-bottom:16px;">📚</div>
            <h2 style="font-family:var(--f-serif);font-size:2rem;margin-bottom:12px;">Hoziroq qo'shiling!</h2>
            <p style="color:rgba(255,255,255,0.8);max-width:480px;margin:0 auto 28px;font-size:1rem;line-height:1.7;">
              Ro'yxatdan o'ting va o'qigan kitoblaringizni kuzatib boring, taqrizlar yozing, kitob tavsiyalari oling.
            </p>
            <button class="btn-hero-primary" onclick="navigate('/kirish')" style="font-size:1.05rem;padding:15px 36px;">
              🚀 Bepul Ro'yxatdan O'tish
            </button>
          </div>
        </section>` : ''}
      </div>
    `;
  } catch (err) {
    document.getElementById('app').innerHTML = `<div class="empty-state"><div class="icon">❌</div><h3>Xato yuz berdi</h3><p>${err.message}</p></div>`;
  }
}

function featuredCardHtml(book, idx) {
  const colors = ['#1C3D2E','#4A2545','#1A3557','#5C2B1A','#1A4040','#3A2000'];
  const bg = colors[idx % colors.length];
  const cover = book.cover_url
    ? `<img src="${esc(book.cover_url)}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">`
    : `<div class="book-cover-placeholder"><div class="book-icon">📖</div><div class="book-title-ph">${esc(book.title)}</div><div class="book-author-ph">${esc(book.author)}</div></div>`;

  return `
    <div class="book-card-featured" onclick="navigate('/kitob/${book.id}')">
      <div class="book-cover" style="background:${bg}">${cover}</div>
      <div class="book-info">
        ${book.genre ? `<div class="tag" style="margin-bottom:8px">${esc(book.genre)}</div>` : ''}
        <div class="book-title">${esc(book.title)}</div>
        <div class="book-author">${esc(book.author)}</div>
        <div class="book-desc">${esc(book.description || '')}</div>
        <div class="book-meta">
          <span class="book-rating">${book.avg_rating ? `★ ${parseFloat(book.avg_rating).toFixed(1)}` : '★ —'}</span>
          <span class="book-likes">❤️ ${book.likes || 0}</span>
          <span class="book-likes">💬 ${book.review_count || 0}</span>
        </div>
      </div>
    </div>`;
}

function recentReviewCardHtml(r) {
  const initials = r.user_name ? r.user_name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() : '?';
  const avatarHtml = r.user_avatar ? `<img src="${esc(r.user_avatar)}" alt="${esc(r.user_name)}">` : initials;
  return `
    <div class="review-card" onclick="navigate('/kitob/${r.book_id}')">
      <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:12px">
        <div style="background:linear-gradient(135deg,var(--c-primary),var(--c-primary2));width:50px;height:70px;border-radius:6px;overflow:hidden;flex-shrink:0">
          ${r.cover_url ? `<img src="${esc(r.cover_url)}" style="width:100%;height:100%;object-fit:cover">` : '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:1.4rem">📖</div>'}
        </div>
        <div>
          <div style="font-family:var(--f-serif);font-weight:700;font-size:0.95rem">${esc(r.book_title)}</div>
          <div style="font-size:0.8rem;color:var(--c-muted)">${esc(r.book_author)}</div>
          <div class="review-rating" style="margin-top:4px">${stars(r.rating)}</div>
        </div>
      </div>
      <div class="review-header">
        <div class="review-avatar">${avatarHtml}</div>
        <div>
          <div class="review-user-name">${esc(r.user_name)}</div>
          <div class="review-date">${fmtDate(r.created_at)}</div>
        </div>
      </div>
      <div class="review-content" style="-webkit-line-clamp:3;">${esc(r.content)}</div>
    </div>`;
}

// ---- BOOKS PAGE ----
async function renderBooksPage(params = {}) {
  document.querySelector('.nav-link[onclick*="kitoblar"]')?.classList.add('active');
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const genre = params.genre || urlParams.get('genre') || '';
  const sort = params.sort || urlParams.get('sort') || 'newest';
  const page = parseInt(params.page || urlParams.get('page') || 1);
  const q = params.q || urlParams.get('q') || '';

  try {
    const [data, featured] = await Promise.all([
      API.books.list({ genre, sort, page, limit: 24, q }),
      API.books.featured()
    ]);

    const genreOptions = ['Barchasi', ...(featured.genres?.map(g => g.genre) || [])];
    const sortOptions = [
      { val: 'newest', lbl: '🆕 Yangi' },
      { val: 'popular', lbl: '❤️ Mashhur' },
      { val: 'rating', lbl: '⭐ Baholangan' },
      { val: 'most_reviewed', lbl: '💬 Taqrizlangan' },
      { val: 'title', lbl: '🔤 Nom bilan' }
    ];

    document.getElementById('app').innerHTML = `
      <div class="page-header">
        <div class="page-header-inner">
          <h1>📚 Kitoblar Katalogi</h1>
          <p>${data.total} ta kitob mavjud</p>
        </div>
      </div>
      <div class="container" style="padding-top:32px">
        <div class="search-bar" style="max-width:100%;margin-bottom:24px">
          <input type="text" id="books-search" placeholder="Kitob yoki muallif..." value="${esc(q)}"
            onkeydown="if(event.key==='Enter')booksSearch()">
          <button onclick="booksSearch()">Qidirish</button>
        </div>
        <div class="filters-bar">
          <span style="font-size:0.85rem;font-weight:600;color:var(--c-muted)">Janr:</span>
          ${genreOptions.map(g => `<div class="filter-chip${(g === 'Barchasi' && !genre) || g === genre ? ' active' : ''}" onclick="navigate('/kitoblar?genre=${g === 'Barchasi' ? '' : encodeURIComponent(g)}&sort=${sort}')">${esc(g)}</div>`).join('')}
        </div>
        <div class="filters-bar" style="margin-top:-8px">
          <span style="font-size:0.85rem;font-weight:600;color:var(--c-muted)">Saralash:</span>
          ${sortOptions.map(s => `<div class="filter-chip${s.val === sort ? ' active' : ''}" onclick="navigate('/kitoblar?genre=${encodeURIComponent(genre)}&sort=${s.val}')">${s.lbl}</div>`).join('')}
        </div>
        ${data.books.length > 0 ? `
          <div class="books-grid" style="margin-top:28px">
            ${data.books.map((b, i) => bookCardHtml(b, i)).join('')}
          </div>
          ${data.total > 24 ? `
          <div style="text-align:center;margin-top:36px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
            ${page > 1 ? `<button class="btn btn-outline" onclick="navigate('/kitoblar?genre=${encodeURIComponent(genre)}&sort=${sort}&page=${page-1}')">← Oldingi</button>` : ''}
            <span style="padding:10px 16px;background:var(--c-bg2);border-radius:var(--r-sm);font-weight:600">${page} / ${Math.ceil(data.total/24)}</span>
            ${page * 24 < data.total ? `<button class="btn btn-outline" onclick="navigate('/kitoblar?genre=${encodeURIComponent(genre)}&sort=${sort}&page=${page+1}')">Keyingi →</button>` : ''}
          </div>` : ''}
        ` : `<div class="empty-state"><div class="icon">🔍</div><h3>Kitob topilmadi</h3><p>Qidiruv shartlarini o'zgartiring</p></div>`}
      </div>
    `;
  } catch (err) {
    document.getElementById('app').innerHTML = `<div class="empty-state"><div class="icon">❌</div><h3>${err.message}</h3></div>`;
  }
}

function booksSearch() {
  const q = document.getElementById('books-search')?.value?.trim();
  navigate('/kitoblar?q=' + encodeURIComponent(q || ''));
}

// ---- SEARCH RESULTS ----
async function renderSearchResults() {
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const q = urlParams.get('q') || '';
  navigate('/kitoblar?q=' + encodeURIComponent(q));
}

// ---- TOP PAGE ----
async function renderTopPage() {
  try {
    const featured = await API.books.featured();
    document.getElementById('app').innerHTML = `
      <div class="page-header">
        <div class="page-header-inner">
          <h1>🏆 Top Kitoblar</h1>
          <p>O'zbek adabiyotining eng sara namunalari</p>
        </div>
      </div>
      <div class="container">
        <section class="section">
          <div class="section-title" style="margin-bottom:24px"><span class="icon">❤️</span> Eng Ko'p Yoqtirilgan</div>
          <div class="featured-grid">${featured.mostLiked.map((b,i)=>featuredCardHtml(b,i)).join('')}</div>
        </section>
        <section class="section" style="padding-top:0">
          <div class="section-title" style="margin-bottom:24px"><span class="icon">💬</span> Eng Ko'p Taqriz Olgan</div>
          <div class="featured-grid">${featured.mostReviewed.map((b,i)=>featuredCardHtml(b,i)).join('')}</div>
        </section>
      </div>`;
  } catch (err) {
    document.getElementById('app').innerHTML = `<div class="empty-state"><div class="icon">❌</div><h3>${err.message}</h3></div>`;
  }
}

// ---- BOOK DETAIL ----
async function renderBookDetail(id) {
  try {
    const book = await API.books.get(id);
    const userStatuses = book.userStatus || [];

    const isReading = userStatuses.some(s => s.status === 'reading');
    const isRead = userStatuses.some(s => s.status === 'read');
    const isWant = userStatuses.some(s => s.status === 'want_to_read');
    const isFav = userStatuses.some(s => s.status === 'favorite');
    const userReview = book.reviews?.find(r => r.user_id === currentUser?.id);

    document.getElementById('app').innerHTML = `
      <div class="book-detail">
        <div class="book-detail-inner">
          <!-- Breadcrumb -->
          <div style="margin-bottom:28px;font-size:0.9rem;color:var(--c-muted)">
            <span onclick="navigate('/')" style="cursor:pointer;color:var(--c-primary)">Bosh sahifa</span> / 
            <span onclick="navigate('/kitoblar')" style="cursor:pointer;color:var(--c-primary)">Kitoblar</span> / 
            <span>${esc(book.title)}</span>
          </div>

          <div class="book-detail-hero">
            <div>
              <div class="book-detail-cover" style="background:linear-gradient(135deg,var(--c-primary),var(--c-primary2))">
                ${book.cover_url ? `<img src="${esc(book.cover_url)}" alt="${esc(book.title)}" onerror="this.style.display='none'">` : 
                  `<div class="book-cover-placeholder" style="height:100%"><div class="book-icon" style="font-size:3rem">📖</div><div class="book-title-ph" style="font-size:1rem">${esc(book.title)}</div><div class="book-author-ph">${esc(book.author)}</div></div>`}
              </div>
            </div>
            <div class="book-detail-info">
              ${book.genre ? `<span class="tag">${esc(book.genre)}</span>` : ''}
              <h1 class="book-detail-title">${esc(book.title)}</h1>
              <div class="book-detail-author">✍️ ${esc(book.author)}</div>
              
              <div class="book-detail-rating">
                ${stars(book.avg_rating)}
                <span style="font-family:var(--f-serif);font-size:1.3rem;font-weight:700;color:var(--c-accent)">${book.avg_rating ? parseFloat(book.avg_rating).toFixed(1) : '—'}</span>
                <span class="rating-count">(${book.review_count || 0} taqriz)</span>
              </div>

              <div class="book-detail-stats">
                <div class="book-stat"><div class="val">❤️ ${book.likes || 0}</div><div class="lbl">Yoqtirdi</div></div>
                <div class="book-stat"><div class="val">📖 ${book.reading_count || 0}</div><div class="lbl">O'qiyapti</div></div>
                <div class="book-stat"><div class="val">✅ ${book.read_count || 0}</div><div class="lbl">O'qib bo'ldi</div></div>
                <div class="book-stat"><div class="val">💬 ${book.review_count || 0}</div><div class="lbl">Taqriz</div></div>
              </div>

              <div class="book-detail-meta">
                ${book.pages ? `<span class="meta-item"><span class="meta-icon">📄</span>${book.pages} sahifa</span>` : ''}
                ${book.year ? `<span class="meta-item"><span class="meta-icon">📅</span>${book.year}</span>` : ''}
                ${book.language ? `<span class="meta-item"><span class="meta-icon">🌐</span>${esc(book.language)}</span>` : ''}
                ${book.publisher ? `<span class="meta-item"><span class="meta-icon">🏢</span>${esc(book.publisher)}</span>` : ''}
              </div>

              ${book.pdf_url ? `
              <div style="margin-bottom:20px">
                <button onclick="openPdfReader()" style="display:inline-flex;align-items:center;gap:10px;padding:13px 28px;background:linear-gradient(135deg,var(--c-primary),var(--c-primary2));color:white;border:none;border-radius:12px;font-size:1rem;font-weight:700;cursor:pointer;font-family:var(--f-serif);box-shadow:0 4px 16px rgba(0,0,0,0.25)">
                  📖 Kitobni O'qish
                </button>
              </div>` : ''}
              ${currentUser ? `
              <div>
                <div style="font-size:0.85rem;font-weight:600;color:var(--c-muted);margin-bottom:10px">Javonimga qo'shish:</div>
                <div class="book-shelf-buttons">
                  <button class="shelf-btn ${isReading ? 'active-reading' : ''}" onclick="toggleShelf(${book.id},'reading',${isReading})">
                    📖 ${isReading ? 'O\'qiyapman ✓' : 'O\'qiyapman'}
                  </button>
                  <button class="shelf-btn ${isRead ? 'active-read' : ''}" onclick="toggleShelf(${book.id},'read',${isRead})">
                    ✅ ${isRead ? 'O\'qidim ✓' : 'O\'qidim'}
                  </button>
                  <button class="shelf-btn ${isWant ? 'active-want' : ''}" onclick="toggleShelf(${book.id},'want_to_read',${isWant})">
                    🔖 ${isWant ? 'O\'qiyman ✓' : 'O\'qiyman'}
                  </button>
                  <button class="shelf-btn ${isFav ? 'active-fav' : ''}" onclick="toggleShelf(${book.id},'favorite',${isFav})">
                    ❤️ ${isFav ? 'Yoqtirdim ✓' : 'Yoqtirish'}
                  </button>
                </div>
              </div>` : `<button class="btn btn-accent btn-lg" onclick="navigate('/kirish')">📚 Javonga qo'shish uchun kiring</button>`}
            </div>
          </div>

          ${book.description ? `
          <div style="background:var(--c-card);border-radius:var(--r-lg);padding:28px;border:1px solid var(--c-border);margin-bottom:36px">
            <h3 style="font-family:var(--f-serif);font-size:1.2rem;margin-bottom:14px">📝 Kitob haqida</h3>
            <div class="book-description">${esc(book.description)}</div>
          </div>` : ''}

          <!-- Reviews -->
          <div class="reviews-section">
            <h2 class="section-title" style="margin-bottom:28px"><span class="icon">💬</span> Taqrizlar (${book.review_count || 0})</h2>
            
            ${currentUser ? `
            <div class="review-form-card">
              <div class="review-form-title">${userReview ? '✏️ Taqrizni tahrirlash' : '✍️ Taqriz yozish'}</div>
              <div class="star-selector" id="star-selector">
                ${[1,2,3,4,5].map(i => `<span class="star-s${userReview && i <= userReview.rating ? ' active' : ''}" onclick="selectStar(${i},${book.id})" onmouseover="hoverStar(${i})" onmouseout="unhoverStar(${book.id},${userReview?.rating||0})">${i <= (userReview?.rating || 0) ? '★' : '☆'}</span>`).join('')}
              </div>
              <input type="hidden" id="selected-rating" value="${userReview?.rating || 0}">
              <textarea class="form-input" id="review-text" placeholder="Kitob haqidagi fikringizni yozing (kamida 10 ta belgi)..." rows="4">${userReview ? esc(userReview.content) : ''}</textarea>
              <button class="btn btn-primary" style="margin-top:12px" onclick="submitReview(${book.id})">
                ${userReview ? '💾 Saqlash' : '📤 Yuborish'}
              </button>
            </div>` : `<div style="background:var(--c-bg2);border-radius:var(--r-md);padding:20px 24px;margin-bottom:24px;text-align:center">
              <span style="color:var(--c-text2)">Taqriz yozish uchun </span>
              <span onclick="navigate('/kirish')" style="color:var(--c-primary);font-weight:600;cursor:pointer">kirish</span>
              <span style="color:var(--c-text2)"> kerak</span>
            </div>`}

            <div id="reviews-list">
              ${book.reviews?.length > 0 ? book.reviews.map(r => reviewHtml(r)).join('') : 
                '<div class="empty-state"><div class="icon">💬</div><h3>Taqrizlar yo\'q</h3><p>Birinchi taqrizni siz yozing!</p></div>'}
            </div>
          </div>
        </div>
      </div>`;

    window._currentBookId = book.id;
    window._currentBookPdfUrl = book.pdf_url || null;
    window._currentBookTitle = book.title || '';
  } catch (err) {
    document.getElementById('app').innerHTML = `<div class="empty-state" style="padding:80px"><div class="icon">❌</div><h3>Kitob topilmadi</h3><p>${err.message}</p></div>`;
  }
}

function reviewHtml(r) {
  const initials = r.user_name ? r.user_name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() : '?';
  const avatarHtml = r.user_avatar ? `<img src="${esc(r.user_avatar)}" alt="${esc(r.user_name)}">` : initials;
  const canDelete = currentUser && (currentUser.id === r.user_id || currentUser.role === 'admin');
  return `
    <div class="review-card" id="review-${r.id}">
      <div class="review-header">
        <div class="review-avatar">${avatarHtml}</div>
        <div style="flex:1">
          <div class="review-user-name">${esc(r.user_name)}</div>
          <div class="review-date">${fmtDate(r.created_at)}</div>
        </div>
        ${canDelete ? `<button class="btn btn-sm" style="color:var(--c-danger);background:transparent;padding:4px 8px;border:1px solid var(--c-border);border-radius:6px" onclick="deleteReview(${r.id})">🗑</button>` : ''}
      </div>
      <div class="review-rating">${stars(r.rating)}</div>
      <div class="review-content">${esc(r.content)}</div>
    </div>`;
}

function selectStar(n, bookId) {
  document.getElementById('selected-rating').value = n;
  document.querySelectorAll('.star-s').forEach((s, i) => {
    s.textContent = i < n ? '★' : '☆';
    s.classList.toggle('active', i < n);
  });
}
function hoverStar(n) {
  document.querySelectorAll('.star-s').forEach((s, i) => {
    s.textContent = i < n ? '★' : '☆';
  });
}
function unhoverStar(bookId, rating) {
  document.querySelectorAll('.star-s').forEach((s, i) => {
    s.textContent = i < rating ? '★' : '☆';
  });
}

async function submitReview(bookId) {
  const content = document.getElementById('review-text')?.value?.trim();
  const rating = parseInt(document.getElementById('selected-rating')?.value);

  if (!rating || rating < 1) return showToast('Iltimos, baho bering', 'error');
  if (!content || content.length < 10) return showToast('Taqriz kamida 10 ta belgi bo\'lishi kerak', 'error');

  try {
    await API.reviews.create({ book_id: bookId, content, rating });
    showToast('Taqriz muvaffaqiyatli saqlandi', 'success');
    renderBookDetail(bookId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function toggleShelf(bookId, status, isActive) {
  if (!currentUser) return navigate('/kirish');
  try {
    if (isActive) {
      await API.shelf.remove({ book_id: bookId, status });
      showToast('Javondan olib tashlandi', 'info');
    } else {
      await API.shelf.add({ book_id: bookId, status });
      const labels = { reading: 'O\'qiyapman', read: 'O\'qidim', want_to_read: 'O\'qiyman', favorite: 'Yoqtirilgan' };
      showToast(`"${labels[status]}" javoniga qo'shildi ✓`, 'success');
    }
    renderBookDetail(bookId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteReview(id) {
  if (!confirm('Taqrizni o\'chirishga ishonchingiz komilmi?')) return;
  try {
    await API.reviews.delete(id);
    document.getElementById('review-' + id)?.remove();
    showToast('Taqriz o\'chirildi', 'info');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ---- PROFILE PAGE ----
async function renderProfilePage() {
  if (!currentUser) { navigate('/kirish'); return; }

  try {
    const [me, myBooks] = await Promise.all([
      API.auth.me(),
      API.shelf.list()
    ]);
    currentUser = me;
    API.setUser(me);
    renderNavUser();

    const shelfTabs = [
      { key: 'reading', label: 'Hozir O\'qiyapman', icon: '📖', count: me.stats?.reading || 0 },
      { key: 'read', label: 'O\'qib Bo\'ldim', icon: '✅', count: me.stats?.read || 0 },
      { key: 'want_to_read', label: 'O\'qimoqchiman', icon: '🔖', count: me.stats?.want_to_read || 0 },
      { key: 'favorite', label: 'Yoqtirganlari', icon: '❤️', count: me.stats?.favorites || 0 },
    ];

    const initials = me.name ? me.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() : '?';
    const avatarLarge = me.avatar
      ? `<img src="${esc(me.avatar)}" alt="${esc(me.name)}">`
      : initials;

    document.getElementById('app').innerHTML = `
      <div class="profile-page">
        <div class="container">
          <div class="profile-header-card">
            <div class="profile-avatar-large">${avatarLarge}</div>
            <div class="profile-user-info">
              <div class="profile-user-name">${esc(me.name)}</div>
              <div class="profile-user-meta">
                ${me.email ? `📧 ${esc(me.email)}` : ''}
                ${me.telegram_username ? ` • 📱 @${esc(me.telegram_username)}` : ''}
              </div>
              <div class="profile-user-meta" style="margin-top:4px">📅 ${fmtDate(me.created_at)} dan a'zo</div>
              <div class="profile-stats">
                <div class="profile-stat"><div class="num">${me.stats?.read||0}</div><div class="lbl">O'qildi</div></div>
                <div class="profile-stat"><div class="num">${me.stats?.reading||0}</div><div class="lbl">O'qiyapman</div></div>
                <div class="profile-stat"><div class="num">${me.stats?.favorites||0}</div><div class="lbl">Yoqtirgan</div></div>
                <div class="profile-stat"><div class="num">${me.stats?.reviews||0}</div><div class="lbl">Taqriz</div></div>
              </div>
            </div>
            <button class="btn btn-ghost" style="align-self:flex-start;background:rgba(255,255,255,0.15);color:white;border:1px solid rgba(255,255,255,0.3)" onclick="showEditProfile()">✏️ Tahrirlash</button>
          </div>

          <div class="shelf-tabs" id="shelf-tabs">
            ${shelfTabs.map((t,i) => `<button class="shelf-tab-btn${i===0?' active':''}" onclick="switchShelfTab('${t.key}', this)">${t.icon} ${t.label} <span class="badge">${t.count}</span></button>`).join('')}
            <button class="shelf-tab-btn" onclick="switchShelfTab('reviews', this)">✍️ Taqrizlarim <span class="badge">${me.stats?.reviews||0}</span></button>
          </div>

          <div id="shelf-content"></div>
        </div>
      </div>`;

    window._profileBooks = myBooks;
    switchShelfTab('reading', document.querySelector('.shelf-tab-btn.active'));
  } catch (err) {
    document.getElementById('app').innerHTML = `<div class="empty-state"><div class="icon">❌</div><h3>${err.message}</h3></div>`;
  }
}

async function switchShelfTab(key, btn) {
  document.querySelectorAll('.shelf-tab-btn').forEach(b => b.classList.remove('active'));
  btn?.classList.add('active');

  const content = document.getElementById('shelf-content');
  if (!content) return;

  if (key === 'reviews') {
    try {
      const reviews = await API.reviews.my();
      if (!reviews.length) {
        content.innerHTML = `<div class="empty-state"><div class="icon">✍️</div><h3>Hali taqriz yozmadingiz</h3><p>Kitob sahifasiga kirib taqriz yozing</p></div>`;
        return;
      }
      content.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px">
        ${reviews.map(r => `
          <div class="review-card" onclick="navigate('/kitob/${r.book_id}')">
            <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:12px">
              <div style="background:linear-gradient(135deg,var(--c-primary),var(--c-primary2));width:44px;height:62px;border-radius:6px;overflow:hidden;flex-shrink:0">
                ${r.cover_url ? `<img src="${esc(r.cover_url)}" style="width:100%;height:100%;object-fit:cover">` : '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:white;font-size:1.3rem">📖</div>'}
              </div>
              <div><div style="font-family:var(--f-serif);font-weight:700;font-size:0.92rem">${esc(r.book_title)}</div>
              <div style="font-size:0.8rem;color:var(--c-muted)">${esc(r.book_author)}</div>
              <div style="margin-top:4px">${stars(r.rating)}</div></div>
            </div>
            <div class="review-content" style="-webkit-line-clamp:3">${esc(r.content)}</div>
            <div style="margin-top:10px;font-size:0.78rem;color:var(--c-muted)">${fmtDate(r.created_at)}</div>
          </div>`).join('')}
      </div>`;
    } catch (err) { content.innerHTML = `<div class="empty-state"><h3>${err.message}</h3></div>`; }
    return;
  }

  const books = (window._profileBooks || []).filter(b => b.status === key);
  const emptyMsg = {
    reading: { icon: '📖', title: 'Hozir o\'qiyotgan kitob yo\'q', sub: 'Kitob sahifasida "O\'qiyapman" tugmasini bosing' },
    read: { icon: '✅', title: 'O\'qilgan kitoblar yo\'q', sub: 'O\'qib bo\'lgan kitoblaringizni belgilang' },
    want_to_read: { icon: '🔖', title: 'Rejadagi kitoblar yo\'q', sub: 'Keyinchalik o\'qimoqchi bo\'lgan kitoblarni belgilang' },
    favorite: { icon: '❤️', title: 'Yoqtirgan kitoblar yo\'q', sub: 'Sevimli kitoblaringizni belgilang' },
  };

  if (!books.length) {
    const e = emptyMsg[key];
    content.innerHTML = `<div class="empty-state"><div class="icon">${e.icon}</div><h3>${e.title}</h3><p>${e.sub}</p><button class="btn btn-primary" style="margin-top:16px" onclick="navigate('/kitoblar')">📚 Kitoblarni ko'rish</button></div>`;
    return;
  }

  content.innerHTML = `<div class="books-grid">${books.map((b, i) => bookCardHtml(b, i)).join('')}</div>`;
}

function showEditProfile() {
  const user = currentUser;
  document.getElementById('modal-container').innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">Profilni Tahrirlash</div>
          <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Ism</label>
            <input class="form-input" id="edit-name" value="${esc(user.name)}" placeholder="Ismingiz">
          </div>
          <div class="form-group">
            <label class="form-label">Avatar URL (rasmning internet manzili)</label>
            <input class="form-input" id="edit-avatar" value="${esc(user.avatar||'')}" placeholder="https://example.com/rasm.jpg">
          </div>
          <button class="btn btn-primary btn-full" onclick="saveProfile()">💾 Saqlash</button>
        </div>
      </div>
    </div>`;
}

async function saveProfile() {
  const name = document.getElementById('edit-name')?.value?.trim();
  const avatar = document.getElementById('edit-avatar')?.value?.trim();
  try {
    await API.auth.updateProfile({ name, avatar: avatar || null });
    showToast('Profil yangilandi', 'success');
    closeModal();
    currentUser = await API.auth.me();
    API.setUser(currentUser);
    renderNavUser();
    renderProfilePage();
  } catch (err) { showToast(err.message, 'error'); }
}

function closeModal() {
  document.getElementById('modal-container').innerHTML = '';
}

// ---- AUTH PAGE ----
function renderAuthPage() {
  if (currentUser) { navigate('/'); return; }

  const TELEGRAM_BOT = (window.TELEGRAM_BOT_NAME) || 'your_bot_username';

  document.getElementById('app').innerHTML = `
    <div class="auth-page">
      <div class="auth-card slide-up">
        <div class="auth-header">
          <div class="icon">📚</div>
          <h1>Kitob.UZ</h1>
          <p>O'zbek kitobxonlar hamjamiyati</p>
        </div>
        <div class="auth-tabs">
          <button class="auth-tab active" onclick="switchAuthTab('login',this)">Kirish</button>
          <button class="auth-tab" onclick="switchAuthTab('register',this)">Ro'yxatdan o'tish</button>
        </div>

        <!-- Login -->
        <div class="auth-tab-content active" id="tab-login">
          <div class="form-group">
            <label class="form-label">Email manzil</label>
            <input class="form-input" id="login-email" type="email" placeholder="siz@example.com" onkeydown="if(event.key==='Enter')submitLogin()">
          </div>
          <div class="form-group">
            <label class="form-label">Parol</label>
            <input class="form-input" id="login-password" type="password" placeholder="Parolingiz" onkeydown="if(event.key==='Enter')submitLogin()">
          </div>
          <div id="login-error" style="color:var(--c-danger);font-size:0.85rem;margin-bottom:12px;display:none"></div>
          <button class="btn btn-primary btn-full btn-lg" onclick="submitLogin()" id="login-btn">🔑 Kirish</button>

          <div class="auth-divider">yoki</div>

         
         
          <p style="text-align:center;margin-top:16px;font-size:0.88rem;color:var(--c-muted)">
            Hisobingiz yo'qmi? <span onclick="switchAuthTab('register',document.querySelectorAll('.auth-tab')[1])" style="color:var(--c-primary);font-weight:600;cursor:pointer">Ro'yxatdan o'ting</span>
          </p>
          <div style="margin-top:20px;padding:14px 16px;background:var(--c-bg2);border-radius:var(--r-sm);font-size:0.82rem;color:var(--c-muted)">
             <u> Kitobxon.uz </u> <i> portalidagi barcha shaxsiy ma'lumotlaringiz sayt ma'muriyati tomonidan himoyalanadi ! </i> <br>
          </div>
        </div>

        <!-- Register -->
        <div class="auth-tab-content" id="tab-register">
          <div class="form-group">
            <label class="form-label">Ismingiz</label>
            <input class="form-input" id="reg-name" type="text" placeholder="To'liq ismingiz">
          </div>
          <div class="form-group">
            <label class="form-label">Email manzil</label>
            <input class="form-input" id="reg-email" type="email" placeholder="siz@example.com">
          </div>
          <div class="form-group">
            <label class="form-label">Parol</label>
            <input class="form-input" id="reg-password" type="password" placeholder="Kamida 6 ta belgi" onkeydown="if(event.key==='Enter')submitRegister()">
          </div>
          <div id="register-error" style="color:var(--c-danger);font-size:0.85rem;margin-bottom:12px;display:none"></div>
          <button class="btn btn-accent btn-full btn-lg" onclick="submitRegister()" id="reg-btn">🚀 Ro'yxatdan O'tish</button>
          <p style="text-align:center;margin-top:16px;font-size:0.88rem;color:var(--c-muted)">
            Hisobingiz bormi? <span onclick="switchAuthTab('login',document.querySelectorAll('.auth-tab')[0])" style="color:var(--c-primary);font-weight:600;cursor:pointer">Kirish</span>
          </p>
        </div>
      </div>
    </div>`;
}

function switchAuthTab(tab, btn) {
  document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.auth-tab-content').forEach(c => c.classList.remove('active'));
  btn?.classList.add('active');
  document.getElementById('tab-' + tab)?.classList.add('active');
}

async function submitLogin() {
  const email = document.getElementById('login-email')?.value?.trim();
  const password = document.getElementById('login-password')?.value;
  const errEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');
  errEl.style.display = 'none';

  if (!email || !password) { errEl.textContent = 'Email va parolni kiriting'; errEl.style.display = 'block'; return; }

  btn.textContent = 'Kirilyapti...'; btn.disabled = true;
  try {
    const data = await API.auth.login({ email, password });
    API.setToken(data.token);
    currentUser = data.user;
    API.setUser(data.user);
    renderNavUser();
    showToast(`Xush kelibsiz, ${data.user.name}! 👋`, 'success');
    navigate('/');
  } catch (err) {
    errEl.textContent = err.message; errEl.style.display = 'block';
  }
  btn.textContent = '🔑 Kirish'; btn.disabled = false;
}

async function submitRegister() {
  const name = document.getElementById('reg-name')?.value?.trim();
  const email = document.getElementById('reg-email')?.value?.trim();
  const password = document.getElementById('reg-password')?.value;
  const errEl = document.getElementById('register-error');
  const btn = document.getElementById('reg-btn');
  errEl.style.display = 'none';

  if (!name || !email || !password) { errEl.textContent = 'Barcha maydonlarni to\'ldiring'; errEl.style.display = 'block'; return; }

  btn.textContent = 'Ro\'yxatdan o\'tilmoqda...'; btn.disabled = true;
  try {
    const data = await API.auth.register({ name, email, password });
    API.setToken(data.token);
    currentUser = data.user;
    API.setUser(data.user);
    renderNavUser();
    showToast(`Xush kelibsiz, ${data.user.name}! 🎉`, 'success');
    navigate('/');
  } catch (err) {
    errEl.textContent = err.message; errEl.style.display = 'block';
  }
  btn.textContent = '🚀 Ro\'yxatdan O\'tish'; btn.disabled = false;
}

// Telegram OAuth callback
window.onTelegramAuth = async (user) => {
  try {
    const data = await API.auth.telegram(user);
    API.setToken(data.token);
    currentUser = data.user;
    API.setUser(data.user);
    renderNavUser();
    showToast(`Xush kelibsiz, ${data.user.name}! 📱`, 'success');
    navigate('/');
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// ---- ADMIN PAGE ----
let adminSection = 'dashboard';

async function renderAdminPage(section = 'dashboard') {
  if (!currentUser || currentUser.role !== 'admin') {
    navigate('/'); showToast('Admin huquqi talab etiladi', 'error'); return;
  }
  adminSection = section;

  const navItems = [
    { key: 'dashboard', icon: '📊', label: 'Boshqaruv paneli' },
    { key: 'users', icon: '👥', label: 'Foydalanuvchilar' },
    { key: 'books', icon: '📚', label: 'Kitoblar' },
    { key: 'add-book', icon: '➕', label: 'Kitob qo\'shish' },
  ];

  document.getElementById('app').innerHTML = `
    <div class="admin-layout">
      <aside class="admin-sidebar">
        <div class="admin-nav-title">Admin Panel</div>
        ${navItems.map(n => `
          <div class="admin-nav-item${section===n.key?' active':''}" onclick="navigate('/admin/${n.key}')">
            <span>${n.icon}</span> ${n.label}
          </div>`).join('')}
        <div style="height:1px;background:rgba(255,255,255,0.1);margin:12px 16px"></div>
        <div class="admin-nav-item" onclick="navigate('/')">🏠 Bosh sahifaga</div>
      </aside>
      <div class="admin-content" id="admin-content">
        <div style="text-align:center;padding:60px"><div class="loading-spinner" style="margin:auto;width:40px;height:40px;border-width:4px"></div></div>
      </div>
    </div>`;

  if (section === 'dashboard') await renderAdminDashboard();
  else if (section === 'users') await renderAdminUsers();
  else if (section === 'books') await renderAdminBooks();
  else if (section === 'add-book') renderAdminAddBook();
}

async function renderAdminDashboard() {
  try {
    const data = await API.admin.stats();
    const s = data.stats;
    document.getElementById('admin-content').innerHTML = `
      <div class="admin-page-title">📊 Boshqaruv Paneli</div>
      <div class="stats-grid">
        ${[
          { icon:'👥', val:s.users, lbl:'Foydalanuvchilar', change:`+${s.newUsersThisMonth} bu oy` },
          { icon:'📚', val:s.books, lbl:'Kitoblar', change:'' },
          { icon:'💬', val:s.reviews, lbl:'Taqrizlar', change:`+${s.newReviewsThisMonth} bu oy` },
          { icon:'📖', val:s.reading, lbl:'O\'qiyotganlar', change:'' },
          { icon:'✅', val:s.read, lbl:'O\'qilgan', change:'' },
          { icon:'❤️', val:s.favorites, lbl:'Yoqtirilgan', change:'' },
          { icon:'🔖', val:s.want_to_read, lbl:'O\'qilmoqchi', change:'' },
        ].map(c => `<div class="stat-card">
          <div class="stat-card-icon">${c.icon}</div>
          <div class="stat-card-val">${c.val}</div>
          <div class="stat-card-lbl">${c.lbl}</div>
          ${c.change ? `<div class="stat-card-change">${c.change}</div>` : ''}
        </div>`).join('')}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;flex-wrap:wrap">
        <div class="table-container">
          <div class="table-header"><div class="table-title">🔥 Top 10 Kitob</div></div>
          <table class="data-table">
            <thead><tr><th>Kitob</th><th>❤️</th><th>💬</th><th>⭐</th></tr></thead>
            <tbody>${data.topBooks.map(b => `
              <tr>
                <td><div style="font-weight:600;font-size:0.88rem">${esc(b.title)}</div><div style="font-size:0.78rem;color:var(--c-muted)">${esc(b.author)}</div></td>
                <td>${b.likes||0}</td>
                <td>${b.review_count||0}</td>
                <td>${b.avg_rating ? parseFloat(b.avg_rating).toFixed(1) : '—'}</td>
              </tr>`).join('')}</tbody>
          </table>
        </div>

        <div class="table-container">
          <div class="table-header"><div class="table-title">👥 So'nggi Foydalanuvchilar</div></div>
          <table class="data-table">
            <thead><tr><th>Foydalanuvchi</th><th>Rol</th><th>Sana</th></tr></thead>
            <tbody>${data.recentUsers.map(u => `
              <tr>
                <td><div class="user-cell"><div class="avatar-sm">${u.name?.[0]||'?'}</div><div><div style="font-weight:600;font-size:0.88rem">${esc(u.name)}</div><div style="font-size:0.78rem;color:var(--c-muted)">${esc(u.email||u.telegram_username||'')}</div></div></div></td>
                <td><span class="badge-role ${u.role}">${u.role==='admin'?'Admin':'Foydalanuvchi'}</span></td>
                <td style="font-size:0.78rem;color:var(--c-muted)">${fmtDate(u.created_at)}</td>
              </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>

      <div class="table-container" style="margin-top:24px">
        <div class="table-header"><div class="table-title">✍️ So'nggi Taqrizlar</div></div>
        <table class="data-table">
          <thead><tr><th>Foydalanuvchi</th><th>Kitob</th><th>⭐</th><th>Sana</th><th>Amal</th></tr></thead>
          <tbody>${data.recentReviews.map(r => `
            <tr>
              <td>${esc(r.user_name)}</td>
              <td style="font-weight:600">${esc(r.book_title)}</td>
              <td>${'★'.repeat(r.rating)}</td>
              <td style="font-size:0.78rem;color:var(--c-muted)">${fmtDate(r.created_at)}</td>
              <td><button class="btn btn-sm btn-danger" onclick="adminDeleteReview(${r.id},this)">🗑</button></td>
            </tr>`).join('')}</tbody>
        </table>
      </div>`;
  } catch (err) {
    document.getElementById('admin-content').innerHTML = `<div class="empty-state"><h3>${err.message}</h3></div>`;
  }
}

async function renderAdminUsers() {
  try {
    const data = await API.admin.users();
    document.getElementById('admin-content').innerHTML = `
      <div class="admin-page-title">👥 Foydalanuvchilar (${data.total})</div>
      <div class="table-container">
        <div class="table-header">
          <div class="table-title">Barcha foydalanuvchilar</div>
          <input class="table-search" id="user-search" placeholder="Qidirish..." onkeyup="searchAdminUsers()">
        </div>
        <div id="users-table-body">
          ${renderUsersTable(data.users)}
        </div>
      </div>`;
    window._adminUsersData = data.users;
  } catch (err) {
    document.getElementById('admin-content').innerHTML = `<div class="empty-state"><h3>${err.message}</h3></div>`;
  }
}

function renderUsersTable(users) {
  return `<table class="data-table">
    <thead><tr><th>Foydalanuvchi</th><th>Email / Telegram</th><th>Rol</th><th>Kitoblar</th><th>Taqrizlar</th><th>Qo'shildi</th><th>Amal</th></tr></thead>
    <tbody>${users.map(u => `
      <tr>
        <td><div class="user-cell">
          <div class="avatar-sm">${u.avatar ? `<img src="${esc(u.avatar)}">` : (u.name?.[0]||'?')}</div>
          <div><div style="font-weight:600;font-size:0.88rem">${esc(u.name)}</div></div>
        </div></td>
        <td style="font-size:0.82rem;color:var(--c-muted)">${esc(u.email||'')}${u.telegram_username?` @${esc(u.telegram_username)}`:''}</td>
        <td><span class="badge-role ${u.role}">${u.role==='admin'?'Admin':'Foydalanuvchi'}</span></td>
        <td>${u.books_read}</td>
        <td>${u.review_count}</td>
        <td style="font-size:0.78rem;color:var(--c-muted)">${fmtDate(u.created_at)}</td>
        <td>
          <div style="display:flex;gap:6px">
            ${u.role==='user'
              ? `<button class="btn btn-sm btn-primary" onclick="changeUserRole(${u.id},'admin',this)" title="Adminga ko'tar">👑</button>`
              : `<button class="btn btn-sm btn-ghost" onclick="changeUserRole(${u.id},'user',this)" title="Foydalanuvchiga tushir">👤</button>`}
            <button class="btn btn-sm btn-danger" onclick="deleteAdminUser(${u.id},this)">🗑</button>
          </div>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

async function searchAdminUsers() {
  const q = document.getElementById('user-search')?.value?.trim();
  try {
    const data = await API.admin.users(q);
    document.getElementById('users-table-body').innerHTML = renderUsersTable(data.users);
  } catch {}
}

async function changeUserRole(id, role, btn) {
  try {
    await API.admin.updateUserRole(id, role);
    showToast('Rol yangilandi', 'success');
    renderAdminUsers();
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteAdminUser(id, btn) {
  if (!confirm('Foydalanuvchini o\'chirishga ishonchingiz komilmi?')) return;
  try {
    await API.admin.deleteUser(id);
    showToast('Foydalanuvchi o\'chirildi', 'info');
    btn.closest('tr').remove();
  } catch (err) { showToast(err.message, 'error'); }
}

async function adminDeleteReview(id, btn) {
  if (!confirm('Taqrizni o\'chirishga ishonchingiz komilmi?')) return;
  try {
    await API.admin.deleteReview(id);
    showToast('Taqriz o\'chirildi', 'info');
    btn.closest('tr').remove();
  } catch (err) { showToast(err.message, 'error'); }
}

async function addBook() {
  try {
    // 🔹 oddiy maydonlar
    const title = document.getElementById('book-title').value.trim();
    const author = document.getElementById('book-author').value.trim();
    const genre = document.getElementById('book-genre').value.trim();
    const description = document.getElementById('book-desc').value.trim();

    // 🔥 SIZ SO‘RAGAN QATOR — SHU YERDA BO‘LADI
    const pdf_url = document.getElementById('book-pdf')?.value?.trim();

    // 🔒 tekshiruv
    if (!title || !author) {
      showToast('Majburiy maydonlar to‘ldirilmagan', 'error');
      return;
    }

    // 📡 API ga yuborish
    await API.books.create({
      title,
      author,
      genre,
      description,
      pdf_url
    });

    showToast('Kitob qo‘shildi', 'success');

    // 🔄 sahifani yangilash
    navigate('/kitoblar');

  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function renderAdminBooks() {
  try {
    const books = await API.admin.books();
    document.getElementById('admin-content').innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px">
        <div class="admin-page-title" style="margin:0">📚 Kitoblar (${books.length})</div>
        <button class="btn btn-accent" onclick="navigate('/admin/add-book')">➕ Kitob qo'shish</button>
      </div>
      <div class="table-container">
        <div class="table-header"><div class="table-title">Barcha kitoblar</div></div>
        <table class="data-table">
          <thead><tr><th>Kitob</th><th>Janr</th><th>Sahifalar</th><th>Yil</th><th>❤️</th><th>💬</th><th>⭐</th><th>Amal</th></tr></thead>
          <tbody>${books.map(b => `
            <tr>
              <td>
                <div style="display:flex;gap:10px;align-items:center">
                  <div style="width:32px;height:44px;border-radius:4px;background:linear-gradient(135deg,var(--c-primary),var(--c-primary2));flex-shrink:0;overflow:hidden">
                    ${b.cover_url ? `<img src="${esc(b.cover_url)}" style="width:100%;height:100%;object-fit:cover">` : ''}
                  </div>
                  <div><div style="font-weight:600;font-size:0.88rem">${esc(b.title)}</div>
                  <div style="font-size:0.78rem;color:var(--c-muted)">${esc(b.author)}</div></div>
                </div>
              </td>
              <td style="font-size:0.82rem">${esc(b.genre||'—')}</td>
              <td>${b.pages||'—'}</td>
              <td>${b.year||'—'}</td>
              <td>${b.likes||0}</td>
              <td>${b.review_count||0}</td>
              <td>${b.avg_rating ? parseFloat(b.avg_rating).toFixed(1) : '—'}</td>
              <td>
                <div style="display:flex;gap:6px">
                  <button class="btn btn-sm btn-ghost" onclick="showEditBookModal(${b.id})" title="Tahrirlash">✏️</button>
                  <button class="btn btn-sm btn-danger" onclick="adminDeleteBook(${b.id},this)">🗑</button>
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    window._adminBooks = books;
  } catch (err) {
    document.getElementById('admin-content').innerHTML = `<div class="empty-state"><h3>${err.message}</h3></div>`;
  }
}

function renderAdminAddBook(book = null) {
  document.getElementById('admin-content').innerHTML = `
    <div class="admin-page-title">${book ? '✏️ Kitobni tahrirlash' : '➕ Yangi Kitob Qo\'shish'}</div>
    <div style="background:var(--c-card);border-radius:var(--r-lg);padding:32px;border:1px solid var(--c-border);max-width:640px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="form-group" style="grid-column:1/-1">
          <label class="form-label">Kitob nomi *</label>
          <input class="form-input" id="book-title" value="${esc(book?.title||'')}" placeholder="Masalan: O'tkan kunlar">
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label class="form-label">Muallif *</label>
          <input class="form-input" id="book-author" value="${esc(book?.author||'')}" placeholder="Masalan: Abdulla Qodiriy">
        </div>
        <div class="form-group">
          <label class="form-label">Janr</label>
          <input class="form-input" id="book-genre" value="${esc(book?.genre||'')}" placeholder="Roman, She'riyat, ...">
        </div>
        <div class="form-group">
          <label class="form-label">Til</label>
          <input class="form-input" id="book-language" value="${esc(book?.language||"O'zbekcha")}" placeholder="O'zbekcha">
        </div>
        <div class="form-group">
          <label class="form-label">Sahifalar soni</label>
          <input class="form-input" id="book-pages" type="number" value="${book?.pages||''}" placeholder="0">
        </div>
        <div class="form-group">
          <label class="form-label">Yil</label>
          <input class="form-input" id="book-year" type="number" value="${book?.year||''}" placeholder="2024">
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label class="form-label">Nashriyot</label>
          <input class="form-input" id="book-publisher" value="${esc(book?.publisher||'')}" placeholder="G'afur G'ulom nashriyoti">
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label class="form-label">Muqova rasmi URL</label>
          <input class="form-input" id="book-cover" value="${esc(book?.cover_url||'')}" placeholder="https://...">
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label class="form-label">📄 PDF URL <span style="font-size:0.78rem;color:var(--c-muted);font-weight:400">(Google Drive, Telegram yoki boshqa havola)</span></label>
          <input class="form-input" id="book-pdf" value="${esc(book?.pdf_url||'')}" placeholder="https://drive.google.com/file/d/.../view">
          <div style="font-size:0.75rem;color:var(--c-muted);margin-top:4px">💡 Google Drive: "Ulashish → Havola olish" tugmasini bosing</div>
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label class="form-label">Kitob haqida</label>
          <textarea class="form-input" id="book-desc" rows="4" placeholder="Kitob haqida qisqacha ma'lumot...">${esc(book?.description||'')}</textarea>
        </div>
      </div>
      <div id="admin-book-error" style="color:var(--c-danger);margin-bottom:12px;display:none"></div>
      <div style="display:flex;gap:12px">
        <button class="btn btn-accent btn-lg" onclick="submitAdminBook(${book?.id||'null'})">${book ? '💾 Saqlash' : '➕ Qo\'shish'}</button>
        <button class="btn btn-ghost btn-lg" onclick="navigate('/admin/books')">Bekor qilish</button>
      </div>
    </div>`;
}

function showEditBookModal(id) {
  const book = window._adminBooks?.find(b => b.id === id);
  if (book) renderAdminAddBook(book);
}

async function submitAdminBook(bookId) {
  const title = document.getElementById('book-title')?.value?.trim();
  const author = document.getElementById('book-author')?.value?.trim();
  const errEl = document.getElementById('admin-book-error');

  if (!title || !author) { errEl.textContent = 'Kitob nomi va muallif talab etiladi'; errEl.style.display = 'block'; return; }

  const bookData = {
    title, author,
    genre: document.getElementById('book-genre')?.value?.trim()||null,
    language: document.getElementById('book-language')?.value?.trim()||"O'zbekcha",
    pages: parseInt(document.getElementById('book-pages')?.value)||0,
    year: parseInt(document.getElementById('book-year')?.value)||null,
    publisher: document.getElementById('book-publisher')?.value?.trim()||null,
    cover_url: document.getElementById('book-cover')?.value?.trim()||null,
    pdf_url: document.getElementById('book-pdf')?.value?.trim()||null,
    description: document.getElementById('book-desc')?.value?.trim()||null,
  };

  try {
    if (bookId && bookId !== 'null') {
      await API.books.update(bookId, bookData);
      showToast('Kitob yangilandi', 'success');
    } else {
      await API.books.create(bookData);
      showToast('Kitob qo\'shildi', 'success');
    }
    navigate('/admin/books');
  } catch (err) {
    errEl.textContent = err.message; errEl.style.display = 'block';
  }
}

async function adminDeleteBook(id, btn) {
  if (!confirm('Kitobni o\'chirishga ishonchingiz komilmi?')) return;
  try {
    await API.books.delete(id);
    showToast('Kitob o\'chirildi', 'info');
    btn.closest('tr').remove();
  } catch (err) { showToast(err.message, 'error'); }
}

// ============================================================
// PDF READER MODAL
// ============================================================
function openPdfReader() {
  const pdfUrl = window._currentBookPdfUrl;
  const title  = window._currentBookTitle;
  if (!pdfUrl) return;

  const old = document.getElementById('pdf-reader-modal');
  if (old) old.remove();

  // Google Drive URL ni embed formatiga o'tkazish
  let embedUrl = pdfUrl;
  const gdrive = pdfUrl.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (gdrive) embedUrl = 'https://drive.google.com/file/d/' + gdrive[1] + '/preview';

  const modal = document.createElement('div');
  modal.id = 'pdf-reader-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.96);display:flex;flex-direction:column';

  modal.innerHTML =
    '<style>' +
    '#pdf-reader-modal .pr-bar{display:flex;align-items:center;gap:12px;padding:10px 18px;background:#1a1a2e;border-bottom:1px solid rgba(255,255,255,.1);flex-shrink:0}' +
    '#pdf-reader-modal .pr-title{flex:1;font-family:var(--f-serif);font-weight:700;font-size:1rem;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '#pdf-reader-modal .pr-btn{padding:8px 16px;border:none;border-radius:8px;font-size:.85rem;font-weight:600;cursor:pointer;white-space:nowrap}' +
    '#pdf-reader-modal .pr-dl{background:#2E7D32;color:#fff}' +
    '#pdf-reader-modal .pr-close{background:#c0392b;color:#fff}' +
    '#pdf-reader-modal iframe{flex:1;width:100%;border:none;background:#fff}' +
    '#pdf-reader-modal .pr-fallback{display:none;flex:1;align-items:center;justify-content:center;flex-direction:column;gap:16px;color:rgba(255,255,255,.8);text-align:center;padding:40px}' +
    '#pdf-reader-modal .pr-fallback a{color:#7eb6ff;font-size:1.1rem}' +
    '</style>' +
    '<div class="pr-bar">' +
      '<span style="font-size:1.3rem">📖</span>' +
      '<div class="pr-title">' + title + '</div>' +
      '<a href="' + pdfUrl + '" target="_blank" class="pr-btn pr-dl">⬇️ Yuklab olish</a>' +
      '<button class="pr-btn pr-close" onclick="closePdfReader()">✕ Yopish</button>' +
    '</div>' +
    '<iframe id="pr-iframe" src="' + embedUrl + '" allowfullscreen></iframe>' +
    '<div class="pr-fallback" id="pr-fallback">' +
      '<div style="font-size:3rem">📄</div>' +
      '<div>PDF to\'g\'ridan-to\'g\'ri yuklanmadi.</div>' +
      '<a href="' + pdfUrl + '" target="_blank">👉 Yangi tabda ochish</a>' +
      '<button class="pr-btn pr-close" onclick="closePdfReader()">Yopish</button>' +
    '</div>';

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  // 10 sek ichida yuklanmasa fallback ko'rsat
  var loaded = false;
  document.getElementById('pr-iframe').onload = function() { loaded = true; };
  setTimeout(function() {
    if (!loaded) {
      document.getElementById('pr-iframe').style.display = 'none';
      document.getElementById('pr-fallback').style.display = 'flex';
    }
  }, 10000);

  // Escape bilan yopish
  function onKey(e) {
    if (e.key === 'Escape') { closePdfReader(); document.removeEventListener('keydown', onKey); }
  }
  document.addEventListener('keydown', onKey);
}

function closePdfReader() {
  var m = document.getElementById('pdf-reader-modal');
  if (m) m.remove();
  document.body.style.overflow = '';
}
