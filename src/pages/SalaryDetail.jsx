import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  ArrowLeft, IndianRupee, Calendar, RefreshCw, Loader2,
  AlertCircle, CheckCircle, LogIn, LogOut, Timer, ChevronLeft,
  ChevronRight, Banknote, TrendingUp, FileText, Users, Plus, X, Edit2
} from 'lucide-react'
import api from '../api/axios'
import Avatar from '../components/ui/Avatar'
import Modal from '../components/ui/Modal'
import { updateAttendanceStatus } from '../store/attendanceSlice'

// ── helpers ───────────────────────────────────────────────────────────────────

const fmtCurrency = (n) =>
  n == null ? '—' : `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtTime = (ts) => {
  if (!ts) return '--:--'
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const fmtDate = (d) => {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const MONTHS = [
  { v: 1, l: 'January' }, { v: 2, l: 'February' }, { v: 3, l: 'March' },
  { v: 4, l: 'April' },   { v: 5, l: 'May' },       { v: 6, l: 'June' },
  { v: 7, l: 'July' },    { v: 8, l: 'August' },    { v: 9, l: 'September' },
  { v: 10, l: 'October' },{ v: 11, l: 'November' }, { v: 12, l: 'December' },
]

const thisMonth = new Date().getMonth() + 1
const thisYear  = new Date().getFullYear()
const YEARS     = Array.from({ length: 5 }, (_, i) => thisYear - i)

const STATUS_CONFIG = {
  present:  { label: 'Present',  dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  late:     { label: 'Late',     dot: 'bg-amber-500',   badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  absent:   { label: 'Absent',   dot: 'bg-red-500',     badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  on_leave: { label: 'On Leave', dot: 'bg-indigo-500',  badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
  half_day: { label: 'Half Day', dot: 'bg-pink-500',    badge: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300' },
}

const roleColors = {
  super_admin:     'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
  admin:           'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
  sales_manager:   'text-[#0082f3] bg-blue-50 dark:bg-blue-900/20',
  sales_executive: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
  external_caller: 'text-sky-600 bg-sky-100 dark:text-sky-400 dark:bg-sky-900/30',
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue:   'bg-[#0082f3]/10 text-[#0082f3]',
    green:  'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    amber:  'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    red:    'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  }
  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-base font-bold text-gray-900 dark:text-white truncate">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 truncate">{sub}</p>}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SalaryDetail() {
  const { user_id } = useParams()
  const navigate    = useNavigate()
  const { user } = useSelector(s => s.auth)
  const isAdmin = ['super_admin', 'admin'].includes(user?.role)

  const deleteIncentive = async (incentiveId) => {
    if (!confirm('Are you sure you want to delete this incentive?')) return
    try {
      await api.delete(`/salary/incentive/${incentiveId}`)
      fetchIncentives()
    } catch (err) {
      console.error('Failed to delete incentive:', err)
    }
  }

  const [month, setMonth] = useState(thisMonth)
  const [year,  setYear]  = useState(thisYear)

  // Employee info
  const [employee,    setEmployee]    = useState(null)
  const [empLoading,  setEmpLoading]  = useState(true)
  const [empError,    setEmpError]    = useState('')

  // Salary set for this employee
  const [salaryInfo,  setSalaryInfo]  = useState(null)  // { monthly_salary, per_day_salary, effective_from }

  // Attendance / day-wise data
  const [attData, setAttData] = useState([])
  const [attSalary, setAttSalary] = useState(null)  // { monthly_salary, per_day_salary, earned_salary, present_days }
  const [attSummary, setAttSummary] = useState(null)
  const [attLoading, setAttLoading] = useState(false)
  const [attError, setAttError] = useState('')
  const [attPagination, setAttPagination] = useState({ page: 1, per_page: 5, total: 0, total_pages: 1 })

  // Modal for editing attendance status
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingAttendance, setEditingAttendance] = useState(null)
  const [editForm, setEditForm] = useState({ status: '', reason: '' })
  const [editLoading, setEditLoading] = useState(false)

  // Generated slips for this user
  const [slips,       setSlips]       = useState([])
  const [slipsLoading,setSlipsLoading]= useState(false)
  
  // Salary history and incentives
  const [salaryHistory, setSalaryHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('salary-history')
  
  // Incentives
  const [incentives, setIncentives] = useState([])
  const [incentivesLoading, setIncentivesLoading] = useState(false)
  const [addIncentiveModal, setAddIncentiveModal] = useState(false)
  const [incentiveForm, setIncentiveForm] = useState({
    amount: '',
    reason: '',
  })

  // ── Fetch employee info + salary ───────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setEmpLoading(true)
      setEmpError('')
      try {
        // Get all employees with salaries to find this one
        const res = await api.get('/salary/employees')
        const emp = res.data.data?.data?.find(e => e.id === user_id)
        if (emp) {
          setEmployee(emp)
          setSalaryInfo({
            monthly_salary: emp.monthly_salary,
            per_day_salary:  emp.per_day_salary,
            effective_from:  emp.effective_from,
            set_by_name:     emp.set_by_name,
          })
        } else {
          setEmpError('Employee not found')
        }
      } catch (e) {
        setEmpError(e.response?.data?.message || 'Failed to load employee')
      } finally {
        setEmpLoading(false)
      }
    }
    load()
  }, [user_id])

  // ── Fetch attendance + day-wise salary ────────────────────────────────────
  const fetchAttendance = async (page = 1) => {
    setAttLoading(true)
    setAttError('')
    try {
      const from = `${year}-${String(month).padStart(2, '0')}-01`
      const to = new Date(year, month, 0).toISOString().split('T')[0]
      const res = await api.get(`/attendance/user/${user_id}`, {
        params: { from, to, page, per_page: attPagination.per_page },
      })
      setAttData(res.data.data || [])
      setAttSummary(res.data.summary || null)
      setAttSalary(res.data.salary || null)
      setAttPagination({
        page: res.data.pagination?.page || 1,
        per_page: res.data.pagination?.per_page || 5,
        total: res.data.pagination?.total || 0,
        total_pages: res.data.pagination?.total_pages || 1,
      })
    } catch (e) {
      setAttError(e.response?.data?.message || 'Failed to load attendance')
      setAttData([])
    } finally {
      setAttLoading(false)
    }
  }

  // ── Fetch salary slips for this user ──────────────────────────────────────
  const fetchSlips = async () => {
    setSlipsLoading(true)
    try {
      const res = await api.get('/salary/slips', {
        params: { user_id, month, year, per_page: 1 },
      })
      setSlips(res.data.data || [])
    } catch {
      setSlips([])
    } finally {
      setSlipsLoading(false)
    }
  }
  
  // ── Fetch salary history for this user ──────────────────────────────────────
  const fetchSalaryHistory = async () => {
    setHistoryLoading(true)
    try {
      const res = await api.get(`/salary/history/${user_id}`)
      setSalaryHistory(res.data.data?.history || [])
    } catch {
      setSalaryHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }
  
  // ── Fetch incentives for this user ──────────────────────────────────────────
  const fetchIncentives = async () => {
    setIncentivesLoading(true)
    try {
      const res = await api.get('/salary/incentives', {
        params: { user_id, month, year }
      })
      // Try multiple possible keys for data
      let incentivesData = []
      if (Array.isArray(res.data)) {
        incentivesData = res.data
      } else if (Array.isArray(res.data.data)) {
        incentivesData = res.data.data
      } else if (Array.isArray(res.data.data?.data)) {
        incentivesData = res.data.data.data
      }
      setIncentives(incentivesData)
    } catch {
      setIncentives([])
    } finally {
      setIncentivesLoading(false)
    }
  }
  
  // ── Add incentive for this user ─────────────────────────────────────────────
  const handleAddIncentive = async () => {
    if (!incentiveForm.amount || !incentiveForm.reason) return
    try {
      await api.post('/salary/incentive', {
        user_id,
        month,
        year,
        amount: parseFloat(incentiveForm.amount),
        reason: incentiveForm.reason,
      })
      setAddIncentiveModal(false)
      setIncentiveForm({ amount: '', reason: '' })
      fetchIncentives()
    } catch (err) {
      console.error('Failed to add incentive:', err)
    }
  }

  // ── Handle edit attendance status ────────────────────────────────────────
  const handleOpenEditModal = (attendance) => {
    setEditingAttendance(attendance)
    setEditForm({ status: attendance.status, reason: attendance.reason || '' })
    setEditModalOpen(true)
  }

  const handleUpdateStatus = async () => {
    if (!editingAttendance || !editForm.status) return
    setEditLoading(true)
    try {
      await api.patch(`/attendance/${editingAttendance.id}/status`, {
        status: editForm.status,
        reason: editForm.reason,
      })
      setEditModalOpen(false)
      fetchAttendance(attPagination.page)
    } catch (err) {
      console.error('Failed to update status:', err)
    } finally {
      setEditLoading(false)
    }
  }

  useEffect(() => {
    setAttPagination(p => ({ ...p, page: 1 }))
    fetchAttendance(1)
    fetchSlips()
    fetchSalaryHistory()
    fetchIncentives()
  }, [user_id, month, year])

  // ── Salary calculation per day ────────────────────────────────────────────
  const perDay = attSalary?.per_day_salary || salaryInfo?.per_day_salary || null

  const dayEarned = (status) => {
    if (!perDay) return null
    if (['present', 'late'].includes(status)) return parseFloat(perDay)
    if (status === 'half_day') return parseFloat(perDay) * 0.5
    return 0
  }

  const totalEarnedPeriod = attData.reduce((sum, r) => sum + (dayEarned(r.status) || 0), 0)

  // ── Month navigation ──────────────────────────────────────────────────────
  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const slip = slips[0] || null

  if (empLoading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 size={32} className="animate-spin text-[#0082f3]" />
    </div>
  )

  if (empError) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <AlertCircle size={32} className="text-red-400" />
      <p className="text-gray-500">{empError}</p>
      <button onClick={() => navigate('/salary')} className="text-sm text-[#0082f3] hover:underline">← Back to Salary</button>
    </div>
  )

  const monthLabel = `${MONTHS.find(m => m.v === month)?.l} ${year}`

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => navigate('/salary')}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#0082f3] transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 flex items-center justify-center group-hover:border-[#0082f3]/30 transition-all">
            <ArrowLeft size={15} />
          </div>
          Back to Salary
        </button>
        <button
          onClick={() => { fetchAttendance(); fetchSlips() }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-[#0082f3] hover:text-[#0082f3] transition-all"
        >
          <RefreshCw size={13} className={attLoading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* ── Employee profile card ───────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#0082f3] to-blue-600 px-6 py-5 flex items-center gap-4">
          <Avatar name={employee?.full_name} size="lg" />
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-lg truncate">{employee?.full_name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleColors[employee?.role] || 'bg-white/20 text-white'}`}>
                {employee?.role?.replace(/_/g, ' ')}
              </span>
              <span className="text-blue-200 text-xs">{employee?.email}</span>
            </div>
          </div>
        </div>

        {/* Salary info row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100 dark:divide-gray-800">
          {[
            { l: 'Monthly Salary',  v: salaryInfo?.monthly_salary ? fmtCurrency(salaryInfo.monthly_salary) : 'Not Set', c: 'text-gray-900 dark:text-white' },
            { l: 'Per Day Salary',  v: salaryInfo?.per_day_salary  ? fmtCurrency(salaryInfo.per_day_salary)  : '—',       c: 'text-emerald-600 dark:text-emerald-400' },
            { l: 'Effective From',  v: salaryInfo?.effective_from  ? new Date(salaryInfo.effective_from).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—', c: 'text-gray-700 dark:text-gray-300' },
            { l: 'Set By',          v: salaryInfo?.set_by_name || '—', c: 'text-gray-700 dark:text-gray-300' },
          ].map(x => (
            <div key={x.l} className="px-4 py-3 text-center sm:text-left">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{x.l}</p>
              <p className={`text-sm font-bold mt-0.5 ${x.c}`}>{x.v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Month selector ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="w-8 h-8 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:border-[#0082f3] hover:text-[#0082f3] transition-colors">
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-bold text-gray-800 dark:text-gray-200 min-w-[130px] text-center">{monthLabel}</span>
          <button onClick={nextMonth} className="w-8 h-8 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:border-[#0082f3] hover:text-[#0082f3] transition-colors">
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Quick year select */}
        <select value={year} onChange={e => setYear(parseInt(e.target.value))}
          className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none focus:border-[#0082f3]">
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* ── Summary stats ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={CheckCircle}  label="Present Days"   value={attSummary?.present ?? '—'}                              sub="Full day" color="green" />
        <StatCard icon={AlertCircle}  label="Absent Days"    value={attSummary?.absent  ?? '—'}                              sub="No pay"   color="red" />
        <StatCard icon={Calendar}     label="On Leave"        value={(attSummary?.on_leave ?? 0)}                             sub="Leave days" color="amber" />
        <StatCard icon={TrendingUp}   label="Earned (Est.)"  value={totalEarnedPeriod > 0 ? fmtCurrency(totalEarnedPeriod) : '—'} sub={monthLabel} color="blue" />
      </div>

      {/* ── Generated slip banner (if exists) ───────────────────────────────── */}
      {slip && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-2xl border border-green-200 dark:border-green-800/40 px-5 py-4">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                <FileText size={16} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-green-800 dark:text-green-300">Salary Slip Generated — {monthLabel}</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">Generated by {slip.generated_by_name || 'Admin'}</p>
              </div>
            </div>
            <div className="flex items-center gap-6 flex-wrap text-sm">
              <div className="text-right">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Earned</p>
                <p className="font-bold text-gray-800 dark:text-gray-200">{fmtCurrency(slip.earned_salary)}</p>
              </div>
              {slip.deductions > 0 && (
                <div className="text-right">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Deductions</p>
                  <p className="font-bold text-red-500">-{fmtCurrency(slip.deductions)}</p>
                </div>
              )}
              <div className="text-right">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Final</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">{fmtCurrency(slip.final_salary)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Day-wise table ───────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">

        {/* Table header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Day-wise Attendance & Salary</h2>
            <p className="text-xs text-gray-400 mt-0.5">{monthLabel} · {attData.length} records</p>
          </div>
          {perDay && (
            <span className="text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full font-semibold">
              Per Day: {fmtCurrency(perDay)}
            </span>
          )}
        </div>

        {attError && (
          <div className="flex items-center gap-2 px-5 py-3 bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">
            <AlertCircle size={14} /> {attError}
          </div>
        )}

        {attLoading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : attData.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Calendar size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No attendance records for {monthLabel}</p>
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className={`grid gap-2 px-5 py-2 bg-gray-50 dark:bg-[#141414] border-b border-gray-100 dark:border-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-wider ${isAdmin ? 'grid-cols-[2fr_1.2fr_1fr_1fr_1fr_auto]' : 'grid-cols-[2fr_1.2fr_1fr_1fr_1fr]'}`}>
              <span>Date</span>
              <span>Status</span>
              <span className="text-center">Check-in</span>
              <span className="text-center">Check-out</span>
              <span className="text-right">Earned</span>
              {isAdmin && <span>Actions</span>}
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {attData.map((rec, i) => {
                const d      = rec.date?.split('T')[0] || rec.date
                const earned = dayEarned(rec.status)
                const cfg    = STATUS_CONFIG[rec.status] || STATUS_CONFIG.absent

                return (
                  <div
                    key={rec.id || i}
                    className={`grid gap-2 items-center px-5 py-3 hover:bg-gray-50/60 dark:hover:bg-gray-800/20 transition-colors ${i % 2 !== 0 ? 'bg-gray-50/30 dark:bg-white/[0.01]' : ''} ${isAdmin ? 'grid-cols-[2fr_1.2fr_1fr_1fr_1fr_auto]' : 'grid-cols-[2fr_1.2fr_1fr_1fr_1fr]'}`}
                  >
                    {/* Date */}
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{fmtDate(d)}</p>
                      <p className="text-[11px] text-gray-400">
                        {new Date(d).toLocaleDateString('en-IN', { weekday: 'short' })}
                        {isAdmin && rec.working_hours ? ` · ${rec.working_hours}h` : ''}
                      </p>
                    </div>

                    {/* Status */}
                    <div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                      {rec.is_manual_entry && (
                        <span className="ml-1 text-[10px] text-purple-500 bg-purple-50 dark:bg-purple-900/20 px-1.5 py-0.5 rounded">Manual</span>
                      )}
                    </div>

                    {/* Check-in */}
                    <div className="text-center">
                      {rec.check_in_time ? (
                        <span className="flex items-center justify-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          <LogIn size={10} />{fmtTime(rec.check_in_time)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300 dark:text-gray-700">—</span>
                      )}
                    </div>

                    {/* Check-out */}
                    <div className="text-center">
                      {rec.check_out_time ? (
                        <span className="flex items-center justify-center gap-1 text-xs text-rose-500 font-medium">
                          <LogOut size={10} />{fmtTime(rec.check_out_time)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300 dark:text-gray-700">—</span>
                      )}
                    </div>

                    {/* Earned */}
                    <div className="text-right">
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
                        <span className="text-xs text-gray-300 dark:text-gray-700">—</span>
                      )}
                    </div>

                    {/* Edit button for admins */}
                    {isAdmin && (
                      <div>
                        <button
                          onClick={() => handleOpenEditModal(rec)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors"
                          title="Edit attendance status"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {attPagination.total_pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#141414]">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {attData.length} of {attPagination.total} records
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchAttendance(attPagination.page - 1)}
                    disabled={attPagination.page <= 1}
                    className="px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                    Page {attPagination.page} of {attPagination.total_pages}
                  </span>
                  <button
                    onClick={() => fetchAttendance(attPagination.page + 1)}
                    disabled={attPagination.page >= attPagination.total_pages}
                    className="px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Footer — running total */}
            <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#141414]">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                  <span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{attData.filter(r => ['present','late'].includes(r.status)).length}</span> full days
                  </span>
                  <span>
                    <span className="font-bold text-pink-500">{attData.filter(r => r.status === 'half_day').length}</span> half days
                  </span>
                  <span>
                    <span className="font-bold text-red-500">{attData.filter(r => r.status === 'absent').length}</span> absent
                  </span>
                  <span>
                    <span className="font-bold text-indigo-500">{attData.filter(r => r.status === 'on_leave').length}</span> on leave
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Total Earned — {monthLabel}</p>
                  <p className="text-xl font-bold text-[#0082f3]">{fmtCurrency(totalEarnedPeriod)}</p>
                  {slip && (
                    <p className="text-[11px] text-green-600 dark:text-green-400 mt-0.5">
                      Slip: {fmtCurrency(slip.final_salary)} (after deductions)
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* ── Tabs: Salary History & Incentives ──────────────────────────────────── */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {/* Tab headers */}
        <div className="flex items-center border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#141414]">
          {[
            { id: 'salary-history', label: 'Salary History' },
            { id: 'incentives', label: 'Incentives' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-5 py-3 text-sm font-bold transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'text-[#0082f3] border-[#0082f3] bg-white dark:bg-[#1a1a1a]'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Tab content */}
        <div className="p-5 max-h-96 overflow-y-auto">
          {activeTab === 'salary-history' && (
            <div>
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-[#0082f3]" />
                </div>
              ) : salaryHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <TrendingUp size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No salary history yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {salaryHistory.map((record, i) => (
                    <div key={i} className="p-4 bg-gray-50 dark:bg-[#141414] rounded-xl border border-gray-100 dark:border-gray-700">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900 dark:text-white">
                              {fmtCurrency(record.monthly_salary)}
                            </p>
                            {record.effective_from && (
                              <span className="text-xs text-gray-400">
                                from {new Date(record.effective_from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                          {record.notes && (
                            <p className="text-xs text-gray-500 mt-1">{record.notes}</p>
                          )}
                        </div>
                        {record.set_by_name && (
                          <span className="text-xs text-gray-400">Set by {record.set_by_name}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'incentives' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Incentives for {MONTHS.find(m => m.v === month)?.l} {year}
                </h3>
                <button
                  onClick={() => setAddIncentiveModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-500 hover:bg-green-600 rounded-xl transition-all"
                >
                  <Plus size={12} />
                  Add Incentive
                </button>
              </div>
              
              {incentivesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-[#0082f3]" />
                </div>
              ) : !Array.isArray(incentives) || incentives.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Banknote size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No incentives for this month</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {incentives.map((incentive, i) => (
                    <div key={i} className="p-4 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/30">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-bold text-green-600 dark:text-green-400">
                            {fmtCurrency(incentive.amount)}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                            {incentive.reason}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {incentive.created_at && (
                            <span className="text-xs text-gray-400">
                              {new Date(incentive.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => deleteIncentive(incentive.id)}
                              className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 hover:text-red-600 transition-all"
                              title="Delete incentive"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* ── Modal: Add Incentive ─────────────────────────────────────────────── */}
      <Modal isOpen={addIncentiveModal} onClose={() => setAddIncentiveModal(false)} title="Add Incentive" size="sm">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
            {employee && <Avatar name={employee.full_name} size="sm" />}
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{employee?.full_name}</p>
              <p className="text-xs text-gray-500">
                {MONTHS.find(m => m.v === month)?.l} {year}
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
              placeholder="e.g., Closed 5 deals in June — exceeded target"
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#141414] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm resize-none"
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() => setAddIncentiveModal(false)}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAddIncentive}
            disabled={!incentiveForm.amount || !incentiveForm.reason}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-xl transition-all disabled:opacity-50"
          >
            <Plus size={14} />
            Add
          </button>
        </div>
      </Modal>

      {/* ── Modal: Edit Attendance Status ─────────────────────────────────────── */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Attendance Status" size="sm">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            {employee && <Avatar name={employee.full_name} size="sm" />}
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{employee?.full_name}</p>
              <p className="text-xs text-gray-500">
                {editingAttendance && fmtDate(editingAttendance.date?.split('T')[0] || editingAttendance.date)}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
            <select
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#141414] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
            >
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
              <option value="on_leave">On Leave</option>
              <option value="half_day">Half Day</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Reason (optional)</label>
            <textarea
              value={editForm.reason}
              onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
              placeholder="Enter reason for status change"
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#141414] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() => setEditModalOpen(false)}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdateStatus}
            disabled={editLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition-all disabled:opacity-50"
          >
            {editLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            Save
          </button>
        </div>
      </Modal>
    </div>
  )
}
