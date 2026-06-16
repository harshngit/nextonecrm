import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useModulePermissions } from '../hooks/usePermission'
import {
  IndianRupee, TrendingUp, Calendar, Users, ChevronDown,
  Plus, RefreshCw, FileText, CheckCircle, AlertCircle,
  Clock, Banknote, Wallet, BarChart3, Edit2, History,
  X, Eye, Loader2, DollarSign, LogIn, LogOut, Timer, ArrowRight,
  MoreVertical,
} from 'lucide-react'
import {
  fetchAllEmployeeSalaries,
  fetchSalarySlips,
  fetchMySalary,
  fetchSalaryHistory,
  fetchMyAttendanceForSalary,
  setEmployeeSalary,
  generateSalarySlip,
  generateAllSalarySlips,
  clearError,
  clearSuccess,
} from '../store/salarySlice'
import api from '../api/axios'
import Modal from '../components/ui/Modal'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'

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
  const [genForm, setGenForm]     = useState({ month: thisMonth, year: thisYear, deductions: '', working_days_override: '', notes: '' })

  // Generate all modal
  const [genAllModal, setGenAllModal] = useState(false)
  const [genAllForm, setGenAllForm]   = useState({ month: thisMonth, year: thisYear, working_days_override: '', notes: '' })

  // History modal
  const [histModal, setHistModal] = useState(false)

  // Result modal (after generate)
  const [resultModal, setResultModal] = useState(false)
  
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

  const openGenerate = (emp) => {
    setGenTarget(emp)
    setGenForm({ month: thisMonth, year: thisYear, deductions: '', working_days_override: '', notes: '' })
    setGenModal(true)
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
      deductions: genForm.deductions ? parseFloat(genForm.deductions) : 0,
      working_days_override: genForm.working_days_override ? parseInt(genForm.working_days_override) : undefined,
      notes: genForm.notes || undefined,
    }))
  }

  const handleGenerateAll = () => {
    dispatch(generateAllSalarySlips({
      month: genAllForm.month,
      year:  genAllForm.year,
      working_days_override: genAllForm.working_days_override ? parseInt(genAllForm.working_days_override) : undefined,
      notes: genAllForm.notes || undefined,
    }))
    setGenAllModal(false)
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
          {perms.create && (
            <button
              onClick={() => setGenAllModal(true)}
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
        {[{ v: 'employees', l: 'Employees & Salaries' }, { v: 'slips', l: 'Salary Slips' }].map(t => (
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
                              onClick={() => setOpenMenuEmpId(openMenuEmpId === emp.id ? null : emp.id)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                            >
                              <MoreVertical size={14} />
                            </button>
                            {openMenuEmpId === emp.id && (
                              <div className={`absolute right-0 w-48 max-h-64 overflow-y-auto bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg z-50 py-1 ${i >= (employees.data?.length || 0) - 2 ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
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
          <div>
            <label className={labelCls}>Effective From</label>
            <input
              type="date"
              value={setSalaryForm.effective_from}
              onChange={e => setSalaryFormData(f => ({ ...f, effective_from: e.target.value }))}
              className={inputCls}
            />
          </div>

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
            <label className={labelCls}>Deductions (₹)</label>
            <div className="relative">
              <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="number" min="0" value={genForm.deductions} onChange={e => setGenForm(f => ({ ...f, deductions: e.target.value }))} placeholder="0" className={inputCls + ' pl-9'} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Working Days Override <span className="text-gray-400">(leave blank for auto)</span></label>
            <input type="number" min="1" max="31" value={genForm.working_days_override} onChange={e => setGenForm(f => ({ ...f, working_days_override: e.target.value }))} placeholder="Auto (Mon–Fri count)" className={inputCls} />
          </div>

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
      <Modal isOpen={genAllModal} onClose={() => setGenAllModal(false)} title="Generate All Salary Slips" size="sm">
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
          <div>
            <label className={labelCls}>Working Days Override <span className="text-gray-400">(optional)</span></label>
            <input type="number" min="1" max="31" value={genAllForm.working_days_override} onChange={e => setGenAllForm(f => ({ ...f, working_days_override: e.target.value }))} placeholder="Auto" className={inputCls} />
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
          <div>
            <label className={labelCls}>Effective From</label>
            <input
              type="date"
              value={appraisalForm.effective_from}
              onChange={(e) => setAppraisalForm({ ...appraisalForm, effective_from: e.target.value })}
              className={inputCls}
            />
          </div>
          
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
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// EMPLOYEE VIEW
// ══════════════════════════════════════════════════════════════════════════════

function EmployeeSalaryView({ user }) {
  const dispatch = useDispatch()
  const { mySalary, myAttendance, loading, error } = useSelector(s => s.salary)
  const { user: currentUser } = useSelector(s => s.auth)
  const isSuperAdmin = currentUser?.role === 'super_admin'

  const [tab,         setTab]         = useState('slips')   // 'slips' | 'daywise' | 'history' | 'incentives'
  const [filterMonth, setFilterMonth] = useState('')
  const [filterYear,  setFilterYear]  = useState(thisYear)
  const [expanded,    setExpanded]    = useState(null)

  // Selected month/year for day-wise tab
  const [dwMonth, setDwMonth] = useState(thisMonth)
  const [dwYear,  setDwYear]  = useState(thisYear)

  // For history and incentives
  const [salaryHistory, setSalaryHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [incentives, setIncentives] = useState([])
  const [incentivesLoading, setIncentivesLoading] = useState(false)

  useEffect(() => {
    dispatch(fetchMySalary({ year: filterYear }))
  }, [dispatch, filterYear])

  // Fetch attendance when day-wise tab is active
  useEffect(() => {
    if (tab === 'daywise') {
      const from = `${dwYear}-${String(dwMonth).padStart(2, '0')}-01`
      const to   = new Date(dwYear, dwMonth, 0).toISOString().split('T')[0]
      dispatch(fetchMyAttendanceForSalary({ from, to, per_page: 31 }))
    }
  }, [dispatch, tab, dwMonth, dwYear])

  const slips       = mySalary?.salary_slips || []
  const totalEarned = slips.reduce((s, slip) => s + (slip.final_salary || 0), 0)
  const filtered    = filterMonth ? slips.filter(s => s.month === parseInt(filterMonth)) : slips

  // Day-wise data
  const attData   = myAttendance?.data     || []
  const attSalary = myAttendance?.salary   // { per_day_salary, monthly_salary, earned_salary, present_days }
  const attSum    = myAttendance?.summary

  const perDay = attSalary?.per_day_salary || null

  const dayEarned = (status) => {
    if (!perDay) return null
    if (['present', 'late'].includes(status)) return perDay
    if (status === 'half_day') return perDay * 0.5
    return 0
  }

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

  // Fetch history or incentives when tab changes
  useEffect(() => {
    if (tab === 'history') fetchMySalaryHistory()
    if (tab === 'incentives') fetchMyIncentives()
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
              {mySalary?.current_monthly_salary?.per_day_salary && (
                <p className="text-blue-200 text-xs mt-1">
                  Per day: ₹{parseFloat(mySalary.current_monthly_salary.per_day_salary).toFixed(2)}
                </p>
              )}
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
          { v: 'slips',      l: 'Salary Slips' },
          { v: 'daywise',    l: 'Day-wise Earnings' },
          { v: 'history',    l: 'Salary History' },
          { v: 'incentives', l: 'Incentives' },
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
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                          {[
                            { label: 'Monthly Salary', value: fmtCurrency(slip.monthly_salary), sub: 'Base' },
                            { label: 'Per Day',         value: fmtCurrency(slip.per_day_salary),  sub: `÷ ${slip.working_days} days` },
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
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── TAB: Day-wise Earnings ────────────────────────────────────────────── */}
      {tab === 'daywise' && (
        <div className="space-y-4">
          {/* Month/year filter */}
          <div className="flex items-center gap-3 flex-wrap">
            <CustomDropdown
              value={dwMonth}
              onChange={(val) => setDwMonth(parseInt(val))}
              options={MONTHS.map(m => ({ value: m.v, label: m.l }))}
              placeholder="Select Month"
              className="w-36"
            />
            <CustomDropdown
              value={dwYear}
              onChange={(val) => setDwYear(parseInt(val))}
              options={YEARS.map(y => ({ value: y, label: y }))}
              placeholder="Select Year"
              className="w-28"
            />
            <button
              onClick={() => {
                const from = `${dwYear}-${String(dwMonth).padStart(2, '0')}-01`
                const to   = new Date(dwYear, dwMonth, 0).toISOString().split('T')[0]
                dispatch(fetchMyAttendanceForSalary({ from, to, per_page: 31 }))
              }}
              className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all"
            >
              <RefreshCw size={14} className={loading.myAttendance ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {/* Summary strip */}
            {attSalary?.monthly_salary && (
              <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden mb-4">
                <div className="bg-gradient-to-r from-[#0082f3] to-blue-600 px-5 py-4">
                  <p className="text-blue-100 text-xs font-medium uppercase tracking-wider mb-1">
                    {MONTHS.find(m => m.v === dwMonth)?.l} {dwYear} — Salary Summary
                  </p>
                  <p className="text-white text-2xl font-bold">{fmtCurrency(attSalary.earned_salary)}</p>
                  <p className="text-blue-200 text-xs mt-0.5">Earned so far · {attSalary.present_days} days present</p>
                </div>
                <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800">
                  {[
                    { l: 'Monthly Base',  v: fmtCurrency(attSalary.monthly_salary),  c: 'text-gray-800 dark:text-gray-200' },
                    { l: 'Per Day',       v: fmtCurrency(attSalary.per_day_salary),   c: 'text-emerald-600 dark:text-emerald-400' },
                    { l: 'Days Present',  v: `${attSalary.present_days}`,             c: 'text-[#0082f3]' },
                  ].map(x => (
                    <div key={x.l} className="px-4 py-3 text-center">
                      <p className={`text-base font-bold ${x.c}`}>{x.v}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{x.l}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Day-wise list */}
            {loading.myAttendance ? (
              <div className="flex items-center justify-center h-40 text-gray-400">
                <Loader2 size={24} className="animate-spin" />
              </div>
            ) : attData.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800">
                <Calendar size={32} className="mx-auto mb-2 opacity-40 text-gray-400" />
                <p className="text-sm text-gray-500">No attendance records for this month</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                {/* Table header */}
                <div className={`grid gap-3 px-5 py-3 bg-gray-50 dark:bg-[#141414] border-b border-gray-100 dark:border-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-wider ${isSuperAdmin ? 'grid-cols-[1fr_auto_auto_auto]' : 'grid-cols-[1fr_auto_auto]'}`}>
                  <span>Date</span>
                  <span className="text-center">Status</span>
                  {isSuperAdmin && <span className="text-center">Hours</span>}
                  <span className="text-right">Earned</span>
                </div>

                <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
                  {attData.map(rec => {
                    const d      = rec.date?.split('T')[0] || rec.date
                    const earned = dayEarned(rec.status)
                    const cfg    = STATUS_CONFIG[rec.status] || STATUS_CONFIG.absent
                    return (
                      <div key={rec.id} className={`grid gap-3 items-center px-5 py-3 hover:bg-gray-50/60 dark:hover:bg-gray-800/20 transition-colors ${isSuperAdmin ? 'grid-cols-[1fr_auto_auto_auto]' : 'grid-cols-[1fr_auto_auto]'}`}>
                        {/* Date + times */}
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{fmtDate(d)}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
                            {rec.check_in_time  && <span className="flex items-center gap-0.5"><LogIn  size={9} className="text-emerald-500" />{fmtTime(rec.check_in_time)}</span>}
                            {rec.check_out_time && <span className="flex items-center gap-0.5"><LogOut size={9} className="text-rose-500"    />{fmtTime(rec.check_out_time)}</span>}
                          </div>
                        </div>

                        {/* Status badge */}
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${cfg.badge}`}>
                          <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${cfg.dot}`} />
                          {cfg.label}
                        </span>

                        {/* Working hours */}
                        {isSuperAdmin && (
                          <span className="text-xs text-gray-400 text-center">
                            {rec.working_hours ? `${rec.working_hours}h` : '—'}
                          </span>
                        )}

                        {/* Earned */}
                        <div className="text-right min-w-[80px]">
                          {earned !== null ? (
                            <>
                              <p className={`text-sm font-bold ${earned > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-400'}`}>
                                {earned > 0 ? `+${fmtCurrency(earned)}` : '₹0'}
                              </p>
                              <p className="text-[10px] text-gray-400">
                                {rec.status === 'half_day' ? '50%' : earned > 0 ? 'full' : 'no pay'}
                              </p>
                            </>
                          ) : (
                            <p className="text-xs text-gray-300 dark:text-gray-700">—</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Running total footer */}
                {perDay && attData.length > 0 && (
                  <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#141414] flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {attData.filter(r => ['present','late'].includes(r.status)).length} full + {attData.filter(r => r.status === 'half_day').length} half days
                    </span>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Total Earned This Period</p>
                      <p className="text-base font-bold text-[#0082f3]">
                        {fmtCurrency(
                          attData.reduce((sum, r) => sum + (dayEarned(r.status) || 0), 0)
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
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
                          {rec.per_day_salary && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Per day: {fmtCurrency(rec.per_day_salary)}
                            </p>
                          )}
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