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

const projectSlice = createSlice({
  name: 'projects',
  initialState: {
    list: [],
    pagination: { total: 0, page: 1, per_page: 20, total_pages: 0 },
    loading: false,
    actionLoading: false,
    error: null,
    actionError: null,
  },
  reducers: {
    clearProjectError: (state) => {
      state.error = null
      state.actionError = null
    },
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

export const { clearProjectError } = projectSlice.actions
export default projectSlice.reducer
