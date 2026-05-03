import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../api/axios'

// ── Thunks ────────────────────────────────────────────────────────────────────

export const fetchLeads = createAsyncThunk(
  'leads/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/leads', { params })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch leads')
    }
  }
)

export const fetchLeadById = createAsyncThunk(
  'leads/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/leads/${id}`)
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch lead')
    }
  }
)

export const createLead = createAsyncThunk(
  'leads/create',
  async (leadData, { rejectWithValue }) => {
    try {
      const response = await api.post('/leads', leadData)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create lead')
    }
  }
)

export const updateLead = createAsyncThunk(
  'leads/update',
  async ({ id, leadData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/leads/${id}`, leadData)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update lead')
    }
  }
)

export const deleteLead = createAsyncThunk(
  'leads/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/leads/${id}`)
      return id
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete lead')
    }
  }
)

export const updateLeadStatus = createAsyncThunk(
  'leads/updateStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/leads/${id}/status`, { status })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update status')
    }
  }
)

export const reassignLead = createAsyncThunk(
  'leads/reassign',
  async ({ id, assigned_to }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/leads/${id}/assign`, { assigned_to })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reassign lead')
    }
  }
)

export const fetchLeadActivities = createAsyncThunk(
  'leads/fetchActivities',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/leads/${id}/activity`)
      return { id, activities: response.data.data }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch activities')
    }
  }
)

export const addLeadNote = createAsyncThunk(
  'leads/addNote',
  async ({ id, note }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/leads/${id}/notes`, { note })
      return { id, activity: response.data.data }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add note')
    }
  }
)

export const fetchLeadSources = createAsyncThunk(
  'leads/fetchSources',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('dashboard/lead-sources')
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch lead sources')
    }
  }
)

// ── Slice ─────────────────────────────────────────────────────────────────────

const leadSlice = createSlice({
  name: 'leads',
  initialState: {
    list: [],
    currentLead: null,
    activities: [],
    sources: [],
    pagination: { total: 0, page: 1, per_page: 20, total_pages: 0 },
    loading: false,
    detailLoading: false,
    actionLoading: false,
    error: null,
    actionError: null,
  },
  reducers: {
    clearLeadError: (state) => {
      state.error = null
      state.actionError = null
    },
    clearCurrentLead: (state) => {
      state.currentLead = null
      state.activities = []
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchLeads
      .addCase(fetchLeads.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchLeads.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload.data || []
        state.pagination = action.payload.pagination || state.pagination
      })
      .addCase(fetchLeads.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      // fetchLeadById
      .addCase(fetchLeadById.pending, (state) => { state.detailLoading = true })
      .addCase(fetchLeadById.fulfilled, (state, action) => { state.detailLoading = false; state.currentLead = action.payload })
      .addCase(fetchLeadById.rejected, (state, action) => { state.detailLoading = false; state.error = action.payload })

      // fetchLeadActivities
      .addCase(fetchLeadActivities.pending, (state) => { state.detailLoading = true })
      .addCase(fetchLeadActivities.fulfilled, (state, action) => {
        state.detailLoading = false
        state.activities = action.payload.activities
      })
      .addCase(fetchLeadActivities.rejected, (state, action) => { state.detailLoading = false })

      // addLeadNote
      .addCase(addLeadNote.fulfilled, (state, action) => {
        if (action.payload.activity) {
          state.activities = [action.payload.activity, ...state.activities]
        }
      })

      // fetchLeadSources
      .addCase(fetchLeadSources.fulfilled, (state, action) => { state.sources = action.payload || [] })

      // create / update / delete / status / reassign — generic action loading
      .addMatcher(
        (action) => ['leads/create', 'leads/update', 'leads/delete', 'leads/updateStatus', 'leads/reassign', 'leads/addNote']
          .some(t => action.type.startsWith(t)),
        (state, action) => {
          if (action.type.endsWith('/pending')) { state.actionLoading = true; state.actionError = null }
          if (action.type.endsWith('/fulfilled')) { state.actionLoading = false }
          if (action.type.endsWith('/rejected')) { state.actionLoading = false; state.actionError = action.payload }
        }
      )
  },
})

export const { clearLeadError, clearCurrentLead } = leadSlice.actions
export default leadSlice.reducer
