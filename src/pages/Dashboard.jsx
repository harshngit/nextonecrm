import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Download, Loader2, FileSpreadsheet, ChevronDown } from 'lucide-react'
import {
  fetchDashboardStats,
  fetchRevenueTrend,
  fetchLeadSources,
  fetchLeadPipeline,
  fetchRecentActivity,
  fetchUpcomingSiteVisits,
} from '../store/dashboardSlice'
import api from '../api/axios'
import DashboardStats from '../components/dashboard/DashboardStats'
import RevenueBookingsChart from '../components/dashboard/RevenueBookingsChart'
import LeadSourcesChart from '../components/dashboard/LeadSourcesChart'
import CommissionOverviewChart from '../components/dashboard/CommissionOverviewChart'
import LeadPipeline from '../components/dashboard/LeadPipeline'
import RecentActivity from '../components/dashboard/RecentActivity'
import QuickActions from '../components/dashboard/QuickActions'
import UpcomingSiteVisits from '../components/dashboard/UpcomingSiteVisits'

// ─── Export Reports Panel ────────────────────────────────────────────────────

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function ExportReportsPanel({ user }) {
  const [open,      setOpen]      = useState(false)
  const [exporting, setExporting] = useState(null)
  const [month,     setMonth]     = useState(new Date().getMonth() + 1)
  const [year,      setYear]      = useState(new Date().getFullYear())

  const isAdmin = ['super_admin','admin'].includes(user?.role)

  const EXPORTS = [
    { key: 'leads',       label: 'Leads Report',         color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',      icon: '📋', show: true },
    { key: 'site-visits', label: 'Site Visits Report',   color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400', icon: '📍', show: true },
    { key: 'follow-ups',  label: 'Follow-Ups Report',    color: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',    icon: '📞', show: true },
    { key: 'attendance',  label: 'Attendance Report',    color: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400', icon: '🗓️', show: true },
    { key: 'projects',    label: 'Projects Report',      color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',    icon: '🏗️', show: isAdmin },
    { key: 'users',       label: 'Team Report',          color: 'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400',        icon: '👥', show: isAdmin },
    { key: 'all',         label: 'Full CRM Export',      color: 'bg-[#0082f3]/10 text-[#0082f3]',                                         icon: '📦', show: isAdmin },
  ].filter(e => e.show)

  const doExport = async (key) => {
    try {
      setExporting(key)
      const from = `${year}-${String(month).padStart(2,'0')}-01`
      const to   = new Date(year, month, 0).toISOString().split('T')[0]
      const needsDates = ['leads','site-visits','follow-ups','attendance','all'].includes(key)
      const res  = await api.get(`/export/${key}`, {
        params: needsDates ? { from, to } : {},
        responseType: 'blob',
      })
      const url  = URL.createObjectURL(res.data)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${key.replace('-','_')}_${from}_${to}.xlsx`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting(null)
    }
  }

  const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i)

  return (
    <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-md shadow-blue-100/50 dark:shadow-blue-900/20 overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0082f3]/10 flex items-center justify-center">
            <FileSpreadsheet size={18} className="text-[#0082f3]" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Export Reports</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Download Excel reports for any module</p>
          </div>
        </div>
        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded panel */}
      {open && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-4 space-y-4">
          {/* Period selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Period:</span>
            <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
              className="px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-[#0082f3] text-gray-700 dark:text-gray-300">
              {MONTH_NAMES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(parseInt(e.target.value))}
              className="px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-[#0082f3] text-gray-700 dark:text-gray-300">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <span className="text-xs text-gray-400">→ {MONTH_NAMES[month-1]} {year}</span>
          </div>

          {/* Export buttons grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {EXPORTS.map(({ key, label, color, icon }) => (
              <button
                key={key}
                onClick={() => doExport(key)}
                disabled={!!exporting}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all text-left disabled:opacity-50 disabled:cursor-wait ${color}`}
              >
                <span className="text-base flex-shrink-0">{icon}</span>
                <span className="text-xs font-medium leading-tight flex-1">{label}</span>
                {exporting === key
                  ? <Loader2 size={12} className="flex-shrink-0 animate-spin" />
                  : <Download size={12} className="flex-shrink-0 opacity-60" />
                }
              </button>
            ))}
          </div>

          {isAdmin && (
            <p className="text-[10px] text-gray-400 dark:text-gray-600">
              Admin sees all data · Other roles see only their own assigned records
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const dispatch = useDispatch()
  const { loading } = useSelector((s) => s.dashboard)
  const { user }    = useSelector((s) => s.auth)

  useEffect(() => {
    dispatch(fetchDashboardStats())
    dispatch(fetchRevenueTrend({ range: 'month' }))
    dispatch(fetchLeadSources())
    dispatch(fetchLeadPipeline())
    dispatch(fetchRecentActivity({ limit: 10 }))
    dispatch(fetchUpcomingSiteVisits({ limit: 5 }))
  }, [dispatch])

  const isInitialLoading = loading.stats && loading.revenue && loading.leadSources && loading.pipeline

  if (isInitialLoading) {
    return (
      <div className="space-y-6">
        <DashboardStats loading={true} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 h-80 rounded-2xl animate-pulse shadow-md shadow-blue-100/50 dark:shadow-blue-900/20" />
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 h-80 rounded-2xl animate-pulse shadow-md shadow-blue-100/50 dark:shadow-blue-900/20" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top KPI Cards — 4th card is Attendance (tap to open modal) */}
      <DashboardStats loading={loading.stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueBookingsChart />
        <LeadSourcesChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CommissionOverviewChart />
        <LeadPipeline />
        <RecentActivity />
      </div>

      {/* Export Reports — collapsible panel */}
      <ExportReportsPanel user={user} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuickActions />
        <UpcomingSiteVisits />
      </div>
    </div>
  )
}