// ============================================
// KITOB.UZ — API Utility Module
// ============================================

const API = {
  base: '/api',

  getToken() { return localStorage.getItem('kitob_token'); },
  setToken(token) { localStorage.setItem('kitob_token', token); },
  removeToken() { localStorage.removeItem('kitob_token'); },

  getUser() {
    const d = localStorage.getItem('kitob_user');
    try { return d ? JSON.parse(d) : null; } catch { return null; }
  },
  setUser(user) { localStorage.setItem('kitob_user', JSON.stringify(user)); },
  removeUser() { localStorage.removeItem('kitob_user'); },

  isLoggedIn() { return !!this.getToken() && !!this.getUser(); },

  async request(method, path, body = null, skipAuth = false) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token && !skipAuth) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    try {
      const res = await fetch(this.base + path, opts);
      const data = await res.json();

      if (res.status === 401) {
        this.removeToken();
        this.removeUser();
        if (window.onAuthExpired) window.onAuthExpired();
      }

      if (!res.ok) throw new Error(data.error || 'So\'rov xatosi');
      return data;
    } catch (err) {
      throw err;
    }
  },

  get: (path) => API.request('GET', path),
  post: (path, body) => API.request('POST', path, body),
  put: (path, body) => API.request('PUT', path, body),
  del: (path, body) => API.request('DELETE', path, body),

  // Auth
  auth: {
    register: (data) => API.post('/auth/register', data),
    login: (data) => API.post('/auth/login', data),
    telegram: (data) => API.post('/auth/telegram', data),
    me: () => API.get('/auth/me'),
    updateProfile: (data) => API.put('/auth/profile', data),
  },

  // Books
  books: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return API.get('/books' + (q ? '?' + q : ''));
    },
    featured: () => API.get('/books/featured'),
    get: (id) => API.get('/books/' + id),
    create: (data) => API.post('/books', data),
    update: (id, data) => API.put('/books/' + id, data),
    delete: (id) => API.del('/books/' + id),
  },

  // User books / shelves
  shelf: {
    list: (status) => API.get('/users/books' + (status ? '?status=' + status : '')),
    add: (data) => API.post('/users/books', data),
    remove: (data) => API.del('/users/books', data),
  },

  // Reviews
  reviews: {
    forBook: (bookId) => API.get('/reviews/book/' + bookId),
    my: () => API.get('/reviews/my'),
    create: (data) => API.post('/reviews', data),
    recent: () => API.get('/reviews/recent'),
    delete: (id) => API.del('/reviews/' + id),
  },

  // Admin
  admin: {
    stats: () => API.get('/admin/stats'),
    users: (q) => API.get('/admin/users' + (q ? '?q=' + encodeURIComponent(q) : '')),
    updateUserRole: (id, role) => API.put('/admin/users/' + id + '/role', { role }),
    deleteUser: (id) => API.del('/admin/users/' + id),
    books: () => API.get('/admin/books'),
    deleteReview: (id) => API.del('/admin/reviews/' + id),
  }
};
