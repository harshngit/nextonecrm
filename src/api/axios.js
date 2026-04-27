import axios from 'axios';

const API_BASE_URL = 'https://nextoneapi.onrender.com/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
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

// Response interceptor to handle token expiration (optional for now, but good practice)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized error (e.g., redirect to login or refresh token)
      // localStorage.removeItem('n1r_access_token');
      // localStorage.removeItem('n1r_refresh_token');
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
