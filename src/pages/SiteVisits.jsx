import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useModulePermissions } from '../hooks/usePermission'
import { Plus, List, CalendarDays, ChevronDown, Edit2, X, CheckCircle, RefreshCw, Eye, Download, Clock, LogIn, LogOut, Building2, User, RotateCcw, StarIcon, MoreVertical } from 'lucide-react'
import {
  fetchSiteVisits, fetchMySiteVisits, createSiteVisit, updateSiteVisit,
  updateSiteVisitStatus, cancelSiteVisit, clearSiteVisitError,
} from '../store/siteVisitSlice'
import { fetchLeads } from '../store/leadSlice'
import { fetchProjects } from '../store/projectSlice'
import { fetchUsers } from '../store/userSlice'
import ListSkeleton from '../components/loaders/ListSkeleton'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import CustomSelect from '../components/ui/CustomSelect'
import ConfirmModal from '../components/ui/ConfirmModal'
import api from '../api/axios'
import Avatar from '../components/ui/Avatar'
import Modal from '../components/ui/Modal'
import ExportModal from '../components/ui/ExportModal'

const ROLE_ORDER = { super_admin: 0, admin: 1, associate_partner: 2, cluster_head: 3, partner: 4, team_leader: 5, sales_manager: 6, sales_executive: 7, external_caller: 8 }
const ROLE_LABEL = { super_admin: 'Super Admin', admin: 'Admin', associate_partner: 'Associate Partner', cluster_head: 'Cluster Head', partner: 'Partner', team_leader: 'Team Leader', sales_manager: 'Sales Manager', sales_executive: 'Sales Executive', external_caller: 'External Caller' }
const sortByRole = users => [...users].sort((a, b) => (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99))

const visitStatuses = ['scheduled', 'done', 'cancelled', 'rescheduled', 'no_show']
const statusLabel = { scheduled: 'Scheduled', done: 'Completed', cancelled: 'Cancelled', rescheduled: 'Rescheduled', no_show: 'No Show' }
const statusOptions = visitStatuses.map(s => ({ value: s, label: statusLabel[s] }))
const statusColor = {
  scheduled:   'bg-blue-100 dark:bg-blue-900/30 text-[#0082f3] dark:text-blue-400',
  done:        'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  cancelled:   'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400',
  rescheduled: 'bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-300',
  no_show:     'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
}

const defaultForm = {
  lead_id: '',
  project_id: '',
  visit_date: '',
  visit_time: '',
  assigned_to: '',
  notes: '',
  transport_arranged: false,
}
const defaultFeedback = { status: 'done', feedback: '' }

// ─── Circular Clock Picker ───────────────────────────────────────────────────

function ClockPicker({ value, onChange, label, icon: Icon, iconColor = 'text-gray-400', required = false }) {
  const [open,    setOpen]    = useState(false)
  const [mode,    setMode]    = useState('hour')   // 'hour' | 'minute'
  const svgRef  = useRef(null)
  const ref     = useRef(null)

  const [hh, mm] = value ? value.split(':') : ['00', '00']
  const hour   = parseInt(hh || 0)
  const minute = parseInt(mm || 0)

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  // Compute angle from center click on SVG
  const getValueFromAngle = (clientX, clientY) => {
    const rect   = svgRef.current.getBoundingClientRect()
    const cx     = rect.left + rect.width  / 2
    const cy     = rect.top  + rect.height / 2
    const dx     = clientX - cx
    const dy     = clientY - cy
    let   angle  = Math.atan2(dy, dx) * (180 / Math.PI) + 90
    if (angle < 0) angle += 360
    if (mode === 'hour') {
      const h = Math.round(angle / 30) % 12
      return h === 0 ? 12 : h
    } else {
      return Math.round(angle / 6) % 60
    }
  }

  const handleClockClick = (e) => {
    const val = getValueFromAngle(e.clientX, e.clientY)
    if (mode === 'hour') {
      const newHH = String(val === 12 ? 0 : val).padStart(2,'0')
      onChange(`${newHH}:${mm || '00'}`)
      setMode('minute')
    } else {
      const newMM = String(val).padStart(2,'0')
      onChange(`${hh || '00'}:${newMM}`)
    }
  }

  const handleAMPM = (isAM) => {
    const h = parseInt(hh || 0)
    let newH = h
    if (isAM && h >= 12) newH = h - 12
    if (!isAM && h < 12) newH = h + 12
    onChange(`${String(newH).padStart(2,'0')}:${mm || '00'}`)
  }

  // Build clock face numbers + hand
  const SIZE    = 220
  const CX      = SIZE / 2
  const CY      = SIZE / 2
  const R_OUTER = 88
  const R_INNER = 62  // inner ring for 13-23

  // For hour mode: 1-12 outer, 13-24 inner (24h clock)
  // For minute mode: 0,5,10...55 outer
  const clockNumbers = mode === 'hour'
    ? [
        ...Array.from({length:12},(_,i)=>({ val: i===0?12:i,  r: R_OUTER, is12h: true  })),
        ...Array.from({length:12},(_,i)=>({ val: i===0?0:i+12, r: R_INNER, is12h: false })),
      ]
    : Array.from({length:12},(_,i)=>({ val: i*5, r: R_OUTER, is12h: true }))

  const activeVal = mode === 'hour' ? (hour === 0 ? 0 : hour % 24) : minute
  const handAngle = mode === 'hour'
    ? ((activeVal % 12 === 0 ? 12 : activeVal % 12) / 12) * 360 - 90
    : (activeVal / 60) * 360 - 90
  const handR     = mode === 'hour' ? (hour >= 13 || hour === 0 ? R_INNER : R_OUTER) : R_OUTER
  const handX     = CX + handR * Math.cos(handAngle * Math.PI / 180)
  const handY     = CY + handR * Math.sin(handAngle * Math.PI / 180)

  const isAM = hour < 12
  const display12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  const displayStr = value
    ? `${String(display12).padStart(2,'0')}:${mm || '00'} ${isAM ? 'AM' : 'PM'}`
    : '--:-- --'

  return (
    <div className="relative" ref={ref}>
      {label && (
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
          {label}{required && ' *'}
        </label>
      )}
      {/* Trigger */}
      <div
        onClick={() => { setOpen(o => !o); setMode('hour') }}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm border rounded-xl cursor-pointer transition-all select-none
          ${open
            ? 'border-[#0082f3] bg-white dark:bg-gray-800 ring-1 ring-[#0082f3]/20'
            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
      >
        {Icon && <Icon size={14} className={`flex-shrink-0 ${iconColor}`} />}
        <span className={`flex-1 font-mono text-base tracking-widest ${value ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
          {value || '--:--'}
        </span>
        <Clock size={14} className="text-gray-400 flex-shrink-0" />
      </div>

      {/* Clock panel — centered in modal */}
      {open && (
        <>
          {/* Overlay to catch clicks and dim background */}
          <div className="fixed inset-0 z-[9998] bg-black/10 backdrop-blur-[1px]" onClick={() => setOpen(false)} />
          
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-[32px] shadow-2xl shadow-black/40 overflow-hidden flex flex-col items-center"
            style={{ width: 'min(320px, 80vw)' }}>

            {/* Digital display + AM/PM */}
            <div className="bg-[#0082f3] w-full px-8 py-6 flex items-center justify-between">
              <div className="flex items-baseline gap-1">
                <span
                  onClick={() => setMode('hour')}
                  className={`font-mono text-5xl font-bold cursor-pointer transition-opacity ${mode==='hour' ? 'opacity-100' : 'opacity-60'} text-white`}>
                  {String(display12).padStart(2,'0')}
                </span>
                <span className="font-mono text-5xl font-bold text-white/80">:</span>
                <span
                  onClick={() => setMode('minute')}
                  className={`font-mono text-5xl font-bold cursor-pointer transition-opacity ${mode==='minute' ? 'opacity-100' : 'opacity-60'} text-white`}>
                  {mm || '00'}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => handleAMPM(true)}
                  className={`w-12 h-9 text-sm font-bold rounded-xl transition-all ${isAM ? 'bg-white text-[#0082f3] shadow-md' : 'text-white/60 hover:text-white/90'}`}>
                  AM
                </button>
                <button onClick={() => handleAMPM(false)}
                  className={`w-12 h-9 text-sm font-bold rounded-xl transition-all ${!isAM ? 'bg-white text-[#0082f3] shadow-md' : 'text-white/60 hover:text-white/90'}`}>
                  PM
                </button>
              </div>
            </div>

            {/* Mode toggle */}
            <div className="flex w-full border-b border-gray-100 dark:border-gray-800">
              <button onClick={() => setMode('hour')}
                className={`flex-1 py-3 text-xs font-bold tracking-widest transition-colors ${mode==='hour' ? 'text-[#0082f3] border-b-2 border-[#0082f3]' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
                HOUR
              </button>
              <button onClick={() => setMode('minute')}
                className={`flex-1 py-3 text-xs font-bold tracking-widest transition-colors ${mode==='minute' ? 'text-[#0082f3] border-b-2 border-[#0082f3]' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
                MINUTE
              </button>
            </div>

            {/* Circular clock face */}
            <div className="flex justify-center py-6 px-6 bg-gray-50/30 dark:bg-black/10 w-full">
              <svg ref={svgRef} width={260} height={260} onClick={handleClockClick}
                style={{ cursor: 'pointer' }}>
                {/* Background circle */}
                <circle cx={130} cy={130} r={126} fill="var(--clock-bg, #ffffff)" className="dark:fill-gray-900" />
                <circle cx={130} cy={130} r={126} fill="none" stroke="#E2E8F0" strokeWidth="0.5" className="dark:stroke-gray-800" />

                {/* Inner ring separator (hour mode only) */}
                {mode === 'hour' && (
                  <circle cx={130} cy={130} r={R_INNER + 20} fill="none"
                    stroke="#E2E8F0" strokeWidth="0.5" strokeDasharray="4,4" className="dark:stroke-gray-700" />
                )}

                {/* Hand */}
                <line
                  x1={130} y1={130} x2={130 + handR * 1.18 * Math.cos(handAngle * Math.PI / 180)} y2={130 + handR * 1.18 * Math.sin(handAngle * Math.PI / 180)}
                  stroke="#0082f3" strokeWidth="2.5" strokeLinecap="round" />
                {/* Center dot */}
                <circle cx={130} cy={130} r={5} fill="#0082f3" />
                {/* Tip dot */}
                <circle cx={130 + handR * 1.18 * Math.cos(handAngle * Math.PI / 180)} cy={130 + handR * 1.18 * Math.sin(handAngle * Math.PI / 180)} r={20} fill="#0082f3" opacity="0.15" />
                <circle cx={130 + handR * 1.18 * Math.cos(handAngle * Math.PI / 180)} cy={130 + handR * 1.18 * Math.sin(handAngle * Math.PI / 180)} r={10}  fill="#0082f3" />

                {/* Numbers */}
                {clockNumbers.map(({ val, r, is12h }) => {
                  const displayVal = mode === 'hour'
                    ? (val === 0 ? '00' : String(val).padStart(2,'0'))
                    : String(val).padStart(2,'0')
                  const indexAngle = mode === 'hour'
                    ? ((val % 12 === 0 ? 0 : val % 12) / 12) * 360 - 90
                    : (val / 60) * 360 - 90
                  const x = 130 + r * 1.18 * Math.cos(indexAngle * Math.PI / 180)
                  const y = 130 + r * 1.18 * Math.sin(indexAngle * Math.PI / 180)
                  const isActive = mode === 'hour'
                    ? activeVal === val
                    : activeVal === val
                  return (
                    <g key={`${mode}-${val}`}>
                      {isActive && <circle cx={x} cy={y} r={18} fill="#0082f3" />}
                      <text
                        x={x} y={y}
                        textAnchor="middle" dominantBaseline="central"
                        fontSize={is12h ? 13 : 11}
                        fontWeight={isActive ? 700 : 500}
                        fill={isActive ? '#ffffff' : is12h ? '#374151' : '#9CA3AF'}
                        className={isActive ? '' : 'dark:fill-gray-400'}
                        style={{ userSelect: 'none', fontFamily: 'monospace' }}
                      >
                        {displayVal}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center w-full bg-white dark:bg-[#1a1a1a]">
              <button onClick={() => { onChange(''); setOpen(false) }}
                className="text-sm font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                CLEAR
              </button>
              <button onClick={() => setOpen(false)}
                className="px-8 py-2.5 bg-[#0082f3] hover:bg-[#0070d4] text-white text-sm font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-95">
                DONE
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Forms defined OUTSIDE to prevent typing/focus loss bug ───────────────────

function VisitForm({ formData, setFormData, leads, projects, salesExecs, isEdit, currentUser }) {
  const ic = "w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm transition-all duration-200"
  const lc = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"

  const leadOptions = leads.map(l => ({
    value: l.id,
    label: `${l.name} ${l.phone ? `— ${l.phone}` : ''}`
  }))

  const projectOptions = projects.map(p => ({
    value: p.id,
    label: `${p.name} ${p.locality ? `— ${p.locality}` : p.location ? `— ${p.location}` : ''}`
  }))

  const execOptions = [
    ...(currentUser ? [{ value: currentUser.id, label: `Self · ${ROLE_LABEL[currentUser.role] || currentUser.role}` }] : []),
    ...salesExecs.filter(u => u.id !== currentUser?.id).map(u => ({
      value: u.id,
      label: `${u.first_name} ${u.last_name} · ${ROLE_LABEL[u.role] || u.role}`
    }))
  ]

  return (
    <div className="space-y-4">

      {/* Lead dropdown */}
      <CustomSelect
        label="Lead"
        required
        value={formData.lead_id}
        onChange={val => setFormData(p => ({ ...p, lead_id: val }))}
        options={leadOptions}
        placeholder="Select lead..."
      />

      {/* Project dropdown */}
      <CustomSelect
        label="Project"
        required
        value={formData.project_id}
        onChange={val => setFormData(p => ({ ...p, project_id: val }))}
        options={projectOptions}
        placeholder="Select project..."
      />

      {/* Date + Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lc}>Visit Date *</label>
          <input required type="date" value={formData.visit_date}
            onChange={e => setFormData(p => ({ ...p, visit_date: e.target.value }))}
            className={ic} />
        </div>
        <ClockPicker
          label="Visit Time"
          required
          value={formData.visit_time}
          onChange={val => setFormData(p => ({ ...p, visit_time: val }))}
          icon={Clock}
        />
      </div>

      {/* Assign To */}
      <CustomSelect
        label="Assign To"
        value={formData.assigned_to}
        onChange={val => setFormData(p => ({ ...p, assigned_to: val }))}
        options={execOptions}
        placeholder="Select team member"
        searchable
      />

      {/* Status (edit only) */}
      {isEdit && (
        <CustomSelect
          label="Status"
          value={formData.status || 'scheduled'}
          onChange={val => setFormData(p => ({ ...p, status: val }))}
          options={statusOptions}
        />
      )}

      {/* Transport arranged */}
      <div className="flex items-center gap-3 p-3 bg-[#f8fafc] dark:bg-[#0f0f0f] border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl">
        <input
          type="checkbox"
          id="transport"
          checked={formData.transport_arranged}
          onChange={e => setFormData(p => ({ ...p, transport_arranged: e.target.checked }))}
          className="w-4 h-4 accent-brand rounded border-gray-300"
        />
        <label htmlFor="transport" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none font-medium">
          Transport arranged for client
        </label>
      </div>

      {/* Notes */}
      <div>
        <label className={lc}>Notes</label>
        <textarea rows={3} value={formData.notes}
          onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
          placeholder="Client wants to see 2BHK and 3BHK units. Prefers upper floors."
          className={ic} />
      </div>
    </div>
  )
}

function FeedbackForm({ formData, setFormData }) {
  const lc = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"

  return (
    <div className="space-y-4">
      <CustomSelect
        label="Outcome"
        required
        value={formData.status}
        onChange={val => setFormData(p => ({ ...p, status: val }))}
        options={visitStatuses.filter(s => s !== 'scheduled').map(s => ({
          value: s,
          label: statusLabel[s]
        }))}
      />
      <div>
        <label className={lc}>Feedback</label>
        <textarea rows={4} value={formData.feedback}
          onChange={e => setFormData(p => ({ ...p, feedback: e.target.value }))}
          placeholder="Client liked the property, interested in 3BHK on 8th floor..."
          className="w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm transition-all duration-200 resize-none" />
      </div>
    </div>
  )
}

function RevisitModal({ visit, salesExecs, currentUser, onClose, onSuccess }) {
  const ic = "w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm transition-all duration-200"
  const lc = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"

  const [form, setForm] = useState({
    original_visit_id: visit.id,
    visit_date: '',
    visit_time: '',
    assigned_to: typeof visit.assigned_to === 'object' ? visit.assigned_to.id : visit.assigned_to,
    reason: '',
    notes: '',
    transport_arranged: false,
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const execOptions = [
    ...(currentUser ? [{ value: currentUser.id, label: `Self · ${ROLE_LABEL[currentUser.role] || currentUser.role}` }] : []),
    ...salesExecs.filter(u => u.id !== currentUser?.id).map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name} · ${ROLE_LABEL[u.role] || u.role}` }))
  ]

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.visit_date || !form.visit_time) {
      setError('Date and time are required'); return
    }
    setLoading(true); setError('')
    try {
      await api.post('/site-revisits', form)
      onSuccess()
      onClose()
    } catch (e) { setError(e.response?.data?.message || 'Failed to schedule re-visit') }
    finally { setLoading(false) }
  }

  return (
    <Modal isOpen onClose={onClose} title="Schedule Re-visit" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-xl">
          <Avatar name={visit.lead_name || '?'} size="sm" />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{visit.lead_name}</p>
            <p className="text-xs text-gray-400">{visit.project_name} · Original Visit: {visit.visit_date?.split('T')[0]}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lc}>Visit Date *</label>
            <input type="date" required value={form.visit_date}
              onChange={e => setForm(p => ({ ...p, visit_date: e.target.value }))} className={ic} />
          </div>
          <ClockPicker
            label="Visit Time"
            required
            value={form.visit_time}
            onChange={val => setForm(p => ({ ...p, visit_time: val }))}
            icon={Clock}
          />
        </div>

        <CustomSelect label="Assign To" value={form.assigned_to}
          onChange={v => setForm(p => ({ ...p, assigned_to: v }))}
          options={execOptions} placeholder="Select team member" searchable />

        <div>
          <label className={lc}>Reason for Re-visit</label>
          <input value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
            placeholder="Client wanted to see 3BHK units again..." className={ic} />
        </div>

        <div>
          <label className={lc}>Notes</label>
          <textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            placeholder="Bring updated price list..." className={ic} />
        </div>

        <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-xl cursor-pointer">
          <input type="checkbox" checked={form.transport_arranged}
            onChange={e => setForm(p => ({ ...p, transport_arranged: e.target.checked }))}
            className="w-4 h-4 accent-brand" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Transport arranged for client</span>
        </label>

        {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">{error}</p>}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" loading={loading}>Schedule Re-visit</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SiteVisits() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { list, loading, pagination, actionLoading, actionError } = useSelector(s => s.siteVisits)
  const { list: leadList }    = useSelector(s => s.leads)
  const { list: projectList } = useSelector(s => s.projects)
  const { list: userList }    = useSelector(s => s.users)
  const { user: currentUser } = useSelector(s => s.auth)

  const [viewMode,      setViewMode]      = useState('list')
  const [filterView,    setFilterView]    = useState('team') // 'mine' | 'team'
  const [filterStatus,  setFilterStatus]  = useState('')
  const [selectedDate,  setSelectedDate]  = useState(new Date().toISOString().split('T')[0])
  const [page,          setPage]          = useState(1)

  const [showAddModal,      setShowAddModal]      = useState(false)
  const [showRevisitModal,  setShowRevisitModal]  = useState(false)
  const [showEditModal,     setShowEditModal]      = useState(false)
  const [showFeedbackModal, setShowFeedbackModal]  = useState(false)
  const [showCancelModal,   setShowCancelModal]    = useState(false)
  const [visitToCancel,     setVisitToCancel]      = useState(null)
  const [showExportModal,   setShowExportModal]    = useState(false)
  const [selectedVisit,     setSelectedVisit]      = useState(null)

  const [addForm,      setAddForm]      = useState(defaultForm)
  const [editForm,     setEditForm]     = useState({ ...defaultForm, status: 'scheduled' })
  const [feedbackForm, setFeedbackForm] = useState(defaultFeedback)
  const [success,      setSuccess]      = useState('')
  const [exporting,    setExporting]    = useState(false)
  const [openMenuVisitId, setOpenMenuVisitId] = useState(null)
  const menuRef = useRef(null)

  const loadVisits = () => {
    const params = { page, per_page: 20 }
    if (filterStatus) params.status = filterStatus
    if (filterView === 'mine') {
      dispatch(fetchMySiteVisits(params))
    } else {
      dispatch(fetchSiteVisits(params))
    }
  }

  useEffect(() => { loadVisits() }, [dispatch, filterView, filterStatus, page])

  useEffect(() => {
    dispatch(fetchLeads({ per_page: 100 }))
    dispatch(fetchProjects({ per_page: 100, status: 'active' }))
    dispatch(fetchUsers())
  }, [dispatch])

  const salesExecs = sortByRole(userList.filter(u => u.is_active))
  const canManage = ['super_admin', 'admin', 'sales_manager'].includes(currentUser?.role)
  const perms = useModulePermissions('site_visits')

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleAdd = async (e) => {
    e.preventDefault()
    dispatch(clearSiteVisitError())
    const result = await dispatch(createSiteVisit(addForm))
    if (createSiteVisit.fulfilled.match(result)) {
      setSuccess('Visit scheduled!')
      loadVisits()
      setTimeout(() => { setShowAddModal(false); setSuccess(''); setAddForm(defaultForm) }, 800)
    }
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    dispatch(clearSiteVisitError())
    const result = await dispatch(updateSiteVisit({ id: selectedVisit.id, data: editForm }))
    if (updateSiteVisit.fulfilled.match(result)) {
      setSuccess('Visit updated!')
      loadVisits()
      setTimeout(() => { setShowEditModal(false); setSuccess('') }, 800)
    }
  }

  const handleFeedback = async (e) => {
    e.preventDefault()
    dispatch(clearSiteVisitError())
    const status = feedbackForm.status
    const result = await dispatch(updateSiteVisitStatus({
      id: selectedVisit.id,
      status: status,
      feedback: feedbackForm.feedback,
    }))
    if (updateSiteVisitStatus.fulfilled.match(result)) {
      setSuccess('Feedback saved!')
      loadVisits()
      setTimeout(() => { 
        setShowFeedbackModal(false)
        setSuccess('')
        if (status === 'rescheduled') {
          setShowRevisitModal(true)
        }
      }, 800)
    }
  }

  const handleCancel = async () => {
    if (!visitToCancel) return
    const result = await dispatch(cancelSiteVisit(visitToCancel.id))
    if (cancelSiteVisit.fulfilled.match(result)) {
      loadVisits()
    }
    setShowCancelModal(false)
    setVisitToCancel(null)
  }

  const confirmCancel = (visit) => {
    setVisitToCancel(visit)
    setShowCancelModal(true)
  }

  const openEdit = (visit) => {
    setSelectedVisit(visit)
    setEditForm({
      lead_id:             visit.lead_id || '',
      project_id:          visit.project_id || '',
      visit_date:          visit.visit_date?.split('T')[0] || '',
      visit_time:          visit.visit_time || '',
      assigned_to:         visit.assigned_to || '',
      notes:               visit.notes || '',
      transport_arranged:  visit.transport_arranged || false,
      status:              visit.status || 'scheduled',
    })
    setShowEditModal(true)
  }

  const openFeedback = (visit) => {
    setSelectedVisit(visit)
    setFeedbackForm({ status: visit.status === 'scheduled' ? 'done' : visit.status, feedback: visit.feedback || '' })
    setShowFeedbackModal(true)
  }

  const handleRevisit = (visit) => {
    setSelectedVisit(visit)
    setShowRevisitModal(true)
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuVisitId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // ── Calendar week ──────────────────────────────────────────────────────────
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay() + 1 + i)
    return d
  })

  const handleExport = async (dateRange) => {
    try {
      setExporting(true)
      const params = { ...dateRange }
      if (filterStatus) params.status = filterStatus
      const res = await api.get('/export/site-visits', { params, responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a'); a.href = url; a.download = `SiteVisits_${dateRange.from}_to_${dateRange.to}.xlsx`
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
      setShowExportModal(false)
    } catch (err) { console.error('Export failed:', err) } finally { setExporting(false) }
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* View toggle */}
          <div className="flex bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 rounded-xl p-1 gap-1">
            <button onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${viewMode === 'list' ? 'bg-brand text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'}`}>
              <List size={14} /> List
            </button>
            <button onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${viewMode === 'calendar' ? 'bg-brand text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'}`}>
              <CalendarDays size={14} /> Calendar
            </button>
          </div>

          {/* My / Team toggle — hidden for super_admin and admin */}
          {!['super_admin', 'admin'].includes(currentUser?.role) && (
            <div className="flex bg-card border border-gray-200 dark:border-gray-700 rounded-xl p-1 gap-1">
              {[
                { key: 'mine', label: 'My Visits' },
                { key: 'team', label: 'Team' },
              ].map(tab => (
                <button key={tab.key}
                  onClick={() => { setFilterView(tab.key); setPage(1) }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                    ${filterView === tab.key
                      ? 'bg-brand text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'}`}>
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Status filter */}
          <div className="w-44">
            <CustomSelect
              value={filterStatus}
              onChange={val => { setFilterStatus(val); setPage(1) }}
              options={[{ value: '', label: 'All Status' }, ...statusOptions]}
              placeholder="All Status"
            />
          </div>

          <button onClick={() => loadVisits()}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 text-gray-400 hover:text-brand hover:border-brand transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* <Button variant="outline" size="sm" icon={Download} loading={exporting} disabled={exporting} onClick={() => setShowExportModal(true)}>
            Export
          </Button> */}
          {perms.create && (
            <Button icon={Plus} onClick={() => { setAddForm(defaultForm); dispatch(clearSiteVisitError()); setShowAddModal(true) }}>
              Schedule Visit
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      {!loading && (
        <div className="text-sm text-gray-500 dark:text-[#888]">
          Showing <span className="font-semibold text-gray-900 dark:text-white">{list.length}</span>
          {pagination?.total > 0 && <> of <span className="font-semibold text-gray-900 dark:text-white">{pagination.total}</span></>} visits
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 rounded-2xl p-4 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50">
          <ListSkeleton rows={6} />
        </div>
      ) : viewMode === 'calendar' ? (
        // ── Calendar ──────────────────────────────────────────────────────────
        <div className="space-y-4">
          <div className="bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 rounded-2xl p-5 hover:shadow-lg transition-all duration-200">
            <h3 className="font-display text-base font-semibold text-gray-900 dark:text-white mb-4">This Week</h3>
            <div className="overflow-x-auto -mx-1 px-1">
              <div className="grid grid-cols-7 gap-2 min-w-[560px] sm:min-w-0">
                {weekDates.map((date, i) => {
                  const dateStr = date.toISOString().split('T')[0]
                  const dayVisits = list.filter(v => (v.visit_date || '').startsWith(dateStr))
                  const isSelected = selectedDate === dateStr
                  const isToday = dateStr === new Date().toISOString().split('T')[0]

                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`rounded-xl border p-3 min-h-[120px] cursor-pointer transition-all duration-200
                        ${isSelected ? 'border-brand bg-brand/5 ring-1 ring-brand/20 shadow-md' : 'border-gray-100 dark:border-gray-800 hover:border-brand/30 hover:bg-gray-50 dark:hover:bg-gray-800/50'}
                        ${isToday && !isSelected ? 'bg-blue-50/30 dark:bg-blue-900/5' : ''}`}
                    >
                      <div className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${isSelected || isToday ? 'text-brand' : 'text-gray-400 dark:text-gray-500'}`}>
                        {days[i]}
                      </div>
                      <div className={`text-xl font-display font-bold mb-2 ${isSelected || isToday ? 'text-brand' : 'text-gray-900 dark:text-white'}`}>
                        {date.getDate()}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {dayVisits.slice(0, 3).map(v => (
                          <div key={v.id} className="w-1.5 h-1.5 rounded-full bg-brand"></div>
                        ))}
                        {dayVisits.length > 3 && <div className="text-[10px] text-gray-400 font-bold">+{dayVisits.length - 3}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Selected Date Visits */}
          <div className="bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-display text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <CalendarDays size={20} className="text-brand" />
                Visits on {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h4>
              <span className="text-xs font-semibold px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full">
                {list.filter(v => (v.visit_date || '').startsWith(selectedDate)).length} visits
              </span>
            </div>

            <div className="space-y-3">
              {(() => { const dayVisits = list.filter(v => (v.visit_date || '').startsWith(selectedDate)); return dayVisits.length === 0 ? (
                <div className="py-10 text-center text-gray-400 dark:text-gray-500 italic">
                  No visits scheduled for this day
                </div>
              ) : (
                dayVisits.map((visit, visitIdx) => (
                  <div key={visit.id} className="group flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-brand/30 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-all">
                    <Avatar name={visit.lead_name || visit['lead name'] || '?'} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span 
                          className="font-bold text-gray-900 dark:text-white truncate cursor-pointer hover:text-brand transition-colors"
                          onClick={() => visit.lead_id ? navigate(`/leads/${visit.lead_id}`) : navigate(`/site-visits/${visit.id}`)}
                        >
                          {visit.lead_name || visit['lead name']}
                        </span>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${statusColor[visit.status] || ''}`}>
                          {statusLabel[visit.status]}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                        {visit.rating && (
                          <div className="flex items-center gap-0.5">
                            {[1,2,3,4,5].map(n => (
                              <StarIcon 
                                key={n} 
                                size={10} 
                                fill={visit.rating >= n ? 'currentColor' : 'none'} 
                                className={visit.rating >= n ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600'} 
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2" ref={openMenuVisitId === visit.id ? menuRef : null}>
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuVisitId(openMenuVisitId === visit.id ? null : visit.id)}
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-brand hover:bg-brand/10 transition-all">
                          <MoreVertical size={16} />
                        </button>
                        
                        {openMenuVisitId === visit.id && (
                          <div className={`absolute right-0 w-48 max-h-64 overflow-y-auto bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg z-50 py-1 ${visitIdx >= dayVisits.length - 2 ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
                            <button
                              onClick={() => { navigate(`/site-visits/${visit.id}`); setOpenMenuVisitId(null); }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                              <Eye size={14} />
                              View Details
                            </button>
                            {['done', 'rescheduled'].includes(visit.status) && (
                              <button 
                                onClick={() => { handleRevisit(visit); setOpenMenuVisitId(null); }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <RotateCcw size={14} />
                                Schedule Revisit
                              </button>
                            )}
                            {perms.edit && visit.status === 'scheduled' && (
                              <>
                                <button 
                                  onClick={() => { openEdit(visit); setOpenMenuVisitId(null); }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                  <Edit2 size={14} />
                                  Edit
                                </button>
                                <button 
                                  onClick={() => { openFeedback(visit); setOpenMenuVisitId(null); }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                  <CheckCircle size={14} />
                                  Mark Outcome
                                </button>
                                <button 
                                  onClick={() => { confirmCancel(visit); setOpenMenuVisitId(null); }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                  <X size={14} />
                                  Cancel
                                </button>
                              </>
                            )}
                            {visit.status !== 'scheduled' && (
                              <button 
                                onClick={() => { openFeedback(visit); setOpenMenuVisitId(null); }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <Edit2 size={14} />
                                Edit Feedback
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) })()}
            </div>
          </div>
        </div>
      ) : (
        // ── List ──────────────────────────────────────────────────────────────
        <div className="bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 rounded-2xl shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 hover:shadow-lg hover:shadow-gray-300/50 dark:hover:shadow-gray-900/50 transition-all duration-200">
          {list.length === 0 ? (
            <div className="py-16 text-center text-gray-400 dark:text-[#888]">
              <CalendarDays size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
              <p className="font-medium">No site visits found</p>
              <p className="text-sm mt-1">Schedule a visit to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0f0f0f]">
                    {['Lead', 'Project', 'Date & Time', ...(filterView !== 'mine' ? ['Assigned To'] : []), 'Transport', 'Status', 'Feedback', 'Actions'].map(h => (
                      <th key={h} className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-[#888] uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {list.map((visit, visitIdx) => (
                    <tr key={visit.id} className="hover:bg-gray-50 dark:hover:bg-[#0f0f0f] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={visit.lead_name || visit['lead name'] || '?'} size="sm" />
                          <div>
                            <div 
                              className="font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:text-brand transition-colors"
                              onClick={() => visit.lead_id ? navigate(`/leads/${visit.lead_id}`) : navigate(`/site-visits/${visit.id}`)}
                            >
                              {visit.lead_name || visit['lead name'] || '—'}
                            </div>
                            <div className="text-xs text-gray-400">{visit.lead_phone || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400 text-xs">
                        {visit.project_name || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900 dark:text-gray-100 text-xs">
                          {visit.visit_date?.split('T')[0] || '—'}
                        </div>
                        <div className="text-xs text-gray-400">{visit.visit_time || ''}</div>
                      </td>
                      {filterView !== 'mine' && (
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <Avatar
                              name={visit.assigned_to_name || '?'}
                              size="xs"
                            />
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {visit.assigned_to_name || '—'}
                            </span>
                          </div>
                        </td>
                      )}
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${visit.transport_arranged ? 'bg-green-100 dark:bg-green-900/20 text-green-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                          {visit.transport_arranged ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${statusColor[visit.status] || ''}`}>
                          {statusLabel[visit.status] || visit.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs text-gray-500 dark:text-[#888] line-clamp-2 max-w-[160px]">
                          {visit.rating ? (
                            <div className="flex items-center gap-0.5">
                              {[1,2,3,4,5].map(n => (
                                <StarIcon 
                                  key={n} 
                                  size={12} 
                                  fill={visit.rating >= n ? 'currentColor' : 'none'} 
                                  className={visit.rating >= n ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600'} 
                                />
                              ))}
                              <span className="ml-1">{visit.rating}</span>
                            </div>
                          ) : '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4" ref={openMenuVisitId === visit.id ? menuRef : null}>
                        <div className="flex items-center justify-end">
                          <div className="relative">
                            <button
                              onClick={() => setOpenMenuVisitId(openMenuVisitId === visit.id ? null : visit.id)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand hover:bg-brand/10 transition-all">
                              <MoreVertical size={16} />
                            </button>
                            
                            {openMenuVisitId === visit.id && (
                              <div className={`absolute right-0 w-48 max-h-64 overflow-y-auto bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg z-50 py-1 ${visitIdx >= list.length - 2 ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
                                <button
                                  onClick={() => { navigate(`/site-visits/${visit.id}`); setOpenMenuVisitId(null); }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                  <Eye size={14} />
                                  View Details
                                </button>
                                {['done', 'rescheduled'].includes(visit.status) && (
                                  <button 
                                    onClick={() => { handleRevisit(visit); setOpenMenuVisitId(null); }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                    <RotateCcw size={14} />
                                    Schedule Revisit
                                  </button>
                                )}
                                {perms.edit && visit.status === 'scheduled' && (
                                  <>
                                    <button 
                                      onClick={() => { openEdit(visit); setOpenMenuVisitId(null); }}
                                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                      <Edit2 size={14} />
                                      Edit
                                    </button>
                                    <button 
                                      onClick={() => { openFeedback(visit); setOpenMenuVisitId(null); }}
                                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                      <CheckCircle size={14} />
                                      Mark Outcome
                                    </button>
                                    <button 
                                      onClick={() => { confirmCancel(visit); setOpenMenuVisitId(null); }}
                                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                      <X size={14} />
                                      Cancel
                                    </button>
                                  </>
                                )}
                                {visit.status !== 'scheduled' && (
                                  <button 
                                    onClick={() => { openFeedback(visit); setOpenMenuVisitId(null); }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                    <Edit2 size={14} />
                                    Edit Feedback
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
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {pagination?.total_pages > 1 && (
        <div className="flex items-center justify-between px-2 text-xs text-gray-500">
          <span>Page {pagination.page} of {pagination.total_pages} · {pagination.total} total</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
            <Button size="sm" variant="outline" disabled={page >= pagination.total_pages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setSuccess('') }} title="Schedule Site Visit">
        <form onSubmit={handleAdd} className="space-y-4">
          <VisitForm formData={addForm} setFormData={setAddForm} leads={leadList} projects={projectList} salesExecs={salesExecs} isEdit={false} currentUser={currentUser} />
          {success && <p className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 py-2 text-center rounded-xl">{success}</p>}
          {actionError && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 py-2 text-center rounded-xl">{actionError}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={actionLoading}>Schedule Visit</Button>
          </div>
        </form>
      </Modal>

      {/* Re-visit Modal */}
      {showRevisitModal && selectedVisit && (
        <RevisitModal
          visit={selectedVisit}
          salesExecs={salesExecs}
          currentUser={currentUser}
          onClose={() => setShowRevisitModal(false)}
          onSuccess={() => {
            setSuccess('Re-visit scheduled!')
            loadVisits()
            setTimeout(() => setSuccess(''), 3000)
          }}
        />
      )}

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSuccess('') }} title="Edit Site Visit">
        <form onSubmit={handleEdit} className="space-y-4">
          <VisitForm formData={editForm} setFormData={setEditForm} leads={leadList} projects={projectList} salesExecs={salesExecs} isEdit={true} currentUser={currentUser} />
          {success && <p className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 py-2 text-center rounded-xl">{success}</p>}
          {actionError && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 py-2 text-center rounded-xl">{actionError}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={actionLoading}>Update Visit</Button>
          </div>
        </form>
      </Modal>

      {/* Feedback Modal */}
      <Modal isOpen={showFeedbackModal} onClose={() => { setShowFeedbackModal(false); setSuccess('') }} title="Visit Outcome & Feedback">
        <form onSubmit={handleFeedback} className="space-y-4">
          {selectedVisit && (
            <div className="flex items-center gap-3 p-3 bg-[#f8fafc] dark:bg-[#0f0f0f] rounded-xl">
              <Avatar name={selectedVisit.lead_name || '?'} size="sm" />
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedVisit.lead_name}</div>
                <div className="text-xs text-gray-400">
                  {selectedVisit.visit_date?.split('T')[0]} · {selectedVisit.visit_time} · {selectedVisit.project_name}
                </div>
              </div>
            </div>
          )}
          <FeedbackForm formData={feedbackForm} setFormData={setFeedbackForm} />
          {success && <p className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 py-2 text-center rounded-xl">{success}</p>}
          {actionError && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 py-2 text-center rounded-xl">{actionError}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowFeedbackModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={actionLoading}>Save Feedback</Button>
          </div>
        </form>
      </Modal>

      {/* Export Modal */}
      <ExportModal 
        isOpen={showExportModal} 
        onClose={() => setShowExportModal(false)} 
        onExport={handleExport} 
        loading={exporting}
        title="Export Site Visits"
      />

      <ConfirmModal 
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancel}
        title="Cancel Site Visit"
        message={`Are you sure you want to cancel the site visit for "${visitToCancel?.lead_name}"?`}
        confirmText="Cancel Visit"
        loading={actionLoading}
      />
    </div>
  )
}