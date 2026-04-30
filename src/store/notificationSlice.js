import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../api/axios'

// ── Thunks ────────────────────────────────────────────────────────────────────

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/notifications', { params })
      return {
        data: response.data.data || [],
        pagination: response.data.pagination || { total: 0, page: 1, per_page: 20, total_pages: 0 },
      }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch notifications')
    }
  }
)

export const fetchUnreadCount = createAsyncThunk(
  'notifications/unreadCount',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/notifications/unread-count')
      return response.data.data?.unread_count || 0
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch count')
    }
  }
)

export const fetchNotificationTypes = createAsyncThunk(
  'notifications/fetchTypes',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/notifications/types')
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch types')
    }
  }
)

export const markOneRead = createAsyncThunk(
  'notifications/markOne',
  async (id, { rejectWithValue }) => {
    try {
      await api.patch(`/notifications/${id}/read`)
      return id
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark read')
    }
  }
)

export const markAllRead = createAsyncThunk(
  'notifications/markAll',
  async (_, { rejectWithValue }) => {
    try {
      await api.patch('/notifications/read-all')
      return true
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark all read')
    }
  }
)

export const deleteNotification = createAsyncThunk(
  'notifications/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/notifications/${id}`)
      return id
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete')
    }
  }
)

export const deleteAllNotifications = createAsyncThunk(
  'notifications/deleteAll',
  async (_, { rejectWithValue }) => {
    try {
      await api.delete('/notifications')
      return true
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete all')
    }
  }
)

// ── Slice ─────────────────────────────────────────────────────────────────────

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    list: [],
    unreadCount: 0,
    pagination: { total: 0, page: 1, per_page: 20, total_pages: 0 },
    types: null,        // { types: [...], categories: {...} }
    loading: false,
    error: null,
  },
  reducers: {
    // For real-time WebSocket push
    addNotification: (state, action) => {
      state.list.unshift(action.payload)
      state.unreadCount += 1
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload.data || []
        state.pagination = action.payload.pagination || state.pagination
        // Derive unread count from the fetched page (accurate only for page 1 all-filter)
        state.unreadCount = (action.payload.data || []).filter(n => !n.is_read).length
      })
      .addCase(fetchNotifications.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchUnreadCount.fulfilled, (state, action) => { state.unreadCount = action.payload })

      .addCase(fetchNotificationTypes.fulfilled, (state, action) => { state.types = action.payload })

      .addCase(markOneRead.fulfilled, (state, action) => {
        const n = state.list.find(n => n.id === action.payload)
        if (n && !n.is_read) { n.is_read = true; state.unreadCount = Math.max(0, state.unreadCount - 1) }
      })

      .addCase(markAllRead.fulfilled, (state) => {
        state.list.forEach(n => { n.is_read = true })
        state.unreadCount = 0
      })

      .addCase(deleteNotification.fulfilled, (state, action) => {
        const n = state.list.find(n => n.id === action.payload)
        if (n && !n.is_read) state.unreadCount = Math.max(0, state.unreadCount - 1)
        state.list = state.list.filter(n => n.id !== action.payload)
        state.pagination.total = Math.max(0, state.pagination.total - 1)
      })

      .addCase(deleteAllNotifications.fulfilled, (state) => {
        state.list = []
        state.unreadCount = 0
        state.pagination = { total: 0, page: 1, per_page: 20, total_pages: 0 }
      })
  },
})

export const { addNotification } = notificationSlice.actions
export default notificationSlice.reducer