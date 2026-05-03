import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../api/axios'

// ── Thunks ────────────────────────────────────────────────────────────────────

export const fetchMySummary = createAsyncThunk(
  'myData/fetchSummary',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/me/summary')
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch summary')
    }
  }
)

export const fetchMyLeads = createAsyncThunk(
  'myData/fetchLeads',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/me/leads', { params })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch my leads')
    }
  }
)

export const fetchMyTasks = createAsyncThunk(
  'myData/fetchTasks',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/me/tasks', { params })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch my tasks')
    }
  }
)

export const fetchMySiteVisits = createAsyncThunk(
  'myData/fetchSiteVisits',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/me/site-visits', { params })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch my site visits')
    }
  }
)

export const fetchMyActivities = createAsyncThunk(
  'myData/fetchActivities',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/me/activities', { params })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch my activities')
    }
  }
)

// ── Slice ─────────────────────────────────────────────────────────────────────

const myDataSlice = createSlice({
  name: 'myData',
  initialState: {
    summary:    null,
    leads:      { data: [], pagination: {} },
    tasks:      { data: [], pagination: {} },
    siteVisits: { data: [], pagination: {} },
    activities: { data: [], pagination: {} },
    loading: {
      summary:    false,
      leads:      false,
      tasks:      false,
      siteVisits: false,
      activities: false,
    },
    error: null,
  },
  reducers: {
    clearMyDataError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMySummary.pending,  (state) => { state.loading.summary = true;  state.error = null })
      .addCase(fetchMySummary.fulfilled,(state, action) => { state.loading.summary = false; state.summary = action.payload })
      .addCase(fetchMySummary.rejected, (state, action) => { state.loading.summary = false; state.error = action.payload })

      .addCase(fetchMyLeads.pending,  (state) => { state.loading.leads = true })
      .addCase(fetchMyLeads.fulfilled,(state, action) => { state.loading.leads = false; state.leads = action.payload })
      .addCase(fetchMyLeads.rejected, (state) => { state.loading.leads = false })

      .addCase(fetchMyTasks.pending,  (state) => { state.loading.tasks = true })
      .addCase(fetchMyTasks.fulfilled,(state, action) => { state.loading.tasks = false; state.tasks = action.payload })
      .addCase(fetchMyTasks.rejected, (state) => { state.loading.tasks = false })

      .addCase(fetchMySiteVisits.pending,  (state) => { state.loading.siteVisits = true })
      .addCase(fetchMySiteVisits.fulfilled,(state, action) => { state.loading.siteVisits = false; state.siteVisits = action.payload })
      .addCase(fetchMySiteVisits.rejected, (state) => { state.loading.siteVisits = false })

      .addCase(fetchMyActivities.pending,  (state) => { state.loading.activities = true })
      .addCase(fetchMyActivities.fulfilled,(state, action) => { state.loading.activities = false; state.activities = action.payload })
      .addCase(fetchMyActivities.rejected, (state) => { state.loading.activities = false })
  },
})

export const { clearMyDataError } = myDataSlice.actions
export default myDataSlice.reducer