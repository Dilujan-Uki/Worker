import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
});

// ── Request interceptor: attach token from localStorage on every request ───
// Reading from localStorage each time (not caching in closure) ensures that
// after logout + re-login, the new token is always used.
api.interceptors.request.use(
  (config) => {
    const stored = localStorage.getItem('clockify_user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        if (user?.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
      } catch {
        // corrupted storage — clear it
        localStorage.removeItem('clockify_user');
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: normalise error messages ─────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If 401, clear stale auth data so the user is sent to login
    if (error.response?.status === 401) {
      localStorage.removeItem('clockify_user');
      // Only redirect if we're not already on an auth page
      if (!window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/register')) {
        window.location.href = '/login';
      }
    }
    const message =
      error.response?.data?.message ||
      error.message ||
      'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export default api;
