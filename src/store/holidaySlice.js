import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../api/axios'

// ── Thunks ────────────────────────────────────────────────────────────────────

export const fetchHolidays = createAsyncThunk(
  'holidays/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/holidays', { params })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch holidays')
    }
  }
)

export const createHoliday = createAsyncThunk(
  'holidays/create',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await api.post('/holidays', payload)
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create holiday')
    }
  }
)

export const updateHoliday = createAsyncThunk(
  'holidays/update',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/holidays/${id}`, payload)
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update holiday')
    }
  }
)

export const deleteHoliday = createAsyncThunk(
  'holidays/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/holidays/${id}`)
      return id
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete holiday')
    }
  }
)

export const checkHoliday = createAsyncThunk(
  'holidays/check',
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.get('/holidays/check', { params })
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to check holiday')
    }
  }
)

// ── Slice ─────────────────────────────────────────────────────────────────────

const holidaySlice = createSlice({
  name: 'holidays',
  initialState: {
    list: [],
    pagination: {},
    todayCheck: null,
    loading: {
      list: false,
      action: false,
    },
    error: null,
  },
  reducers: {
    clearHolidayError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHolidays.pending, (state) => { state.loading.list = true; state.error = null })
      .addCase(fetchHolidays.fulfilled, (state, action) => {
        state.loading.list = false
        state.list = action.payload.data || []
        state.pagination = action.payload.pagination || {}
      })
      .addCase(fetchHolidays.rejected, (state, action) => { state.loading.list = false; state.error = action.payload })

      .addCase(checkHoliday.fulfilled, (state, action) => { state.todayCheck = action.payload })

      .addMatcher(
        (action) => ['holidays/create', 'holidays/update', 'holidays/delete']
          .some(t => action.type.startsWith(t)),
        (state, action) => {
          if (action.type.endsWith('/pending')) { state.loading.action = true; state.error = null }
          if (action.type.endsWith('/fulfilled')) { state.loading.action = false }
          if (action.type.endsWith('/rejected')) { state.loading.action = false; state.error = action.payload }
        }
      )
  },
})

export const { clearHolidayError } = holidaySlice.actions
export default holidaySlice.reducer
