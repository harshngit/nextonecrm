import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle, Clock, AlertCircle, Phone, Plus,
  Edit2, Trash2, Download, RefreshCw, ChevronDown, Filter, Eye, X,
  ArrowRightCircle,
  CheckCircle2,
  CalendarPlus
} from 'lucide-react'
import {
  fetchFollowUps, createFollowUp, updateFollowUp,
  completeFollowUp, deleteFollowUp, clearFollowUpError, markCompleted,
} from '../store/followUpSlice'
import { fetchLeads } from '../store/leadSlice'
import { fetchProjects } from '../store/projectSlice'
import { fetchUsers } from '../store/userSlice'
import ListSkeleton from '../components/loaders/ListSkeleton'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import api from '../api/axios'
import Modal from '../components/ui/Modal'
import ExportModal from '../components/ui/ExportModal'
import CustomSelect from '../components/ui/CustomSelect'

const priorities = ['low', 'medium', 'high']
const priorityOptions = priorities.map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))
const priorityStyle = {
  high:   'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  medium: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  low:    'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
}

// ─── Circular Clock Picker ───────────────────────────────────────────────────

function ClockPicker({ value, onChange, label, icon: Icon, iconColor = 'text-gray-400', required = false }) {
  const [open,    setOpen]    = useState(false)
  const [mode,    setMode]    = useState('hour')   // 'hour' | 'minute'
  const svgRef  = useRef(null)
  const ref     = useRef(null)

  const [hh, mm] = value ? value.split(':') : ['10', '00']
  const hour   = parseInt(hh || 10)
  const minute = parseInt(mm || 0)

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

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

  const SIZE    = 220
  const CX      = SIZE / 2
  const CY      = SIZE / 2
  const R_OUTER = 88
  const R_INNER = 62

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
  const isAM = hour < 12
  const display12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour

  return (
    <div className="relative" ref={ref}>
      {label && (
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
          {label}{required && ' *'}
        </label>
      )}
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

      {open && (
        <>
          <div className="fixed inset-0 z-[9998] bg-black/10 backdrop-blur-[1px]" onClick={() => setOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-[32px] shadow-2xl shadow-black/40 overflow-hidden flex flex-col items-center"
            style={{ width: 'min(320px, 80vw)' }}>

            <div className="bg-[#0082f3] w-full px-8 py-6 flex items-center justify-between">
              <div className="flex items-baseline gap-1">
                <span onClick={() => setMode('hour')} className={`font-mono text-5xl font-bold cursor-pointer transition-opacity ${mode==='hour' ? 'opacity-100' : 'opacity-60'} text-white`}>
                  {String(display12).padStart(2,'0')}
                </span>
                <span className="font-mono text-5xl font-bold text-white/80">:</span>
                <span onClick={() => setMode('minute')} className={`font-mono text-5xl font-bold cursor-pointer transition-opacity ${mode==='minute' ? 'opacity-100' : 'opacity-60'} text-white`}>
                  {mm || '00'}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => handleAMPM(true)} className={`w-12 h-9 text-sm font-bold rounded-xl transition-all ${isAM ? 'bg-white text-[#0082f3] shadow-md' : 'text-white/60 hover:text-white/90'}`}>AM</button>
                <button onClick={() => handleAMPM(false)} className={`w-12 h-9 text-sm font-bold rounded-xl transition-all ${!isAM ? 'bg-white text-[#0082f3] shadow-md' : 'text-white/60 hover:text-white/90'}`}>PM</button>
              </div>
            </div>

            <div className="flex w-full border-b border-gray-100 dark:border-gray-800">
              <button onClick={() => setMode('hour')} className={`flex-1 py-3 text-xs font-bold tracking-widest transition-colors ${mode==='hour' ? 'text-[#0082f3] border-b-2 border-[#0082f3]' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>HOUR</button>
              <button onClick={() => setMode('minute')} className={`flex-1 py-3 text-xs font-bold tracking-widest transition-colors ${mode==='minute' ? 'text-[#0082f3] border-b-2 border-[#0082f3]' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>MINUTE</button>
            </div>

            <div className="flex justify-center py-6 px-6 bg-gray-50/30 dark:bg-black/10 w-full">
              <svg ref={svgRef} width={260} height={260} onClick={handleClockClick} style={{ cursor: 'pointer' }}>
                <circle cx={130} cy={130} r={126} fill="var(--clock-bg, #ffffff)" className="dark:fill-gray-900" />
                <circle cx={130} cy={130} r={126} fill="none" stroke="#E2E8F0" strokeWidth="0.5" className="dark:stroke-gray-800" />
                {mode === 'hour' && <circle cx={130} cy={130} r={R_INNER + 20} fill="none" stroke="#E2E8F0" strokeWidth="0.5" strokeDasharray="4,4" className="dark:stroke-gray-700" />}
                <line x1={130} y1={130} x2={130 + handR * 1.18 * Math.cos(handAngle * Math.PI / 180)} y2={130 + handR * 1.18 * Math.sin(handAngle * Math.PI / 180)} stroke="#0082f3" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx={130} cy={130} r={5} fill="#0082f3" />
                <circle cx={130 + handR * 1.18 * Math.cos(handAngle * Math.PI / 180)} cy={130 + handR * 1.18 * Math.sin(handAngle * Math.PI / 180)} r={20} fill="#0082f3" opacity="0.15" />
                <circle cx={130 + handR * 1.18 * Math.cos(handAngle * Math.PI / 180)} cy={130 + handR * 1.18 * Math.sin(handAngle * Math.PI / 180)} r={10}  fill="#0082f3" />
                {clockNumbers.map(({ val, r, is12h }) => {
                  const displayVal = mode === 'hour' ? (val === 0 ? '00' : String(val).padStart(2,'0')) : String(val).padStart(2,'0')
                  const indexAngle = mode === 'hour' ? ((val % 12 === 0 ? 0 : val % 12) / 12) * 360 - 90 : (val / 60) * 360 - 90
                  const x = 130 + r * 1.18 * Math.cos(indexAngle * Math.PI / 180)
                  const y = 130 + r * 1.18 * Math.sin(indexAngle * Math.PI / 180)
                  const isActive = activeVal === val
                  return (
                    <g key={`${mode}-${val}`}>
                      {isActive && <circle cx={x} cy={y} r={18} fill="#0082f3" />}
                      <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={is12h ? 13 : 11} fontWeight={isActive ? 700 : 500} fill={isActive ? '#ffffff' : is12h ? '#374151' : '#9CA3AF'} className={isActive ? '' : 'dark:fill-gray-400'} style={{ userSelect: 'none', fontFamily: 'monospace' }}>{displayVal}</text>
                    </g>
                  )
                })}
              </svg>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center w-full bg-white dark:bg-[#1a1a1a]">
              <button onClick={() => { onChange(''); setOpen(false) }} className="text-sm font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">CLEAR</button>
              <button onClick={() => setOpen(false)} className="px-8 py-2.5 bg-[#0082f3] hover:bg-[#0070d4] text-white text-sm font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-95">DONE</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const defaultForm = {
  title: '', lead_id: '', due_date: '', due_time: '10:00',
  assigned_to: '', priority: 'medium', notes: '',
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function classifyTask(task) {
  if (task.is_completed) return 'completed'
  const now = new Date()
  const due = new Date(task.due_date)
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  if (due < todayStart) return 'overdue'
  if (due <= todayEnd) return 'today'
  return 'upcoming'
}

function formatDue(task) {
  if (!task.due_date) return '—'
  const d = new Date(task.due_date)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
    (task.due_time ? ` at ${task.due_time}` : '')
}

// ── Form — defined OUTSIDE to prevent typing/focus bug ────────────────────────
function FollowUpForm({ formData, setFormData, leads, salesExecs, isEdit }) {
  const ic = "w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm transition-all duration-200"
  const lc = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"

  const leadOptions = leads.map(l => ({
    value: l.id,
    label: `${l.name}${l.phone ? ` — ${l.phone}` : ''}`
  }))

  const execOptions = salesExecs.map(u => ({
    value: u.id,
    label: `${u.first_name} ${u.last_name}`
  }))

  return (
    <div className="space-y-4">

      {/* Title */}
      <div>
        <label className={lc}>Task Title *</label>
        <input
          required
          value={formData.title}
          onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
          placeholder="Follow up call with Suresh Patel"
          className={ic}
        />
      </div>

      {/* Lead */}
      <CustomSelect
        label="Lead"
        required
        value={formData.lead_id}
        onChange={val => setFormData(p => ({ ...p, lead_id: val }))}
        options={leadOptions}
        placeholder="Select lead..."
      />

      {/* Due Date + Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lc}>Due Date *</label>
          <input
            required
            type="date"
            value={formData.due_date}
            onChange={e => setFormData(p => ({ ...p, due_date: e.target.value }))}
            className={ic}
          />
        </div>
        <ClockPicker
          label="Due Time"
          value={formData.due_time}
          onChange={val => setFormData(p => ({ ...p, due_time: val }))}
          icon={Clock}
        />
      </div>

      {/* Priority + Assign To */}
      <div className="grid grid-cols-2 gap-3">
        <CustomSelect
          label="Priority"
          value={formData.priority}
          onChange={val => setFormData(p => ({ ...p, priority: val }))}
          options={priorityOptions}
        />
        <CustomSelect
          label="Assign To"
          value={formData.assigned_to}
          onChange={val => setFormData(p => ({ ...p, assigned_to: val }))}
          options={execOptions}
          placeholder="Default (lead's executive)"
        />
      </div>

      {/* Notes */}
      <div>
        <label className={lc}>Notes</label>
        <textarea
          rows={3}
          value={formData.notes}
          onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
          placeholder="Additional context about the follow-up..."
          className={ic}
        />
      </div>
    </div>
  )
}

// ── Task Card — defined OUTSIDE to prevent focus bug ─────────────────────────

// ─── Convert Follow-Up to Site Visit Modal ────────────────────────────────────

function ConvertFollowUpModal({ task, onClose, onSuccess }) {
  const [converting, setConverting] = useState(false)
  const [error, setError] = useState('')
  const [options, setOptions] = useState(null)
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [form, setForm] = useState({
    project_id: '', visit_date: '', visit_time: '10:00',
    assigned_to: '', transport_arranged: false, notes: '',
  })

  const { list: projectList } = useSelector(s => s.projects)
  const { list: userList }    = useSelector(s => s.users)
  const salesExecs = userList.filter(u => ['sales_executive','sales_manager'].includes(u.role) && u.is_active)

  useEffect(() => {
    api.get(`/convert/follow-up/${task.id}/options`)
      .then(r => {
        setOptions(r.data.data)
        const pf = r.data.data?.conversions?.to_site_visit?.prefill || {}
        setForm(f => ({
          ...f,
          project_id:        pf.project_id || '',
          assigned_to:       pf.assigned_to || task.assigned_to || '',
          transport_arranged: pf.transport_arranged || false,
        }))
      })
      .catch(() => {})
      .finally(() => setLoadingOptions(false))
  }, [task.id])

  const inputCls = "w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-[#0082f3] text-gray-700 dark:text-gray-300 transition-colors placeholder-gray-400"
  const labelCls = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5"

  const projectOpts = (options?.projects || projectList || []).map(p => ({ value: p.id, label: `${p.name}${p.city ? ` · ${p.city}` : ''}` }))
  const userOpts    = (options?.users    || salesExecs    || []).map(u => ({ value: u.id, label: u.name || `${u.first_name} ${u.last_name}` }))

  const svAvailable = options?.conversions?.to_site_visit?.available !== false

  const handleConvert = async () => {
    setError('')
    if (!form.project_id) { setError('Project is required'); return }
    if (!form.visit_date) { setError('Visit date is required'); return }
    if (!form.visit_time) { setError('Visit time is required'); return }
    setConverting(true)
    try {
      await api.post(`/convert/follow-up/${task.id}/to-site-visit`, {
        project_id:        form.project_id,
        visit_date:        form.visit_date,
        visit_time:        form.visit_time,
        assigned_to:       form.assigned_to || undefined,
        transport_arranged: Boolean(form.transport_arranged),
        notes:             form.notes || undefined,
      })
      onSuccess()
    } catch (e) {
      setError(e.response?.data?.message || 'Conversion failed')
    } finally {
      setConverting(false)
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Convert to Site Visit" size="md">
      {loadingOptions ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={22} className="animate-spin text-[#0082f3]" />
        </div>
      ) : !svAvailable ? (
        <div className="py-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto">
            <AlertCircle size={22} className="text-red-500" />
          </div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Cannot Convert</p>
          <p className="text-xs text-gray-400">{options?.conversions?.to_site_visit?.unavailable_reason}</p>
          <button onClick={onClose} className="px-5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500">Close</button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Task info */}
          <div className="flex items-start gap-3 px-4 py-3 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/10 dark:to-violet-900/10 rounded-xl border border-purple-100 dark:border-purple-900/30">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-400 to-violet-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CalendarPlus size={14} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{task.title}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{task.lead_name} · Follow-up will be marked completed</p>
            </div>
          </div>

          <CustomSelect label="Project *" value={form.project_id} onChange={v => setForm(f => ({...f, project_id: v}))} options={projectOpts} placeholder="Select project" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Visit Date *</label>
              <input type="date" value={form.visit_date} onChange={e => setForm(f => ({...f, visit_date: e.target.value}))}
                min={new Date().toISOString().split('T')[0]} className={inputCls} />
            </div>
            <div>
              <ClockPicker label="Visit Time *" value={form.visit_time} onChange={v => setForm(f => ({...f, visit_time: v}))} required />
            </div>
          </div>
          <CustomSelect label="Assign To" value={form.assigned_to} onChange={v => setForm(f => ({...f, assigned_to: v}))} options={userOpts} placeholder="Keep current" />
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800 cursor-pointer"
            onClick={() => setForm(f => ({...f, transport_arranged: !f.transport_arranged}))}>
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors flex-shrink-0 ${form.transport_arranged ? 'bg-[#0082f3] border-[#0082f3]' : 'border-gray-300 dark:border-gray-600'}`}>
              {form.transport_arranged && <CheckCircle2 size={12} className="text-white"/>}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Transport Arranged</p>
              <p className="text-[10px] text-gray-400">Check if you will arrange pick-up/drop for the client</p>
            </div>
          </div>
          <div>
            <label className={labelCls}>Notes <span className="font-normal text-gray-400">(optional)</span></label>
            <textarea rows={3} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
              placeholder="Any special instructions for the visit…" className={inputCls + ' resize-none'} />
          </div>
          {error && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5">
              <AlertCircle size={13} className="text-red-500 flex-shrink-0"/>
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
            <button onClick={handleConvert} disabled={converting}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60">
              {converting ? <><Loader2 size={14} className="animate-spin"/> Converting…</> : <><CalendarPlus size={14}/> Schedule Visit</>}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ─── Bulk Convert Follow-Ups to Site Visit ───────────────────────────────────

function BulkConvertFUModal({ taskIds, tasks, onClose, onSuccess }) {
  const [converting, setConverting] = useState(false)
  const [error, setError]     = useState('')
  const [results, setResults] = useState(null)
  const [form, setForm] = useState({ project_id: '', visit_date: '', visit_time: '10:00', assigned_to: '', transport_arranged: false, notes: '' })

  const { list: projectList } = useSelector(s => s.projects)
  const { list: userList }    = useSelector(s => s.users)
  const salesExecs = userList.filter(u => ['sales_executive','sales_manager'].includes(u.role) && u.is_active)

  const inputCls = "w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-[#0082f3] text-gray-700 dark:text-gray-300 transition-colors placeholder-gray-400"
  const labelCls = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5"
  const projectOpts = projectList.map(p => ({ value: p.id, label: `${p.name}${p.city ? ` · ${p.city}` : ''}` }))
  const userOpts    = salesExecs.map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name}` }))

  const handleConvert = async () => {
    setError('')
    if (!form.project_id) { setError('Project is required'); return }
    if (!form.visit_date) { setError('Visit date is required'); return }
    setConverting(true)
    const settled = await Promise.allSettled(
      taskIds.map(id => api.post(`/convert/follow-up/${id}/to-site-visit`, {
        project_id:        form.project_id,
        visit_date:        form.visit_date,
        visit_time:        form.visit_time,
        assigned_to:       form.assigned_to || undefined,
        transport_arranged: Boolean(form.transport_arranged),
        notes:             form.notes || undefined,
      }))
    )
    setConverting(false)
    const ok = settled.filter(r => r.status === 'fulfilled').length
    const err = settled.filter(r => r.status === 'rejected').length
    setResults({ ok, err })
  }

  if (results) {
    return (
      <Modal isOpen={true} onClose={onSuccess} title="Conversion Complete" size="sm">
        <div className="py-4 text-center space-y-4">
          <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${results.err === 0 ? 'bg-purple-50 dark:bg-purple-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
            <CheckCircle2 size={28} className={results.err === 0 ? 'text-purple-500' : 'text-amber-500'} />
          </div>
          <p className="text-base font-bold text-gray-900 dark:text-white">{results.ok} of {taskIds.length} converted</p>
          {results.err > 0 && <p className="text-xs text-amber-600 mt-1">{results.err} failed (no lead linked or already completed)</p>}
          <button onClick={onSuccess} className="w-full py-2.5 rounded-xl bg-purple-500 text-white text-sm font-semibold">Done</button>
        </div>
      </Modal>
    )
  }

  const selectedNames = tasks.filter(t => taskIds.includes(t.id))

  return (
    <Modal isOpen={true} onClose={onClose} title={`Convert ${taskIds.length} Follow-Up${taskIds.length > 1 ? 's' : ''} → Site Visit`} size="md">
      <div className="space-y-4">
        <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1.5">{taskIds.length} follow-up{taskIds.length > 1 ? 's' : ''} selected · all will be marked completed</p>
          <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
            {selectedNames.slice(0, 6).map(t => (
              <span key={t.id} className="text-[10px] px-2 py-0.5 bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800 rounded-lg text-purple-700 dark:text-purple-300 font-medium truncate max-w-[120px]">{t.title}</span>
            ))}
            {selectedNames.length > 6 && <span className="text-[10px] text-gray-400 px-1">+{selectedNames.length - 6} more</span>}
          </div>
        </div>
        <CustomSelect label="Project *" value={form.project_id} onChange={v => setForm(f => ({...f, project_id: v}))} options={projectOpts} placeholder="Select project" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Visit Date *</label>
            <input type="date" value={form.visit_date} onChange={e => setForm(f => ({...f, visit_date: e.target.value}))}
              min={new Date().toISOString().split('T')[0]} className={inputCls} />
          </div>
          <div>
            <ClockPicker label="Visit Time" value={form.visit_time} onChange={v => setForm(f => ({...f, visit_time: v}))} />
          </div>
        </div>
        <CustomSelect label="Assign To" value={form.assigned_to} onChange={v => setForm(f => ({...f, assigned_to: v}))} options={userOpts} placeholder="Keep current" />
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800 cursor-pointer"
          onClick={() => setForm(f => ({...f, transport_arranged: !f.transport_arranged}))}>
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${form.transport_arranged ? 'bg-[#0082f3] border-[#0082f3]' : 'border-gray-300 dark:border-gray-600'}`}>
            {form.transport_arranged && <CheckCircle2 size={12} className="text-white"/>}
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Transport Arranged</p>
        </div>
        <div>
          <label className={labelCls}>Notes <span className="font-normal text-gray-400">(optional)</span></label>
          <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
            placeholder="Special instructions…" className={inputCls + ' resize-none'} />
        </div>
        {error && <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5"><AlertCircle size={13} className="text-red-500"/><p className="text-xs text-red-600">{error}</p></div>}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500">Cancel</button>
          <button onClick={handleConvert} disabled={converting}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
            {converting ? <><Loader2 size={14} className="animate-spin"/> Converting…</> : <><CalendarPlus size={14}/> Schedule {taskIds.length} Visit{taskIds.length > 1 ? 's' : ''}</>}
          </button>
        </div>
      </div>
    </Modal>
  )
}


function TaskCard({ task, onEdit, onDelete, onComplete, onConvert, canManage, isSelected, onSelect }) {
  const navigate = useNavigate()
  const category = classifyTask(task)

  const cardStyle = {
    overdue:   'border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-900/10',
    today:     'border-blue-200 dark:border-blue-900/40 bg-white dark:bg-[#1a1a1a]',
    upcoming:  'border-[#e2e8f0] dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a]',
    completed: 'border-green-200 dark:border-green-900/40 bg-green-50/30 dark:bg-green-900/10 opacity-60',
  }

  return (
    <div className={`border rounded-xl p-4 transition-all ${cardStyle[category]}`}>
      <div className="flex items-start gap-3">
        {/* Checkbox for selection */}
        {onSelect && (
          <div
            onClick={e => { e.stopPropagation(); onSelect(task.id) }}
            className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 cursor-pointer transition-all
              ${isSelected
                ? 'bg-[#0082f3] border-[#0082f3]'
                : 'border-gray-300 dark:border-gray-600 hover:border-[#0082f3]'}`}>
            {isSelected && <CheckCircle2 size={11} className="text-white" />}
          </div>
        )}
        <Avatar name={task.lead_name || task.title} size="sm" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span 
              className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate cursor-pointer hover:text-brand transition-colors"
              onClick={() => task.lead_id ? navigate(`/leads/${task.lead_id}`) : navigate(`/follow-ups/${task.id}`)}
            >
              {task.lead_name || '—'}
            </span>
            {category === 'overdue' && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full flex-shrink-0">
                <AlertCircle size={9} /> Overdue
              </span>
            )}
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${priorityStyle[task.priority] || priorityStyle.medium}`}>
              {task.priority || 'medium'}
            </span>
          </div>

          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 truncate">{task.title}</p>

          {task.notes && (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-1 line-clamp-1">"{task.notes}"</p>
          )}

          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <div className="flex items-center gap-1">
              <Clock size={11} className={category === 'overdue' ? 'text-red-500' : 'text-brand'} />
              <span className={`text-xs font-medium ${category === 'overdue' ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-[#888]'}`}>
                {formatDue(task)}
              </span>
            </div>
            {task.assigned_to_name && (
              <span className="text-xs text-gray-400">→ {task.assigned_to_name}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          {task.lead_phone && (
            <a href={`tel:${task.lead_phone}`}>
              <Button size="sm" variant="ghost" icon={Phone} className="text-xs">Call</Button>
            </a>
          )}
          {!task.is_completed && (
            <Button size="sm" variant="secondary" onClick={() => onComplete(task)} className="text-xs">
              Done
            </Button>
          )}
          {canManage && !task.is_completed && (
            <div className="flex gap-1 justify-end">
              <button onClick={() => navigate(`/follow-ups/${task.id}`)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand hover:bg-brand/10 transition-all hover:scale-110 active:scale-95" title="View Details">
                <Eye size={14} />
              </button>
              {onConvert && task.lead_id && (
                <button onClick={() => onConvert(task)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors" title="Convert to Site Visit">
                  <ArrowRightCircle size={13} />
                </button>
              )}
              <button onClick={() => onEdit(task)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Edit">
                <Edit2 size={13} />
              </button>
              <button onClick={() => onDelete(task)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete">
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FollowUps() {
  const dispatch = useDispatch()
  const { list, loading, pagination, actionLoading, actionError } = useSelector(s => s.followUps)
  const { list: leadList } = useSelector(s => s.leads)
  const { list: userList } = useSelector(s => s.users)
  const { user: currentUser } = useSelector(s => s.auth)

  const [filterStatus,   setFilterStatus]   = useState('all') // pending | overdue | all | completed
  const [filterAssigned, setFilterAssigned] = useState('')
  const [page, setPage] = useState(1)

  const [showAddModal,      setShowAddModal]      = useState(false)
  const [showEditModal,     setShowEditModal]      = useState(false)
  const [showCompleteModal, setShowCompleteModal]  = useState(false)
  const [showExportModal,   setShowExportModal]    = useState(false)
  const [selectedTask,      setSelectedTask]       = useState(null)
  const [completeNotes,     setCompleteNotes]      = useState('')

  const [addForm,  setAddForm]  = useState(defaultForm)
  const [editForm, setEditForm] = useState(defaultForm)
  const [success,           setSuccess]           = useState('')
  const [exporting,         setExporting]         = useState(false)
  const [selectedTasks,     setSelectedTasks]     = useState([])
  const [showBulkConvert,   setShowBulkConvert]   = useState(false)
  const [showConvertModal,  setShowConvertModal]  = useState(false)
  const [convertTask,       setConvertTask]       = useState(null)
  const [convertSuccess,    setConvertSuccess]    = useState('')

  const salesExecs = userList.filter(u =>
    ['sales_executive', 'sales_manager'].includes(u.role) && u.is_active
  )
  const canManage = ['super_admin', 'admin', 'sales_manager'].includes(currentUser?.role)

  // ── Load data ───────────────────────────────────────────────────────────────
  const loadTasks = () => {
    const params = { page, per_page: 50 }
    if (filterStatus === 'pending')   { params.is_completed = false }
    if (filterStatus === 'completed') { params.is_completed = true }
    if (filterStatus === 'overdue')   { params.overdue = true; params.is_completed = false }
    if (filterAssigned) params.assigned_to = filterAssigned
    dispatch(fetchFollowUps(params))
  }

  useEffect(() => { loadTasks() }, [dispatch, filterStatus, filterAssigned, page])

  useEffect(() => {
    dispatch(fetchLeads({ per_page: 100 }))
    dispatch(fetchUsers())
    dispatch(fetchProjects())
  }, [dispatch])

  // ── Classify tasks into buckets ─────────────────────────────────────────────
  const overdueTasks   = list.filter(t => classifyTask(t) === 'overdue')
  const todayTasks     = list.filter(t => classifyTask(t) === 'today')
  const upcomingTasks  = list.filter(t => classifyTask(t) === 'upcoming')
  const completedTasks = list.filter(t => classifyTask(t) === 'completed')

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault()
    dispatch(clearFollowUpError())
    // Build ISO datetime from date + time
    const due_date = formData => {
      if (!formData.due_date) return ''
      const time = formData.due_time || '10:00'
      return `${formData.due_date}T${time}:00`
    }
    const payload = {
      title:       addForm.title,
      lead_id:     addForm.lead_id,
      due_date:    due_date(addForm),
      priority:    addForm.priority,
      notes:       addForm.notes,
      ...(addForm.assigned_to && { assigned_to: addForm.assigned_to }),
    }
    const result = await dispatch(createFollowUp(payload))
    if (createFollowUp.fulfilled.match(result)) {
      setSuccess('Follow-up created!')
      loadTasks()
      setTimeout(() => { setShowAddModal(false); setSuccess(''); setAddForm(defaultForm) }, 800)
    }
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    dispatch(clearFollowUpError())
    const due_date = editForm.due_date
      ? `${editForm.due_date}T${editForm.due_time || '10:00'}:00`
      : undefined
    const payload = {
      title:    editForm.title,
      due_date,
      priority: editForm.priority,
      notes:    editForm.notes,
      ...(editForm.assigned_to && { assigned_to: editForm.assigned_to }),
    }
    const result = await dispatch(updateFollowUp({ id: selectedTask.id, data: payload }))
    if (updateFollowUp.fulfilled.match(result)) {
      setSuccess('Follow-up updated!')
      loadTasks()
      setTimeout(() => { setShowEditModal(false); setSuccess('') }, 800)
    }
  }

  const handleComplete = async (e) => {
    e.preventDefault()
    // Optimistic UI update
    dispatch(markCompleted(selectedTask.id))
    const result = await dispatch(completeFollowUp({ id: selectedTask.id, notes: completeNotes }))
    if (completeFollowUp.fulfilled.match(result)) {
      setSuccess('Task marked as done!')
      loadTasks()
      setTimeout(() => { setShowCompleteModal(false); setSuccess(''); setCompleteNotes('') }, 600)
    }
  }

  const handleDelete = async (task) => {
    if (window.confirm(`Delete this follow-up task?`)) {
      const result = await dispatch(deleteFollowUp(task.id))
      if (deleteFollowUp.fulfilled.match(result)) loadTasks()
    }
  }

  const openEdit = (task) => {
    setSelectedTask(task)
    const dueDate = task.due_date ? task.due_date.split('T')[0] : ''
    const dueTime = task.due_date ? task.due_date.split('T')[1]?.slice(0, 5) : '10:00'
    setEditForm({
      title:       task.title || '',
      lead_id:     task.lead_id || '',
      due_date:    dueDate,
      due_time:    dueTime || '10:00',
      assigned_to: task.assigned_to || '',
      priority:    task.priority || 'medium',
      notes:       task.notes || '',
    })
    setShowEditModal(true)
  }

  const openComplete = (task) => {
    setSelectedTask(task)
    setCompleteNotes('')
    setShowCompleteModal(true)
  }

  // ── Selection + conversion helpers ──────────────────────────────────────────
  const allTasks = [...overdueTasks, ...todayTasks, ...upcomingTasks]  // completed excluded from bulk

  const toggleTask = (id) =>
    setSelectedTasks(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])

  const toggleSectionAll = (tasks) => {
    const ids = tasks.map(t => t.id)
    const allSel = ids.every(id => selectedTasks.includes(id))
    setSelectedTasks(prev => allSel
      ? prev.filter(id => !ids.includes(id))
      : [...new Set([...prev, ...ids])]
    )
  }

  const handleBulkFUConvertSuccess = () => {
    setShowBulkConvert(false)
    setSelectedTasks([])
    setSuccess(`${selectedTasks.length} follow-up${selectedTasks.length > 1 ? 's' : ''} converted to site visit!`)
    loadTasks()
    setTimeout(() => setSuccess(''), 3000)
  }

  const handleConvertTaskSuccess = () => {
    setShowConvertModal(false)
    setConvertTask(null)
    setSuccess('Follow-up converted to site visit!')
    loadTasks()
    setTimeout(() => setSuccess(''), 3000)
  }

  // ── Section Component ────────────────────────────────────────────────────────
  const Section = ({ title, tasks, icon: Icon, iconColor, accent, selectable }) => {
    if (tasks.length === 0) return null
    return (
      <div className={`bg-white dark:bg-[#1a1a1a] border ${accent || 'border-[#e2e8f0] dark:border-[#2a2a2a]'} rounded-2xl p-5`}>
        <div className="flex items-center gap-2 mb-4">
          {selectable && tasks.length > 0 && (
            <div
              onClick={() => toggleSectionAll(tasks)}
              className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer flex-shrink-0 transition-all
                ${tasks.every(t => selectedTasks.includes(t.id))
                  ? 'bg-[#0082f3] border-[#0082f3]'
                  : 'border-gray-400 dark:border-gray-600 hover:border-[#0082f3]'}`}
            >
              {tasks.every(t => selectedTasks.includes(t.id)) && (
                <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              )}
            </div>
          )}
          <Icon size={16} className={iconColor} />
          <h3 className={`font-display text-sm font-semibold ${iconColor}`}>{title}</h3>
          <span className="w-5 h-5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs flex items-center justify-center font-bold text-gray-600 dark:text-gray-400">
            {tasks.length}
          </span>
          {selectable && selectedTasks.filter(id => tasks.map(t => t.id).includes(id)).length > 0 && (
            <span className="ml-auto text-[10px] font-semibold text-[#0082f3] bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
              {selectedTasks.filter(id => tasks.map(t => t.id).includes(id)).length} selected
            </span>
          )}
        </div>
        <div className="space-y-3">
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={openComplete}
              onEdit={openEdit}
              onDelete={handleDelete}
              onConvert={selectable ? (t) => { setConvertTask(t); setShowConvertModal(true) } : undefined}
              canManage={canManage}
              isSelected={selectedTasks.includes(task.id)}
              onSelect={selectable ? toggleTask : undefined}
            />
          ))}
        </div>
      </div>
    )
  }

  const handleExport = async (dateRange) => {
    try {
      setExporting(true)
      const params = { ...dateRange }
      if (filterStatus !== 'all') {
        if (filterStatus === 'pending')   params.is_completed = false
        if (filterStatus === 'completed') params.is_completed = true
        if (filterStatus === 'overdue')   { params.overdue = true; params.is_completed = false }
      }
      if (filterAssigned) params.assigned_to = filterAssigned

      const res = await api.get('/export/follow-ups', { params, responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a'); a.href = url; a.download = `FollowUps_${dateRange.from}_to_${dateRange.to}.xlsx`
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
      setShowExportModal(false)
    } catch (err) { console.error('Export failed:', err) } finally { setExporting(false) }
  }

  return (
    <div className="space-y-4">

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">

          {/* Status tabs */}
          <div className="flex bg-white dark:bg-[#1a1a1a] border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl p-1 gap-1">
            {[
              { key: 'all',       label: 'All' },
              { key: 'pending',   label: 'Active' },
              { key: 'completed', label: 'Done' },
              { key: 'overdue',   label: 'Overdue' },
            ].map(tab => (
              <button key={tab.key}
                onClick={() => { setFilterStatus(tab.key); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                  ${filterStatus === tab.key
                    ? 'bg-brand text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Assign filter */}
          {canManage && (
            <div className="w-44">
              <CustomSelect
                value={filterAssigned}
                onChange={val => { setFilterAssigned(val); setPage(1) }}
                options={[{ value: '', label: 'All Team' }, ...salesExecs.map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name}` }))]}
                placeholder="All Team"
              />
            </div>
          )}

          <button onClick={loadTasks}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#e2e8f0] dark:border-[#2a2a2a] text-gray-400 hover:text-brand hover:border-brand transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Bulk convert button — appears when follow-ups are selected */}
          {selectedTasks.length > 0 && (
            <button
              onClick={() => setShowBulkConvert(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white text-xs font-semibold shadow-sm shadow-purple-500/20 transition-all active:scale-[0.97]"
            >
              <ArrowRightCircle size={13} />
              Convert {selectedTasks.length}
            </button>
          )}
          <Button variant="outline" size="sm" icon={Download} loading={exporting} disabled={exporting} onClick={() => setShowExportModal(true)}>
            Export
          </Button>
          <Button icon={Plus} onClick={() => { setAddForm(defaultForm); dispatch(clearFollowUpError()); setShowAddModal(true) }}>
            Add Follow-up
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Today's Tasks",  count: todayTasks.length,    color: 'text-blue-600',  bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Overdue',        count: overdueTasks.length,   color: 'text-red-600',   bg: 'bg-red-50 dark:bg-red-900/20' },
          { label: 'Upcoming',       count: upcomingTasks.length,  color: 'text-brand',     bg: 'bg-brand/10 dark:bg-brand/15' },
          { label: 'Completed',      count: completedTasks.length, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl px-4 py-3`}>
            <div className={`text-2xl font-display font-bold ${s.color}`}>{s.count}</div>
            <div className="text-xs text-gray-500 dark:text-[#888] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white dark:bg-[#1a1a1a] border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-2xl p-4">
          <ListSkeleton rows={4} />
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand/10 mb-6">
            <CheckCircle size={32} className="text-brand" />
          </div>
          <h3 className="font-display text-2xl font-bold text-gray-900 dark:text-white">All caught up!</h3>
          <p className="text-gray-500 dark:text-[#888] mt-2 text-base">No follow-ups here.</p>
        </div>
      ) : (
        <>
          <Section title="⚠️ Overdue"           tasks={overdueTasks}   icon={AlertCircle}  iconColor="text-red-600 dark:text-red-400"   accent="border-red-200 dark:border-red-900/50" selectable />
          <Section title="📞 Today's Follow-ups" tasks={todayTasks}     icon={Phone}        iconColor="text-blue-600 dark:text-blue-400" accent="border-blue-200 dark:border-blue-900/40" selectable />
          <Section title="📅 Upcoming"           tasks={upcomingTasks}  icon={Clock}        iconColor="text-brand" selectable />
          <Section title="✅ Completed"           tasks={completedTasks} icon={CheckCircle}  iconColor="text-green-600 dark:text-green-400" />
        </>
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

      {/* Add Modal */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setSuccess('') }} title="Add Follow-up Task">
        <form onSubmit={handleAdd} className="space-y-4">
          <FollowUpForm formData={addForm} setFormData={setAddForm} leads={leadList} salesExecs={salesExecs} isEdit={false} />
          {success    && <p className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 py-2 text-center rounded-xl">{success}</p>}
          {actionError && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 py-2 text-center rounded-xl">{actionError}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={actionLoading}>Create Follow-up</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSuccess('') }} title="Edit Follow-up Task">
        <form onSubmit={handleEdit} className="space-y-4">
          <FollowUpForm formData={editForm} setFormData={setEditForm} leads={leadList} salesExecs={salesExecs} isEdit={true} />
          {success    && <p className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 py-2 text-center rounded-xl">{success}</p>}
          {actionError && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 py-2 text-center rounded-xl">{actionError}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={actionLoading}>Update</Button>
          </div>
        </form>
      </Modal>

      {/* Complete Modal */}
      <Modal isOpen={showCompleteModal} onClose={() => setShowCompleteModal(false)} title="Mark as Done">
        <form onSubmit={handleComplete} className="space-y-4">
          {selectedTask && (
            <div className="p-3 bg-[#f8fafc] dark:bg-[#0f0f0f] rounded-xl">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedTask.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{selectedTask.lead_name} · {formatDue(selectedTask)}</p>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Completion Notes <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={completeNotes}
              onChange={e => setCompleteNotes(e.target.value)}
              placeholder="Spoke with client, discussed pricing. Will call back next week."
              className="w-full px-3 py-2 text-sm bg-[#f8fafc] dark:bg-[#0f0f0f] border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand resize-none text-gray-900 dark:text-gray-100"
            />
          </div>
          {success    && <p className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 py-2 text-center rounded-xl">{success}</p>}
          {actionError && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 py-2 text-center rounded-xl">{actionError}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCompleteModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={actionLoading}>
              ✓ Mark as Done
            </Button>
          </div>
        </form>
      </Modal>

      {/* Success toast */}
      {success && !showAddModal && !showEditModal && !showCompleteModal && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-purple-500 text-white px-5 py-3 rounded-2xl shadow-xl shadow-purple-500/30">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8L6.5 11.5L13 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {success}
        </div>
      )}

      {/* Bulk Convert Follow-Ups to Site Visit */}
      {showBulkConvert && selectedTasks.length > 0 && (
        <BulkConvertFUModal
          taskIds={selectedTasks}
          tasks={allTasks}
          onClose={() => setShowBulkConvert(false)}
          onSuccess={handleBulkFUConvertSuccess}
        />
      )}

      {/* Single Convert Follow-Up to Site Visit */}
      {showConvertModal && convertTask && (
        <ConvertFollowUpModal
          task={convertTask}
          onClose={() => { setShowConvertModal(false); setConvertTask(null) }}
          onSuccess={handleConvertTaskSuccess}
        />
      )}

      {/* Export Modal */}
      <ExportModal 
        isOpen={showExportModal} 
        onClose={() => setShowExportModal(false)} 
        onExport={handleExport} 
        loading={exporting}
        title="Export Follow-ups"
      />
    </div>
  )
}