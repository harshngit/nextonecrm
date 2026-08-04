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

// Personal leads for the logged-in user — used by sales_manager to see their own assigned leads
export const fetchMyLeads = createAsyncThunk(
  'leads/fetchMyLeads',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/me/leads', { params })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch my leads')
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

export const bulkDeleteLeads = createAsyncThunk(
  'leads/bulkDelete',
  async (ids, { rejectWithValue }) => {
    try {
      const response = await api.delete('/leads/bulk/delete', { data: { ids } })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete leads')
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
      const response = await api.get('/config/lead-sources')
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch lead sources')
    }
  }
)

export const addLeadSource = createAsyncThunk(
  'leads/addSource',
  async (name, { rejectWithValue }) => {
    try {
      const response = await api.post('/config/lead-sources', { name })
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add lead source')
    }
  }
)

export const updateLeadSource = createAsyncThunk(
  'leads/updateSource',
  async ({ id, name, is_active }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/config/lead-sources/${id}`, { name, is_active })
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update lead source')
    }
  }
)

export const deleteLeadSource = createAsyncThunk(
  'leads/deleteSource',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/config/lead-sources/${id}`)
      return id
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete lead source')
    }
  }
)

export const fetchLeadConfigurations = createAsyncThunk(
  'leads/fetchConfigurations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/config/lead-configurations')
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch lead configurations')
    }
  }
)

export const addLeadConfiguration = createAsyncThunk(
  'leads/addConfiguration',
  async (name, { rejectWithValue }) => {
    try {
      const response = await api.post('/config/lead-configurations', { name })
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add lead configuration')
    }
  }
)

export const updateLeadConfiguration = createAsyncThunk(
  'leads/updateConfiguration',
  async ({ id, name, is_active }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/config/lead-configurations/${id}`, { name, is_active })
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update lead configuration')
    }
  }
)

export const deleteLeadConfiguration = createAsyncThunk(
  'leads/deleteConfiguration',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/config/lead-configurations/${id}`)
      return id
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete lead configuration')
    }
  }
)

export const fetchLeadStatuses = createAsyncThunk(
  'leads/fetchStatuses',
  async (includeInactive = false, { rejectWithValue }) => {
    try {
      const response = await api.get('/config/lead-statuses', { params: { include_inactive: includeInactive } })
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch lead statuses')
    }
  }
)

export const addLeadStatus = createAsyncThunk(
  'leads/addStatus',
  async (statusData, { rejectWithValue }) => {
    try {
      const response = await api.post('/config/lead-statuses', statusData)
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add lead status')
    }
  }
)

export const updateLeadStatusConfig = createAsyncThunk(
  'leads/updateStatusConfig',
  async ({ id, statusData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/config/lead-statuses/${id}`, statusData)
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update lead status')
    }
  }
)

export const deleteLeadStatus = createAsyncThunk(
  'leads/deleteStatus',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/config/lead-statuses/${id}`)
      return id
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete lead status')
    }
  }
)

export const reorderLeadStatuses = createAsyncThunk(
  'leads/reorderStatuses',
  async (order, { rejectWithValue }) => {
    try {
      const response = await api.patch('/config/lead-statuses/reorder', { order })
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reorder lead statuses')
    }
  }
)

// ── Slice ─────────────────────────────────────────────────────────────────────

const leadSlice = createSlice({
  name: 'leads',
  initialState: {
    list:         [],
    myList:       [],           // personal leads for sales_manager (from /me/leads)
    myPagination: { total: 0, page: 1, per_page: 20, total_pages: 0 },
    myLoading:    false,
    currentLead:  null,
    activities:   [],
    sources:      [],
    statuses:     [],
    configurations: [],
    pagination:   { total: 0, page: 1, per_page: 20, total_pages: 0 },
    loading:      false,
    detailLoading: false,
    actionLoading: false,
    error:        null,
    actionError:  null,
  },
  reducers: {
    clearLeadError: (state) => {
      state.error       = null
      state.actionError = null
    },
    clearCurrentLead: (state) => {
      state.currentLead = null
      state.activities  = []
    },
  },
  extraReducers: (builder) => {
    builder

      // ── fetchLeads (team / all) ───────────────────────────────────────────
      .addCase(fetchLeads.pending,   (state) => { state.loading = true; state.error = null })
      .addCase(fetchLeads.fulfilled, (state, action) => {
        state.loading    = false
        state.list       = action.payload?.data || []
        state.pagination = action.payload?.pagination || state.pagination
      })
      .addCase(fetchLeads.rejected,  (state, action) => { state.loading = false; state.error = action.payload })

      // ── fetchMyLeads (personal — /me/leads) ───────────────────────────────
      .addCase(fetchMyLeads.pending,   (state) => { state.myLoading = true })
      .addCase(fetchMyLeads.fulfilled, (state, action) => {
        state.myLoading    = false
        state.myList       = action.payload?.data || []
        state.myPagination = action.payload?.pagination || {}
      })
      .addCase(fetchMyLeads.rejected,  (state) => { state.myLoading = false })

      // ── fetchLeadById ─────────────────────────────────────────────────────
      .addCase(fetchLeadById.pending,   (state) => { state.detailLoading = true })
      .addCase(fetchLeadById.fulfilled, (state, action) => {
        state.detailLoading = false
        state.currentLead   = action.payload
      })
      .addCase(fetchLeadById.rejected,  (state, action) => { state.detailLoading = false; state.error = action.payload })

      // ── fetchLeadActivities ───────────────────────────────────────────────
      .addCase(fetchLeadActivities.pending,   (state) => { state.detailLoading = true })
      .addCase(fetchLeadActivities.fulfilled, (state, action) => {
        state.detailLoading = false
        state.activities    = action.payload.activities
      })
      .addCase(fetchLeadActivities.rejected,  (state) => { state.detailLoading = false })

      // ── addLeadNote ───────────────────────────────────────────────────────
      .addCase(addLeadNote.fulfilled, (state, action) => {
        if (action.payload.activity) {
          state.activities = [action.payload.activity, ...state.activities]
        }
      })

      // ── fetchLeadSources ──────────────────────────────────────────────────
      .addCase(fetchLeadSources.fulfilled, (state, action) => {
        state.sources = action.payload || []
      })

      .addCase(addLeadSource.fulfilled, (state, action) => {
        state.sources = [action.payload, ...state.sources]
      })

      .addCase(updateLeadSource.fulfilled, (state, action) => {
        state.sources = state.sources.map(s => s.id === action.payload.id ? action.payload : s)
      })

      .addCase(deleteLeadSource.fulfilled, (state, action) => {
        state.sources = state.sources.filter(s => s.id !== action.payload)
      })

      // ── fetchLeadConfigurations ────────────────────────────────────────────
      .addCase(fetchLeadConfigurations.fulfilled, (state, action) => {
        state.configurations = action.payload || []
      })

      .addCase(addLeadConfiguration.fulfilled, (state, action) => {
        state.configurations = [...state.configurations, action.payload]
      })

      .addCase(updateLeadConfiguration.fulfilled, (state, action) => {
        state.configurations = state.configurations.map(c => c.id === action.payload.id ? action.payload : c)
      })

      .addCase(deleteLeadConfiguration.fulfilled, (state, action) => {
        state.configurations = state.configurations.filter(c => c.id !== action.payload)
      })

      // ── fetchLeadStatuses ──────────────────────────────────────────────────
      .addCase(fetchLeadStatuses.fulfilled, (state, action) => {
        state.statuses = action.payload || []
      })

      .addCase(addLeadStatus.fulfilled, (state, action) => {
        state.statuses = [...state.statuses, action.payload].sort((a, b) => a.sort_order - b.sort_order)
      })

      .addCase(updateLeadStatusConfig.fulfilled, (state, action) => {
        state.statuses = state.statuses.map(s => s.id === action.payload.id ? action.payload : s).sort((a, b) => a.sort_order - b.sort_order)
      })

      .addCase(deleteLeadStatus.fulfilled, (state, action) => {
        state.statuses = state.statuses.filter(s => s.id !== action.payload)
      })

      .addCase(reorderLeadStatuses.fulfilled, (state, action) => {
        state.statuses = action.payload || []
      })

      // ── create / update / delete / status / reassign — action loading ─────
      .addMatcher(
        (action) =>
          ['leads/create', 'leads/update', 'leads/delete', 'leads/bulkDelete', 'leads/updateStatus', 'leads/reassign', 'leads/addNote', 'leads/addSource', 'leads/updateSource', 'leads/deleteSource', 'leads/addStatus', 'leads/updateStatusConfig', 'leads/deleteStatus', 'leads/reorderStatuses', 'leads/addConfiguration', 'leads/updateConfiguration', 'leads/deleteConfiguration']
            .some(t => action.type.startsWith(t)),
        (state, action) => {
          if (action.type.endsWith('/pending'))   { state.actionLoading = true;  state.actionError = null }
          if (action.type.endsWith('/fulfilled')) { state.actionLoading = false }
          if (action.type.endsWith('/rejected'))  { state.actionLoading = false; state.actionError = action.payload }
        }
      )
  },
})

export const { clearLeadError, clearCurrentLead } = leadSlice.actions
export default leadSlice.reducer