import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useModulePermissions } from '../hooks/usePermission'
import {
  IndianRupee, TrendingUp, Calendar, Users, ChevronDown,
  Plus, RefreshCw, FileText, CheckCircle, AlertCircle,
  Clock, Banknote, Wallet, BarChart3, Edit2, History,
  X, Eye, Loader2, DollarSign, Timer, ArrowRight,
  MoreVertical, Download, Percent, Trash2, Handshake, CreditCard, Link2, Upload,
} from 'lucide-react'
import {
  fetchAllEmployeeSalaries,
  fetchSalarySlips,
  fetchMySalary,
  fetchSalaryHistory,
  setEmployeeSalary,
  generateSalarySlip,
  generateAllSalarySlips,
  clearError,
  clearSuccess,
} from '../store/salarySlice'
import api from '../api/axios'
import Modal from '../components/ui/Modal'
import DatePicker from '../components/ui/DatePicker'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import ExportModal from '../components/ui/ExportModal'
import AsyncSearchSelect from '../components/ui/AsyncSearchSelect'

// ── helpers ───────────────────────────────────────────────────────────────────

const fmtCurrency = (n) =>
  n == null ? '—' : `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const MONTHS = [
  { v: 1, l: 'January' }, { v: 2, l: 'February' }, { v: 3, l: 'March' },
  { v: 4, l: 'April' },   { v: 5, l: 'May' },       { v: 6, l: 'June' },
  { v: 7, l: 'July' },    { v: 8, l: 'August' },    { v: 9, l: 'September' },
  { v: 10, l: 'October' },{ v: 11, l: 'November' }, { v: 12, l: 'December' },
]

const thisMonth = new Date().getMonth() + 1
const thisYear  = new Date().getFullYear()
const YEARS     = Array.from({ length: 5 }, (_, i) => thisYear - i)

const roleColors = {
  super_admin:     'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
  admin:           'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
  sales_manager:   'text-brand bg-brand/10',
  sales_executive: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
  external_caller: 'text-sky-600 bg-sky-100 dark:text-sky-400 dark:bg-sky-900/30',
}

const inputCls = 'w-full px-3 py-2 text-sm bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:border-[#0082f3] text-gray-900 dark:text-gray-100 shadow-sm transition-all'
const labelCls = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'

// Status config for day-wise view
const STATUS_CONFIG = {
  present:  { label: 'Present',  dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  late:     { label: 'Late',     dot: 'bg-amber-500',   badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  absent:   { label: 'Absent',   dot: 'bg-red-500',     badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  on_leave: { label: 'On Leave', dot: 'bg-indigo-500',  badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
  half_day: { label: 'Half Day', dot: 'bg-pink-500',    badge: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300' },
}

const fmtTime = (ts) => {
  if (!ts) return '--:--'
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const fmtDate = (d) => {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Uploaded file URLs come back relative (e.g. "/uploads/payment-proofs/x.png"),
// served from the API's origin rather than the frontend's.
const fileOrigin = api.defaults.baseURL.replace(/\/api\/v1\/?$/, '')
const resolveFileUrl = (url) => {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `${fileOrigin}${url.startsWith('/') ? '' : '/'}${url}`
}

const searchLeads = async (q) => {
  const r = await api.get('/leads', { params: { search: q, per_page: 20 } })
  return (r.data.data || []).map(l => ({ value: l.id, label: `${l.name}${l.phone ? ` — ${l.phone}` : ''}` }))
}

const searchProjects = async (q) => {
  const r = await api.get('/projects', { params: { search: q, per_page: 20 } })
  return (r.data.data || []).map(p => ({ value: p.id, label: `${p.name}${p.city ? ` — ${p.city}` : ''}` }))
}

// ── sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color = 'brand' }) {
  const colors = {
    brand:  'bg-[#0082f3]/10 text-[#0082f3]',
    green:  'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    amber:  'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  }
  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 flex items-center gap-4 shadow-sm">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-lg font-bold text-gray-900 dark:text-white truncate">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 truncate">{sub}</p>}
      </div>
    </div>
  )
}

function CustomDropdown({ value, onChange, options, placeholder, className = '' }) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedOption = options.find(opt => opt.value === value)

  const handleOptionClick = (optionValue) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-3 py-2 text-sm bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-800 rounded-xl cursor-pointer hover:border-[#0082f3] transition-all"
      >
        <span className="text-gray-900 dark:text-gray-100">
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </div>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto">
            {options.map((option) => (
              <div
                key={option.value}
                onClick={() => handleOptionClick(option.value)}
                className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                  option.value === value
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-[#0082f3]'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a1a]'
                }`}
              >
                {option.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function SlipBadge({ slip }) {
  if (!slip) return <span className="text-xs text-gray-400">—</span>
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
      <CheckCircle size={10} /> Generated
    </span>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN VIEW
// ══════════════════════════════════════════════════════════════════════════════

function AdminSalaryView({ user }) {
  const dispatch  = useDispatch()
  const navigate  = useNavigate()
  const { employees, slips, history, loading, error, actionSuccess, lastGenerated } = useSelector(s => s.salary)
  const perms = useModulePermissions('salary')

  const [tab, setTab]                   = useState('employees')
  const [filterMonth, setFilterMonth]   = useState(thisMonth)
  const [filterYear, setFilterYear]     = useState(thisYear)
  const [employeesPage, setEmployeesPage] = useState(1)
  const [slipsPage, setSlipsPage]         = useState(1)
  const perPage = 10
  const [openMenuEmpId, setOpenMenuEmpId] = useState(null)
  const [menuPos,       setMenuPos]       = useState(null)
  const menuRef = useRef(null)

  // Set Salary modal
  const [setSalaryModal, setSetSalaryModal] = useState(false)
  const [setSalaryTarget, setSalaryTargetE] = useState(null) // employee row
  const [setSalaryForm, setSalaryFormData] = useState({
    monthly_salary:        '',
    per_day_salary:        '',
    working_days_in_month: '26',
    effective_from:        '',
    notes:                 '',
  })
  
  // Appraisal form
  const [appraisalForm, setAppraisalForm] = useState({
    new_salary:     '',
    effective_from: '',
    notes:          '',
  })

  // Generate slip modal (single)
  const [genModal, setGenModal]   = useState(false)
  const [genTarget, setGenTarget] = useState(null)
  const [genForm, setGenForm]     = useState({ month: thisMonth, year: thisYear, basic_salary: '', pay_date: '', notes: '' })

  // Generate all modal
  const [genAllModal, setGenAllModal] = useState(false)
  const [genAllForm, setGenAllForm]   = useState({ month: thisMonth, year: thisYear, pay_date: '', notes: '' })
  const [bulkPdfDownloading, setBulkPdfDownloading] = useState(false)

  // Edit slip modal
  const [editSlipModal,  setEditSlipModal]  = useState(false)
  const [editSlipTarget, setEditSlipTarget] = useState(null)
  const [editSlipForm,   setEditSlipForm]   = useState({ basic_salary: '', notes: '' })
  const [editSlipSaving, setEditSlipSaving] = useState(false)
  const [editSlipError,  setEditSlipError]  = useState('')

  // History modal
  const [histModal, setHistModal] = useState(false)

  // Result modal (after generate)
  const [resultModal, setResultModal] = useState(false)

  // Export modal
  const [showExportModal, setShowExportModal] = useState(false)
  const [exporting,       setExporting]       = useState(false)

  // Appraisal modal
  const [appraisalModal, setAppraisalModal] = useState(false)
  const [appraisalTarget, setAppraisalTarget] = useState(null)
  
  // Incentive modal
  const [incentiveModal, setIncentiveModal] = useState(false)
  const [incentiveTarget, setIncentiveTarget] = useState(null)
  const [incentiveForm, setIncentiveForm] = useState({
    amount: '',
    reason: '',
  })

  // Shared employee search list (used by Commission + Advance "Employee" pickers)
  const [salaryEmployees, setSalaryEmployees] = useState([])

  // Commissions
  const [commissions, setCommissions] = useState({ data: [], pagination: {} })
  const [commissionsLoading, setCommissionsLoading] = useState(false)
  const [commissionsPage, setCommissionsPage] = useState(1)
  const [commissionFilters, setCommissionFilters] = useState({ user_id: '', paid: '', from: '', to: '' })
  const [addCommissionModal, setAddCommissionModal] = useState(false)
  const [commissionSaving, setCommissionSaving] = useState(false)
  const [commissionForm, setCommissionForm] = useState({
    user_id: '', lead_id: '', project_id: '', project_name: '',
    commission_amount: '', commission_percentage: '', notes: '',
  })

  // Advances
  const [advances, setAdvances] = useState({ data: [], pagination: {} })
  const [advancesLoading, setAdvancesLoading] = useState(false)
  const [advancesPage, setAdvancesPage] = useState(1)
  const [advanceFilters, setAdvanceFilters] = useState({ user_id: '', from: '', to: '' })
  const [addAdvanceModal, setAddAdvanceModal] = useState(false)
  const [advanceSaving, setAdvanceSaving] = useState(false)
  const [advanceProofUploading, setAdvanceProofUploading] = useState(false)
  const [advanceProofError, setAdvanceProofError] = useState('')
  const [advanceForm, setAdvanceForm] = useState({
    user_id: '', advance_date: '', amount: '', transaction_reference: '', payment_proof_url: '', notes: '',
  })

  useEffect(() => {
    dispatch(fetchAllEmployeeSalaries({ page: employeesPage, per_page: perPage }))
    dispatch(fetchSalarySlips({ month: filterMonth, year: filterYear, page: slipsPage, per_page: perPage }))
  }, [dispatch, employeesPage, slipsPage])

  useEffect(() => {
    if (tab === 'slips') {
      setSlipsPage(1)
      dispatch(fetchSalarySlips({ month: filterMonth, year: filterYear, page: 1, per_page: perPage }))
    }
  }, [tab, filterMonth, filterYear, dispatch])

  useEffect(() => {
    if (tab === 'commissions') {
      loadSalaryEmployees()
      fetchCommissions(1, commissionFilters)
      setCommissionsPage(1)
    }
    if (tab === 'advances') {
      loadSalaryEmployees()
      fetchAdvances(1, advanceFilters)
      setAdvancesPage(1)
    }
  }, [tab])

  useEffect(() => {
    if (actionSuccess) {
      if (actionSuccess.includes('Generated')) setResultModal(true)
      if (actionSuccess.includes('Slip generated')) {
        setGenModal(false)
        dispatch(fetchSalarySlips({ month: filterMonth, year: filterYear, page: slipsPage, per_page: perPage }))
        setTimeout(() => dispatch(clearSuccess()), 3000)
      }
      if (actionSuccess.includes('set for')) {
        setSetSalaryModal(false)
        dispatch(fetchAllEmployeeSalaries({ page: employeesPage, per_page: perPage }))
        setTimeout(() => dispatch(clearSuccess()), 3000)
      }
    }
  }, [actionSuccess, dispatch, filterMonth, filterYear, slipsPage, employeesPage, perPage])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuEmpId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const openSetSalary = (emp) => {
    setSalaryTargetE(emp)
    const monthly = emp.monthly_salary ? String(emp.monthly_salary) : ''
    const perDay  = emp.per_day_salary
      ? String(emp.per_day_salary)
      : monthly ? (parseFloat(monthly) / 26).toFixed(2) : ''
    setSalaryFormData({
      monthly_salary:        monthly,
      per_day_salary:        perDay,
      working_days_in_month: '26',
      effective_from:        new Date().toISOString().split('T')[0],
      notes:                 '',
    })
    setSetSalaryModal(true)
  }

  const openHistory = (emp) => {
    dispatch(fetchSalaryHistory(emp.id))
    setHistModal(true)
  }
  
  const openAppraisal = (emp) => {
    setAppraisalTarget(emp)
    setAppraisalForm({
      new_salary:     emp.monthly_salary ? String(emp.monthly_salary) : '',
      effective_from: new Date().toISOString().split('T')[0],
      notes:          '',
    })
    setAppraisalModal(true)
  }
  
  const handleSaveAppraisal = async () => {
    if (!appraisalTarget || !appraisalForm.new_salary) return
    try {
      await api.post('/salary/appraisal', {
        user_id: appraisalTarget.id,
        new_salary: parseFloat(appraisalForm.new_salary),
        effective_from: appraisalForm.effective_from,
        appraisal_note: appraisalForm.notes,
        working_days_in_month: 26
      })
      setAppraisalModal(false)
      setAppraisalForm({ new_salary: '', effective_from: '', notes: '' })
      dispatch(fetchAllEmployeeSalaries({ page: employeesPage, per_page: perPage }))
    } catch (err) {
      console.error('Failed to save appraisal:', err)
    }
  }
  
  const openIncentive = (emp) => {
    setIncentiveTarget(emp)
    setIncentiveForm({ amount: '', reason: '' })
    setIncentiveModal(true)
  }
  
  const handleAddIncentive = async () => {
    if (!incentiveTarget || !incentiveForm.amount || !incentiveForm.reason) return
    try {
      await api.post('/salary/incentive', {
        user_id: incentiveTarget.id,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        amount: parseFloat(incentiveForm.amount),
        reason: incentiveForm.reason,
      })
      setIncentiveModal(false)
      setIncentiveForm({ amount: '', reason: '' })
      dispatch(fetchAllEmployeeSalaries({ page: employeesPage, per_page: perPage }))
    } catch (err) {
      console.error('Failed to add incentive:', err)
    }
  }

  const openCommissionForEmployee = (emp) => {
    setCommissionForm({ user_id: emp.id, lead_id: '', project_id: '', project_name: '', commission_amount: '', commission_percentage: '', notes: '' })
    loadSalaryEmployees()
    setAddCommissionModal(true)
  }

  const openAdvanceForEmployee = (emp) => {
    setAdvanceForm({ user_id: emp.id, advance_date: new Date().toISOString().split('T')[0], amount: '', transaction_reference: '', payment_proof_url: '', notes: '' })
    setAdvanceProofError('')
    loadSalaryEmployees()
    setAddAdvanceModal(true)
  }

  const openGenerate = (emp) => {
    setGenTarget(emp)
    setGenForm({
      month: thisMonth, year: thisYear,
      basic_salary: emp.monthly_salary ? String(emp.monthly_salary) : '',
      pay_date: '', notes: '',
    })
    setGenModal(true)
  }

  // ── Commissions ──────────────────────────────────────────────────────────
  const fetchCommissions = async (page = 1, filters = commissionFilters) => {
    setCommissionsLoading(true)
    try {
      const params = { page, per_page: perPage }
      if (filters.user_id) params.user_id = filters.user_id
      if (filters.paid !== '') params.paid = filters.paid === 'true'
      if (filters.from) params.from = filters.from
      if (filters.to) params.to = filters.to
      const res = await api.get('/salary/commissions', { params })
      const payload = res.data?.data ?? res.data
      const list = payload?.data || (Array.isArray(payload) ? payload : [])
      setCommissions({
        data: list,
        pagination: payload?.pagination || res.data?.pagination || { page, per_page: perPage, total: list.length, total_pages: 1 },
      })
    } catch (err) {
      console.error('Failed to fetch commissions:', err)
      setCommissions({ data: [], pagination: {} })
    } finally {
      setCommissionsLoading(false)
    }
  }

  const goToCommissionsPage = (page) => {
    setCommissionsPage(page)
    fetchCommissions(page, commissionFilters)
  }

  const applyCommissionFilters = (next) => {
    setCommissionFilters(next)
    setCommissionsPage(1)
    fetchCommissions(1, next)
  }

  const loadSalaryEmployees = async () => {
    if (salaryEmployees.length > 0) return
    try {
      const res = await api.get('/salary/employees', { params: { per_page: 500 } })
      const list = res.data?.data?.data || res.data?.data || []
      setSalaryEmployees(list)
    } catch (err) {
      console.error('Failed to fetch employees:', err)
    }
  }

  const searchSalaryEmployees = async (q) => {
    return salaryEmployees
      .filter(e => e.full_name?.toLowerCase().includes(q.toLowerCase()))
      .map(e => ({ value: e.id, label: `${e.full_name}${e.role ? ` — ${e.role.replace(/_/g, ' ')}` : ''}` }))
  }

  const openAddCommission = () => {
    setCommissionForm({ user_id: '', lead_id: '', project_id: '', project_name: '', commission_amount: '', commission_percentage: '', notes: '' })
    loadSalaryEmployees()
    setAddCommissionModal(true)
  }

  const handleAddCommission = async () => {
    if (!commissionForm.user_id || !commissionForm.commission_amount) return
    setCommissionSaving(true)
    try {
      await api.post('/salary/commission', {
        user_id: commissionForm.user_id,
        lead_id: commissionForm.lead_id || undefined,
        project_id: commissionForm.project_id || undefined,
        project_name: commissionForm.project_id ? undefined : (commissionForm.project_name || undefined),
        commission_amount: parseFloat(commissionForm.commission_amount),
        commission_percentage: commissionForm.commission_percentage ? parseFloat(commissionForm.commission_percentage) : undefined,
        notes: commissionForm.notes || undefined,
      })
      setAddCommissionModal(false)
      goToCommissionsPage(1)
    } catch (err) {
      console.error('Failed to add commission:', err)
    } finally {
      setCommissionSaving(false)
    }
  }

  const toggleCommissionPaid = async (c) => {
    try {
      await api.patch(`/salary/commission/${c.id}/paid`, { paid: !c.paid })
      fetchCommissions(commissionsPage, commissionFilters)
    } catch (err) {
      console.error('Failed to update commission status:', err)
    }
  }

  const deleteCommission = async (id) => {
    try {
      await api.delete(`/salary/commission/${id}`)
      fetchCommissions(commissionsPage, commissionFilters)
    } catch (err) {
      console.error('Failed to delete commission:', err)
    }
  }

  // ── Advances ─────────────────────────────────────────────────────────────
  const fetchAdvances = async (page = 1, filters = advanceFilters) => {
    setAdvancesLoading(true)
    try {
      const params = { page, per_page: perPage }
      if (filters.user_id) params.user_id = filters.user_id
      if (filters.from) params.from = filters.from
      if (filters.to) params.to = filters.to
      const res = await api.get('/salary/advances', { params })
      const payload = res.data?.data ?? res.data
      const list = payload?.data || (Array.isArray(payload) ? payload : [])
      setAdvances({
        data: list,
        pagination: payload?.pagination || res.data?.pagination || { page, per_page: perPage, total: list.length, total_pages: 1 },
      })
    } catch (err) {
      console.error('Failed to fetch advances:', err)
      setAdvances({ data: [], pagination: {} })
    } finally {
      setAdvancesLoading(false)
    }
  }

  const goToAdvancesPage = (page) => {
    setAdvancesPage(page)
    fetchAdvances(page, advanceFilters)
  }

  const applyAdvanceFilters = (next) => {
    setAdvanceFilters(next)
    setAdvancesPage(1)
    fetchAdvances(1, next)
  }

  const openAddAdvance = () => {
    setAdvanceForm({ user_id: '', advance_date: new Date().toISOString().split('T')[0], amount: '', transaction_reference: '', payment_proof_url: '', notes: '' })
    setAdvanceProofError('')
    loadSalaryEmployees()
    setAddAdvanceModal(true)
  }

  const handleUploadAdvanceProof = async (file) => {
    if (!file) return
    setAdvanceProofError('')
    setAdvanceProofUploading(true)
    try {
      const fd = new FormData()
      fd.append('payment_proof', file)
      const res = await api.post('/upload/payment-proof', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      const url = res.data.data?.url
      setAdvanceForm(f => ({ ...f, payment_proof_url: url || '' }))
    } catch (err) {
      setAdvanceProofError(err.response?.data?.message || 'Upload failed')
    } finally {
      setAdvanceProofUploading(false)
    }
  }

  const handleAddAdvance = async () => {
    if (!advanceForm.user_id || !advanceForm.advance_date || !advanceForm.amount || !advanceForm.payment_proof_url) return
    setAdvanceSaving(true)
    try {
      await api.post('/salary/advance', {
        user_id: advanceForm.user_id,
        advance_date: advanceForm.advance_date,
        amount: parseFloat(advanceForm.amount),
        transaction_reference: advanceForm.transaction_reference || undefined,
        payment_proof_url: advanceForm.payment_proof_url,
        notes: advanceForm.notes || undefined,
      })
      setAddAdvanceModal(false)
      goToAdvancesPage(1)
    } catch (err) {
      console.error('Failed to add advance:', err)
    } finally {
      setAdvanceSaving(false)
    }
  }

  const deleteAdvance = async (id) => {
    if (!confirm('Are you sure you want to delete this advance?')) return
    try {
      await api.delete(`/salary/advance/${id}`)
      fetchAdvances(advancesPage, advanceFilters)
    } catch (err) {
      console.error('Failed to delete advance:', err)
    }
  }

  const handleSetSalary = () => {
    if (!setSalaryForm.monthly_salary && !setSalaryForm.per_day_salary) return
    dispatch(setEmployeeSalary({
      user_id:               setSalaryTarget.id,
      monthly_salary:        setSalaryForm.monthly_salary        ? parseFloat(setSalaryForm.monthly_salary)        : undefined,
      per_day_salary:        setSalaryForm.per_day_salary        ? parseFloat(setSalaryForm.per_day_salary)        : undefined,
      working_days_in_month: setSalaryForm.working_days_in_month ? parseInt(setSalaryForm.working_days_in_month)   : 26,
      effective_from:        setSalaryForm.effective_from        || undefined,
      notes:                 setSalaryForm.notes                 || undefined,
    }))
  }

  const handleGenerate = () => {
    dispatch(generateSalarySlip({
      user_id: genTarget.id,
      month:   genForm.month,
      year:    genForm.year,
      basic_salary: genForm.basic_salary ? parseFloat(genForm.basic_salary) : undefined,
      pay_date:     genForm.pay_date     || undefined,
      notes:        genForm.notes        || undefined,
    }))
  }

  const handleGenerateAll = () => {
    dispatch(generateAllSalarySlips({
      month: genAllForm.month,
      year:  genAllForm.year,
      pay_date: genAllForm.pay_date || undefined,
      notes:    genAllForm.notes    || undefined,
    }))
    setGenAllModal(false)
  }

  const handleExport = async (dateRange) => {
    try {
      setExporting(true)
      const params = { ...dateRange, month: filterMonth, year: filterYear }
      const res = await api.get('/export/salary', { params, responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a'); a.href = url; a.download = `Salary_${dateRange.from}_to_${dateRange.to}.xlsx`
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
      setShowExportModal(false)
    } catch (err) { console.error('Export failed:', err) } finally { setExporting(false) }
  }

  const downloadSlipPdf = async (slip) => {
    try {
      const res = await api.get(`/salary/slips/${slip.id}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url; a.download = `Salary_Slip_${(slip.employee_name || 'slip').replace(/\s+/g, '_')}_${slip.month}_${slip.year}.pdf`
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    } catch (err) { console.error('Failed to download slip PDF:', err) }
  }

  const downloadBulkPdf = async () => {
    setBulkPdfDownloading(true)
    try {
      const res = await api.post('/salary/slips/bulk-pdf', { month: filterMonth, year: filterYear }, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url; a.download = `Salary_Slips_${filterMonth}_${filterYear}.zip`
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    } catch (err) { console.error('Bulk PDF download failed:', err) } finally { setBulkPdfDownloading(false) }
  }

  const openEditSlip = (slip) => {
    setEditSlipTarget(slip)
    setEditSlipForm({
      basic_salary: slip.basic_salary != null ? String(slip.basic_salary) : (slip.monthly_salary != null ? String(slip.monthly_salary) : ''),
      notes:        slip.notes || '',
    })
    setEditSlipError('')
    setEditSlipModal(true)
  }

  const handleEditSlip = async () => {
    if (!editSlipTarget) return
    setEditSlipError('')
    setEditSlipSaving(true)
    try {
      await api.patch(`/salary/slips/${editSlipTarget.id}`, {
        basic_salary: editSlipForm.basic_salary ? parseFloat(editSlipForm.basic_salary) : undefined,
        notes:        editSlipForm.notes || undefined,
      })
      setEditSlipModal(false)
      dispatch(fetchSalarySlips({ month: filterMonth, year: filterYear, page: slipsPage, per_page: perPage }))
    } catch (err) {
      setEditSlipError(err.response?.data?.message || 'Failed to update slip')
    } finally {
      setEditSlipSaving(false)
    }
  }

  // Quick stats
  const totalSet      = employees.data?.filter(e => e.salary_set).length || 0
  const totalNotSet   = (employees.data?.length || 0) - totalSet
  const totalPayroll  = employees.data?.reduce((s, e) => s + (e.monthly_salary || 0), 0) || 0
  const totalSlips    = slips.data?.length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Salary Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Set salaries, generate slips and track payroll</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setEmployeesPage(1); setSlipsPage(1); dispatch(fetchAllEmployeeSalaries({ page: 1, per_page: perPage })); dispatch(fetchSalarySlips({ month: filterMonth, year: filterYear, page: 1, per_page: perPage })) }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl transition-all"
          >
            <RefreshCw size={13} className={loading.employees || loading.slips ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl transition-all disabled:opacity-50"
          >
            {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Export
          </button>
          {perms.create && (
            <button
              onClick={() => { setGenAllForm({ month: thisMonth, year: thisYear, pay_date: '', notes: '' }); setGenAllModal(true) }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-[#0082f3] hover:bg-[#006fd4] rounded-xl transition-all shadow-sm"
            >
              <FileText size={13} />
              Generate All Slips
            </button>
          )}
        </div>
      </div>

      {/* Toast */}
      {actionSuccess && !actionSuccess.includes('Generated') && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-700 dark:text-green-400">
          <CheckCircle size={15} /> {actionSuccess}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
          <AlertCircle size={15} /> {error}
          <button onClick={() => dispatch(clearError())} className="ml-auto"><X size={13} /></button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}       label="Total Employees"  value={employees.data?.length || 0}  color="brand" />
        <StatCard icon={CheckCircle} label="Salary Set"       value={totalSet}     sub={`${totalNotSet} pending`}  color="green" />
        <StatCard icon={Banknote}    label="Monthly Payroll"  value={fmtCurrency(totalPayroll)}                     color="purple" />
        <StatCard icon={FileText}    label="Slips This Month" value={totalSlips}   sub={`${MONTHS.find(m=>m.v===filterMonth)?.l} ${filterYear}`} color="amber" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-[#141414] p-1 rounded-xl w-fit">
        {[{ v: 'employees', l: 'Employees & Salaries' }, { v: 'slips', l: 'Salary Slips' }, { v: 'commissions', l: 'Commissions' }, { v: 'advances', l: 'Advances' }].map(t => (
          <button
            key={t.v}
            onClick={() => setTab(t.v)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${tab === t.v ? 'bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {/* ── TAB: Employees & Salaries ────────────────────────────────────────── */}
      {tab === 'employees' && (
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          {loading.employees ? (
            <div className="flex items-center justify-center h-40 text-gray-400">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#141414]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Monthly Salary</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Effective From</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Set By</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.data?.map((emp, i) => (
                    <tr key={emp.id} className={`border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-[#141414] transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30 dark:bg-white/[0.01]'}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={emp.full_name} size="sm" />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white text-sm">{emp.full_name}</p>
                            <p className="text-xs text-gray-400">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[emp.role] || 'text-gray-500 bg-gray-100'}`}>
                          {emp.role?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {emp.salary_set ? (
                          <span className="font-bold text-gray-900 dark:text-white">{fmtCurrency(emp.monthly_salary)}</span>
                        ) : (
                          <span className="text-xs text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">Not set</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {emp.effective_from ? new Date(emp.effective_from).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{emp.set_by_name || '—'}</td>
                      <td className="px-4 py-3" ref={openMenuEmpId === emp.id ? menuRef : null}>
                        <div className="flex items-center justify-end">
                          <div className="relative">
                            <button
                              onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); const below = window.innerHeight - r.bottom; setMenuPos({ right: window.innerWidth - r.right, ...(below > 200 ? { top: r.bottom + 4 } : { bottom: window.innerHeight - r.top + 4 }) }); setOpenMenuEmpId(openMenuEmpId === emp.id ? null : emp.id) }}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                            >
                              <MoreVertical size={14} />
                            </button>
                            {openMenuEmpId === emp.id && (
                              <div style={{ top: menuPos?.top, bottom: menuPos?.bottom, right: menuPos?.right }} className="fixed w-48 max-h-64 overflow-y-auto bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg z-[9999] py-1">
                                <button
                                  onClick={() => { navigate(`/salary/${emp.id}`); setOpenMenuEmpId(null) }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                  <Eye size={14} />
                                  View Day-wise Salary
                                </button>
                                {/* Show Set Salary button if salary not set, otherwise Appraisal button */}
                                {perms.edit && (!emp.salary_set ? (
                                  <button
                                    onClick={() => { openSetSalary(emp); setOpenMenuEmpId(null) }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                  >
                                    <IndianRupee size={14} />
                                    Set Salary
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => { openAppraisal(emp); setOpenMenuEmpId(null) }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                  >
                                    <TrendingUp size={14} />
                                    Appraisal
                                  </button>
                                ))}
                                {perms.create && (
                                  <button
                                    onClick={() => { openGenerate(emp); setOpenMenuEmpId(null) }}
                                    disabled={!emp.salary_set}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-30"
                                  >
                                    <FileText size={14} />
                                    Generate Slip
                                  </button>
                                )}
                                <button
                                  onClick={() => { openHistory(emp); setOpenMenuEmpId(null) }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                  <History size={14} />
                                  Salary History
                                </button>
                                {perms.create && (
                                  <button
                                    onClick={() => { openIncentive(emp); setOpenMenuEmpId(null) }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                  >
                                    <Banknote size={14} />
                                    Add Incentive
                                  </button>
                                )}
                                {perms.create && (
                                  <button
                                    onClick={() => { openCommissionForEmployee(emp); setOpenMenuEmpId(null) }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                  >
                                    <Handshake size={14} />
                                    Add Commission
                                  </button>
                                )}
                                {perms.create && (
                                  <button
                                    onClick={() => { openAdvanceForEmployee(emp); setOpenMenuEmpId(null) }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                  >
                                    <CreditCard size={14} />
                                    Add Advance
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!employees.data?.length && (
                <div className="text-center py-12 text-gray-400">
                  <Users size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No employees found</p>
                </div>
              )}
              {/* Summary and Pagination */}
              {(employees.data?.length > 0 || employees.total > 0) && (
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-[#141414]">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Showing <span className="font-semibold text-gray-900 dark:text-white">{employees.data?.length || 0}</span>
                    {employees.total > 0 && (
                      <>
                        {' '}of <span className="font-semibold text-gray-900 dark:text-white">{employees.total}</span>
                      </>
                    )}{' '}
                    employees
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={employeesPage === 1} onClick={() => setEmployeesPage(p => p - 1)}>Prev</Button>
                    <Button size="sm" variant="outline" disabled={employeesPage >= (employees.total_pages || 1)} onClick={() => setEmployeesPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Salary Slips ────────────────────────────────────────────────── */}
      {tab === 'slips' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <CustomDropdown
              value={filterMonth}
              onChange={(val) => setFilterMonth(parseInt(val))}
              options={MONTHS.map(m => ({ value: m.v, label: m.l }))}
              placeholder="Select Month"
              className="w-36"
            />
            <CustomDropdown
              value={filterYear}
              onChange={(val) => setFilterYear(parseInt(val))}
              options={YEARS.map(y => ({ value: y, label: y }))}
              placeholder="Select Year"
              className="w-28"
            />
            <button
              onClick={downloadBulkPdf}
              disabled={bulkPdfDownloading || !slips.data?.length}
              className="ml-auto flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl transition-all disabled:opacity-50"
            >
              {bulkPdfDownloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              Download All PDFs (ZIP)
            </button>
          </div>

          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            {loading.slips ? (
              <div className="flex items-center justify-center h-40 text-gray-400">
                <Loader2 size={24} className="animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#141414]">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Month</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Monthly Salary</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Days</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Earned</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Deductions</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Final</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Generated By</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slips.data?.map((slip, i) => (
                      <tr key={slip.id} className={`border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-[#141414] transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30 dark:bg-white/[0.01]'}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={slip.employee_name} size="sm" />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{slip.employee_name}</p>
                              <p className="text-xs text-gray-400">{slip.employee_role?.replace(/_/g, ' ')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {MONTHS.find(m => m.v === slip.month)?.l} {slip.year}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{fmtCurrency(slip.monthly_salary)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs text-gray-500">{slip.present_days}/{slip.working_days}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 font-medium">{fmtCurrency(slip.earned_salary)}</td>
                        <td className="px-4 py-3 text-right text-red-500">
                          {slip.deductions > 0 ? `-${fmtCurrency(slip.deductions)}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-green-600 dark:text-green-400">{fmtCurrency(slip.final_salary)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{slip.generated_by_name || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {perms.edit && (
                              <button
                                onClick={() => openEditSlip(slip)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                                title="Edit slip"
                              >
                                <Edit2 size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => downloadSlipPdf(slip)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors"
                              title="Download PDF"
                            >
                              <Download size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!slips.data?.length && (
                  <div className="text-center py-12 text-gray-400">
                    <FileText size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No slips generated for this period</p>
                    <p className="text-xs mt-1">Generate slips from the Employees tab</p>
                  </div>
                )}
                {/* Summary and Pagination */}
                {(slips.data?.length > 0 || slips.pagination?.total > 0) && (
                  <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-[#141414]">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Showing <span className="font-semibold text-gray-900 dark:text-white">{slips.data?.length || 0}</span>
                      {slips.pagination?.total > 0 && (
                        <>
                          {' '}of <span className="font-semibold text-gray-900 dark:text-white">{slips.pagination.total}</span>
                        </>
                      )}{' '}
                      slips
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={slipsPage === 1} onClick={() => setSlipsPage(p => p - 1)}>Prev</Button>
                      <Button size="sm" variant="outline" disabled={slipsPage >= (slips.pagination?.total_pages || 1)} onClick={() => setSlipsPage(p => p + 1)}>Next</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Commissions ─────────────────────────────────────────────────── */}
      {tab === 'commissions' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-56">
              <AsyncSearchSelect
                placeholder="Filter by employee..."
                value={commissionFilters.user_id}
                onChange={(val) => applyCommissionFilters({ ...commissionFilters, user_id: val })}
                onSearch={searchSalaryEmployees}
                initialOptions={salaryEmployees.slice(0, 20).map(e => ({ value: e.id, label: e.full_name }))}
              />
            </div>
            <CustomDropdown
              value={commissionFilters.paid}
              onChange={(val) => applyCommissionFilters({ ...commissionFilters, paid: val })}
              options={[{ value: '', label: 'All Status' }, { value: 'true', label: 'Paid' }, { value: 'false', label: 'Unpaid' }]}
              placeholder="Status"
              className="w-32"
            />
            <div className="w-40">
              <DatePicker placeholder="From date" value={commissionFilters.from} onChange={(v) => applyCommissionFilters({ ...commissionFilters, from: v })} />
            </div>
            <div className="w-40">
              <DatePicker placeholder="To date" value={commissionFilters.to} onChange={(v) => applyCommissionFilters({ ...commissionFilters, to: v })} />
            </div>
            {(commissionFilters.user_id || commissionFilters.paid || commissionFilters.from || commissionFilters.to) && (
              <button
                onClick={() => applyCommissionFilters({ user_id: '', paid: '', from: '', to: '' })}
                className="text-xs text-gray-500 hover:text-red-500 transition-colors"
              >
                Clear filters
              </button>
            )}
            {perms.create && (
              <button
                onClick={openAddCommission}
                className="ml-auto flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-[#0082f3] hover:bg-[#006fd4] rounded-xl transition-all shadow-sm"
              >
                <Plus size={13} />
                Add Commission
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            {commissionsLoading ? (
              <div className="flex items-center justify-center h-40 text-gray-400">
                <Loader2 size={24} className="animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#141414]">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Lead / Project</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">%</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.data?.map((c, i) => {
                      const empName = c.user_name || c.employee_name || c.user?.full_name || '—'
                      const leadName = c.lead_name || c.lead?.name
                      const projectName = c.project_name || c.project?.name
                      return (
                        <tr key={c.id} className={`border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-[#141414] transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30 dark:bg-white/[0.01]'}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={empName} size="sm" />
                              <span className="font-medium text-gray-900 dark:text-white text-sm">{empName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-gray-700 dark:text-gray-300">{projectName || '—'}</p>
                            {leadName && <p className="text-xs text-gray-400">{leadName}</p>}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">{fmtCurrency(c.commission_amount)}</td>
                          <td className="px-4 py-3 text-right text-gray-500">{c.commission_percentage != null ? `${c.commission_percentage}%` : '—'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${c.paid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                              {c.paid ? 'Paid' : 'Unpaid'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(c.created_at)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              {perms.edit && (
                                <button
                                  onClick={() => toggleCommissionPaid(c)}
                                  title={c.paid ? 'Mark as unpaid' : 'Mark as paid'}
                                  className={`p-1.5 rounded-lg transition-colors ${c.paid ? 'hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600' : 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600'}`}
                                >
                                  <CheckCircle size={14} />
                                </button>
                              )}
                              {perms.delete && (
                                <button
                                  onClick={() => deleteCommission(c.id)}
                                  title="Delete commission"
                                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {!commissions.data?.length && (
                  <div className="text-center py-12 text-gray-400">
                    <Handshake size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No commissions found</p>
                  </div>
                )}
                {(commissions.data?.length > 0 || commissions.pagination?.total > 0) && (
                  <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-[#141414]">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Showing <span className="font-semibold text-gray-900 dark:text-white">{commissions.data?.length || 0}</span>
                      {commissions.pagination?.total > 0 && (
                        <> of <span className="font-semibold text-gray-900 dark:text-white">{commissions.pagination.total}</span></>
                      )}{' '}
                      commissions
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={commissionsPage === 1} onClick={() => goToCommissionsPage(commissionsPage - 1)}>Prev</Button>
                      <Button size="sm" variant="outline" disabled={commissionsPage >= (commissions.pagination?.total_pages || 1)} onClick={() => goToCommissionsPage(commissionsPage + 1)}>Next</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Advances ─────────────────────────────────────────────────────── */}
      {tab === 'advances' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-56">
              <AsyncSearchSelect
                placeholder="Filter by employee..."
                value={advanceFilters.user_id}
                onChange={(val) => applyAdvanceFilters({ ...advanceFilters, user_id: val })}
                onSearch={searchSalaryEmployees}
                initialOptions={salaryEmployees.slice(0, 20).map(e => ({ value: e.id, label: e.full_name }))}
              />
            </div>
            <div className="w-40">
              <DatePicker placeholder="From date" value={advanceFilters.from} onChange={(v) => applyAdvanceFilters({ ...advanceFilters, from: v })} />
            </div>
            <div className="w-40">
              <DatePicker placeholder="To date" value={advanceFilters.to} onChange={(v) => applyAdvanceFilters({ ...advanceFilters, to: v })} />
            </div>
            {(advanceFilters.user_id || advanceFilters.from || advanceFilters.to) && (
              <button
                onClick={() => applyAdvanceFilters({ user_id: '', from: '', to: '' })}
                className="text-xs text-gray-500 hover:text-red-500 transition-colors"
              >
                Clear filters
              </button>
            )}
            {perms.create && (
              <button
                onClick={openAddAdvance}
                className="ml-auto flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-[#0082f3] hover:bg-[#006fd4] rounded-xl transition-all shadow-sm"
              >
                <Plus size={13} />
                Add Advance
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            {advancesLoading ? (
              <div className="flex items-center justify-center h-40 text-gray-400">
                <Loader2 size={24} className="animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#141414]">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Reference</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {advances.data?.map((a, i) => {
                      const empName = a.user_name || a.employee_name || a.user?.full_name || '—'
                      return (
                        <tr key={a.id} className={`border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-[#141414] transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30 dark:bg-white/[0.01]'}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={empName} size="sm" />
                              <span className="font-medium text-gray-900 dark:text-white text-sm">{empName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(a.advance_date)}</td>
                          <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">{fmtCurrency(a.amount)}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">
                            {a.transaction_reference || '—'}
                            {a.payment_proof_url && (
                              <a href={resolveFileUrl(a.payment_proof_url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center ml-1.5 text-[#0082f3] hover:underline">
                                <Link2 size={11} />
                              </a>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">{a.notes || '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              {perms.delete && (
                                <button
                                  onClick={() => deleteAdvance(a.id)}
                                  title="Delete advance"
                                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {!advances.data?.length && (
                  <div className="text-center py-12 text-gray-400">
                    <CreditCard size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No advances found</p>
                  </div>
                )}
                {(advances.data?.length > 0 || advances.pagination?.total > 0) && (
                  <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-[#141414]">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Showing <span className="font-semibold text-gray-900 dark:text-white">{advances.data?.length || 0}</span>
                      {advances.pagination?.total > 0 && (
                        <> of <span className="font-semibold text-gray-900 dark:text-white">{advances.pagination.total}</span></>
                      )}{' '}
                      advances
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={advancesPage === 1} onClick={() => goToAdvancesPage(advancesPage - 1)}>Prev</Button>
                      <Button size="sm" variant="outline" disabled={advancesPage >= (advances.pagination?.total_pages || 1)} onClick={() => goToAdvancesPage(advancesPage + 1)}>Next</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: Set Salary ──────────────────────────────────────────────── */}
      <Modal isOpen={setSalaryModal} onClose={() => setSetSalaryModal(false)} title={`Set Salary — ${setSalaryTarget?.full_name}`} size="sm">
        <div className="space-y-4">

          {/* Employee info */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <Avatar name={setSalaryTarget?.full_name} size="sm" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{setSalaryTarget?.full_name}</p>
              <p className="text-xs text-gray-500">{setSalaryTarget?.role?.replace(/_/g, ' ')}</p>
            </div>
          </div>

          {/* Working days — controls conversion ratio */}
          <div>
            <label className={labelCls}>
              Working Days / Month
              <span className="text-gray-400 font-normal ml-1">(used for monthly ↔ per day conversion)</span>
            </label>
            <input
              type="number" min="1" max="31"
              value={setSalaryForm.working_days_in_month}
              onChange={e => {
                const wd = parseInt(e.target.value) || 26
                setSalaryFormData(f => {
                  const m = parseFloat(f.monthly_salary)
                  const p = parseFloat(f.per_day_salary)
                  if (!isNaN(m) && m > 0)
                    return { ...f, working_days_in_month: e.target.value, per_day_salary: (m / wd).toFixed(2) }
                  if (!isNaN(p) && p > 0)
                    return { ...f, working_days_in_month: e.target.value, monthly_salary: (p * wd).toFixed(2) }
                  return { ...f, working_days_in_month: e.target.value }
                })
              }}
              placeholder="26"
              className={inputCls}
            />
          </div>

          {/* Monthly salary */}
          <div>
            <label className={labelCls}>Monthly Salary (₹)</label>
            <div className="relative">
              <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="number" min="0" step="500"
                value={setSalaryForm.monthly_salary}
                onChange={e => {
                  const val = e.target.value
                  const wd  = parseInt(setSalaryForm.working_days_in_month) || 26
                  setSalaryFormData(f => ({
                    ...f,
                    monthly_salary: val,
                    per_day_salary: val && !isNaN(parseFloat(val))
                      ? (parseFloat(val) / wd).toFixed(2) : '',
                  }))
                }}
                placeholder="35000"
                className={inputCls + ' pl-9'}
              />
            </div>
          </div>

          {/* Per day salary — auto-calculated but editable */}
          <div>
            <label className={labelCls}>
              Per Day Salary (₹)
              <span className="text-gray-400 font-normal ml-1">— auto-calculated or enter directly</span>
            </label>
            <div className="relative">
              <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="number" min="0" step="10"
                value={setSalaryForm.per_day_salary}
                onChange={e => {
                  const val = e.target.value
                  const wd  = parseInt(setSalaryForm.working_days_in_month) || 26
                  setSalaryFormData(f => ({
                    ...f,
                    per_day_salary: val,
                    monthly_salary: val && !isNaN(parseFloat(val))
                      ? (parseFloat(val) * wd).toFixed(2) : '',
                  }))
                }}
                placeholder="Auto-calculated"
                className={inputCls + ' pl-9'}
              />
            </div>
          </div>

          {/* Live preview */}
          {(setSalaryForm.monthly_salary || setSalaryForm.per_day_salary) && (
            <div className="bg-gray-50 dark:bg-[#141414] rounded-xl p-3 border border-gray-100 dark:border-gray-800 space-y-1.5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Preview</p>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Monthly</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {setSalaryForm.monthly_salary ? fmtCurrency(parseFloat(setSalaryForm.monthly_salary)) : '—'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Per Day</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {setSalaryForm.per_day_salary ? fmtCurrency(parseFloat(setSalaryForm.per_day_salary)) : '—'}
                </span>
              </div>
              <div className="flex justify-between text-xs border-t border-gray-200 dark:border-gray-700 pt-1.5">
                <span className="text-gray-500">Working days / month</span>
                <span className="font-medium text-gray-600 dark:text-gray-300">{setSalaryForm.working_days_in_month || 26} days</span>
              </div>
            </div>
          )}

          {/* Effective from */}
          <DatePicker
            label="Effective From"
            value={setSalaryForm.effective_from}
            onChange={(v) => setSalaryFormData(f => ({ ...f, effective_from: v }))}
          />

          {/* Notes */}
          <div>
            <label className={labelCls}>Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="text"
              value={setSalaryForm.notes}
              onChange={e => setSalaryFormData(f => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. Revised after appraisal"
              className={inputCls}
            />
          </div>

        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={() => setSetSalaryModal(false)}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSetSalary}
            disabled={loading.action || (!setSalaryForm.monthly_salary && !setSalaryForm.per_day_salary)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0082f3] hover:bg-[#006fd4] rounded-xl transition-all disabled:opacity-50"
          >
            {loading.action ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            Save Salary
          </button>
        </div>
      </Modal>

      {/* ── MODAL: Edit Slip ─────────────────────────────────────────────── */}
      <Modal isOpen={editSlipModal} onClose={() => setEditSlipModal(false)} title={`Edit Slip — ${editSlipTarget?.employee_name || ''}`} size="sm">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#141414] rounded-xl">
            <Avatar name={editSlipTarget?.employee_name} size="sm" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{editSlipTarget?.employee_name}</p>
              <p className="text-xs text-gray-500">
                {MONTHS.find(m => m.v === editSlipTarget?.month)?.l} {editSlipTarget?.year}
              </p>
            </div>
          </div>

          <div>
            <label className={labelCls}>Basic Salary (₹)</label>
            <div className="relative">
              <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="number" min="0" value={editSlipForm.basic_salary} onChange={e => setEditSlipForm(f => ({ ...f, basic_salary: e.target.value }))} placeholder="30000" className={inputCls + ' pl-9'} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Notes</label>
            <input type="text" value={editSlipForm.notes} onChange={e => setEditSlipForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Corrected after payroll review" className={inputCls} />
          </div>

          {editSlipError && <p className="text-xs text-red-500">{editSlipError}</p>}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={() => setEditSlipModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Cancel</button>
          <button
            onClick={handleEditSlip}
            disabled={editSlipSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0082f3] hover:bg-[#006fd4] rounded-xl transition-all disabled:opacity-50"
          >
            {editSlipSaving ? <Loader2 size={14} className="animate-spin" /> : <Edit2 size={14} />}
            Save Changes
          </button>
        </div>
      </Modal>

      {/* ── MODAL: Generate Single Slip ───────────────────────────────────── */}
      <Modal isOpen={genModal} onClose={() => setGenModal(false)} title={`Generate Slip — ${genTarget?.full_name}`} size="sm">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
            <Avatar name={genTarget?.full_name} size="sm" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{genTarget?.full_name}</p>
              <p className="text-xs text-gray-500">Monthly: {fmtCurrency(genTarget?.monthly_salary)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Month *</label>
              <CustomDropdown
                value={genForm.month}
                onChange={(val) => setGenForm(f => ({ ...f, month: parseInt(val) }))}
                options={MONTHS.map(m => ({ value: m.v, label: m.l }))}
                placeholder="Select Month"
              />
            </div>
            <div>
              <label className={labelCls}>Year *</label>
              <CustomDropdown
                value={genForm.year}
                onChange={(val) => setGenForm(f => ({ ...f, year: parseInt(val) }))}
                options={YEARS.map(y => ({ value: y, label: y }))}
                placeholder="Select Year"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Basic Salary (₹)</label>
            <div className="relative">
              <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="number" min="0" value={genForm.basic_salary} onChange={e => setGenForm(f => ({ ...f, basic_salary: e.target.value }))} placeholder="30000" className={inputCls + ' pl-9'} />
            </div>
          </div>

          <DatePicker label="Pay Date" value={genForm.pay_date} onChange={(v) => setGenForm(f => ({ ...f, pay_date: v }))} />

          <div>
            <label className={labelCls}>Notes</label>
            <input type="text" value={genForm.notes} onChange={e => setGenForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" className={inputCls} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={() => setGenModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Cancel</button>
          <button
            onClick={handleGenerate}
            disabled={loading.action}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-xl transition-all disabled:opacity-50"
          >
            {loading.action ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            Generate
          </button>
        </div>
      </Modal>

      {/* ── MODAL: Generate All ───────────────────────────────────────────── */}
      <Modal isOpen={genAllModal} onClose={() => setGenAllModal(false)} title="Generate All Salary Slips" size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Generate salary slips for <strong className="text-gray-900 dark:text-white">all employees</strong> who have a salary set. Existing slips for the chosen month will be overwritten.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Month *</label>
              <CustomDropdown
                value={genAllForm.month}
                onChange={(val) => setGenAllForm(f => ({ ...f, month: parseInt(val) }))}
                options={MONTHS.map(m => ({ value: m.v, label: m.l }))}
                placeholder="Select Month"
              />
            </div>
            <div>
              <label className={labelCls}>Year *</label>
              <CustomDropdown
                value={genAllForm.year}
                onChange={(val) => setGenAllForm(f => ({ ...f, year: parseInt(val) }))}
                options={YEARS.map(y => ({ value: y, label: y }))}
                placeholder="Select Year"
              />
            </div>
          </div>

          <DatePicker label="Pay Date" value={genAllForm.pay_date} onChange={(v) => setGenAllForm(f => ({ ...f, pay_date: v }))} />

          <div>
            <label className={labelCls}>Notes</label>
            <input type="text" value={genAllForm.notes} onChange={e => setGenAllForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" className={inputCls} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={() => setGenAllModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 transition-colors">Cancel</button>
          <button
            onClick={handleGenerateAll}
            disabled={loading.action}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0082f3] hover:bg-[#006fd4] rounded-xl transition-all disabled:opacity-50"
          >
            {loading.action ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            Generate All
          </button>
        </div>
      </Modal>

      {/* ── MODAL: Salary History ─────────────────────────────────────────── */}
      <Modal isOpen={histModal} onClose={() => setHistModal(false)} title="Salary History" size="sm">
        {loading.history ? (
          <div className="flex items-center justify-center h-24 text-gray-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : history ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#141414] rounded-xl">
              <Avatar name={history.employee?.full_name} size="sm" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{history.employee?.full_name}</p>
                <p className="text-xs text-gray-500">{history.employee?.role?.replace(/_/g, ' ')}</p>
              </div>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {history.history?.map((h, i) => (
                <div key={h.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{fmtCurrency(h.monthly_salary)}</p>
                    <p className="text-xs text-gray-500">Effective: {new Date(h.effective_from).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    {h.notes && <p className="text-xs text-gray-400 italic">{h.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Set by</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">{h.set_by_name || '—'}</p>
                    {i === 0 && <span className="text-[10px] text-green-600 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded-full font-medium">Current</span>}
                  </div>
                </div>
              ))}
              {!history.history?.length && <p className="text-sm text-gray-400 text-center py-4">No history yet</p>}
            </div>
          </div>
        ) : null}
        <div className="flex justify-end mt-4">
          <button onClick={() => setHistModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Close</button>
        </div>
      </Modal>
      
      {/* ── MODAL: Appraisal ──────────────────────────────────────────────── */}
      <Modal isOpen={appraisalModal} onClose={() => setAppraisalModal(false)} title={`Appraisal — ${appraisalTarget?.full_name}`} size="sm">
        <div className="space-y-4">
          {/* Employee info */}
          {appraisalTarget && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
              <Avatar name={appraisalTarget.full_name} size="sm" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{appraisalTarget.full_name}</p>
                <p className="text-xs text-gray-500">
                  Current: {appraisalTarget.monthly_salary ? fmtCurrency(appraisalTarget.monthly_salary) : 'Not Set'}
                </p>
              </div>
            </div>
          )}
          
          {/* New salary */}
          <div>
            <label className={labelCls}>New Monthly Salary (₹)</label>
            <div className="relative">
              <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="number" min="0" step="500"
                value={appraisalForm.new_salary}
                onChange={(e) => setAppraisalForm({ ...appraisalForm, new_salary: e.target.value })}
                placeholder="Enter new salary"
                className={inputCls + ' pl-9'}
              />
            </div>
          </div>
          
          {/* Effective from */}
          <DatePicker
            label="Effective From"
            value={appraisalForm.effective_from}
            onChange={(v) => setAppraisalForm({ ...appraisalForm, effective_from: v })}
          />
          
          {/* Notes */}
          <div>
            <label className={labelCls}>Notes (Optional)</label>
            <input
              type="text"
              value={appraisalForm.notes}
              onChange={(e) => setAppraisalForm({ ...appraisalForm, notes: e.target.value })}
              placeholder="Reason for appraisal"
              className={inputCls}
            />
          </div>
          
          {/* Live difference calculation */}
          {appraisalForm.new_salary && appraisalTarget?.monthly_salary && (
            <div className="p-3 bg-gray-50 dark:bg-[#141414] rounded-xl">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Difference</span>
                <span className={`font-bold ${parseFloat(appraisalForm.new_salary) > parseFloat(appraisalTarget.monthly_salary) ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                  {parseFloat(appraisalForm.new_salary) > parseFloat(appraisalTarget.monthly_salary) ? '+' : ''}
                  {fmtCurrency(parseFloat(appraisalForm.new_salary) - parseFloat(appraisalTarget.monthly_salary))}
                </span>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() => setAppraisalModal(false)}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAppraisal}
            disabled={loading.action || !appraisalForm.new_salary}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-all disabled:opacity-50"
          >
            {loading.action ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
            Save Appraisal
          </button>
        </div>
      </Modal>
      
      {/* ── MODAL: Add Incentive ──────────────────────────────────────────── */}
      <Modal isOpen={incentiveModal} onClose={() => setIncentiveModal(false)} title="Add Incentive" size="sm">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
            {incentiveTarget && <Avatar name={incentiveTarget.full_name} size="sm" />}
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{incentiveTarget?.full_name}</p>
              <p className="text-xs text-gray-500">
                {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Amount (₹)</label>
            <div className="relative">
              <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="number" min="0" step="100"
                value={incentiveForm.amount}
                onChange={(e) => setIncentiveForm({ ...incentiveForm, amount: e.target.value })}
                placeholder="Enter amount"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#141414] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Reason</label>
            <textarea
              value={incentiveForm.reason}
              onChange={(e) => setIncentiveForm({ ...incentiveForm, reason: e.target.value })}
              placeholder="e.g., Closed 5 deals — exceeded target"
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#141414] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm resize-none"
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() => setIncentiveModal(false)}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAddIncentive}
            disabled={!incentiveForm.amount || !incentiveForm.reason}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-xl transition-all disabled:opacity-50"
          >
            <Banknote size={14} />
            Add
          </button>
        </div>
      </Modal>

      {/* ── MODAL: Generated Result ───────────────────────────────────────── */}
      <Modal isOpen={resultModal} onClose={() => { setResultModal(false); dispatch(clearSuccess()); dispatch(fetchSalarySlips({ month: filterMonth, year: filterYear, per_page: 100 })) }} title="Slips Generated" size="md">
        {lastGenerated && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{lastGenerated.total_processed}</p>
                <p className="text-xs text-gray-500 mt-1">Processed</p>
              </div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                <p className="text-2xl font-bold text-red-500">{lastGenerated.total_failed}</p>
                <p className="text-xs text-gray-500 mt-1">Failed</p>
              </div>
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{lastGenerated.working_days}</p>
                <p className="text-xs text-gray-500 mt-1">Working Days</p>
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1.5">
              {lastGenerated.slips?.map(s => (
                <div key={s.user_id} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-[#141414]">
                  <div className="flex items-center gap-2">
                    <Avatar name={s.full_name} size="sm" />
                    <span className="text-sm text-gray-800 dark:text-gray-200">{s.full_name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{s.present_days} days present</p>
                    <p className="text-sm font-bold text-green-600 dark:text-green-400">{fmtCurrency(s.final_salary)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-end mt-4">
          <button
            onClick={() => { setResultModal(false); dispatch(clearSuccess()); dispatch(fetchSalarySlips({ month: filterMonth, year: filterYear, per_page: 100 })) }}
            className="px-4 py-2 text-sm font-medium text-white bg-[#0082f3] hover:bg-[#006fd4] rounded-xl transition-all"
          >
            Done
          </button>
        </div>
      </Modal>

      {/* ── MODAL: Add Commission ─────────────────────────────────────────── */}
      <Modal isOpen={addCommissionModal} onClose={() => setAddCommissionModal(false)} title="Add Commission" size="sm">
        <div className="space-y-4">
          <AsyncSearchSelect
            label="Team Member" required
            value={commissionForm.user_id}
            onChange={(val) => setCommissionForm(f => ({ ...f, user_id: val }))}
            onSearch={searchSalaryEmployees}
            initialOptions={salaryEmployees.slice(0, 20).map(e => ({ value: e.id, label: e.full_name }))}
            placeholder="Type to search employees..."
          />

          <AsyncSearchSelect
            label="Lead"
            value={commissionForm.lead_id}
            onChange={(val) => setCommissionForm(f => ({ ...f, lead_id: val }))}
            onSearch={searchLeads}
            placeholder="Type to search leads (optional)..."
          />

          <AsyncSearchSelect
            label="Project"
            value={commissionForm.project_id}
            onChange={(val) => setCommissionForm(f => ({ ...f, project_id: val, project_name: '' }))}
            onTextChange={(text) => setCommissionForm(f => ({ ...f, project_name: text, project_id: '' }))}
            onSearch={searchProjects}
            placeholder="Type to search projects (optional)..."
            fallbackToInput
            defaultText={commissionForm.project_id ? '' : commissionForm.project_name}
          />

          <div>
            <label className={labelCls}>Commission Amount (₹) *</label>
            <div className="relative">
              <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="number" min="0" step="100"
                value={commissionForm.commission_amount}
                onChange={(e) => setCommissionForm(f => ({ ...f, commission_amount: e.target.value }))}
                placeholder="25000"
                className={inputCls + ' pl-9'}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Commission Percentage <span className="text-gray-400 font-normal">(optional)</span></label>
            <div className="relative">
              <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="number" min="0" max="100" step="0.1"
                value={commissionForm.commission_percentage}
                onChange={(e) => setCommissionForm(f => ({ ...f, commission_percentage: e.target.value }))}
                placeholder="2.5"
                className={inputCls + ' pl-9'}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              value={commissionForm.notes}
              onChange={(e) => setCommissionForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. Referral commission for closed deal"
              rows={3}
              className={inputCls + ' resize-none'}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={() => setAddCommissionModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Cancel</button>
          <button
            onClick={handleAddCommission}
            disabled={commissionSaving || !commissionForm.user_id || !commissionForm.commission_amount}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0082f3] hover:bg-[#006fd4] rounded-xl transition-all disabled:opacity-50"
          >
            {commissionSaving ? <Loader2 size={14} className="animate-spin" /> : <Handshake size={14} />}
            Add Commission
          </button>
        </div>
      </Modal>

      {/* ── MODAL: Add Advance ────────────────────────────────────────────── */}
      <Modal isOpen={addAdvanceModal} onClose={() => setAddAdvanceModal(false)} title="Add Advance" size="sm">
        <div className="space-y-4">
          <AsyncSearchSelect
            label="Team Member" required
            value={advanceForm.user_id}
            onChange={(val) => setAdvanceForm(f => ({ ...f, user_id: val }))}
            onSearch={searchSalaryEmployees}
            initialOptions={salaryEmployees.slice(0, 20).map(e => ({ value: e.id, label: e.full_name }))}
            placeholder="Type to search employees..."
          />

          <DatePicker
            label="Advance Date" required
            value={advanceForm.advance_date}
            onChange={(v) => setAdvanceForm(f => ({ ...f, advance_date: v }))}
          />

          <div>
            <label className={labelCls}>Amount (₹) *</label>
            <div className="relative">
              <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="number" min="0" step="100"
                value={advanceForm.amount}
                onChange={(e) => setAdvanceForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="10000"
                className={inputCls + ' pl-9'}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Transaction Reference <span className="text-gray-400 font-normal">(optional)</span></label>
            <div className="relative">
              <CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={advanceForm.transaction_reference}
                onChange={(e) => setAdvanceForm(f => ({ ...f, transaction_reference: e.target.value }))}
                placeholder="TXN123456789"
                className={inputCls + ' pl-9'}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Payment Proof *</label>
            {advanceForm.payment_proof_url ? (
              <div className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-gray-700">
                <a
                  href={resolveFileUrl(advanceForm.payment_proof_url)}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 flex-1 min-w-0 text-xs text-gray-700 dark:text-gray-300"
                >
                  <Link2 size={14} className="text-[#0082f3] flex-shrink-0" />
                  <span className="truncate">Payment proof uploaded</span>
                </a>
                <button
                  type="button"
                  onClick={() => setAdvanceForm(f => ({ ...f, payment_proof_url: '' }))}
                  className="p-1 rounded-lg text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                  title="Remove"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Upload size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  disabled={advanceProofUploading}
                  onChange={(e) => handleUploadAdvanceProof(e.target.files?.[0])}
                  className={inputCls + ' pl-9 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:bg-blue-50 file:text-[#0082f3] file:text-xs disabled:opacity-50'}
                />
                {advanceProofUploading && <Loader2 size={14} className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />}
              </div>
            )}
            {advanceProofError && <p className="text-xs text-red-500 mt-1">{advanceProofError}</p>}
          </div>

          <div>
            <label className={labelCls}>Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              value={advanceForm.notes}
              onChange={(e) => setAdvanceForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. Emergency advance"
              rows={3}
              className={inputCls + ' resize-none'}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={() => setAddAdvanceModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Cancel</button>
          <button
            onClick={handleAddAdvance}
            disabled={advanceSaving || advanceProofUploading || !advanceForm.user_id || !advanceForm.advance_date || !advanceForm.amount || !advanceForm.payment_proof_url}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0082f3] hover:bg-[#006fd4] rounded-xl transition-all disabled:opacity-50"
          >
            {advanceSaving ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
            Add Advance
          </button>
        </div>
      </Modal>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        loading={exporting}
        title="Export Salary"
      />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// EMPLOYEE VIEW
// ══════════════════════════════════════════════════════════════════════════════

function EmployeeSalaryView({ user }) {
  const dispatch = useDispatch()
  const { mySalary, loading, error } = useSelector(s => s.salary)

  const [tab,         setTab]         = useState('slips')   // 'slips' | 'history' | 'incentives' | 'commissions'
  const [filterMonth, setFilterMonth] = useState('')
  const [filterYear,  setFilterYear]  = useState(thisYear)
  const [expanded,    setExpanded]    = useState(null)

  // Selected month/year for history/incentives tabs
  const [dwMonth, setDwMonth] = useState(thisMonth)
  const [dwYear,  setDwYear]  = useState(thisYear)

  // For history and incentives
  const [salaryHistory, setSalaryHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [incentives, setIncentives] = useState([])
  const [incentivesLoading, setIncentivesLoading] = useState(false)

  // My commissions
  const [myCommissions, setMyCommissions] = useState([])
  const [myCommissionsLoading, setMyCommissionsLoading] = useState(false)
  const [myCommissionFilters, setMyCommissionFilters] = useState({ paid: '', from: '', to: '' })
  const [myCommissionsPagination, setMyCommissionsPagination] = useState({ page: 1, per_page: 10, total: 0, total_pages: 1 })

  // My advances
  const [myAdvances, setMyAdvances] = useState([])
  const [myAdvancesLoading, setMyAdvancesLoading] = useState(false)
  const [myAdvanceFilters, setMyAdvanceFilters] = useState({ from: '', to: '' })
  const [myAdvancesPagination, setMyAdvancesPagination] = useState({ page: 1, per_page: 10, total: 0, total_pages: 1 })

  const [downloadingSlipId, setDownloadingSlipId] = useState(null)
  const downloadMySlipPdf = async (slip) => {
    setDownloadingSlipId(slip.id)
    try {
      const res = await api.get(`/salary/slips/${slip.id}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url; a.download = `Salary_Slip_${(slip.month_label || `${slip.month}_${slip.year}`).replace(/\s+/g, '_')}.pdf`
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download slip PDF:', err)
    } finally {
      setDownloadingSlipId(null)
    }
  }

  useEffect(() => {
    dispatch(fetchMySalary({ year: filterYear }))
  }, [dispatch, filterYear])

  const slips       = mySalary?.salary_slips || []
  const totalEarned = slips.reduce((s, slip) => s + (slip.final_salary || 0), 0)
  const filtered    = filterMonth ? slips.filter(s => s.month === parseInt(filterMonth)) : slips

  const fetchMySalaryHistory = async () => {
    setHistoryLoading(true)
    try {
      const res = await api.get('/salary/my-salary-history', {
        params: { month: dwMonth, year: dwYear }
      })
      setSalaryHistory(res.data?.data?.history || [])
    } catch (err) {
      console.error('Failed to fetch salary history:', err)
      setSalaryHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const [incentiveSummary, setIncentiveSummary] = useState({ total_incentive_amount: 0, total_count: 0 })
  const fetchMyIncentives = async () => {
    setIncentivesLoading(true)
    try {
      const res = await api.get('/salary/my-incentives', {
        params: { month: dwMonth, year: dwYear }
      })
      setIncentives(res.data?.data?.incentives || [])
      setIncentiveSummary({
        total_incentive_amount: res.data?.data?.total_incentive_amount || 0,
        total_count: res.data?.data?.total_count || 0,
      })
    } catch (err) {
      console.error('Failed to fetch my incentives:', err)
      setIncentives([])
      setIncentiveSummary({ total_incentive_amount: 0, total_count: 0 })
    } finally {
      setIncentivesLoading(false)
    }
  }

  // ── Fetch my commissions ─────────────────────────────────────────────────
  const fetchMyCommissions = async (page = 1, filters = myCommissionFilters) => {
    setMyCommissionsLoading(true)
    try {
      const params = { page, per_page: myCommissionsPagination.per_page }
      if (filters.paid !== '') params.paid = filters.paid === 'true'
      if (filters.from) params.from = filters.from
      if (filters.to) params.to = filters.to
      const res = await api.get('/salary/my-commissions', { params })
      const payload = res.data?.data ?? res.data
      const list = payload?.data || (Array.isArray(payload) ? payload : [])
      setMyCommissions(list)
      const pag = payload?.pagination || res.data?.pagination || {}
      setMyCommissionsPagination(p => ({
        page: pag.page || page,
        per_page: pag.per_page || p.per_page,
        total: pag.total ?? list.length,
        total_pages: pag.total_pages || 1,
      }))
    } catch (err) {
      console.error('Failed to fetch my commissions:', err)
      setMyCommissions([])
    } finally {
      setMyCommissionsLoading(false)
    }
  }

  const applyMyCommissionFilters = (next) => {
    setMyCommissionFilters(next)
    fetchMyCommissions(1, next)
  }

  // ── Fetch my advances ────────────────────────────────────────────────────
  const fetchMyAdvances = async (page = 1, filters = myAdvanceFilters) => {
    setMyAdvancesLoading(true)
    try {
      const params = { page, per_page: myAdvancesPagination.per_page }
      if (filters.from) params.from = filters.from
      if (filters.to) params.to = filters.to
      const res = await api.get('/salary/my-advances', { params })
      const payload = res.data?.data ?? res.data
      const list = payload?.data || (Array.isArray(payload) ? payload : [])
      setMyAdvances(list)
      const pag = payload?.pagination || res.data?.pagination || {}
      setMyAdvancesPagination(p => ({
        page: pag.page || page,
        per_page: pag.per_page || p.per_page,
        total: pag.total ?? list.length,
        total_pages: pag.total_pages || 1,
      }))
    } catch (err) {
      console.error('Failed to fetch my advances:', err)
      setMyAdvances([])
    } finally {
      setMyAdvancesLoading(false)
    }
  }

  const applyMyAdvanceFilters = (next) => {
    setMyAdvanceFilters(next)
    fetchMyAdvances(1, next)
  }

  // Fetch history or incentives when tab changes
  useEffect(() => {
    if (tab === 'history') fetchMySalaryHistory()
    if (tab === 'incentives') fetchMyIncentives()
    if (tab === 'commissions') fetchMyCommissions(1, myCommissionFilters)
    if (tab === 'advances') fetchMyAdvances(1, myAdvanceFilters)
  }, [tab])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Salary</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Your salary, daily earnings and payment history</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Current salary card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2 bg-gradient-to-br from-[#0082f3] to-[#006fd4] rounded-2xl p-5 text-white shadow-lg shadow-blue-500/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-100 text-xs font-medium uppercase tracking-wider">Monthly Salary</p>
              <p className="text-3xl font-bold mt-1">
                {loading.mySalary ? '—' : mySalary?.current_monthly_salary ? fmtCurrency(mySalary.current_monthly_salary.amount) : 'Not Set'}
              </p>
              {mySalary?.current_monthly_salary?.effective_from && (
                <p className="text-blue-200 text-xs mt-0.5">
                  Effective from {new Date(mySalary.current_monthly_salary.effective_from).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Wallet size={22} />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-blue-100 text-xs">Total earned {filterYear} (slips generated)</p>
            <p className="text-xl font-bold">{fmtCurrency(totalEarned)}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <StatCard icon={FileText} label="Total Slips"   value={slips.length}              sub={`Year ${filterYear}`} color="brand" />
          <StatCard icon={Calendar} label="Latest Month"  value={slips[0] ? slips[0].month_label : '—'} color="green" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-[#141414] p-1 rounded-xl w-fit">
        {[
          { v: 'slips',       l: 'Salary Slips' },
          { v: 'history',     l: 'Salary History' },
          { v: 'incentives',  l: 'Incentives' },
          { v: 'commissions', l: 'My Commissions' },
          { v: 'advances',    l: 'My Advances' },
        ].map(t => (
          <button key={t.v} onClick={() => setTab(t.v)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${tab === t.v ? 'bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ── TAB: Salary Slips ──────────────────────────────────────────────────── */}
      {tab === 'slips' && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <CustomDropdown
              value={filterYear}
              onChange={(val) => setFilterYear(parseInt(val))}
              options={YEARS.map(y => ({ value: y, label: y }))}
              placeholder="Select Year"
              className="w-28"
            />
            <CustomDropdown
              value={filterMonth}
              onChange={setFilterMonth}
              options={[
                { value: '', label: 'All Months' },
                ...MONTHS.map(m => ({ value: m.v, label: m.l }))
              ]}
              placeholder="Select Month"
              className="w-36"
            />
            <button onClick={() => dispatch(fetchMySalary({ year: filterYear }))}
              className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all">
              <RefreshCw size={14} className={loading.mySalary ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading.mySalary ? (
              <div className="flex items-center justify-center h-32 text-gray-400">
                <Loader2 size={24} className="animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800">
                <FileText size={36} className="mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                <p className="text-sm text-gray-500">No salary slips found</p>
                <p className="text-xs text-gray-400 mt-1">Your admin hasn't generated a slip for this period yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(slip => (
                  <div key={slip.id} className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-[#141414] transition-colors text-left"
                      onClick={() => setExpanded(expanded === slip.id ? null : slip.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                          <FileText size={18} className="text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{slip.month_label}</p>
                          <p className="text-xs text-gray-500">{slip.present_days} / {slip.working_days} working days</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Final Salary</p>
                          <p className="text-base font-bold text-green-600 dark:text-green-400">{fmtCurrency(slip.final_salary)}</p>
                        </div>
                        <ChevronDown size={16} className={`text-gray-400 transition-transform ${expanded === slip.id ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {expanded === slip.id && (
                      <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                          {[
                            { label: 'Monthly Salary', value: fmtCurrency(slip.monthly_salary), sub: 'Base' },
                            { label: 'Days Present',    value: `${slip.present_days}`,            sub: `Absent: ${slip.absent_days}` },
                            { label: 'Earned Salary',   value: fmtCurrency(slip.earned_salary),  sub: 'Before deductions' },
                          ].map(item => (
                            <div key={item.label} className="p-3 bg-gray-50 dark:bg-[#141414] rounded-xl">
                              <p className="text-xs text-gray-500">{item.label}</p>
                              <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{item.value}</p>
                              <p className="text-[11px] text-gray-400">{item.sub}</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-xl border border-green-100 dark:border-green-900/30">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Earned Salary</span>
                            <span className="font-medium text-gray-900 dark:text-white">{fmtCurrency(slip.earned_salary)}</span>
                          </div>
                          {slip.deductions > 0 && (
                            <div className="flex items-center justify-between text-sm mt-1">
                              <span className="text-red-500">Deductions</span>
                              <span className="font-medium text-red-500">- {fmtCurrency(slip.deductions)}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-green-200 dark:border-green-800/50">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">Final Salary</span>
                            <span className="text-lg font-bold text-green-600 dark:text-green-400">{fmtCurrency(slip.final_salary)}</span>
                          </div>
                        </div>
                        {slip.notes && <p className="text-xs text-gray-400 mt-2 italic">{slip.notes}</p>}
                        <button
                          onClick={() => downloadMySlipPdf(slip)}
                          disabled={downloadingSlipId === slip.id}
                          className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 border border-green-300 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl transition-colors disabled:opacity-50"
                        >
                          {downloadingSlipId === slip.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                          Download PDF
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── TAB: Salary History ──────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Salary History</h2>
            <CustomDropdown
              value={dwMonth}
              onChange={(val) => { setDwMonth(val); fetchMySalaryHistory(); }}
              options={MONTHS.map(m => ({ value: m.v, label: m.l }))}
              placeholder="Select Month"
              className="w-32"
            />
            <CustomDropdown
              value={dwYear}
              onChange={(val) => { setDwYear(parseInt(val)); fetchMySalaryHistory(); }}
              options={YEARS.map(y => ({ value: y, label: y }))}
              placeholder="Select Year"
              className="w-24"
            />
            <button onClick={() => fetchMySalaryHistory()} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
              <RefreshCw size={12} className={historyLoading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {historyLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-[#0082f3]" />
              </div>
            ) : salaryHistory.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800">
                <History size={32} className="mx-auto mb-3 opacity-40 text-gray-400" />
                <p className="text-sm text-gray-500">No salary history yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {salaryHistory.map((rec, i) => (
                  <div key={rec.id || i} className="p-4 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                          <IndianRupee size={18} className="text-white" />
                        </div>
                        <div>
                          <p className="text-xl font-bold text-gray-900 dark:text-white">
                            {fmtCurrency(rec.monthly_salary)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {rec.effective_from && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Effective {new Date(rec.effective_from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                        {rec.set_by_name && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Users size={10} /> Set by {rec.set_by_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Incentives ────────────────────────────────────────────────────────── */}
      {tab === 'incentives' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Incentives</h2>
            <CustomDropdown
              value={dwMonth}
              onChange={(val) => { setDwMonth(val); fetchMyIncentives(); }}
              options={MONTHS.map(m => ({ value: m.v, label: m.l }))}
              placeholder="Select Month"
              className="w-32"
            />
            <CustomDropdown
              value={dwYear}
              onChange={(val) => { setDwYear(parseInt(val)); fetchMyIncentives(); }}
              options={YEARS.map(y => ({ value: y, label: y }))}
              placeholder="Select Year"
              className="w-24"
            />
            <button onClick={() => fetchMyIncentives()} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
              <RefreshCw size={12} className={incentivesLoading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {incentivesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-[#0082f3]" />
              </div>
            ) : incentives.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800">
                <Banknote size={32} className="mx-auto mb-3 opacity-40 text-gray-400" />
                <p className="text-sm text-gray-500">No incentives for this month</p>
              </div>
            ) : (
              <div className="space-y-3">
                {incentives.map((inc, i) => (
                  <div key={i} className="p-4 bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-900/30">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-bold text-green-600 dark:text-green-400">
                          {fmtCurrency(inc.amount)}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                          {inc.reason}
                        </p>
                      </div>
                      {inc.created_at && (
                        <span className="text-xs text-gray-400">
                          {new Date(inc.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: My Commissions ────────────────────────────────────────────────── */}
      {tab === 'commissions' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">My Commissions</h2>
            <CustomDropdown
              value={myCommissionFilters.paid}
              onChange={(val) => applyMyCommissionFilters({ ...myCommissionFilters, paid: val })}
              options={[{ value: '', label: 'All Status' }, { value: 'true', label: 'Paid' }, { value: 'false', label: 'Unpaid' }]}
              placeholder="Status"
              className="w-32"
            />
            <div className="w-36">
              <DatePicker placeholder="From date" value={myCommissionFilters.from} onChange={(v) => applyMyCommissionFilters({ ...myCommissionFilters, from: v })} />
            </div>
            <div className="w-36">
              <DatePicker placeholder="To date" value={myCommissionFilters.to} onChange={(v) => applyMyCommissionFilters({ ...myCommissionFilters, to: v })} />
            </div>
            <button onClick={() => fetchMyCommissions(myCommissionsPagination.page, myCommissionFilters)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
              <RefreshCw size={12} className={myCommissionsLoading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {myCommissionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-[#0082f3]" />
              </div>
            ) : myCommissions.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800">
                <Handshake size={32} className="mx-auto mb-3 opacity-40 text-gray-400" />
                <p className="text-sm text-gray-500">No commissions found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myCommissions.map((c, i) => (
                  <div key={c.id || i} className="p-4 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{fmtCurrency(c.commission_amount)}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {(c.project_name || c.project?.name) || '—'}
                          {c.commission_percentage != null && ` · ${c.commission_percentage}%`}
                        </p>
                        {(c.lead_name || c.lead?.name) && <p className="text-xs text-gray-400">{c.lead_name || c.lead?.name}</p>}
                        {c.notes && <p className="text-xs text-gray-400 mt-1 italic">{c.notes}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${c.paid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                          {c.paid ? 'Paid' : 'Unpaid'}
                        </span>
                        {c.created_at && <span className="text-xs text-gray-400">{fmtDate(c.created_at)}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: My Advances ───────────────────────────────────────────────────── */}
      {tab === 'advances' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">My Advances</h2>
            <div className="w-36">
              <DatePicker placeholder="From date" value={myAdvanceFilters.from} onChange={(v) => applyMyAdvanceFilters({ ...myAdvanceFilters, from: v })} />
            </div>
            <div className="w-36">
              <DatePicker placeholder="To date" value={myAdvanceFilters.to} onChange={(v) => applyMyAdvanceFilters({ ...myAdvanceFilters, to: v })} />
            </div>
            <button onClick={() => fetchMyAdvances(myAdvancesPagination.page, myAdvanceFilters)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
              <RefreshCw size={12} className={myAdvancesLoading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {myAdvancesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-[#0082f3]" />
              </div>
            ) : myAdvances.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800">
                <CreditCard size={32} className="mx-auto mb-3 opacity-40 text-gray-400" />
                <p className="text-sm text-gray-500">No advances found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myAdvances.map((a, i) => (
                  <div key={a.id || i} className="p-4 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{fmtCurrency(a.amount)}</p>
                        {a.transaction_reference && <p className="text-xs text-gray-500 mt-0.5">Ref: {a.transaction_reference}</p>}
                        {a.notes && <p className="text-xs text-gray-400 mt-1 italic">{a.notes}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {a.advance_date && <span className="text-xs text-gray-400">{fmtDate(a.advance_date)}</span>}
                        {a.payment_proof_url && (
                          <a href={resolveFileUrl(a.payment_proof_url)} target="_blank" rel="noopener noreferrer" className="text-xs text-[#0082f3] hover:underline flex items-center gap-1">
                            <Link2 size={10} /> Proof
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT PAGE — role router
// ══════════════════════════════════════════════════════════════════════════════

export default function Salary() {
  const user = useSelector(s => s.auth.user)

  const isAdmin = ['super_admin', 'admin'].includes(user?.role)

  return isAdmin ? <AdminSalaryView user={user} /> : <EmployeeSalaryView user={user} />
}