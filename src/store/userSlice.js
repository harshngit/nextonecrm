import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../api/axios'

// ── Thunks ────────────────────────────────────────────────────────────────────

export const fetchUsers = createAsyncThunk(
  'users/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const allowedParams = {}
      if (params.role && params.role !== '--') allowedParams.role = params.role
      if (params.is_active !== '' && params.is_active !== undefined) allowedParams.is_active = params.is_active
      
      const response = await api.get('/users', { params: allowedParams })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch users')
    }
  }
)

export const fetchUserById = createAsyncThunk(
  'users/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/users/${id}`)
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch user')
    }
  }
)

// Create user via /auth/register (requires Bearer token for non-admin roles)
export const createUser = createAsyncThunk(
  'users/create',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/register', userData)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create user')
    }
  }
)

export const updateUser = createAsyncThunk(
  'users/update',
  async ({ id, userData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/users/${id}`, userData)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update user')
    }
  }
)

export const deleteUser = createAsyncThunk(
  'users/delete',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/users/${id}`)
      return { id, ...response.data }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to deactivate user')
    }
  }
)

export const updateUserRole = createAsyncThunk(
  'users/updateRole',
  async ({ id, role }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/users/${id}/role`, { role })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update user role')
    }
  }
)

// ── Slice ─────────────────────────────────────────────────────────────────────

const userSlice = createSlice({
  name: 'users',
  initialState: {
    list: [],
    loading: false,
    error: null,
    actionLoading: false,
    actionError: null,
  },
  reducers: {
    clearUserError: (state) => {
      state.error = null
      state.actionError = null
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchUsers
      .addCase(fetchUsers.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload.data || []
      })
      .addCase(fetchUsers.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      // Action matchers for create / update / delete / role
      .addMatcher(
        (action) => action.type.endsWith('/pending') && action.type.startsWith('users/') && action.type !== 'users/fetchAll/pending',
        (state) => { state.actionLoading = true; state.actionError = null }
      )
      .addMatcher(
        (action) => action.type.endsWith('/fulfilled') && action.type.startsWith('users/') && action.type !== 'users/fetchAll/fulfilled',
        (state) => { state.actionLoading = false }
      )
      .addMatcher(
        (action) => action.type.endsWith('/rejected') && action.type.startsWith('users/') && action.type !== 'users/fetchAll/rejected',
        (state, action) => { state.actionLoading = false; state.actionError = action.payload }
      )
  },
})

export const { clearUserError } = userSlice.actions
export default userSlice.reducer