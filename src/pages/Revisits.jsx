import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { useModulePermissions } from '../hooks/usePermission'
import { fetchTeamTree } from '../store/userSlice'
import {
  Plus, RefreshCw, Eye, Edit2, X, CheckCircle2, Clock, CalendarDays,
  Loader2, AlertCircle, ChevronDown, RotateCcw, Star, MessageSquare,
  Users, Building2, Car, Trash2, Search, Filter, Phone, MoreVertical, Download,
} from 'lucide-react'
import api from '../api/axios'
import Avatar from '../components/ui/Avatar'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import CustomSelect from '../components/ui/CustomSelect'
import AsyncSearchSelect from '../components/ui/AsyncSearchSelect'
import ConfirmModal from '../components/ui/ConfirmModal'
import ExportModal from '../components/ui/ExportModal'
import ListSkeleton from '../components/loaders/ListSkeleton'
import PhoneActions from '../components/ui/PhoneActions'
import PageSizeSelect, { resolvePerPage } from '../components/ui/PageSizeSelect'
import ClockPicker from '../components/ui/ClockPicker'
import DatePicker from '../components/ui/DatePicker'

// ── Constants ─────────────────────────────────────────────────────────────────
const ROLE_ORDER_MAP = { super_admin: 0, admin: 1, associate_partner: 2, cluster_head: 3, partner: 4, team_leader: 5, sales_manager: 6, sales_executive: 7, external_caller: 8 }
const ROLE_LABEL_MAP = { super_admin: 'Super Admin', admin: 'Admin', associate_partner: 'Associate Partner', cluster_head: 'Cluster Head', partner: 'Partner', team_leader: 'Team Leader', sales_manager: 'Sales Manager', sales_executive: 'Sales Executive', external_caller: 'External Caller' }
const sortByRole = users => [...users].sort((a, b) => (ROLE_ORDER_MAP[a.role] ?? 99) - (ROLE_ORDER_MAP[b.role] ?? 99))

const STATUS_VALUES = ['scheduled', 'done', 'cancelled', 'rescheduled', 'no_show']
const STATUS_LABEL  = { scheduled: 'Scheduled', done: 'Completed', cancelled: 'Cancelled', rescheduled: 'Rescheduled', no_show: 'No Show' }
const STATUS_COLOR  = {
  scheduled:   'bg-blue-100 dark:bg-blue-900/30 text-[#0082f3]',
  done:        'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  cancelled:   'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400',
  rescheduled: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  no_show:     'bg-gray-100 dark:bg-gray-800 text-gray-500',
}
const REACTION_OPTIONS  = ['very_positive','positive','neutral','negative','not_interested']
const NEXT_STEP_OPTIONS = ['negotiation','follow_up','send_proposal','booked','lost','another_revisit']
const REACTION_LABEL    = { very_positive:'Very Positive', positive:'Positive', neutral:'Neutral', negative:'Negative', not_interested:'Not Interested' }
const NEXT_STEP_LABEL   = { negotiation:'Negotiation', follow_up:'Follow Up', send_proposal:'Send Proposal', booked:'Booked', lost:'Lost', another_revisit:'Another Revisit' }
const STATUS_OPTIONS    = STATUS_VALUES.map(v => ({ value: v, label: STATUS_LABEL[v] }))
const REACTION_OPTS     = REACTION_OPTIONS.map(v => ({ value: v, label: REACTION_LABEL[v] }))
const NEXT_STEP_OPTS    = NEXT_STEP_OPTIONS.map(v => ({ value: v, label: NEXT_STEP_LABEL[v] }))

const ic = 'w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm transition-all'
const lc = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${STATUS_COLOR[status] || 'bg-gray-100 text-gray-500'}`}>
      {STATUS_LABEL[status] || status}
    </span>
  )
}

// ── Schedule Revisit Modal ────────────────────────────────────────────────────
function ScheduleModal({ siteVisits, salesExecs, currentUser, onClose, onSuccess }) {
  const [form, setForm] = useState({
    original_visit_id: '', visit_date: '', visit_time: '',
    assigned_to: '', reason: '', notes: '', transport_arranged: false,
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const svOptions = siteVisits.map(sv => ({
    value: sv.id,
    label: `${sv.lead_name} — ${sv.project_name} (${sv.visit_date?.split('T')[0] || '—'})`,
  }))
  const searchOriginalVisits = async q => {
    if (!q.trim()) return svOptions
    const term = q.toLowerCase()
    return svOptions.filter(opt => opt.label.toLowerCase().includes(term))
  }
  const execOptions = [
    ...(currentUser ? [{ value: currentUser.id, label: `Self · ${ROLE_LABEL_MAP[currentUser.role] || currentUser.role}` }] : []),
    ...salesExecs.filter(u => u.id !== currentUser?.id).map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name} · ${ROLE_LABEL_MAP[u.role] || u.role}` }))
  ]

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.original_visit_id || !form.visit_date || !form.visit_time) {
      setError('Original visit, date and time are required'); return
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
        <AsyncSearchSelect label="Original Site Visit *" required value={form.original_visit_id}
          onChange={v => setForm(p => ({ ...p, original_visit_id: v }))}
          onSearch={searchOriginalVisits} initialOptions={svOptions}
          placeholder="Type to search original visit..." />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DatePicker
            label="Visit Date"
            required
            value={form.visit_date}
            onChange={val => setForm(p => ({ ...p, visit_date: val }))}
          />
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
          options={execOptions} placeholder="Default: original visit's assignee" searchable />

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

// ── Edit Revisit Modal ────────────────────────────────────────────────────────
function EditModal({ revisit, salesExecs, currentUser, onClose, onSuccess }) {
  const [form, setForm] = useState({
    visit_date:          revisit.visit_date?.split('T')[0] || '',
    visit_time:          revisit.visit_time || '',
    assigned_to:         revisit.assigned_to?.id || revisit.assigned_to || '',
    reason:              revisit.reason || '',
    notes:               revisit.notes || '',
    transport_arranged:  revisit.transport_arranged || false,
    reschedule_reason:   '',
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const execOptions = [
    ...(currentUser ? [{ value: currentUser.id, label: `Self · ${ROLE_LABEL_MAP[currentUser.role] || currentUser.role}` }] : []),
    ...salesExecs.filter(u => u.id !== currentUser?.id).map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name} · ${ROLE_LABEL_MAP[u.role] || u.role}` }))
  ]

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await api.put(`/site-revisits/${revisit.id}`, form)
      onSuccess(); onClose()
    } catch (e) { setError(e.response?.data?.message || 'Update failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal isOpen onClose={onClose} title="Edit Re-visit" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DatePicker
            label="Visit Date"
            value={form.visit_date}
            onChange={val => setForm(p => ({ ...p, visit_date: val }))}
          />
          <ClockPicker
            label="Visit Time"
            value={form.visit_time}
            onChange={val => setForm(p => ({ ...p, visit_time: val }))}
            icon={Clock}
          />
        </div>

        <CustomSelect label="Assign To" value={form.assigned_to}
          onChange={v => setForm(p => ({ ...p, assigned_to: v }))}
          options={execOptions} placeholder="Select team member" searchable />

        <div>
          <label className={lc}>Reason</label>
          <input value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
            placeholder="Reason for re-visit..." className={ic} />
        </div>

        <div>
          <label className={lc}>Notes</label>
          <textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            className={ic} />
        </div>

        <div>
          <label className={lc}>Reschedule Reason <span className="font-normal text-gray-400">(if changing date/time)</span></label>
          <input value={form.reschedule_reason} onChange={e => setForm(p => ({ ...p, reschedule_reason: e.target.value }))}
            placeholder="Client requested morning slot..." className={ic} />
        </div>

        <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-xl cursor-pointer">
          <input type="checkbox" checked={form.transport_arranged}
            onChange={e => setForm(p => ({ ...p, transport_arranged: e.target.checked }))}
            className="w-4 h-4 accent-brand" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Transport arranged</span>
        </label>

        {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">{error}</p>}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" loading={loading}>Update Re-visit</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Status Modal ──────────────────────────────────────────────────────────────
function StatusModal({ revisit, onClose, onSuccess }) {
  const [status,  setStatus]  = useState(revisit.status || 'done')
  const [note,    setNote]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const needsNote = ['cancelled', 'no_show'].includes(status)

  const handleSubmit = async e => {
    e.preventDefault()
    if (needsNote && !note.trim()) { setError('Note is required for this status'); return }
    setLoading(true); setError('')
    try {
      await api.patch(`/site-revisits/${revisit.id}/status`, { status, note: note || undefined })
      onSuccess(); onClose()
    } catch (e) { setError(e.response?.data?.message || 'Status update failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal isOpen onClose={onClose} title="Update Re-visit Status" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0f0f0f] rounded-xl border border-gray-100 dark:border-gray-800">
          <Avatar name={revisit.lead_name} size="sm" />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{revisit.lead_name}</p>
            <p className="text-xs text-gray-400">{fmtDate(revisit.visit_date)} · {revisit.visit_time} · {revisit.project_name}</p>
          </div>
        </div>

        <CustomSelect label="New Status *" value={status} onChange={setStatus}
          options={STATUS_OPTIONS} />

        <div>
          <label className={lc}>Note {needsNote ? '*' : '(optional)'}</label>
          <textarea rows={3} value={note} onChange={e => setNote(e.target.value)}
            placeholder={needsNote ? 'Reason is required...' : 'Add a note...'}
            className={ic} />
        </div>

        {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">{error}</p>}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" loading={loading}>Update Status</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Feedback Modal ────────────────────────────────────────────────────────────
function FeedbackModal({ revisit, onClose, onSuccess, salesExecs = [], currentUser }) {
  const [form, setForm] = useState({
    rating: '', client_reaction: '', interested_in: '', next_step: '', remarks: '', closing_person: '',
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.client_reaction || !form.next_step) { setError('Client reaction and next step are required'); return }
    setLoading(true); setError('')
    try {
      const { closing_person, ...feedbackPayload } = form
      await api.post(`/site-revisits/${revisit.id}/feedback`, {
        ...feedbackPayload,
        rating: form.rating ? parseInt(form.rating) : undefined,
        ...(closing_person && { closing_person }),
      })
      onSuccess(); onClose()
    } catch (e) { setError(e.response?.data?.message || 'Failed to submit feedback') }
    finally { setLoading(false) }
  }

  return (
    <Modal isOpen onClose={onClose} title="Submit Re-visit Feedback" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-[#f0f6ff] dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
          <Avatar name={revisit.lead_name} size="sm" />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{revisit.lead_name}</p>
            <p className="text-xs text-gray-500">{revisit.project_name} · {fmtDate(revisit.visit_date)}</p>
          </div>
        </div>

        {/* Star rating */}
        <div>
          <label className={lc}>Rating</label>
          <div className="flex gap-2">
            {[1,2,3,4,5].map(n => (
              <button key={n} type="button"
                onClick={() => setForm(p => ({ ...p, rating: p.rating === String(n) ? '' : String(n) }))}
                className={`w-9 h-9 rounded-xl border-2 text-sm font-bold transition-all ${
                  parseInt(form.rating) >= n
                    ? 'border-amber-400 bg-amber-400 text-white'
                    : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:border-amber-300'
                }`}>
                {n}
              </button>
            ))}
            {form.rating && (
              <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-semibold ml-1">
                <Star size={11} fill="currentColor" /> {form.rating}/5
              </span>
            )}
          </div>
        </div>

        <CustomSelect label="Client Reaction *" value={form.client_reaction}
          onChange={v => setForm(p => ({ ...p, client_reaction: v }))}
          options={REACTION_OPTS} placeholder="Select reaction..." />

        <div>
          <label className={lc}>Interested In</label>
          <input value={form.interested_in} onChange={e => setForm(p => ({ ...p, interested_in: e.target.value }))}
            placeholder="3BHK, floor 12-15, west facing..." className={ic} />
        </div>

        <CustomSelect label="Next Step *" value={form.next_step}
          onChange={v => setForm(p => ({ ...p, next_step: v }))}
          options={NEXT_STEP_OPTS} placeholder="Select next step..." />

        <div>
          <label className={lc}>Remarks</label>
          <textarea rows={3} value={form.remarks} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))}
            placeholder="Client liked Tower B, comparing with competitor..." className={ic} />
        </div>

        {form.next_step === 'booked' && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-xl space-y-2">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">🏆 Closing Details</p>
            <div>
              <label className={lc}>Closing Person</label>
              <input
                type="text"
                value={form.closing_person}
                onChange={e => setForm(p => ({ ...p, closing_person: e.target.value }))}
                placeholder="Enter closing person name..."
                className={ic}
              />
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">{error}</p>}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" loading={loading}>Submit Feedback</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Revisits() {
  const navigate    = useNavigate()
  const dispatch    = useDispatch()
  const { user }    = useSelector(s => s.auth)
  const { teamTree: salesExecs, teamTreeLoading } = useSelector(s => s.users)

  const [revisits,   setRevisits]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [pagination, setPagination] = useState({})
  const [page,       setPage]       = useState(1)
  const [perPage,    setPerPage]    = useState('20')

  // Filters
  const isExternalCaller = user?.role === 'external_caller'
  const [filterView,   setFilterView]   = useState(isExternalCaller ? 'mine' : 'team')
  const [filterStatus, setFilterStatus] = useState('')
  const [search,       setSearch]       = useState('')

  // Sidebar data
  const [siteVisits,  setSiteVisits]  = useState([])

  // Modals
  const [showSchedule,  setShowSchedule]  = useState(false)
  const [showEdit,      setShowEdit]      = useState(false)
  const [showStatus,    setShowStatus]    = useState(false)
  const [showFeedback,  setShowFeedback]  = useState(false)
  const [showDelete,    setShowDelete]    = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exporting,       setExporting]       = useState(false)
  const [selected,      setSelected]      = useState(null)

  const menuRef = useRef(null)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [menuPos,    setMenuPos]    = useState(null)

  const canManage = true // All roles can manage re-visits
  const perms = useModulePermissions('revisits')

  useEffect(() => {
    const fn = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuId(null) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const fetchRevisits = async () => {
    setLoading(true)
    try {
      const params = { page, per_page: resolvePerPage(perPage) }
      if (filterStatus) params.status = filterStatus
      const endpoint = filterView === 'mine' ? '/me/revisits' : '/site-revisits'
      const res = await api.get(endpoint, { params })
      setRevisits(res.data.data || [])
      setPagination(res.data.pagination || {})
    } catch { setRevisits([]) }
    finally { setLoading(false) }
  }

  const fetchSideData = async () => {
    try {
      const svRes = await api.get('/site-visits', { params: { per_page: 100 } })
      setSiteVisits(svRes.data.data || [])
    } catch {}
  }

  useEffect(() => { fetchRevisits() }, [page, filterView, filterStatus, perPage])
  useEffect(() => { fetchSideData() }, [])
  useEffect(() => { if (user?.id) dispatch(fetchTeamTree(user.id)) }, [user?.id, dispatch])

  const handleDelete = async () => {
    try {
      await api.delete(`/site-revisits/${selected.id}`)
      setShowDelete(false); setSelected(null)
      fetchRevisits()
    } catch {}
  }

  const handleExport = async (dateRange) => {
    try {
      setExporting(true)
      const params = { ...dateRange }
      if (filterStatus) params.status = filterStatus
      const res = await api.get('/export/site-revisits', { params, responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a'); a.href = url; a.download = `Revisits_${dateRange.from}_to_${dateRange.to}.xlsx`
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
      setShowExportModal(false)
    } catch (err) { console.error('Export failed:', err) } finally { setExporting(false) }
  }

  const displayed = search
    ? revisits.filter(r =>
        r.lead_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.project_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.assigned_to_name?.toLowerCase().includes(search.toLowerCase())
      )
    : revisits

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = STATUS_VALUES.reduce((acc, s) => {
    acc[s] = revisits.filter(r => r.status === s).length
    return acc
  }, {})

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <RotateCcw size={20} className="text-brand" /> Re-visits
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Follow-up visits linked to original site visits</p>
        </div>
        <div className="flex items-center gap-2">
          {['admin', 'super_admin'].includes(user?.role) && (
            <Button variant="outline" size="sm" icon={Download} loading={exporting} disabled={exporting} onClick={() => setShowExportModal(true)}>
              Export
            </Button>
          )}
          {perms.create && <Button icon={Plus} onClick={() => setShowSchedule(true)}>Schedule Re-visit</Button>}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { key: 'scheduled',   label: 'Scheduled',   color: 'text-[#0082f3] bg-blue-50 dark:bg-blue-900/20' },
          { key: 'done',        label: 'Completed',   color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
          { key: 'rescheduled', label: 'Rescheduled', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
          { key: 'cancelled',   label: 'Cancelled',   color: 'text-red-500 bg-red-50 dark:bg-red-900/20' },
          { key: 'no_show',     label: 'No Show',     color: 'text-gray-500 bg-gray-50 dark:bg-gray-800' },
        ].map(({ key, label, color }) => (
          <button key={key}
            onClick={() => setFilterStatus(filterStatus === key ? '' : key)}
            className={`p-3 rounded-2xl border text-left transition-all ${
              filterStatus === key
                ? 'border-brand ring-1 ring-brand/20 bg-brand/5'
                : 'bg-card border-gray-200 dark:border-gray-700 hover:border-brand/40'
            }`}>
            <p className={`text-2xl font-bold ${color.split(' ')[0]}`}>{stats[key] || 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
          </button>
        ))}
      </div>

      {/* Filters bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* My / Team toggle — hidden for super_admin and admin */}
        {!['super_admin', 'admin', 'external_caller'].includes(user?.role) && (
          <div className="flex bg-card border border-gray-200 dark:border-gray-700 rounded-xl p-1 gap-1">
            {[
              { key: 'mine', label: 'My Re-visits' },
              { key: 'team', label: 'Team' },
            ].map(tab => (
              <button key={tab.key}
                onClick={() => { setFilterView(tab.key); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                  ${filterView === tab.key
                    ? 'bg-brand text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}>
                {tab.label}
              </button>
            ))}
          </div>
        )}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search lead, project..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-card text-card-foreground border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-brand placeholder-gray-400" />
        </div>
        <div className="w-44">
          <CustomSelect value={filterStatus} onChange={v => { setFilterStatus(v); setPage(1) }}
            options={[{ value: '', label: 'All Status' }, ...STATUS_OPTIONS]}
            placeholder="All Status" />
        </div>
        <PageSizeSelect value={perPage} onChange={v => { setPerPage(v); setPage(1) }} />
        <button onClick={fetchRevisits}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-brand hover:border-brand transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
        {filterStatus && (
          <button onClick={() => { setFilterStatus(''); setPage(1) }}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
            <X size={12} /> Clear filter
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-4"><ListSkeleton rows={5} /></div>
        ) : displayed.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <RotateCcw size={28} className="text-gray-400" strokeWidth={1.5} />
            </div>
            <p className="text-gray-500 font-medium">No re-visits found</p>
            <p className="text-sm text-gray-400 mt-1">Schedule a re-visit to get started</p>
            {perms.create && (
              <button onClick={() => setShowSchedule(true)}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-brand/10 hover:bg-brand/20 text-brand text-sm font-semibold rounded-xl mx-auto transition-colors">
                <Plus size={14} /> Schedule Re-visit
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#0f0f0f] border-b border-gray-200 dark:border-gray-800">
                  {['Lead', 'Project', 'Date & Time', ...(filterView !== 'mine' ? ['Assigned To'] : []), 'Reason', 'Transport', 'Status', 'Feedback', 'Closing Person', 'Actions'].map(h => (
                    <th key={h} className="py-3 px-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {displayed.map(rv => (
                  <tr key={rv.id} className="hover:bg-gray-50/60 dark:hover:bg-[#0f0f0f]/60 transition-colors group">
                    {/* Lead */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={rv.lead_name || rv['lead name'] || '?'} size="sm" />
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white text-sm cursor-pointer hover:text-brand transition-colors"
                             onClick={() => rv.lead_id && navigate(`/leads/${rv.lead_id}`)}>
                            {rv.lead_name || rv['lead name'] || '—'}
                          </p>
                          <p className="text-[11px] text-gray-400">{rv.lead_phone || ''}</p>
                        </div>
                      </div>
                    </td>

                    {/* Project */}
                    <td className="py-3 px-4">
                      <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">{rv.project_name || '—'}</p>
                      <p className="text-[11px] text-gray-400">{rv.project_city || ''}</p>
                    </td>

                    {/* Date/Time */}
                    <td className="py-3 px-4">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{fmtDate(rv.visit_date)}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Clock size={10} />{rv.visit_time || '—'}</p>
                    </td>

                    {/* Assigned To */}
                    {filterView !== 'mine' && (
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <Avatar name={rv.assigned_to_name || '?'} size="xs" />
                          <span className="text-xs text-gray-600 dark:text-gray-400">{rv.assigned_to_name || '—'}</span>
                        </div>
                      </td>
                    )}

                    {/* Reason */}
                    <td className="py-3 px-4 max-w-[140px]">
                      <p className="text-xs text-gray-500 line-clamp-2">{rv.reason || '—'}</p>
                    </td>

                    {/* Transport */}
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${rv.transport_arranged ? 'bg-green-100 dark:bg-green-900/20 text-green-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                        {rv.transport_arranged ? 'Yes' : 'No'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4"><StatusBadge status={rv.status} /></td>

                    {/* Feedback */}
                    <td className="py-3 px-4">
                      {rv.client_reaction || rv.rating ? (
                        <div>
                          {rv.rating && (
                            <div className="flex items-center gap-0.5 mb-1">
                              {[1,2,3,4,5].map(n => (
                                <Star 
                                  key={n} 
                                  size={10} 
                                  fill={rv.rating >= n ? 'currentColor' : 'none'} 
                                  className={rv.rating >= n ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600'} 
                                />
                              ))}
                              <span className="ml-1 text-[10px]">{rv.rating}</span>
                            </div>
                          )}
                          {rv.client_reaction && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                              {REACTION_LABEL[rv.client_reaction]}
                            </span>
                          )}
                          {rv.next_step && (
                            <p className="text-[10px] text-gray-400 mt-0.5">{NEXT_STEP_LABEL[rv.next_step]}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300 dark:text-gray-700">—</span>
                      )}
                    </td>

                    {/* Closing Person */}
                    <td className="py-3 px-4">
                      <span className="text-xs text-gray-700 dark:text-gray-300">{rv.closing_person || '—'}</span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        {rv.lead_phone && (
                          <PhoneActions phone={rv.lead_phone}>
                            <span title="Call"
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                              <Phone size={13} />
                            </span>
                          </PhoneActions>
                        )}
                        <div className="relative" ref={openMenuId === rv.id ? menuRef : null}>
                          <button
                            onClick={e => { const r = e.currentTarget.getBoundingClientRect(); const below = window.innerHeight - r.bottom; setMenuPos({ right: window.innerWidth - r.right, ...(below > 160 ? { top: r.bottom + 4 } : { bottom: window.innerHeight - r.top + 4 }) }); setOpenMenuId(openMenuId === rv.id ? null : rv.id) }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand hover:bg-brand/10 transition-colors">
                            <MoreVertical size={14} />
                          </button>
                          {openMenuId === rv.id && (
                            <div style={{ top: menuPos?.top, bottom: menuPos?.bottom, right: menuPos?.right }} className="fixed w-48 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg z-[9999] py-1">
                              <button onClick={() => { navigate(`/revisits/${rv.id}`); setOpenMenuId(null) }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <Eye size={14} /> View Details
                              </button>
                              {perms.edit && (
                                <button onClick={() => { setSelected(rv); setShowEdit(true); setOpenMenuId(null) }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                  <Edit2 size={14} /> Edit
                                </button>
                              )}
                              {rv.status !== 'done' && (
                                <button onClick={() => { setSelected(rv); setShowStatus(true); setOpenMenuId(null) }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                  <CheckCircle2 size={14} /> Update Status
                                </button>
                              )}
                              {rv.status === 'done' && !rv.client_reaction && (
                                <button onClick={() => { setSelected(rv); setShowFeedback(true); setOpenMenuId(null) }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                  <MessageSquare size={14} /> Submit Feedback
                                </button>
                              )}
                              {perms.delete && (
                                <button onClick={() => { setSelected(rv); setShowDelete(true); setOpenMenuId(null) }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                  <Trash2 size={14} /> Delete
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

      {/* Pagination */}
      {pagination?.total > 0 && (
        <div className="flex items-center justify-between text-xs text-gray-500 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span>Page {pagination.page} of {pagination.total_pages || 1} · {pagination.total} total</span>
            <PageSizeSelect value={perPage} onChange={v => { setPerPage(v); setPage(1) }} />
          </div>
          {pagination.total_pages > 1 && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button size="sm" variant="outline" disabled={page >= pagination.total_pages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </div>
      )}

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        loading={exporting}
        title="Export Re-visits"
      />

      {/* Modals */}
      {showSchedule && (
        <ScheduleModal siteVisits={siteVisits} salesExecs={salesExecs} currentUser={user}
          onClose={() => setShowSchedule(false)} onSuccess={fetchRevisits} />
      )}
      {showEdit && selected && (
        <EditModal revisit={selected} salesExecs={salesExecs} currentUser={user}
          onClose={() => setShowEdit(false)} onSuccess={fetchRevisits} />
      )}
      {showStatus && selected && (
        <StatusModal revisit={selected}
          onClose={() => setShowStatus(false)} onSuccess={fetchRevisits} />
      )}
      {showFeedback && selected && (
        <FeedbackModal revisit={selected}
          salesExecs={salesExecs} currentUser={user}
          onClose={() => setShowFeedback(false)} onSuccess={fetchRevisits} />
      )}
      <ConfirmModal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Re-visit"
        message={`Delete re-visit for "${selected?.lead_name}"? This cannot be undone.`}
        confirmText="Delete"
      />
    </div>
  )
}
