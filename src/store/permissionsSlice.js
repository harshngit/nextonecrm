import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../api/axios'

export const fetchMyPermissions = createAsyncThunk(
  'permissions/fetchMyPermissions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/users/me/permissions')
      return response.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Failed to fetch permissions')
    }
  }
)

const permissionsSlice = createSlice({
  name: 'permissions',
  initialState: {
    data: {},
    role: null,
    loading: false,
    error: null,
    loaded: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyPermissions.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchMyPermissions.fulfilled, (state, action) => {
        state.loading = false
        state.role = action.payload.role
        state.data = action.payload.permissions
        state.loaded = true
      })
      .addCase(fetchMyPermissions.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  },
})

export const selectPermissions = (state) => state.permissions.data
export const selectRole = (state) => state.permissions.role
export const selectPermissionsLoaded = (state) => state.permissions.loaded

export default permissionsSlice.reducer
