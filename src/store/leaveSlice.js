import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../api/axios'

export const applyLeave = createAsyncThunk(
  'leaves/apply',
  async (leaveData, { rejectWithValue }) => {
    try {
      const response = await api.post('/attendance/leave/apply', leaveData)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to apply for leave')
    }
  }
)

export const markLeave = createAsyncThunk(
  'leaves/mark',
  async (leaveData, { rejectWithValue }) => {
    try {
      const response = await api.post('/attendance/leave', leaveData)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark leave')
    }
  }
)

export const fetchTodayLeaves = createAsyncThunk(
  'leaves/fetchToday',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/attendance/leaves/today')
      // Handle response shape like { data: { leaves: [...] } }
      return response.data?.data?.leaves || response.data?.data || []
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch today\'s leaves')
    }
  }
)

export const fetchLeaves = createAsyncThunk(
  'leaves/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/attendance/leaves', { params })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch leaves')
    }
  }
)

const leaveSlice = createSlice({
  name: 'leaves',
  initialState: {
    list: [],
    todayLeaves: [],
    loading: false,
    todayLoading: false,
    pagination: { total: 0, page: 1, per_page: 30, total_pages: 0 },
    error: null,
    actionLoading: false,
    actionError: null,
  },
  reducers: {
    clearLeaveError: (state) => {
      state.error = null
      state.actionError = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLeaves.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchLeaves.fulfilled, (state, action) => {
        state.loading = false
        // Handle both shapes: { data: [...] } or { data: { leaves: [...] } }
        const responseData = action.payload?.data?.leaves || action.payload?.data
        state.list = Array.isArray(responseData) ? responseData : []
        state.pagination = action.payload?.data?.pagination || action.payload?.pagination || state.pagination
      })
      .addCase(fetchLeaves.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(fetchTodayLeaves.pending, (state) => {
        state.todayLoading = true
      })
      .addCase(fetchTodayLeaves.fulfilled, (state, action) => {
        state.todayLoading = false
        state.todayLeaves = Array.isArray(action.payload) ? action.payload : []
      })
      .addCase(fetchTodayLeaves.rejected, (state) => {
        state.todayLoading = false
      })
      .addMatcher(
        (action) =>
          ['leaves/apply', 'leaves/mark'].some(t => action.type.startsWith(t)),
        (state, action) => {
          if (action.type.endsWith('/pending')) {
            state.actionLoading = true
            state.actionError = null
          }
          if (action.type.endsWith('/fulfilled')) {
            state.actionLoading = false
          }
          if (action.type.endsWith('/rejected')) {
            state.actionLoading = false
            state.actionError = action.payload
          }
        }
      )
  },
})

export const { clearLeaveError } = leaveSlice.actions
export default leaveSlice.reducer
