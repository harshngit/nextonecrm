import axios from 'axios';

const API_BASE_URL = 'https://api.nextonerealty.in/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000, // a hung request must eventually reject — otherwise auth
                   // checks that depend on it (e.g. authMe on app load) can
                   // leave the whole app stuck on the loading screen forever
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add the access token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('n1r_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor — on a 401 from any authenticated request (session
// expired / token invalidated), clear the stored session and hard-redirect
// to login. Skipped for /auth/login itself so a wrong-password attempt just
// shows the form's own error instead of bouncing the page.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('n1r_access_token');
      localStorage.removeItem('n1r_refresh_token');
      localStorage.removeItem('n1r_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
