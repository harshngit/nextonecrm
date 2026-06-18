import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../api/axios'

// ── Thunks ────────────────────────────────────────────────────────────────────

export const fetchUsers = createAsyncThunk(
  'users/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const allowedParams = {}
      if (params.role && params.role !== '--') allowedParams.role = params.role
      if (params.is_active !== '' && params.is_active !== undefined) allowedParams.is_active = params.is_active
      if (params.page) allowedParams.page = params.page
      if (params.per_page) allowedParams.per_page = params.per_page

      const response = await api.get('/users', { params: allowedParams })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch users')
    }
  }
)

export const fetchUserById = createAsyncThunk(
  'users/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/users/${id}`)
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch user')
    }
  }
)

// Create user via /auth/register (requires Bearer token for non-admin roles)
export const createUser = createAsyncThunk(
  'users/create',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/register', userData)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create user')
    }
  }
)

export const updateUser = createAsyncThunk(
  'users/update',
  async ({ id, userData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/users/${id}`, userData)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update user')
    }
  }
)

export const deleteUser = createAsyncThunk(
  'users/delete',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/users/${id}`)
      return { id, ...response.data }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to deactivate user')
    }
  }
)

export const updateUserRole = createAsyncThunk(
  'users/updateRole',
  async ({ id, role }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/users/${id}/role`, { role })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update user role')
    }
  }
)

export const assignManager = createAsyncThunk(
  'users/assignManager',
  async ({ userId, managerId }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/users/${userId}/assign-manager`, { manager_id: managerId })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to assign manager')
    }
  }
)

export const toggleUserStatus = createAsyncThunk(
  'users/toggleStatus',
  async ({ id, is_active }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/users/${id}/status`, { is_active })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update user status')
    }
  }
)

export const fetchRoles = createAsyncThunk(
  'users/fetchRoles',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/users/roles')
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch roles')
    }
  }
)

export const fetchTeamTree = createAsyncThunk(
  'users/fetchTeamTree',
  async (managerId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/users/${managerId}/team-tree`)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch team tree')
    }
  }
)

// ── Slice ─────────────────────────────────────────────────────────────────────

const userSlice = createSlice({
  name: 'users',
  initialState: {
    list: [],
    roles: [],
    pagination: {},
    currentUser: null,
    loading: false,
    detailLoading: false,
    error: null,
    actionLoading: false,
    actionError: null,
    teamTree: [],
    teamTreeLoading: false,
  },
  reducers: {
    clearUserError: (state) => {
      state.error = null
      state.actionError = null
    },
    clearCurrentUser: (state) => {
      state.currentUser = null
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchUsers
      .addCase(fetchUsers.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload.data || []
        state.pagination = action.payload.pagination || {}
      })
      .addCase(fetchUsers.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchUserById.pending, (state) => { state.detailLoading = true })
      .addCase(fetchUserById.fulfilled, (state, action) => { state.detailLoading = false; state.currentUser = action.payload })
      .addCase(fetchUserById.rejected, (state, action) => { state.detailLoading = false; state.error = action.payload })

      // fetchRoles
      .addCase(fetchRoles.fulfilled, (state, action) => {
        state.roles = action.payload.data || []
      })

      // fetchTeamTree
      .addCase(fetchTeamTree.pending, (state) => { state.teamTreeLoading = true; state.error = null })
      .addCase(fetchTeamTree.fulfilled, (state, action) => {
        state.teamTreeLoading = false
        state.teamTree = action.payload.data?.team || []
      })
      .addCase(fetchTeamTree.rejected, (state, action) => { state.teamTreeLoading = false; state.error = action.payload })

      // updateUser — patch the updated row directly in list so email shows immediately
      .addCase(updateUser.fulfilled, (state, action) => {
        const updated = action.payload?.data
        if (updated?.id) {
          state.list = state.list.map(u => u.id === updated.id ? { ...u, ...updated } : u)
        }
      })

      // updateUserRole — patch role in-place so the list reflects the new role immediately
      .addCase(updateUserRole.fulfilled, (state, action) => {
        const updated = action.payload?.data
        if (updated?.id) {
          state.list = state.list.map(u => u.id === updated.id ? { ...u, role: updated.role } : u)
        }
      })

      // Action matchers for create / update / delete / role / assignManager
      .addMatcher(
        (action) => action.type.endsWith('/pending') && action.type.startsWith('users/') && action.type !== 'users/fetchAll/pending',
        (state) => { state.actionLoading = true; state.actionError = null }
      )
      .addMatcher(
        (action) => action.type.endsWith('/fulfilled') && action.type.startsWith('users/') && action.type !== 'users/fetchAll/fulfilled',
        (state) => { state.actionLoading = false }
      )
      .addMatcher(
        (action) => action.type.endsWith('/rejected') && action.type.startsWith('users/') && action.type !== 'users/fetchAll/rejected',
        (state, action) => { state.actionLoading = false; state.actionError = action.payload }
      )
  },
})

export const { clearUserError, clearCurrentUser } = userSlice.actions
export default userSlice.reducer