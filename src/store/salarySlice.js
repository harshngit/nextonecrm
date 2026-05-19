import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../api/axios'

// ── Thunks ────────────────────────────────────────────────────────────────────

// Admin: set salary for one employee
export const setEmployeeSalary = createAsyncThunk(
  'salary/setEmployeeSalary',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post('/salary/set', payload)
      return res.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to set salary')
    }
  }
)

// Admin: get all employees with current salary
export const fetchAllEmployeeSalaries = createAsyncThunk(
  'salary/fetchAllEmployeeSalaries',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/salary/employees')
      return res.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch salaries')
    }
  }
)

// Admin: salary revision history for one employee
export const fetchSalaryHistory = createAsyncThunk(
  'salary/fetchSalaryHistory',
  async (userId, { rejectWithValue }) => {
    try {
      const res = await api.get(`/salary/history/${userId}`)
      return res.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch salary history')
    }
  }
)

// Admin: generate slip for one employee
export const generateSalarySlip = createAsyncThunk(
  'salary/generateSlip',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post('/salary/generate', payload)
      return res.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to generate slip')
    }
  }
)

// Admin: generate slips for ALL employees
export const generateAllSalarySlips = createAsyncThunk(
  'salary/generateAll',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post('/salary/generate-all', payload)
      return res.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to generate all slips')
    }
  }
)

// Admin: view all slips (filterable)
export const fetchSalarySlips = createAsyncThunk(
  'salary/fetchSlips',
  async (params, { rejectWithValue }) => {
    try {
      const res = await api.get('/salary/slips', { params })
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch slips')
    }
  }
)

// Employee: view own salary + slips
export const fetchMySalary = createAsyncThunk(
  'salary/fetchMySalary',
  async (params, { rejectWithValue }) => {
    try {
      const res = await api.get('/salary/my-salary', { params })
      return res.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch your salary')
    }
  }
)

// ── Slice ─────────────────────────────────────────────────────────────────────

const salarySlice = createSlice({
  name: 'salary',
  initialState: {
    // admin views
    employees:     { total: 0, data: [] },
    slips:         { data: [], pagination: {} },
    history:       null,   // { employee, history[] }
    // employee view
    mySalary:      null,   // { current_monthly_salary, salary_slips[] }
    // last generated result
    lastGenerated: null,
    loading: {
      employees: false,
      slips:     false,
      history:   false,
      mySalary:  false,
      action:    false,
    },
    error:         null,
    actionSuccess: null,
  },
  reducers: {
    clearError:   (state) => { state.error = null },
    clearSuccess: (state) => { state.actionSuccess = null },
  },
  extraReducers: (builder) => {
    builder
      // fetchAllEmployeeSalaries
      .addCase(fetchAllEmployeeSalaries.pending,   (state) => { state.loading.employees = true; state.error = null })
      .addCase(fetchAllEmployeeSalaries.fulfilled, (state, action) => { state.loading.employees = false; state.employees = action.payload })
      .addCase(fetchAllEmployeeSalaries.rejected,  (state, action) => { state.loading.employees = false; state.error = action.payload })

      // fetchSalarySlips
      .addCase(fetchSalarySlips.pending,   (state) => { state.loading.slips = true; state.error = null })
      .addCase(fetchSalarySlips.fulfilled, (state, action) => { state.loading.slips = false; state.slips = action.payload })
      .addCase(fetchSalarySlips.rejected,  (state, action) => { state.loading.slips = false; state.error = action.payload })

      // fetchSalaryHistory
      .addCase(fetchSalaryHistory.pending,   (state) => { state.loading.history = true; state.error = null })
      .addCase(fetchSalaryHistory.fulfilled, (state, action) => { state.loading.history = false; state.history = action.payload })
      .addCase(fetchSalaryHistory.rejected,  (state, action) => { state.loading.history = false; state.error = action.payload })

      // fetchMySalary
      .addCase(fetchMySalary.pending,   (state) => { state.loading.mySalary = true; state.error = null })
      .addCase(fetchMySalary.fulfilled, (state, action) => { state.loading.mySalary = false; state.mySalary = action.payload })
      .addCase(fetchMySalary.rejected,  (state, action) => { state.loading.mySalary = false; state.error = action.payload })

      // setEmployeeSalary
      .addCase(setEmployeeSalary.pending,   (state) => { state.loading.action = true; state.error = null; state.actionSuccess = null })
      .addCase(setEmployeeSalary.fulfilled, (state, action) => {
        state.loading.action = false
        state.actionSuccess = `Salary set for ${action.payload.employee?.full_name}`
        // Update employee in list if present
        const idx = state.employees.data.findIndex(e => e.id === action.payload.salary?.user_id)
        if (idx !== -1) {
          state.employees.data[idx].monthly_salary = action.payload.salary?.monthly_salary
          state.employees.data[idx].effective_from = action.payload.salary?.effective_from
          state.employees.data[idx].salary_set = true
        }
      })
      .addCase(setEmployeeSalary.rejected, (state, action) => { state.loading.action = false; state.error = action.payload })

      // generateSalarySlip
      .addCase(generateSalarySlip.pending,   (state) => { state.loading.action = true; state.error = null; state.actionSuccess = null })
      .addCase(generateSalarySlip.fulfilled, (state, action) => {
        state.loading.action = false
        state.lastGenerated = action.payload
        state.actionSuccess = `Slip generated for ${action.payload.employee?.full_name}`
      })
      .addCase(generateSalarySlip.rejected, (state, action) => { state.loading.action = false; state.error = action.payload })

      // generateAllSalarySlips
      .addCase(generateAllSalarySlips.pending,   (state) => { state.loading.action = true; state.error = null; state.actionSuccess = null })
      .addCase(generateAllSalarySlips.fulfilled, (state, action) => {
        state.loading.action = false
        state.lastGenerated = action.payload
        state.actionSuccess = `Generated ${action.payload.total_processed} salary slips`
      })
      .addCase(generateAllSalarySlips.rejected, (state, action) => { state.loading.action = false; state.error = action.payload })
  },
})

export const { clearError, clearSuccess } = salarySlice.actions
export default salarySlice.reducer
