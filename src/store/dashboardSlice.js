import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../api/axios'

// ── Thunks ────────────────────────────────────────────────────────────────────

export const fetchDashboardStats = createAsyncThunk(
  'dashboard/fetchStats',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/dashboard/stats', { params })
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch stats')
    }
  }
)

export const fetchRevenueTrend = createAsyncThunk(
  'dashboard/fetchRevenue',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/dashboard/revenue', { params })
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch revenue')
    }
  }
)

export const fetchLeadSources = createAsyncThunk(
  'dashboard/fetchLeadSources',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/dashboard/lead-sources', { params })
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch lead sources')
    }
  }
)

export const fetchLeadPipeline = createAsyncThunk(
  'dashboard/fetchLeadPipeline',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/dashboard/lead-pipeline', { params })
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch pipeline')
    }
  }
)

export const fetchRecentActivity = createAsyncThunk(
  'dashboard/fetchRecentActivity',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/dashboard/recent-activity', { params })
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch activity')
    }
  }
)

export const fetchUpcomingSiteVisits = createAsyncThunk(
  'dashboard/fetchUpcomingSiteVisits',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/dashboard/upcoming-site-visits', { params })
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch site visits')
    }
  }
)

// ── Slice ─────────────────────────────────────────────────────────────────────

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: {
    stats: null,
    revenueTrend: null,
    leadSources: null,
    leadPipeline: null,
    recentActivity: [],
    upcomingSiteVisits: [],
    loading: {
      stats: false,
      revenue: false,
      leadSources: false,
      pipeline: false,
      activity: false,
      siteVisits: false,
    },
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    // Stats
    builder
      .addCase(fetchDashboardStats.pending, (state) => { state.loading.stats = true })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.loading.stats = false
        state.stats = action.payload
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.loading.stats = false
        state.error = action.payload
      })

    // Revenue
    builder
      .addCase(fetchRevenueTrend.pending, (state) => { state.loading.revenue = true })
      .addCase(fetchRevenueTrend.fulfilled, (state, action) => {
        state.loading.revenue = false
        state.revenueTrend = action.payload
      })
      .addCase(fetchRevenueTrend.rejected, (state, action) => {
        state.loading.revenue = false
        state.error = action.payload
      })

    // Lead sources
    builder
      .addCase(fetchLeadSources.pending, (state) => { state.loading.leadSources = true })
      .addCase(fetchLeadSources.fulfilled, (state, action) => {
        state.loading.leadSources = false
        state.leadSources = action.payload
      })
      .addCase(fetchLeadSources.rejected, (state, action) => {
        state.loading.leadSources = false
        state.error = action.payload
      })

    // Pipeline
    builder
      .addCase(fetchLeadPipeline.pending, (state) => { state.loading.pipeline = true })
      .addCase(fetchLeadPipeline.fulfilled, (state, action) => {
        state.loading.pipeline = false
        state.leadPipeline = action.payload
      })
      .addCase(fetchLeadPipeline.rejected, (state, action) => {
        state.loading.pipeline = false
        state.error = action.payload
      })

    // Recent activity
    builder
      .addCase(fetchRecentActivity.pending, (state) => { state.loading.activity = true })
      .addCase(fetchRecentActivity.fulfilled, (state, action) => {
        state.loading.activity = false
        state.recentActivity = action.payload || []
      })
      .addCase(fetchRecentActivity.rejected, (state, action) => {
        state.loading.activity = false
        state.error = action.payload
      })

    // Upcoming site visits
    builder
      .addCase(fetchUpcomingSiteVisits.pending, (state) => { state.loading.siteVisits = true })
      .addCase(fetchUpcomingSiteVisits.fulfilled, (state, action) => {
        state.loading.siteVisits = false
        state.upcomingSiteVisits = action.payload || []
      })
      .addCase(fetchUpcomingSiteVisits.rejected, (state, action) => {
        state.loading.siteVisits = false
        state.error = action.payload
      })
  },
})

export default dashboardSlice.reducer
