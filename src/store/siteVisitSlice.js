import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../api/axios'

export const fetchSiteVisits = createAsyncThunk(
  'siteVisits/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/site-visits', { params })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch site visits')
    }
  }
)

export const createSiteVisit = createAsyncThunk(
  'siteVisits/create',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post('/site-visits', data)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to schedule visit')
    }
  }
)

export const updateSiteVisit = createAsyncThunk(
  'siteVisits/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/site-visits/${id}`, data)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update visit')
    }
  }
)

export const updateSiteVisitStatus = createAsyncThunk(
  'siteVisits/updateStatus',
  async ({ id, status, feedback }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/site-visits/${id}/status`, { status, feedback })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update status')
    }
  }
)

export const cancelSiteVisit = createAsyncThunk(
  'siteVisits/cancel',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/site-visits/${id}`)
      return { id, ...response.data }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to cancel visit')
    }
  }
)

export const fetchSiteVisitById = createAsyncThunk(
  'siteVisits/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/site-visits/${id}`)
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch site visit')
    }
  }
)

const siteVisitSlice = createSlice({
  name: 'siteVisits',
  initialState: {
    list: [],
    currentVisit: null,
    pagination: { total: 0, page: 1, per_page: 20, total_pages: 0 },
    loading: false,
    detailLoading: false,
    actionLoading: false,
    error: null,
    actionError: null,
  },
  reducers: {
    clearSiteVisitError: (state) => {
      state.error = null
      state.actionError = null
    },
    clearCurrentVisit: (state) => {
      state.currentVisit = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSiteVisits.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchSiteVisits.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload.data || []
        state.pagination = action.payload.pagination || state.pagination
      })
      .addCase(fetchSiteVisits.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      
      .addCase(fetchSiteVisitById.pending, (state) => { state.detailLoading = true })
      .addCase(fetchSiteVisitById.fulfilled, (state, action) => { state.detailLoading = false; state.currentVisit = action.payload })
      .addCase(fetchSiteVisitById.rejected, (state, action) => { state.detailLoading = false; state.error = action.payload })

      .addMatcher(
        (action) => ['siteVisits/create', 'siteVisits/update', 'siteVisits/updateStatus', 'siteVisits/cancel']
          .some(t => action.type.startsWith(t)),
        (state, action) => {
          if (action.type.endsWith('/pending')) { state.actionLoading = true; state.actionError = null }
          if (action.type.endsWith('/fulfilled')) { state.actionLoading = false }
          if (action.type.endsWith('/rejected')) { state.actionLoading = false; state.actionError = action.payload }
        }
      )
  },
})

export const { clearSiteVisitError, clearCurrentVisit } = siteVisitSlice.actions
export default siteVisitSlice.reducer
