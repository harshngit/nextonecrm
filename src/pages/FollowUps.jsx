import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useModulePermissions } from '../hooks/usePermission'
import {
  CheckCircle, Clock, AlertCircle, Phone, Plus, MapPin,
  Edit2, Trash2, Download, RefreshCw, ChevronDown, Filter, Eye, X,
  ArrowRightCircle, CheckCircle2, CalendarPlus, Loader2, MoreVertical, CalendarClock, User,
} from 'lucide-react'
import {
  fetchFollowUps, fetchMyFollowUps, createFollowUp, updateFollowUp,
  completeFollowUp, deleteFollowUp, clearFollowUpError, markCompleted,
} from '../store/followUpSlice'
import { fetchLeads, fetchLeadSources } from '../store/leadSlice'
import { fetchTeamTree } from '../store/userSlice'
import { fetchProjects } from '../store/projectSlice'
import ListSkeleton from '../components/loaders/ListSkeleton'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import api from '../api/axios'
import Modal from '../components/ui/Modal'
import ExportModal from '../components/ui/ExportModal'
import CustomSelect from '../components/ui/CustomSelect'
import ConfirmModal from '../components/ui/ConfirmModal'
import AsyncSearchSelect from '../components/ui/AsyncSearchSelect'

const priorities = ['low', 'medium', 'high']
const priorityOptions = priorities.map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))
const priorityStyle = {
  high:   'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  medium: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  low:    'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
}

const ROLE_LABEL = { super_admin: 'Super Admin', admin: 'Admin', associate_partner: 'Associate Partner', cluster_head: 'Cluster Head', partner: 'Partner', team_leader: 'Team Leader', sales_manager: 'Sales Manager', sales_executive: 'Sales Executive', external_caller: 'External Caller' }

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

const configurationOptions = [
  { value: '1RK', label: '1RK' },
  { value: '1BHK', label: '1BHK' },
  { value: '2BHK', label: '2BHK' },
  { value: '3BHK', label: '3BHK' },
  { value: '4BHK', label: '4BHK' },
  { value: 'Penta House / Duplex', label: 'Penta House / Duplex' },
  { value: 'Commercial shop', label: 'Commercial shop' },
  { value: 'Office space', label: 'Office space' },
]

const defaultLeadWithTaskForm = {
  // Lead fields
  name: '', phone: '', alternate_phone_number: '', email: '',
  source: '', source_id: '', project_id: '', project_name: '', assigned_to: '',
  budget: '', location_preference: '', configuration: [],
  lead_notes: '', callback_time: '', next_followup_time: '',
  // Task fields
  title: '', due_date: '', due_time: '10:00', priority: 'medium', notes: ''
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
function FollowUpForm({ formData, setFormData, leads, teamMembers = [], isEdit, selectedTask, currentUser }) {
  const ic = "w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm transition-all duration-200"
  const lc = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"

  const execOptions = [
    ...(currentUser ? [{ value: currentUser.id, label: `Self · ${ROLE_LABEL[currentUser.role] || currentUser.role}` }] : []),
    ...teamMembers.filter(u => u.id !== currentUser?.id && !u.is_self).map(u => ({
      value: u.id,
      label: `${u.first_name} ${u.last_name} · ${ROLE_LABEL[u.role] || u.role}`
    })),
    ...(isEdit && selectedTask?.assigned_to && !teamMembers.find(u => u.id === selectedTask.assigned_to) && selectedTask?.assigned_name
      ? [{ value: selectedTask.assigned_to, label: selectedTask.assigned_name }]
      : [])
  ]

  const searchLeads = async (q) => {
    const res = await api.get('/leads', { params: { search: q, per_page: 20 } })
    return (res.data.data || []).map(l => ({ value: l.id, label: `${l.name}${l.phone ? ` — ${l.phone}` : ''}` }))
  }
  const leadInitial = [
    // ensure the current lead is always in the list when editing so AsyncSearchSelect can display it
    ...(isEdit && selectedTask?.lead_id && selectedTask?.lead_name && !leads.slice(0, 20).find(l => l.id === selectedTask.lead_id)
      ? [{ value: selectedTask.lead_id, label: `${selectedTask.lead_name}${selectedTask.lead_phone ? ` — ${selectedTask.lead_phone}` : ''}` }]
      : []),
    ...leads.slice(0, 20).map(l => ({ value: l.id, label: `${l.name}${l.phone ? ` — ${l.phone}` : ''}` })),
  ]

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

      {/* Lead — async search */}
      <AsyncSearchSelect
        label="Lead"
        required
        value={formData.lead_id}
        onChange={val => setFormData(p => ({ ...p, lead_id: val }))}
        onSearch={searchLeads}
        initialOptions={leadInitial}
        placeholder="Type to search leads..."
      />

      {/* Due Date + Time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          searchable
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

// ── Lead + Task Form Component ─────────────────────────────────────────────────
function LeadWithTaskForm({ formData, setFormData, activeTab, setActiveTab, sourceList, teamMembers = [], projects, currentUser, errors, onNext }) {
  const inputClass = 'w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm transition-all duration-200'
  const labelClass = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'
  const isRestricted = ['sales_executive', 'external_caller'].includes(currentUser?.role)
  const ROLE_LABEL = { super_admin: 'Super Admin', admin: 'Admin', associate_partner: 'Associate Partner', cluster_head: 'Cluster Head', partner: 'Partner', team_leader: 'Team Leader', sales_manager: 'Sales Manager', sales_executive: 'Sales Executive', external_caller: 'External Caller' }
  
  const sourceOptions = sourceList.map(s => ({ value: s.id, label: s.name }))
  const execOptions = [
    ...(currentUser ? [{ value: currentUser.id, label: `Self · ${ROLE_LABEL[currentUser.role] || currentUser.role}` }] : []),
    ...teamMembers.filter(u => u.id !== currentUser?.id && !u.is_self).map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name} · ${ROLE_LABEL[u.role] || u.role}` }))
  ]
  const projectOptions = projects.map(p => ({ value: p.id, label: p.name || p.project_name }))
  const searchProjects = async (q) => {
    const res = await api.get('/projects', { params: { search: q, per_page: 20 } })
    return (res.data.data || []).map(p => ({ value: p.id, label: `${p.name}${p.city ? ` — ${p.city}` : ''}` }))
  }

  useEffect(() => {
    if (isRestricted && !formData.assigned_to && currentUser?.id) {
      setFormData(prev => ({ ...prev, assigned_to: currentUser.id }))
    }
  }, [isRestricted, currentUser?.id])

  const updateForm = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex bg-gray-50 dark:bg-gray-800/40 rounded-xl p-1 gap-1">
        <button
          onClick={() => setActiveTab('lead')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'lead' ? 'bg-brand text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          Lead Details
        </button>
        <button
          onClick={() => setActiveTab('task')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'task' ? 'bg-brand text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          Follow-up Task
        </button>
      </div>

      {activeTab === 'lead' ? (
        <div className="space-y-4">
          {/* Name + Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Full Name *</label>
              <input required value={formData.name} onChange={e => updateForm('name', e.target.value)} placeholder="Suresh Patel" className={inputClass} />
              {errors?.name && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className={labelClass}>Phone *</label>
              <input required value={formData.phone} onChange={e => updateForm('phone', e.target.value)} placeholder="+919876543210" className={inputClass} />
              {errors?.phone && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.phone}</p>}
            </div>
          </div>

          {/* Alt Phone + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Alternate Phone</label>
              <input value={formData.alternate_phone_number} onChange={e => updateForm('alternate_phone_number', e.target.value)} placeholder="+919876543211" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" value={formData.email} onChange={e => updateForm('email', e.target.value)} placeholder="suresh.patel@gmail.com" className={inputClass} />
            </div>
          </div>

          {/* Budget + Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Budget</label>
              <input value={formData.budget} onChange={e => updateForm('budget', e.target.value)} placeholder="80-100L" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Finding Location</label>
              <div className="relative">
                <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={formData.location_preference} onChange={e => updateForm('location_preference', e.target.value)} placeholder="Andheri West" className={inputClass + ' pl-8'} />
              </div>
            </div>
          </div>

          {/* Configuration (Multi-select) */}
          <div>
            <CustomSelect
              label="Configuration"
              value={formData.configuration}
              onChange={val => updateForm('configuration', val)}
              options={configurationOptions}
              placeholder="Select configuration(s)"
              multiple
            />
          </div>

          {/* Project Name — autocomplete with plain-text fallback when no results */}
          <div>
            <AsyncSearchSelect
              label="Project Name"
              value={formData.project_id}
              onChange={val => setFormData(prev => ({ ...prev, project_id: val, project_name: '' }))}
              onTextChange={text => updateForm('project_name', text)}
              onSearch={searchProjects}
              initialOptions={projectOptions.slice(0, 20)}
              placeholder="Type to search projects..."
              fallbackToInput
              defaultText={formData.project_id ? '' : (formData.project_name || '')}
            />
          </div>

          {/* Callback + Follow-up */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}><span className="flex items-center gap-1"><Clock size={11} /> Callback Time</span></label>
              <input type="datetime-local" value={formData.callback_time ? formData.callback_time.slice(0, 16) : ''}
                onChange={e => updateForm('callback_time', e.target.value ? new Date(e.target.value).toISOString() : '')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}><span className="flex items-center gap-1"><CalendarClock size={11} /> Next Follow-up</span></label>
              <input type="datetime-local" value={formData.next_followup_time ? formData.next_followup_time.slice(0, 16) : ''}
                onChange={e => updateForm('next_followup_time', e.target.value ? new Date(e.target.value).toISOString() : '')} className={inputClass} />
            </div>
          </div>

          {/* Source */}
          <CustomSelect 
            label="Lead Source" 
            value={(() => {
              if (formData.source_id) {
                const hasMatchingId = sourceOptions.some(opt => opt.value === formData.source_id)
                if (hasMatchingId) return formData.source_id
              }
              if (formData.source) {
                const matchedOpt = sourceOptions.find(opt => 
                  opt.label.toLowerCase() === formData.source.toLowerCase()
                )
                if (matchedOpt) return matchedOpt.value
              }
              return ''
            })()}
            onChange={val => {
              const selected = sourceList.find(s => s.id === val)
              updateForm('source_id', selected?.id || val)
              updateForm('source', selected?.name || val)
            }}
            options={sourceOptions} 
            placeholder="Select Platform" 
          />

          {/* Assign To */}
          <div>
            {isRestricted ? (
              <div>
                <label className={labelClass}>Assign To</label>
                <input readOnly value={`${currentUser?.first_name ?? ''} ${currentUser?.last_name ?? ''}`.trim()} className={inputClass + ' cursor-not-allowed opacity-60 bg-gray-50 dark:bg-gray-800/40'} />
              </div>
            ) : (
              <CustomSelect label="Assign To" value={formData.assigned_to} onChange={val => updateForm('assigned_to', val)} options={execOptions} placeholder="Select team member" searchable />
            )}
          </div>

          {/* Notes */}
          <div>
            <label className={labelClass}>Lead Notes</label>
            <textarea rows={3} value={formData.lead_notes} onChange={e => updateForm('lead_notes', e.target.value)}
              placeholder="Interested in 2BHK units" className={inputClass} />
          </div>

          {/* Errors */}
          {errors && Object.keys(errors).length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
              {Object.entries(errors).filter(([k]) => k !== 'submit').map(([key, msg]) => (
                <p key={key} className="text-xs text-red-600 dark:text-red-400">{msg}</p>
              ))}
              {errors?.submit && <p className="text-xs text-red-600 dark:text-red-400">{errors.submit}</p>}
            </div>
          )}

          {/* Next Button */}
          <div className="pt-2">
            <Button 
              type="button" 
              className="w-full" 
              onClick={onNext}
            >
              Next
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Task Title */}
          <div>
            <label className={labelClass}>Task Title *</label>
            <input
              required
              value={formData.title}
              onChange={e => updateForm('title', e.target.value)}
              placeholder="Follow up with John Doe"
              className={inputClass}
            />
          </div>

          {/* Due Date + Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Due Date *</label>
              <input
                required
                type="date"
                value={formData.due_date}
                onChange={e => updateForm('due_date', e.target.value)}
                className={inputClass}
              />
            </div>
            <ClockPicker
              label="Due Time"
              value={formData.due_time}
              onChange={val => updateForm('due_time', val)}
              icon={Clock}
            />
          </div>

          {/* Priority + Assign To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CustomSelect
              label="Priority"
              value={formData.priority}
              onChange={val => updateForm('priority', val)}
              options={priorityOptions}
            />
            {!isRestricted && (
              <CustomSelect
                label="Assign To"
                value={formData.assigned_to}
                onChange={val => updateForm('assigned_to', val)}
                options={execOptions}
                placeholder="Select team member"
                searchable
              />
            )}
          </div>

          {/* Notes */}
          <div>
            <label className={labelClass}>Task Notes</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={e => updateForm('notes', e.target.value)}
              placeholder="Discuss project details"
              className={inputClass}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Task Card — defined OUTSIDE to prevent focus bug ─────────────────────────

// ─── Convert Follow-Up to Site Visit Modal ────────────────────────────────────

function ConvertFollowUpModal({ task, onClose, onSuccess, teamMembers = [] }) {
  const [converting, setConverting] = useState(false)
  const [error, setError] = useState('')
  const [options, setOptions] = useState(null)
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [form, setForm] = useState({
    project_id: '', visit_date: '', visit_time: '10:00',
    assigned_to: '', transport_arranged: false, notes: '',
  })

  const { list: projectList } = useSelector(s => s.projects)
  const { user: currentUser } = useSelector(s => s.auth)

  useEffect(() => {
    api.get(`/convert/follow-up/${task.id}/options`)
      .then(async r => {
        setOptions(r.data.data)
        const pf = r.data.data?.conversions?.to_site_visit?.prefill || {}
        let projectId = pf.project_id || ''
        // fallback: fetch project from the lead if prefill didn't provide one
        if (!projectId && task.lead_id) {
          try {
            const lr = await api.get(`/leads/${task.lead_id}`)
            projectId = lr.data.data?.project?.id || lr.data.data?.project_id || ''
          } catch {}
        }
        setForm(f => ({
          ...f,
          project_id:         projectId,
          assigned_to:        pf.assigned_to || task.assigned_to || '',
          transport_arranged: pf.transport_arranged || false,
        }))
      })
      .catch(() => {})
      .finally(() => setLoadingOptions(false))
  }, [task.id])

  const inputCls = "w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-[#0082f3] text-gray-700 dark:text-gray-300 transition-colors placeholder-gray-400"
  const labelCls = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5"

  const projectOpts = (options?.projects || projectList || []).map(p => ({ value: p.id, label: `${p.name}${p.city ? ` · ${p.city}` : ''}` }))
  const _baseUsers  = options?.users || teamMembers || []
  const userOpts    = [
    ...(currentUser ? [{ value: currentUser.id, label: `Self · ${ROLE_LABEL[currentUser.role] || currentUser.role}` }] : []),
    ..._baseUsers.filter(u => u.id !== currentUser?.id && !u.is_self).map(u => ({ value: u.id, label: u.name || `${u.first_name} ${u.last_name}${u.role ? ` · ${ROLE_LABEL[u.role] || u.role}` : ''}` }))
  ]

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Visit Date *</label>
              <input type="date" value={form.visit_date} onChange={e => setForm(f => ({...f, visit_date: e.target.value}))}
                min={new Date().toISOString().split('T')[0]} className={inputCls} />
            </div>
            <div>
              <ClockPicker label="Visit Time *" value={form.visit_time} onChange={v => setForm(f => ({...f, visit_time: v}))} required />
            </div>
          </div>
          <CustomSelect label="Assign To" value={form.assigned_to} onChange={v => setForm(f => ({...f, assigned_to: v}))} options={userOpts} placeholder="Keep current" searchable />
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

function BulkConvertFUModal({ taskIds, tasks, onClose, onSuccess, teamMembers = [] }) {
  const [converting, setConverting] = useState(false)
  const [error, setError]     = useState('')
  const [results, setResults] = useState(null)
  const [form, setForm] = useState({ project_id: '', visit_date: '', visit_time: '10:00', assigned_to: '', transport_arranged: false, notes: '' })

  const { list: projectList } = useSelector(s => s.projects)
  const { user: currentUser } = useSelector(s => s.auth)

  const inputCls = "w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-[#0082f3] text-gray-700 dark:text-gray-300 transition-colors placeholder-gray-400"
  const labelCls = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5"
  const projectOpts = projectList.map(p => ({ value: p.id, label: `${p.name}${p.city ? ` · ${p.city}` : ''}` }))
  const userOpts    = [
    ...(currentUser ? [{ value: currentUser.id, label: `Self · ${ROLE_LABEL[currentUser.role] || currentUser.role}` }] : []),
    ...teamMembers.filter(u => u.id !== currentUser?.id && !u.is_self).map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name} · ${ROLE_LABEL[u.role] || u.role}` }))
  ]

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Visit Date *</label>
            <input type="date" value={form.visit_date} onChange={e => setForm(f => ({...f, visit_date: e.target.value}))}
              min={new Date().toISOString().split('T')[0]} className={inputCls} />
          </div>
          <div>
            <ClockPicker label="Visit Time" value={form.visit_time} onChange={v => setForm(f => ({...f, visit_time: v}))} />
          </div>
        </div>
        <CustomSelect label="Assign To" value={form.assigned_to} onChange={v => setForm(f => ({...f, assigned_to: v}))} options={userOpts} placeholder="Keep current" searchable />
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


function TaskCard({ task, onEdit, onDelete, onComplete, onConvert, canManage, isSelected, onSelect, editLoading, openMenuTaskId, setOpenMenuTaskId }) {
  const navigate = useNavigate()
  const [menuPos, setMenuPos] = useState(null)
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
              onClick={() => navigate(`/follow-ups/${task.id}`)}
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
            {task.assigned_name && (
              <span className="text-xs text-gray-400">→ {task.assigned_name}</span>
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
          {canManage && (
            <div className="flex gap-1 justify-end">
              <div className="relative">
                <button onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); const below = window.innerHeight - r.bottom; setMenuPos({ right: window.innerWidth - r.right, ...(below > 200 ? { top: r.bottom + 4 } : { bottom: window.innerHeight - r.top + 4 }) }); setOpenMenuTaskId(openMenuTaskId === task.id ? null : task.id) }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand hover:bg-brand/10 transition-colors" title="Actions">
                  <MoreVertical size={13} />
                </button>

                {openMenuTaskId === task.id && (
                  <div style={{ top: menuPos?.top, bottom: menuPos?.bottom, right: menuPos?.right }} className="fixed w-48 max-h-64 overflow-y-auto bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg z-[9999] py-1">
                    <button
                      onClick={() => { navigate(`/follow-ups/${task.id}`); setOpenMenuTaskId(null)}}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <Eye size={14} />
                      View Details
                    </button>
                    {onConvert && task.lead_id && !task.is_completed && (
                      <button 
                        onClick={() => { onConvert(task); setOpenMenuTaskId(null)}}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <ArrowRightCircle size={14} />
                        Convert to Site Visit
                      </button>
                    )}
                    <button 
                      onClick={() => { onEdit(task); setOpenMenuTaskId(null)}}
                      disabled={editLoading === task.id}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
                      {editLoading === task.id ? <Loader2 size={14} className="animate-spin" /> : <Edit2 size={14} />}
                      Edit
                    </button>
                    <button 
                      onClick={() => { onDelete(task); setOpenMenuTaskId(null)}}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                )}
              </div>
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
  const navigate = useNavigate()
  const { list, loading, pagination, actionLoading, actionError } = useSelector(s => s.followUps)
  const { list: leadList, sources: sourceList = [] } = useSelector(s => s.leads)
  const { list: projectList = [] } = useSelector(s => s.projects)
  const { user: currentUser } = useSelector(s => s.auth)
  const { teamTree: teamMembers = [] } = useSelector(s => s.users)

  const isExternalCaller = currentUser?.role === 'external_caller'
  const [filterView,     setFilterView]     = useState(isExternalCaller ? 'mine' : 'team')
  const [filterStatus,   setFilterStatus]   = useState('all') // pending | overdue | all | completed
  const [filterAssigned, setFilterAssigned] = useState('')
  const [page, setPage] = useState(1)

  const [showAddModal,      setShowAddModal]      = useState(false)
  const [showEditModal,     setShowEditModal]     = useState(false)
  const [showCompleteModal, setShowCompleteModal]  = useState(false)
  const [showDeleteModal,   setShowDeleteModal]    = useState(false)
  const [taskToDelete,      setTaskToDelete]       = useState(null)
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
  const [editLoading,       setEditLoading]       = useState(null) // Track which task is loading
  const [openMenuTaskId,    setOpenMenuTaskId]    = useState(null)
  const [menuPos,           setMenuPos]           = useState(null)
  const [showLeadWithTaskModal, setShowLeadWithTaskModal] = useState(false)
  const [leadWithTaskForm, setLeadWithTaskForm] = useState(defaultLeadWithTaskForm)
  const [leadWithTaskTab, setLeadWithTaskTab] = useState('lead') // 'lead' or 'task'
  const [leadWithTaskErrors, setLeadWithTaskErrors] = useState({})
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const canManage = true // All roles can manage follow-ups and convert to site visits
  const perms = useModulePermissions('follow_ups')

  const toggleAll = () => {
    setSelectedTasks(prev => prev.length === list.length ? [] : list.map(t => t.id))
  }

  // ── Load data ───────────────────────────────────────────────────────────────
  const loadTasks = () => {
    const params = { page, per_page: 10 }
    if (filterStatus === 'pending')   { params.is_completed = false }
    if (filterStatus === 'completed') { params.is_completed = true }
    if (filterStatus === 'overdue')   { params.overdue = true; params.is_completed = false }
    if (filterView === 'mine') {
      dispatch(fetchMyFollowUps(params))
    } else {
      if (filterAssigned) params.assigned_to = filterAssigned
      dispatch(fetchFollowUps(params))
    }
  }

  useEffect(() => { loadTasks() }, [dispatch, filterView, filterStatus, filterAssigned, page])

  useEffect(() => {
    dispatch(fetchLeads({ per_page: 100 }))
    dispatch(fetchProjects())
    dispatch(fetchLeadSources())
  }, [dispatch])

  useEffect(() => {
    if (!currentUser?.id) return
    dispatch(fetchTeamTree(currentUser.id))
  }, [currentUser?.id, dispatch])

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

  const handleLeadWithTaskNext = () => {
    const errors = {}
    if (!leadWithTaskForm.name) errors.name = 'Full name is required'
    if (!leadWithTaskForm.phone) errors.phone = 'Phone is required'
    
    setLeadWithTaskErrors(errors)
    
    if (Object.keys(errors).length === 0) {
      setLeadWithTaskTab('task')
    }
  }

  const handleAddLeadWithTask = async (e) => {
    e.preventDefault()
    dispatch(clearFollowUpError())
    try {
      // Build the payload
      const payload = {
        // Lead fields
        name: leadWithTaskForm.name,
        phone: leadWithTaskForm.phone,
        ...(leadWithTaskForm.alternate_phone_number && { alternate_phone_number: leadWithTaskForm.alternate_phone_number }),
        ...(leadWithTaskForm.email && { email: leadWithTaskForm.email }),
        ...(leadWithTaskForm.source && { source: leadWithTaskForm.source }),
        ...(leadWithTaskForm.source_id && { source_id: leadWithTaskForm.source_id }),
        ...(leadWithTaskForm.project_id
          ? { project_id: leadWithTaskForm.project_id }
          : leadWithTaskForm.project_name ? { project_name: leadWithTaskForm.project_name } : {}),
        ...(leadWithTaskForm.assigned_to && { assigned_to: leadWithTaskForm.assigned_to }),
        ...(leadWithTaskForm.budget && { budget: leadWithTaskForm.budget }),
        ...(leadWithTaskForm.location_preference && { location_preference: leadWithTaskForm.location_preference }),
        ...(leadWithTaskForm.configuration && { configuration: leadWithTaskForm.configuration }),
        ...(leadWithTaskForm.lead_notes && { lead_notes: leadWithTaskForm.lead_notes }),
        ...(leadWithTaskForm.callback_time && { callback_time: leadWithTaskForm.callback_time }),
        ...(leadWithTaskForm.next_followup_time && { next_followup_time: leadWithTaskForm.next_followup_time }),
        // Task fields
        title: leadWithTaskForm.title,
        due_date: leadWithTaskForm.due_date ? `${leadWithTaskForm.due_date}T${leadWithTaskForm.due_time || '10:00'}:00` : undefined,
        priority: leadWithTaskForm.priority,
        ...(leadWithTaskForm.notes && { notes: leadWithTaskForm.notes }),
      }

      // Call the API
      const response = await api.post('/tasks/create-with-lead', payload)

      if (response.status === 200 || response.status === 201) {
        setSuccess('Lead and Follow-up created!')
        loadTasks()
        // Also reload leads if needed
        dispatch(fetchLeads({ per_page: 100 }))
        setTimeout(() => {
          setShowLeadWithTaskModal(false)
          setSuccess('')
          setLeadWithTaskForm(defaultLeadWithTaskForm)
          setLeadWithTaskTab('lead')
          setLeadWithTaskErrors({})
        }, 800)
      }
    } catch (err) {
      console.error('Error creating lead with task:', err)
      // If there's an error from the API, display it
      if (err.response?.data?.message) {
        setLeadWithTaskErrors({ submit: err.response.data.message })
      }
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

  const handleDelete = async () => {
    if (!taskToDelete) return
    const result = await dispatch(deleteFollowUp(taskToDelete.id))
    if (deleteFollowUp.fulfilled.match(result)) loadTasks()
    setShowDeleteModal(false)
    setTaskToDelete(null)
  }

  const confirmDelete = (task) => {
    setTaskToDelete(task)
    setShowDeleteModal(true)
  }

  const openEdit = async (task) => {
    console.log('openEdit called with task:', task)
    setEditLoading(task.id)
    setSelectedTask(task)
    // First populate form with original task data immediately
    const originalDueDate = task.due_date ? task.due_date.split('T')[0] : ''
    const originalDueTime = task.due_date ? task.due_date.split('T')[1]?.slice(0, 5) : '10:00'
    setEditForm({
      title:       task.title || '',
      lead_id:     task.lead_id || '',
      due_date:    originalDueDate,
      due_time:    originalDueTime || '10:00',
      assigned_to: task.assigned_to || '',
      priority:    task.priority || 'medium',
      notes:       task.notes || '',
    })
    setShowEditModal(true) // Open modal immediately
    
    try {
      // Then fetch latest from API and update form
      const res = await api.get(`/tasks/${task.id}`)
      const taskData = res.data.data
      console.log('API returned taskData:', taskData)
      const dueDate = taskData.due_date ? taskData.due_date.split('T')[0] : ''
      const dueTime = taskData.due_date ? taskData.due_date.split('T')[1]?.slice(0, 5) : '10:00'
      setEditForm({
        title:       taskData.title || '',
        lead_id:     taskData.lead_id || '',
        due_date:    dueDate,
        due_time:    dueTime || '10:00',
        assigned_to: taskData.assigned_to || '',
        priority:    taskData.priority || 'medium',
        notes:       taskData.notes || '',
      })
    } catch (err) {
      console.error('API call failed:', err)
      // API failed, form already has original data
    } finally {
      setEditLoading(null)
    }
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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuTaskId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // ── Section Component ────────────────────────────────────────────────────────
  const Section = ({ title, tasks, icon: Icon, iconColor, accent, selectable, editLoading }) => {
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
          {tasks.map((task, taskIdx) => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={openComplete}
              onEdit={openEdit}
              onDelete={confirmDelete}
              onConvert={selectable ? (t) => { setConvertTask(t); setShowConvertModal(true) } : undefined}
              canManage={perms.edit}
              isSelected={selectedTasks.includes(task.id)}
              onSelect={selectable ? toggleTask : undefined}
              editLoading={editLoading}
              openMenuTaskId={openMenuTaskId}
              setOpenMenuTaskId={setOpenMenuTaskId}
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

          {/* My / Team toggle — hidden for super_admin and admin */}
          {!['super_admin', 'admin', 'external_caller'].includes(currentUser?.role) && (
            <div className="flex bg-white dark:bg-[#1a1a1a] border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl p-1 gap-1">
              {[
                { key: 'mine', label: 'My Follow-ups' },
                { key: 'team', label: 'Team' },
              ].map(tab => (
                <button key={tab.key}
                  onClick={() => { setFilterView(tab.key); setFilterAssigned(''); setPage(1) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                    ${filterView === tab.key
                      ? 'bg-brand text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}>
                  {tab.label}
                </button>
              ))}
            </div>
          )}

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

          {/* Assign filter — visible in Team view for everyone */}
          {filterView === 'team' && (
            <div className="w-48">
              <CustomSelect
                value={filterAssigned}
                onChange={val => { setFilterAssigned(val); setPage(1) }}
                options={[{ value: '', label: 'All Team' }, ...teamMembers.filter(u => !u.is_self).map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name} · ${ROLE_LABEL[u.role] || u.role}` }))]}
                placeholder="All Team"
                searchable
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
          {/* <Button variant="outline" size="sm" icon={Download} loading={exporting} disabled={exporting} onClick={() => setShowExportModal(true)}>
            Export
          </Button> */}
          <div className="relative">
            <Button 
              icon={Plus} 
              onClick={() => { 
                setAddMenuOpen(o => !o) 
              }}
            >
              Add Follow-up
            </Button>
            {addMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setAddMenuOpen(false)}
                />
                <div className="absolute lg:right-0 top-full mt-2 z-50 w-60 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg py-1">
                  <button 
                    onClick={() => { 
                      setAddForm(defaultForm); 
                      dispatch(clearFollowUpError()); 
                      setShowAddModal(true); 
                      setAddMenuOpen(false); 
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <User size={16} />
                    <span>Existing Lead</span>
                  </button>
                  <button 
                    onClick={() => { 
                      setLeadWithTaskForm(defaultLeadWithTaskForm); 
                      setLeadWithTaskTab('lead'); 
                      dispatch(clearFollowUpError()); 
                      setShowLeadWithTaskModal(true); 
                      setAddMenuOpen(false); 
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Plus size={16} />
                    <span>New Lead + Follow-up</span>
                  </button>
                </div>
              </>
            )}
          </div>
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

      {/* Summary row + inline selection actions */}
      {!loading && (
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-gray-500 dark:text-[#888]">
            Showing <span className="font-semibold text-gray-900 dark:text-white">{list.length}</span>
            {pagination?.total > 0 && <> of <span className="font-semibold text-gray-900 dark:text-white">{pagination.total}</span></>} follow-ups
          </div>

          {/* Inline bulk-action pills — only visible when rows are checked */}
          {selectedTasks.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {selectedTasks.length} selected
              </span>
              {canManage && (
                <button onClick={() => setShowBulkConvert(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.97]">
                  <ArrowRightCircle size={13} /> Convert {selectedTasks.length}
                </button>
              )}
              <button onClick={() => setSelectedTasks([])}
                className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-blue-100/50 dark:shadow-blue-900/20 rounded-2xl hover:shadow-lg transition-all duration-200">
        {loading ? (
          <div className="p-4"><ListSkeleton rows={8} /></div>
        ) : list.length === 0 ? (
          <div className="py-16 text-center text-gray-400 dark:text-[#888]">
            <CheckCircle size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
            <p className="font-medium">No follow-ups found</p>
            <p className="text-sm mt-1">Try adjusting your filters or add a new follow-up</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-blue-50/50 dark:bg-blue-900/10">
                  <th className="py-3 pl-4 pr-2 w-8">
                    <input type="checkbox"
                      checked={selectedTasks.length === list.length && list.length > 0}
                      onChange={toggleAll} className="rounded border-gray-300 text-[#0082f3] focus:ring-[#0082f3]" />
                  </th>
                  {['Lead', 'Task', 'Due', 'Priority', ...(filterView !== 'mine' ? ['Assigned'] : []), 'Status', 'Actions'].map((h, i) => (
                    <th key={h} className={`py-3 px-3 text-left text-xs font-medium text-blue-900/70 dark:text-blue-200/70 uppercase tracking-wide whitespace-nowrap
                      ${h === 'Priority' ? 'hidden md:table-cell' : ''}
                      ${h === 'Actions' ? 'text-right' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {list.map((task, taskIdx) => {
                  const category = classifyTask(task)
                  return (
                    <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-[#0f0f0f] transition-colors">
                      <td className="py-3 pl-4 pr-2">
                        <input type="checkbox" checked={selectedTasks.includes(task.id)}
                          onChange={() => toggleTask(task.id)} className="rounded border-gray-300" />
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={task.lead_name || task.title} size="sm" />
                          <div>
                            <div
                              className="font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:text-brand transition-colors"
                              onClick={() => navigate(`/follow-ups/${task.id}`)}
                            >
                              {task.lead_name || '—'}
                            </div>
                            {task.lead_phone && (
                              <div className="text-xs text-gray-400">{task.lead_phone}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-400">
                        <div className="text-sm font-medium">{task.title}</div>
                        {task.notes && (
                          <div className="text-xs text-gray-400 line-clamp-1">{task.notes}</div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className={`text-xs ${category === 'overdue' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                          <Clock size={10} className="inline mr-1" />
                          {formatDue(task)}
                        </div>
                      </td>
                      <td className="py-3 px-3 hidden md:table-cell">
                        <span className={`text-xs px-2 py-1 rounded-lg ${priorityStyle[task.priority] || priorityStyle.medium}`}>
                          {task.priority || 'Medium'}
                        </span>
                      </td>
                      {filterView !== 'mine' && (
                        <td className="py-3 px-3">
                          {task.assigned_to ? (
                            <div className="flex items-center gap-1.5">
                              <Avatar name={task.assigned_to_name || task.assigned_to} size="xs" />
                              <span className="text-xs text-gray-600 dark:text-gray-400">{task.assigned_to_name || task.assigned_to}</span>
                            </div>
                          ) : <span className="text-xs text-gray-400">Unassigned</span>}
                        </td>
                      )}
                      <td className="py-3 px-3">
                        <span className={`text-xs px-2 py-1 rounded-lg
                          ${category === 'completed' ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' :
                            category === 'overdue' ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400' :
                            category === 'today' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' :
                            'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
                        >
                          {category === 'completed' ? 'Done' :
                            category === 'overdue' ? 'Overdue' :
                            category === 'today' ? 'Today' : 'Upcoming'}
                        </span>
                      </td>
                      <td className="py-3 px-3" ref={openMenuTaskId === task.id ? menuRef : null}>
                        <div className="flex items-center justify-end gap-1">
                          {task.lead_phone && (
                            <a href={`tel:${task.lead_phone}`} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors" title="Call">
                              <Phone size={13} />
                            </a>
                          )}
                          {!task.is_completed && (
                            <button onClick={() => openComplete(task)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors" title="Mark Done">
                              <CheckCircle2 size={13} />
                            </button>
                          )}
                          <div className="relative">
                            <button onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); const below = window.innerHeight - r.bottom; setMenuPos({ right: window.innerWidth - r.right, ...(below > 200 ? { top: r.bottom + 4 } : { bottom: window.innerHeight - r.top + 4 }) }); setOpenMenuTaskId(openMenuTaskId === task.id ? null : task.id) }}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand hover:bg-brand/10 transition-colors" title="Actions">
                              <MoreVertical size={13} />
                            </button>
                            {openMenuTaskId === task.id && (
                              <div style={{ top: menuPos?.top, bottom: menuPos?.bottom, right: menuPos?.right }} className="fixed w-48 max-h-64 overflow-y-auto bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg z-[9999] py-1">
                                <button
                                  onClick={() => { navigate(`/follow-ups/${task.id}`); setOpenMenuTaskId(null)}}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                  <Eye size={14} />
                                  View Details
                                </button>
                                {task.lead_id && !task.is_completed && (
                                  <button 
                                    onClick={() => { setConvertTask(task); setShowConvertModal(true); setOpenMenuTaskId(null)}}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                    <ArrowRightCircle size={14} />
                                    Convert to Site Visit
                                  </button>
                                )}
                                <button 
                                  onClick={() => { openEdit(task); setOpenMenuTaskId(null)}}
                                  disabled={editLoading === task.id}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
                                  {editLoading === task.id ? <Loader2 size={14} className="animate-spin" /> : <Edit2 size={14} />}
                                  Edit
                                </button>
                                <button 
                                  onClick={() => { confirmDelete(task); setOpenMenuTaskId(null)}}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                  <Trash2 size={14} />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination?.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500 dark:text-[#888]">
            Page {pagination.page} of {pagination.total_pages} · {pagination.total} total
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
            <Button size="sm" variant="outline" disabled={page >= pagination.total_pages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setSuccess('') }} title="Add Follow-up Task">
        <form onSubmit={handleAdd} className="space-y-4">
          <FollowUpForm formData={addForm} setFormData={setAddForm} leads={leadList} teamMembers={teamMembers} isEdit={false} currentUser={currentUser} />
          {success    && <p className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 py-2 text-center rounded-xl">{success}</p>}
          {actionError && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 py-2 text-center rounded-xl">{actionError}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={actionLoading}>Create Follow-up</Button>
          </div>
        </form>
      </Modal>

      {/* Create Lead + Follow-up Modal */}
      <Modal isOpen={showLeadWithTaskModal} onClose={() => { setShowLeadWithTaskModal(false); setSuccess(''); setLeadWithTaskErrors({}) }} title="Create Lead + Follow-up">
        <form onSubmit={handleAddLeadWithTask} className="space-y-4">
          <LeadWithTaskForm 
            formData={leadWithTaskForm} 
            setFormData={setLeadWithTaskForm} 
            activeTab={leadWithTaskTab}
            setActiveTab={setLeadWithTaskTab}
            sourceList={sourceList}
            teamMembers={teamMembers}
            projects={projectList}
            currentUser={currentUser}
            errors={leadWithTaskErrors}
            onNext={handleLeadWithTaskNext}
          />
          {success    && <p className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 py-2 text-center rounded-xl">{success}</p>}
          {leadWithTaskErrors?.submit && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 py-2 text-center rounded-xl">{leadWithTaskErrors.submit}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowLeadWithTaskModal(false); setLeadWithTaskErrors({}) }}>Cancel</Button>
            {leadWithTaskTab === 'task' && (
              <Button type="submit" className="flex-1" loading={actionLoading}>Create</Button>
            )}
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSuccess('') }} title="Edit Follow-up Task">
        <form onSubmit={handleEdit} className="space-y-4">
          <FollowUpForm formData={editForm} setFormData={setEditForm} leads={leadList} teamMembers={teamMembers} isEdit={true} selectedTask={selectedTask} currentUser={currentUser} />
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
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Completion Notes</label>
            <textarea
              value={completeNotes}
              onChange={(e) => setCompleteNotes(e.target.value)}
              placeholder="Enter completion notes..."
              rows={4}
              className="w-full px-3 py-2 text-sm bg-background border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-brand transition-all resize-none"
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
          teamMembers={teamMembers}
        />
      )}

      {/* Single Convert Follow-Up to Site Visit */}
      {showConvertModal && convertTask && (
        <ConvertFollowUpModal
          task={convertTask}
          onClose={() => { setShowConvertModal(false); setConvertTask(null) }}
          onSuccess={handleConvertTaskSuccess}
          teamMembers={teamMembers}
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

      <ConfirmModal 
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Follow-up"
        message={`Are you sure you want to delete this follow-up task? This action cannot be undone.`}
        confirmText="Delete Task"
        loading={actionLoading}
      />
    </div>
  )
}