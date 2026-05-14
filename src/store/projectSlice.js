import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../api/axios'

export const fetchProjects = createAsyncThunk(
  'projects/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/projects', { params })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch projects')
    }
  }
)

export const fetchProjectById = createAsyncThunk(
  'projects/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/projects/${id}`)
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch project')
    }
  }
)

export const createProject = createAsyncThunk(
  'projects/create',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post('/projects', data)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create project')
    }
  }
)

export const updateProject = createAsyncThunk(
  'projects/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/projects/${id}`, data)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update project')
    }
  }
)

export const deleteProject = createAsyncThunk(
  'projects/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/projects/${id}`)
      return id
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete project')
    }
  }
)

export const fetchProjectLeads = createAsyncThunk(
  'projects/fetchLeads',
  async ({ id, params = {} }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/projects/${id}/leads`, { params })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch project leads')
    }
  }
)

export const fetchProjectDocuments = createAsyncThunk(
  'projects/fetchDocuments',
  async (projectId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/projects/${projectId}/documents`)
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch documents')
    }
  }
)

export const deleteProjectDocument = createAsyncThunk(
  'projects/deleteDocument',
  async ({ projectId, docId }, { rejectWithValue }) => {
    try {
      await api.delete(`/projects/${projectId}/documents/${docId}`)
      return { projectId, docId }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete document')
    }
  }
)

const projectSlice = createSlice({
  name: 'projects',
  initialState: {
    list: [],
    currentProject: null,
    projectLeads: [],
    projectDocuments: { unit_plans: [], creatives: [] },
    docsLoading: false,
    pagination: { total: 0, page: 1, per_page: 20, total_pages: 0 },
    loading: false,
    detailLoading: false,
    actionLoading: false,
    error: null,
    actionError: null,
  },
  reducers: {
    clearProjectError: (state) => {
      state.error = null
      state.actionError = null
    },
    clearCurrentProject: (state) => {
      state.currentProject = null
      state.projectLeads = []
      state.projectDocuments = { unit_plans: [], creatives: [] }
    },
    clearProjectDocuments: (state) => {
      state.projectDocuments = { unit_plans: [], creatives: [] }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload.data || []
        state.pagination = action.payload.pagination || state.pagination
      })
      .addCase(fetchProjects.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      
      .addCase(fetchProjectById.pending, (state) => { state.detailLoading = true })
      .addCase(fetchProjectById.fulfilled, (state, action) => {
        state.detailLoading = false
        state.currentProject = action.payload
      })
      .addCase(fetchProjectById.rejected, (state) => { state.detailLoading = false })

      .addCase(fetchProjectLeads.pending, (state) => { state.detailLoading = true })
      .addCase(fetchProjectLeads.fulfilled, (state, action) => {
        state.detailLoading = false
        state.currentProject = action.payload.data?.project
        state.projectLeads = action.payload.data?.leads || []
        state.pagination = action.payload.pagination || state.pagination
      })
      .addCase(fetchProjectLeads.rejected, (state) => { state.detailLoading = false })

      // fetchProjectDocuments
      .addCase(fetchProjectDocuments.pending,   (state) => { state.docsLoading = true })
      .addCase(fetchProjectDocuments.fulfilled, (state, action) => {
        state.docsLoading = false
        state.projectDocuments = action.payload?.documents || { unit_plans: [], creatives: [] }
      })
      .addCase(fetchProjectDocuments.rejected,  (state) => { state.docsLoading = false })

      // deleteProjectDocument — remove from local state immediately
      .addCase(deleteProjectDocument.fulfilled, (state, action) => {
        const { docId } = action.payload
        state.projectDocuments.unit_plans = state.projectDocuments.unit_plans.filter(d => d.id !== docId)
        state.projectDocuments.creatives  = state.projectDocuments.creatives.filter(d => d.id !== docId)
      })

      .addMatcher(
        (action) => ['projects/create', 'projects/update', 'projects/delete']
          .some(t => action.type.startsWith(t)),
        (state, action) => {
          if (action.type.endsWith('/pending')) { state.actionLoading = true; state.actionError = null }
          if (action.type.endsWith('/fulfilled')) { state.actionLoading = false }
          if (action.type.endsWith('/rejected')) { state.actionLoading = false; state.actionError = action.payload }
        }
      )
  },
})

export const { clearProjectError, clearCurrentProject, clearProjectDocuments } = projectSlice.actions
export default projectSlice.reducer