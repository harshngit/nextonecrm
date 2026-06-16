import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../api/axios'

// The exact response shape for GET /targets wasn't confirmed against the live
// API, so this normalizes whatever shape comes back into a plain array.
const extractList = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.data?.targets)) return payload.data.targets
  if (Array.isArray(payload?.data?.users)) return payload.data.users
  if (Array.isArray(payload?.targets)) return payload.targets
  if (Array.isArray(payload?.users)) return payload.users
  return []
}

export const fetchTargets = createAsyncThunk(
  'targets/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/targets', { params })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch targets')
    }
  }
)

export const fetchMyTarget = createAsyncThunk(
  'targets/fetchMine',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/targets/me', { params })
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch your target')
    }
  }
)

export const fetchUserTarget = createAsyncThunk(
  'targets/fetchOne',
  async ({ userId, month }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/targets/${userId}`, { params: month ? { month } : {} })
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch target')
    }
  }
)

// POST — sets (upserts) a custom monthly target for a user
export const createTarget = createAsyncThunk(
  'targets/create',
  async ({ userId, data }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/targets/${userId}`, data)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to set target')
    }
  }
)

// PUT — partially update an existing target (creates it if it doesn't exist yet)
export const updateTarget = createAsyncThunk(
  'targets/update',
  async ({ userId, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/targets/${userId}`, data)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update target')
    }
  }
)

// DELETE — resets a user's target back to the default (15 site visits / 1 closure)
export const deleteTarget = createAsyncThunk(
  'targets/delete',
  async ({ userId, month }, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/targets/${userId}`, { params: month ? { month } : {} })
      return { userId, month, ...response.data }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reset target')
    }
  }
)

const targetSlice = createSlice({
  name: 'targets',
  initialState: {
    list: [],
    myTarget: null,
    currentTarget: null,
    loading: false,
    detailLoading: false,
    actionLoading: false,
    error: null,
    actionError: null,
  },
  reducers: {
    clearTargetError: (state) => {
      state.error = null
      state.actionError = null
    },
    clearCurrentTarget: (state) => {
      state.currentTarget = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTargets.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchTargets.fulfilled, (state, action) => {
        state.loading = false
        state.list = extractList(action.payload)
      })
      .addCase(fetchTargets.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchMyTarget.pending, (state) => { state.detailLoading = true })
      .addCase(fetchMyTarget.fulfilled, (state, action) => { state.detailLoading = false; state.myTarget = action.payload })
      .addCase(fetchMyTarget.rejected, (state, action) => { state.detailLoading = false; state.error = action.payload })

      .addCase(fetchUserTarget.pending, (state) => { state.detailLoading = true })
      .addCase(fetchUserTarget.fulfilled, (state, action) => { state.detailLoading = false; state.currentTarget = action.payload })
      .addCase(fetchUserTarget.rejected, (state, action) => { state.detailLoading = false; state.error = action.payload })

      .addMatcher(
        (action) => ['targets/create', 'targets/update', 'targets/delete']
          .some(t => action.type.startsWith(t)),
        (state, action) => {
          if (action.type.endsWith('/pending')) { state.actionLoading = true; state.actionError = null }
          if (action.type.endsWith('/fulfilled')) { state.actionLoading = false }
          if (action.type.endsWith('/rejected')) { state.actionLoading = false; state.actionError = action.payload }
        }
      )
  },
})

export const { clearTargetError, clearCurrentTarget } = targetSlice.actions
export default targetSlice.reducer
