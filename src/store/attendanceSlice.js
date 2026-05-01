import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../api/axios'

// ── Thunks ────────────────────────────────────────────────────────────────────

export const fetchAttendanceToday = createAsyncThunk(
  'attendance/fetchToday',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/attendance/today')
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch today\'s attendance')
    }
  }
)

export const fetchMyAttendance = createAsyncThunk(
  'attendance/fetchMe',
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.get('/attendance/me', { params })
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch my attendance')
    }
  }
)

export const fetchAttendanceCalendar = createAsyncThunk(
  'attendance/fetchCalendar',
  async ({ month, year }, { rejectWithValue }) => {
    try {
      const response = await api.get('/attendance/calendar', { params: { month, year } })
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch calendar')
    }
  }
)

export const fetchAttendanceByMonth = createAsyncThunk(
  'attendance/fetchByMonth',
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.get('/attendance/by-month', { params })
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch monthly grid')
    }
  }
)

export const fetchAttendanceByDate = createAsyncThunk(
  'attendance/fetchByDate',
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.get('/attendance/by-date', { params })
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch daily view')
    }
  }
)

export const fetchAllAttendance = createAsyncThunk(
  'attendance/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.get('/attendance/all', { params })
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch all attendance')
    }
  }
)

export const fetchAttendanceSummary = createAsyncThunk(
  'attendance/fetchSummary',
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.get('/attendance/summary', { params })
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch summary')
    }
  }
)

export const fetchLateArrivals = createAsyncThunk(
  'attendance/fetchLateArrivals',
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.get('/attendance/late-arrivals', { params })
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch late arrivals')
    }
  }
)

export const checkIn = createAsyncThunk(
  'attendance/checkIn',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await api.post('/attendance/check-in', payload)
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Check-in failed')
    }
  }
)

export const checkOut = createAsyncThunk(
  'attendance/checkOut',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await api.post('/attendance/check-out', payload)
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Check-out failed')
    }
  }
)

export const markLeave = createAsyncThunk(
  'attendance/markLeave',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await api.post('/attendance/leave', payload)
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark leave')
    }
  }
)

export const manualAttendanceEntry = createAsyncThunk(
  'attendance/manualEntry',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await api.post('/attendance/manual', payload)
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to record attendance')
    }
  }
)

export const updateAttendanceRecord = createAsyncThunk(
  'attendance/updateRecord',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/attendance/records/${id}`, payload)
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update record')
    }
  }
)

export const fetchPendingApprovals = createAsyncThunk(
  'attendance/fetchPendingApprovals',
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.get('/attendance/pending', { params })
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch pending approvals')
    }
  }
)

export const approveAttendanceStatus = createAsyncThunk(
  'attendance/approveStatus',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await api.post('/attendance/approve', payload)
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Approval failed')
    }
  }
)

export const uploadAttendancePhoto = createAsyncThunk(
  'attendance/uploadPhoto',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await api.post('/attendance/upload-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return response.data.url
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Photo upload failed')
    }
  }
)

// ── Slice ─────────────────────────────────────────────────────────────────────

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState: {
    today: null,
    myHistory: { data: [], summary: null, pagination: {} },
    calendar: [],
    byMonth: { data: [], all_days: [] },
    byDate: null,
    summary: null,
    lateArrivals: [],
    pending: null,
    photos: [],
    loading: {
      today: false,
      myHistory: false,
      calendar: false,
      byMonth: false,
      byDate: false,
      summary: false,
      pending: false,
      action: false,
    },
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    clearPhotos: (state) => {
      state.photos = []
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchAttendanceToday
      .addCase(fetchAttendanceToday.pending, (state) => { state.loading.today = true; state.error = null })
      .addCase(fetchAttendanceToday.fulfilled, (state, action) => { state.loading.today = false; state.today = action.payload })
      .addCase(fetchAttendanceToday.rejected, (state, action) => { state.loading.today = false; state.error = action.payload })

      // fetchAttendanceCalendar
      .addCase(fetchAttendanceCalendar.pending, (state) => { state.loading.calendar = true })
      .addCase(fetchAttendanceCalendar.fulfilled, (state, action) => { state.loading.calendar = false; state.calendar = action.payload })
      .addCase(fetchAttendanceCalendar.rejected, (state, action) => { state.loading.calendar = false })

      // fetchMyAttendance
      .addCase(fetchMyAttendance.pending, (state) => { state.loading.myHistory = true })
      .addCase(fetchMyAttendance.fulfilled, (state, action) => { 
        state.loading.myHistory = false
        state.myHistory = action.payload 
      })
      .addCase(fetchMyAttendance.rejected, (state) => { state.loading.myHistory = false })

      // fetchAttendanceByMonth
      .addCase(fetchAttendanceByMonth.pending, (state) => { state.loading.byMonth = true })
      .addCase(fetchAttendanceByMonth.fulfilled, (state, action) => { 
        state.loading.byMonth = false
        state.byMonth = action.payload 
      })
      .addCase(fetchAttendanceByMonth.rejected, (state) => { state.loading.byMonth = false })

      // fetchAttendanceByDate
      .addCase(fetchAttendanceByDate.pending, (state) => { state.loading.byDate = true })
      .addCase(fetchAttendanceByDate.fulfilled, (state, action) => { state.loading.byDate = false; state.byDate = action.payload })
      .addCase(fetchAttendanceByDate.rejected, (state, action) => { state.loading.byDate = false })

      // fetchPendingApprovals
      .addCase(fetchPendingApprovals.pending, (state) => { state.loading.pending = true })
      .addCase(fetchPendingApprovals.fulfilled, (state, action) => { state.loading.pending = false; state.pending = action.payload })
      .addCase(fetchPendingApprovals.rejected, (state, action) => { state.loading.pending = false })

      // fetchAttendanceSummary
      .addCase(fetchAttendanceSummary.pending, (state) => { state.loading.summary = true })
      .addCase(fetchAttendanceSummary.fulfilled, (state, action) => { 
        state.loading.summary = false
        state.summary = action.payload 
      })
      .addCase(fetchAttendanceSummary.rejected, (state) => { state.loading.summary = false })

      // Generic actions
      .addMatcher(
        (action) => ['attendance/checkIn', 'attendance/checkOut', 'attendance/markLeave', 'attendance/approveStatus', 'attendance/manualEntry']
          .some(t => action.type.startsWith(t)),
        (state, action) => {
          if (action.type.endsWith('/pending')) { state.loading.action = true; state.error = null }
          if (action.type.endsWith('/fulfilled')) { state.loading.action = false }
          if (action.type.endsWith('/rejected')) { state.loading.action = false; state.error = action.payload }
        }
      )
  },
})

export const { clearError, clearPhotos } = attendanceSlice.actions
export default attendanceSlice.reducer
