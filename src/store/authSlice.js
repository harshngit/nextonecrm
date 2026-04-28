import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/axios';

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', credentials);
      const { access_token, refresh_token, user } = response.data.data;

      // Save tokens to localStorage
      localStorage.setItem('n1r_access_token', access_token);
      localStorage.setItem('n1r_refresh_token', refresh_token);
      localStorage.setItem('n1r_user', JSON.stringify(user));
      
      return { user, access_token, refresh_token };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

export const authMe = createAsyncThunk(
  'auth/me',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/auth/me');
      const user = response.data.data;
      
      localStorage.setItem('n1r_user', JSON.stringify(user));
      return user;
    } catch (error) {
      localStorage.removeItem('n1r_access_token');
      localStorage.removeItem('n1r_refresh_token');
      localStorage.removeItem('n1r_user');
      return rejectWithValue('Session expired');
    }
  }
);

const initialState = {
  user: JSON.parse(localStorage.getItem('n1r_user')) || null,
  accessToken: localStorage.getItem('n1r_access_token') || null,
  refreshToken: localStorage.getItem('n1r_refresh_token') || null,
  loading: false,
  error: null,
  isAuthenticated: !!localStorage.getItem('n1r_access_token'),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem('n1r_access_token');
      localStorage.removeItem('n1r_refresh_token');
      localStorage.removeItem('n1r_user');
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.access_token;
        state.refreshToken = action.payload.refresh_token;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      // Auth Me
      .addCase(authMe.pending, (state) => {
        state.loading = true;
      })
      .addCase(authMe.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(authMe.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = action.payload;
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
