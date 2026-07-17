import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../api/axios'

export const fetchWebsiteInquiries = createAsyncThunk(
  'websiteInquiries/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/website-inquiries', { params })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch website inquiries')
    }
  }
)

export const fetchWebsiteInquiryById = createAsyncThunk(
  'websiteInquiries/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/website-inquiries/${id}`)
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch website inquiry')
    }
  }
)

export const updateWebsiteInquiry = createAsyncThunk(
  'websiteInquiries/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/website-inquiries/${id}`, data)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update website inquiry')
    }
  }
)

export const deleteWebsiteInquiry = createAsyncThunk(
  'websiteInquiries/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/website-inquiries/${id}`)
      return id
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete website inquiry')
    }
  }
)

export const convertWebsiteInquiry = createAsyncThunk(
  'websiteInquiries/convert',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/website-inquiries/${id}/convert`, data)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Conversion failed')
    }
  }
)

const websiteInquirySlice = createSlice({
  name: 'websiteInquiries',
  initialState: {
    list: [],
    currentInquiry: null,
    pagination: { total: 0, page: 1, per_page: 20, total_pages: 0 },
    loading: false,
    detailLoading: false,
    actionLoading: false,
    error: null,
    actionError: null,
  },
  reducers: {
    clearWebsiteInquiryError: (state) => {
      state.error = null
      state.actionError = null
    },
    clearCurrentInquiry: (state) => {
      state.currentInquiry = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWebsiteInquiries.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchWebsiteInquiries.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload?.data || []
        state.pagination = action.payload?.pagination || state.pagination
      })
      .addCase(fetchWebsiteInquiries.rejected, (state, action) => {
        state.loading = false; state.error = action.payload
      })

      .addCase(fetchWebsiteInquiryById.pending, (state) => { state.detailLoading = true })
      .addCase(fetchWebsiteInquiryById.fulfilled, (state, action) => {
        state.detailLoading = false
        state.currentInquiry = action.payload
      })
      .addCase(fetchWebsiteInquiryById.rejected, (state, action) => {
        state.detailLoading = false; state.error = action.payload
      })

      .addMatcher(
        (action) => ['websiteInquiries/update', 'websiteInquiries/delete', 'websiteInquiries/convert']
          .some(t => action.type.startsWith(t)),
        (state, action) => {
          if (action.type.endsWith('/pending'))   { state.actionLoading = true;  state.actionError = null }
          if (action.type.endsWith('/fulfilled')) { state.actionLoading = false }
          if (action.type.endsWith('/rejected'))  { state.actionLoading = false; state.actionError = action.payload }
        }
      )
  },
})

export const { clearWebsiteInquiryError, clearCurrentInquiry } = websiteInquirySlice.actions
export default websiteInquirySlice.reducer
