import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  ArrowLeft, Phone, Mail, Clock, Shield, Loader2,
  TrendingUp, Users, CalendarCheck, PhoneCall,
  CheckCircle2, XCircle, Target, AlertCircle,
  BarChart2, RefreshCw, UserCheck, ShieldCheck,
  ExternalLink, BookOpen,
} from 'lucide-react'
import { fetchUserById, clearCurrentUser } from '../store/userSlice'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import api from '../api/axios'

// ── constants ──────────────────────────────────────────────────────────────────
const roleColors = {
  super_admin:    'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30',
  admin:          'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
  sales_manager:  'text-brand bg-brand/10 dark:bg-brand/15',
  sales_executive:'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
  external_caller:'text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-900/30',
}

const roleGradients = {
  sales_manager:  'from-brand/30 via-blue-500/10 to-purple-500/10',
  sales_executive:'from-green-500/20 via-teal-500/10 to-brand/10',
  external_caller:'from-sky-500/20 via-blue-500/10 to-indigo-500/10',
  admin:          'from-blue-500/20 via-indigo-500/10 to-purple-500/10',
  super_admin:    'from-purple-500/20 via-pink-500/10 to-rose-500/10',
}

// ── helpers ───────────────────────────────────────────────────────────────────
function InfoTile({ icon: Icon, label, value, color }) {
  return (
    <div className="p-4 rounded-2xl border border-gray-50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-[#0f0f0f]/50">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color} dark:bg-opacity-10`}>
          <Icon size={14} />
        </div>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{value || '—'}</div>
    </div>
  )
}

function PipelineBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-semibold text-gray-800 dark:text-gray-200 tabular-nums">
          {value} <span className="text-gray-400 font-normal">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── history tabs content ───────────────────────────────────────────────────────
function HistoryTab({ userId, tab }) {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const endpointMap = {
    leads:       `/team-history/${userId}/leads`,
    followups:   `/team-history/${userId}/follow-ups`,
    sitevisits:  `/team-history/${userId}/site-visits`,
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true); setError('')
        const res = await api.get(endpointMap[tab])
        if (!cancelled) setData(res.data.data || [])
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [userId, tab])

  if (loading) return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
    </div>
  )

  if (error) return (
    <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl border border-red-200 dark:border-red-900">
      <AlertCircle size={16} />{error}
    </div>
  )

  if (data.length === 0) return (
    <div className="py-10 text-center text-sm text-gray-400 dark:text-[#888]">
      <div className="text-3xl mb-2">{tab === 'leads' ? '📋' : tab === 'followups' ? '📞' : '🏠'}</div>
      No {tab === 'leads' ? 'leads' : tab === 'followups' ? 'follow-ups' : 'site visits'} found
    </div>
  )

  // ── Leads list ───────────────────────────────────────────────────────────
  if (tab === 'leads') return (
    <div className="space-y-2">
      {data.map(lead => (
        <div key={lead.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50/60 dark:bg-[#0f0f0f]/60 border border-gray-100 dark:border-gray-800 hover:border-brand/20 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={lead.name} size="sm" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{lead.name}</div>
              <div className="text-[11px] text-gray-400">{lead.phone} {lead.source ? `· ${lead.source}` : ''}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {lead.budget && <span className="text-[10px] text-gray-400 hidden sm:block">{lead.budget}</span>}
            <Badge label={lead.status?.replace(/_/g, ' ') || 'New'} />
          </div>
        </div>
      ))}
    </div>
  )

  // ── Follow-ups list ──────────────────────────────────────────────────────
  if (tab === 'followups') return (
    <div className="space-y-2">
      {data.map(task => (
        <div key={task.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50/60 dark:bg-[#0f0f0f]/60 border border-gray-100 dark:border-gray-800 hover:border-brand/20 transition-colors">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{task.title}</div>
            <div className="text-[11px] text-gray-400">
              {task.lead_name && `${task.lead_name} · `}
              {task.due_date ? new Date(task.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wide ${
              task.priority === 'high'   ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
              task.priority === 'medium' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
              'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
              {task.priority}
            </span>
            <Badge label={task.is_completed ? 'Completed' : 'Pending'} />
          </div>
        </div>
      ))}
    </div>
  )

  // ── Site visits list ─────────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      {data.map(sv => (
        <div key={sv.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50/60 dark:bg-[#0f0f0f]/60 border border-gray-100 dark:border-gray-800 hover:border-brand/20 transition-colors">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{sv.lead_name || 'Lead'}</div>
            <div className="text-[11px] text-gray-400">
              {sv.project_name && `${sv.project_name} · `}
              {sv.visit_date ? new Date(sv.visit_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
            </div>
          </div>
          <div className="flex-shrink-0">
            <Badge label={sv.status?.charAt(0).toUpperCase() + sv.status?.slice(1) || 'Scheduled'} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────
export default function UserDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { currentUser: user, detailLoading } = useSelector(s => s.users)

  const today         = new Date()
  const firstOfMonth  = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
  const todayStr      = today.toISOString().split('T')[0]

  const [perf,     setPerf]     = useState(null)
  const [perfLoad, setPerfLoad] = useState(false)
  const [perfErr,  setPerfErr]  = useState('')
  const [from,     setFrom]     = useState(firstOfMonth)
  const [to,       setTo]       = useState(todayStr)
  const [histTab,  setHistTab]  = useState('leads')

  useEffect(() => {
    dispatch(fetchUserById(id))
    return () => dispatch(clearCurrentUser())
  }, [dispatch, id])

  const fetchPerf = async () => {
    try {
      setPerfLoad(true); setPerfErr('')
      const res = await api.get(`/users/${id}/performance`, { params: { from, to } })
      setPerf(res.data.data)
    } catch (e) { setPerfErr(e.response?.data?.message || 'Failed to load performance data') }
    finally { setPerfLoad(false) }
  }

  useEffect(() => { if (id) fetchPerf() }, [id, from, to])

  // ── loading / not found ────────────────────────────────────────────────────
  if (detailLoading && !user) return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <Loader2 className="animate-spin text-brand mb-4" size={40} />
      <p className="text-gray-500 font-medium">Loading profile…</p>
    </div>
  )

  if (!user && !detailLoading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center max-w-sm px-6">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">👤</div>
        <h3 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-2">User not found</h3>
        <Button variant="outline" onClick={() => navigate('/team')} className="mt-4 rounded-xl">Back to Team</Button>
      </div>
    </div>
  )

  const total    = perf?.total_leads   ?? 0
  const convRate = perf?.conversion_rate ?? 0
  const showPerf = user && ['sales_executive', 'external_caller', 'sales_manager'].includes(user.role)
  const gradient = roleGradients[user?.role] || 'from-brand/20 via-blue-500/10 to-purple-500/10'

  const histTabs = [
    { key: 'leads',      label: 'Leads',       icon: Users },
    { key: 'followups',  label: 'Follow-ups',  icon: PhoneCall },
    { key: 'sitevisits', label: 'Site Visits',  icon: CalendarCheck },
  ]

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12">

      {/* ── Breadcrumb / top bar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/team')}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand transition-colors group">
          <div className="w-8 h-8 rounded-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 flex items-center justify-center group-hover:border-brand/30 transition-all">
            <ArrowLeft size={16} />
          </div>
          Back to Team
        </button>
        {user && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => navigate('/users')}>
              User Management
            </Button>
          </div>
        )}
      </div>

      {user && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ════════════════════════════════════════════════════════════════
              LEFT COLUMN  (8 cols)
          ════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-8 space-y-6">

            {/* 1 ── Profile Header Card ──────────────────────────────────── */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] overflow-hidden shadow-sm hover:shadow-md transition-all">
              <div className={`h-24 bg-gradient-to-r ${gradient} opacity-80 dark:opacity-60`} />
              <div className="px-8 pb-8 relative">
                <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-10">
                  <div className="p-1.5 bg-white dark:bg-[#1a1a1a] rounded-[28px] shadow-xl">
                    <Avatar
                      name={`${user.first_name} ${user.last_name}`}
                      size="2xl"
                      className="rounded-[22px] w-24 h-24 md:w-28 md:h-28 text-2xl"
                    />
                  </div>
                  <div className="flex-1 space-y-2 mb-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">
                        {user.first_name} {user.last_name}
                      </h1>
                      <Badge label={user.is_active ? 'Active' : 'Inactive'} />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold uppercase text-[10px] ${roleColors[user.role]}`}>
                        {user.role?.replace(/_/g, ' ')}
                        {user.role === 'super_admin' && <Shield size={11} className="ml-1" />}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-gray-400">
                        <ShieldCheck size={13} className="text-brand" />
                        ID: {user.id?.slice(0, 8)}…
                      </span>
                    </div>
                    {user.manager && (
                      <div className="text-xs text-gray-400 flex items-center gap-1.5 mt-1">
                        <UserCheck size={12} className="text-brand" />
                        Reports to: <span className="font-semibold text-gray-600 dark:text-gray-300 ml-0.5">{user.manager.full_name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Info tiles row */}
                <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-8">
                  <InfoTile icon={Mail}     label="Email"        value={user.email}           color="text-blue-600 bg-blue-50" />
                  <InfoTile icon={Phone}    label="Phone"        value={user.phone_number}     color="text-purple-600 bg-purple-50" />
                  <InfoTile icon={Clock}    label="Last Login"   value={user.last_login ? new Date(user.last_login).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : 'Never'} color="text-teal-600 bg-teal-50" />
                  <InfoTile icon={BookOpen} label="Member Since" value={user.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'} color="text-amber-600 bg-amber-50" />
                </div>
              </div>
            </div>

            {/* 2 ── Performance Card ─────────────────────────────────────── */}
            {showPerf && (
              <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-8 shadow-sm">
                {/* Section header + date picker */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
                      <BarChart2 size={18} className="text-brand" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">Performance</h3>
                      <p className="text-xs text-gray-400">Lead conversion & activity stats</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <label className="text-[11px] text-gray-400">From</label>
                      <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                        className="text-xs bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-lg px-2.5 py-1.5 text-gray-900 dark:text-gray-100 outline-none focus:border-brand" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="text-[11px] text-gray-400">To</label>
                      <input type="date" value={to} onChange={e => setTo(e.target.value)}
                        className="text-xs bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-lg px-2.5 py-1.5 text-gray-900 dark:text-gray-100 outline-none focus:border-brand" />
                    </div>
                    <button onClick={fetchPerf}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-800 text-gray-400 hover:text-brand hover:border-brand bg-white dark:bg-[#1a1a1a] transition-colors">
                      <RefreshCw size={13} className={perfLoad ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>

                {perfLoad ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[...Array(8)].map((_, i) => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
                  </div>
                ) : perfErr ? (
                  <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl border border-red-200 dark:border-red-900">
                    <AlertCircle size={16} />{perfErr}
                  </div>
                ) : perf && (
                  <div className="space-y-6">
                    {/* Stat grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Total Leads',    value: total,         icon: Users,        color: 'text-brand bg-brand/10' },
                        { label: 'Booked',         value: perf.booked,   icon: CheckCircle2, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
                        { label: 'Conversion',     value: `${convRate}%`,icon: Target,       color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
                        { label: 'Lost',           value: perf.lost,     icon: XCircle,      color: 'text-red-500 bg-red-100 dark:bg-red-900/30' },
                      ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="bg-gray-50 dark:bg-[#0f0f0f] rounded-2xl px-4 py-4 border border-gray-100 dark:border-gray-800">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${color}`}>
                            <Icon size={16} />
                          </div>
                          <div className="text-xl font-display font-bold text-gray-900 dark:text-white">{value ?? '—'}</div>
                          <div className="text-[10px] text-gray-400 uppercase tracking-wide font-medium mt-0.5">{label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Pipeline bars */}
                    <div className="bg-gray-50 dark:bg-[#0f0f0f] rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <TrendingUp size={14} className="text-brand" />
                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Pipeline Breakdown</span>
                        </div>
                        <span className="text-xs text-gray-400">{total} leads total</span>
                      </div>
                      {total === 0 ? (
                        <p className="text-center text-sm text-gray-400 py-4">No leads in this period</p>
                      ) : (
                        <div className="space-y-3">
                          <PipelineBar label="Contacted"            value={perf.contacted}             total={total} color="bg-blue-400" />
                          <PipelineBar label="Interested"           value={perf.interested}            total={total} color="bg-indigo-400" />
                          <PipelineBar label="Site Visit Scheduled" value={perf.site_visits_scheduled} total={total} color="bg-teal-400" />
                          <PipelineBar label="Site Visit Done"      value={perf.site_visits_done}      total={total} color="bg-cyan-500" />
                          <PipelineBar label="Negotiation"          value={perf.negotiation}           total={total} color="bg-purple-400" />
                          <PipelineBar label="Booked"               value={perf.booked}                total={total} color="bg-green-500" />
                          <PipelineBar label="Lost"                 value={perf.lost}                  total={total} color="bg-red-400" />
                        </div>
                      )}
                    </div>

                    {/* Rate pills */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Contact rate', value: total > 0 ? `${Math.round((perf.contacted / total) * 100)}%` : '0%',         color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
                        { label: 'Visit rate',   value: total > 0 ? `${Math.round((perf.site_visits_done / total) * 100)}%` : '0%', color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/20' },
                        { label: 'Booking rate', value: `${convRate}%`,                                                               color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className={`rounded-2xl px-4 py-3 text-center ${color}`}>
                          <div className="text-xl font-display font-bold">{value}</div>
                          <div className="text-[10px] font-medium uppercase tracking-wider opacity-70 mt-0.5">{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3 ── Activity History Card ────────────────────────────────── */}
            {showPerf && (
              <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                    <BookOpen size={18} className="text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">Activity History</h3>
                    <p className="text-xs text-gray-400">Leads, follow-ups and site visits</p>
                  </div>
                </div>

                {/* Tab switcher */}
                <div className="flex gap-1 p-1 bg-gray-100 dark:bg-[#0f0f0f] rounded-xl mb-5 w-fit">
                  {histTabs.map(({ key, label, icon: Icon }) => (
                    <button key={key} onClick={() => setHistTab(key)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        histTab === key
                          ? 'bg-white dark:bg-[#1a1a1a] text-brand shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                      }`}>
                      <Icon size={14} />
                      {label}
                    </button>
                  ))}
                </div>

                <HistoryTab userId={id} tab={histTab} />
              </div>
            )}
          </div>

          {/* ════════════════════════════════════════════════════════════════
              RIGHT COLUMN  (4 cols)
          ════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-4 space-y-6">

            {/* 4 ── Quick stats sidebar ──────────────────────────────────── */}
            {showPerf && perf && (
              <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
                <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                  <TrendingUp size={17} className="text-brand" /> Quick Stats
                </h3>
                <div className="space-y-3">
                  {[
                    { icon: CalendarCheck, label: 'Visits Done',       value: perf.site_visits_done,      color: 'bg-teal-50 dark:bg-teal-900/20 text-teal-600' },
                    { icon: CalendarCheck, label: 'Visits Scheduled',  value: perf.site_visits_scheduled, color: 'bg-sky-50 dark:bg-sky-900/20 text-sky-600' },
                    { icon: PhoneCall,     label: 'Pending Follow-ups',value: perf.pending_followups,     color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' },
                    { icon: AlertCircle,   label: 'Overdue Follow-ups',value: perf.overdue_followups,     color: 'bg-red-50 dark:bg-red-900/20 text-red-500' },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="flex items-center justify-between p-3 rounded-[16px] bg-gray-50/60 dark:bg-[#0f0f0f]/60 border border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                          <Icon size={15} />
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{value ?? 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5 ── Contact card ─────────────────────────────────────────── */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
              <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <Phone size={17} className="text-blue-500" /> Contact
              </h3>

              <div className="space-y-3">
                <a href={`mailto:${user.email}`}
                  className="flex items-center justify-between p-4 rounded-[18px] bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 group hover:bg-blue-500 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 group-hover:bg-white/20 group-hover:text-white">
                      <Mail size={16} />
                    </div>
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-300 group-hover:text-white truncate max-w-[140px]">{user.email}</span>
                  </div>
                  <ExternalLink size={14} className="text-blue-400 group-hover:text-white flex-shrink-0" />
                </a>

                {user.phone_number && (
                  <a href={`tel:${user.phone_number}`}
                    className="flex items-center justify-between p-4 rounded-[18px] bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 group hover:bg-green-500 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center text-green-600 group-hover:bg-white/20 group-hover:text-white">
                        <Phone size={16} />
                      </div>
                      <span className="text-sm font-semibold text-green-700 dark:text-green-300 group-hover:text-white">{user.phone_number}</span>
                    </div>
                    <ExternalLink size={14} className="text-green-400 group-hover:text-white flex-shrink-0" />
                  </a>
                )}
              </div>
            </div>

            {/* 6 ── Manager info card ────────────────────────────────────── */}
            {user.manager && (
              <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
                <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                  <UserCheck size={17} className="text-teal-500" /> Reports To
                </h3>
                <div className="p-4 rounded-[18px] bg-gray-50/50 dark:bg-[#0f0f0f]/50 border border-gray-50 dark:border-gray-800">
                  <div className="flex items-center gap-4">
                    <Avatar name={user.manager.full_name} size="lg" className="rounded-2xl" />
                    <div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">{user.manager.full_name}</div>
                      <div className="text-[10px] font-bold text-brand uppercase tracking-wider mt-0.5">Sales Manager</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 7 ── Account info card ────────────────────────────────────── */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
              <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <ShieldCheck size={17} className="text-purple-500" /> Account Info
              </h3>
              <div className="space-y-3 text-xs text-gray-500 dark:text-gray-400">
                {[
                  { label: 'User ID',       value: user.id?.slice(0, 18) + '…' },
                  { label: 'Status',        value: user.is_active ? '● Active' : '● Inactive', cls: user.is_active ? 'text-green-500 font-semibold' : 'text-red-400 font-semibold' },
                  { label: 'Role',          value: user.role?.replace(/_/g, ' ') },
                  { label: 'Joined',        value: user.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—' },
                  { label: 'Last Login',    value: user.last_login ? new Date(user.last_login).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : 'Never' },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <span className="text-gray-400 dark:text-[#888]">{label}</span>
                    <span className={`font-medium text-gray-700 dark:text-gray-300 text-right ${cls || ''}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}