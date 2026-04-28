import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../api/axios'

export const fetchFollowUps = createAsyncThunk(
  'followUps/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/tasks', { params })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch follow-ups')
    }
  }
)

export const createFollowUp = createAsyncThunk(
  'followUps/create',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post('/tasks', data)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create follow-up')
    }
  }
)

export const updateFollowUp = createAsyncThunk(
  'followUps/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/tasks/${id}`, data)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update follow-up')
    }
  }
)

export const completeFollowUp = createAsyncThunk(
  'followUps/complete',
  async ({ id, notes }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/tasks/${id}/complete`, { notes })
      return { id, ...response.data }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to complete task')
    }
  }
)

export const deleteFollowUp = createAsyncThunk(
  'followUps/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/tasks/${id}`)
      return id
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete follow-up')
    }
  }
)

const followUpSlice = createSlice({
  name: 'followUps',
  initialState: {
    list: [],
    pagination: { total: 0, page: 1, per_page: 20, total_pages: 0 },
    loading: false,
    actionLoading: false,
    error: null,
    actionError: null,
  },
  reducers: {
    clearFollowUpError: (state) => {
      state.error = null
      state.actionError = null
    },
    // Optimistic complete — mark done immediately before API confirms
    markCompleted: (state, action) => {
      state.list = state.list.map(t =>
        t.id === action.payload ? { ...t, is_completed: true } : t
      )
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFollowUps.pending,   (state) => { state.loading = true; state.error = null })
      .addCase(fetchFollowUps.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload.data || []
        state.pagination = action.payload.pagination || state.pagination
      })
      .addCase(fetchFollowUps.rejected,  (state, action) => {
        state.loading = false; state.error = action.payload
      })
      .addMatcher(
        (action) => ['followUps/create', 'followUps/update', 'followUps/complete', 'followUps/delete']
          .some(t => action.type.startsWith(t)),
        (state, action) => {
          if (action.type.endsWith('/pending'))   { state.actionLoading = true;  state.actionError = null }
          if (action.type.endsWith('/fulfilled')) { state.actionLoading = false }
          if (action.type.endsWith('/rejected'))  { state.actionLoading = false; state.actionError = action.payload }
        }
      )
  },
})

export const { clearFollowUpError, markCompleted } = followUpSlice.actions
export default followUpSlice.reducer
