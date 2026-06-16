import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { 
  ArrowLeft, Calendar, Clock, User, Phone, 
  MessageSquare, AlertCircle, CheckCircle, Loader2, 
  UserCheck, MapPin, ExternalLink, ShieldCheck, Info,
  Send, ChevronDown, CalendarPlus, Edit2, Eye
} from 'lucide-react'
import { fetchFollowUpById, clearCurrentTask, completeFollowUp, updateFollowUp } from '../store/followUpSlice'
import { fetchLeads } from '../store/leadSlice'
import { fetchUsers } from '../store/userSlice'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import CustomSelect from '../components/ui/CustomSelect'
import ConvertFollowUpModal from '../components/modals/ConvertFollowUpModal'

const priorities = ['low', 'medium', 'high']
const priorityOptions = priorities.map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))
const priorityStyle = {
  high:   'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  medium: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  low:    'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
}

const defaultForm = {
  title: '', lead_id: '', due_date: '', due_time: '10:00',
  assigned_to: '', priority: 'medium', notes: '',
}

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
      {label && <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label} {required && '*'}</label>}
      <div onClick={() => setOpen(!open)} className="w-full px-3 py-2 text-sm bg-background border border-gray-200 dark:border-gray-700 rounded-xl outline-none cursor-pointer flex items-center justify-between transition-all">
        <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
          {Icon && <Icon size={14} className={iconColor} />}
          {value || '10:00'}
        </div>
        <ChevronDown size={14} className="text-gray-400" />
      </div>

      {open && (
        <div className="absolute z-50 w-[260px] left-1/2 -translate-x-1/2 mt-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
          <div className="flex items-center justify-between px-4 pt-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setMode('hour')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${mode === 'hour' ? 'bg-[#0082f3] text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                Hours
              </button>
              <button onClick={() => setMode('minute')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${mode === 'minute' ? 'bg-[#0082f3] text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                Minutes
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => handleAMPM(true)} className={`w-12 h-9 text-xs font-bold rounded-xl transition-all ${isAM ? 'bg-white text-[#0082f3] shadow-md' : 'text-white/60 hover:text-white/90'}`}>AM</button>
              <button onClick={() => handleAMPM(false)} className={`w-12 h-9 text-xs font-bold rounded-xl transition-all ${!isAM ? 'bg-white text-[#0082f3] shadow-md' : 'text-white/60 hover:text-white/90'}`}>PM</button>
            </div>
          </div>

          <div className="flex w-full border-b border-gray-100 dark:border-gray-800">
            <button onClick={() => setMode('hour')} className={`flex-1 py-3 text-xs font-bold tracking-wide transition-colors ${mode==='hour' ? 'text-[#0082f3] border-b-2 border-[#0082f3]' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>HOUR</button>
            <button onClick={() => setMode('minute')} className={`flex-1 py-3 text-xs font-bold tracking-wide transition-colors ${mode==='minute' ? 'text-[#0082f3] border-b-2 border-[#0082f3]' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>MINUTE</button>
          </div>

          <div className="flex justify-center py-6 px-6 bg-gray-50/30 dark:bg-black/10 w-full">
            <svg ref={svgRef} width={260} height={260} onClick={handleClockClick} style={{ cursor: 'pointer' }}>
              <circle cx={130} cy={130} r={126} fill="var(--clock-bg, #ffffff)" className="dark:fill-gray-900" />
              <circle cx={130} cy={130} r={126} fill="none" stroke="#E2E8F0" strokeWidth={0.5} className="dark:stroke-gray-800" />
              {mode === 'hour' && <circle cx={130} cy={130} r={R_INNER + 20} fill="none" stroke="#E2E8F0" strokeWidth={0.5} strokeDasharray="4,4" className="dark:stroke-gray-700" />}
              <line x1={130} y1={130} x2={130 + handR * 1.18 * Math.cos(handAngle * Math.PI / 180)} y2={130 + handR * 1.18 * Math.sin(handAngle * Math.PI / 180)} stroke="#0082f3" strokeWidth={2.5} strokeLinecap="round" />
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
            <button onClick={() => setOpen(false)} className="px-8 py-2.5 bg-[#0082f3] hover:bg-[#0070d4] text-white text-sm font-bold rounded-2xl transition-all shadow-xl shadow-blue-500/20 active:scale-95">DONE</button>
          </div>
        </div>
      )}
    </div>
  )
}

function FollowUpForm({ formData, setFormData, leads, salesExecs, isEdit, selectedTask }) {
  const ic = "w-full px-3 py-2 text-sm bg-background border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm transition-all duration-200"
  const lc = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"

  const leadOptions = [
    ...leads.map(l => ({
      value: l.id,
      label: `${l.name}${l.phone ? ` — ${l.phone}` : ''}`
    })),
    ...(isEdit && selectedTask?.lead_id && !leads.find(l => l.id === selectedTask.lead_id) && selectedTask?.lead_name
      ? [{ value: selectedTask.lead_id, label: selectedTask.lead_name }]
      : [])
  ]

  const execOptions = [
    ...salesExecs.map(u => ({
      value: u.id,
      label: `${u.first_name} ${u.last_name}`
    })),
    ...(isEdit && selectedTask?.assigned_to && !salesExecs.find(u => u.id === selectedTask.assigned_to) && selectedTask?.assigned_name
      ? [{ value: selectedTask.assigned_to, label: selectedTask.assigned_name }]
      : [])
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

export default function FollowUpDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const { currentTask: task, detailLoading, actionLoading, error } = useSelector(s => s.followUps)
  const { list: leadList } = useSelector(s => s.leads)
  const { list: userList } = useSelector(s => s.users)
  const { user: currentUser } = useSelector(s => s.auth)

  const isAdmin = ['admin', 'super_admin'].includes(currentUser?.role)
  const [showPhone, setShowPhone] = useState(false)
  
  const [completeNotes, setCompleteNotes] = useState('')
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState(defaultForm)

  const salesExecs = userList.filter(u =>
    ['sales_executive', 'sales_manager'].includes(u.role) && u.is_active
  )

  useEffect(() => {
    dispatch(fetchFollowUpById(id))
    dispatch(fetchLeads({ per_page: 100 }))
    dispatch(fetchUsers())
    return () => dispatch(clearCurrentTask())
  }, [dispatch, id])

  useEffect(() => {
    if (task?.completion_notes) setCompleteNotes(task.completion_notes)
  }, [task])

  const openEdit = () => {
    if (!task) return
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

  const handleEdit = async (e) => {
    e.preventDefault()
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
    const result = await dispatch(updateFollowUp({ id: task.id, data: payload }))
    if (updateFollowUp.fulfilled.match(result)) {
      setShowEditModal(false)
      dispatch(fetchFollowUpById(id))
    }
  }

  if (detailLoading && !task) return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <Loader2 className="animate-spin text-brand mb-4" size={40} />
      <p className="text-gray-500 font-medium">Loading follow-up details...</p>
    </div>
  )

  if (!task && !detailLoading) return (
    <div className="flex items-center justify-center h-[60vh] text-gray-400 dark:text-[#888]">
      <div className="text-center max-w-sm px-6">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">📞</div>
        <h3 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-2">Follow-up not found</h3>
        <Button variant="outline" onClick={() => navigate('/follow-ups')} className="mt-4 rounded-xl">Back to Follow-ups</Button>
      </div>
    </div>
  )



  const handleMarkDone = async () => {
    const result = await dispatch(completeFollowUp({ id, notes: completeNotes }))
    if (completeFollowUp.fulfilled.match(result)) {
      dispatch(fetchFollowUpById(id))
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12">
      {/* Top Header / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <button
          onClick={() => navigate('/follow-ups')}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand transition-colors group flex-shrink-0"
        >
          <div className="w-8 h-8 rounded-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 flex items-center justify-center group-hover:border-brand/30 transition-all">
            <ArrowLeft size={16} />
          </div>
          Back to Follow-ups
        </button>

        <div className="flex gap-2 overflow-x-auto whitespace-nowrap pb-1 -mb-1 sm:pb-0 sm:-mb-0">
          {!task?.is_completed && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-purple-200 hover:border-purple-300 hover:bg-purple-50 text-purple-600 dark:border-purple-900/30 dark:hover:bg-purple-900/20 flex-shrink-0"
              onClick={() => setShowConvertModal(true)}
            >
              <CalendarPlus size={14} className="mr-2" /> Schedule Visit
            </Button>
          )}
          <Button variant="outline" size="sm" className="rounded-xl flex-shrink-0" onClick={() => navigate(`/leads/${task.lead_id}`)}>
            View Lead Profile
          </Button>
          <Button size="sm" className="rounded-xl px-5 font-bold shadow-lg shadow-blue-100/50 flex-shrink-0" onClick={openEdit}>
            Edit Task
          </Button>
        </div>
      </div>

      {task && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Main Info (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. Profile Header Card */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] overflow-hidden shadow-sm hover:shadow-md transition-all">
              <div className="h-24 bg-gradient-to-r from-blue-500 to-[#0082f3] relative opacity-10 dark:opacity-20" />
              <div className="px-8 pb-8 relative">
                <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-10">
                  <div className="p-1.5 bg-white dark:bg-[#1a1a1a] rounded-[28px] shadow-xl">
                    <div className="w-24 h-24 md:w-32 md:h-32 bg-brand rounded-[22px] flex items-center justify-center text-white">
                      <Phone size={48} />
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 mb-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">{task.title || 'Follow-up Interaction'}</h1>
                      <Badge label={task.is_completed ? 'Completed' : 'Pending'} variant={task.is_completed ? 'success' : 'warning'} className="px-3 py-1 text-xs" />
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-brand" /> ID: {task.id?.slice?.(0, 8) || task.id}</span>
                      <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg font-bold uppercase text-[10px] ${priorityStyle[task.priority] || priorityStyle.medium}`}>
                        {task.priority} Priority
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-10">
                  {[
                    { icon: Calendar, label: 'Due Date', value: new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }), color: 'text-blue-600 bg-blue-50' },
                    { icon: Clock, label: 'Due Time', value: task.due_date ? new Date(task.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Anytime', color: 'text-indigo-600 bg-indigo-50' },
                    { icon: User, label: 'Lead Name', value: task.lead_name || '—', color: 'text-purple-600 bg-purple-50' },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="p-4 rounded-2xl border border-gray-50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-[#0f0f0f]/50">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color} dark:bg-opacity-10`}>
                          <Icon size={14} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
                      </div>
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Interaction Notes */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <MessageSquare size={18} className="text-brand" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">Interaction Notes</h3>
                  <p className="text-xs text-gray-400">Context and instructions for this follow-up</p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-[#0f0f0f] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 min-h-[120px]">
                {task.notes ? (
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{task.notes}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">No detailed notes provided for this follow-up.</p>
                )}
              </div>
            </div>

            {/* 3. Completion Feedback */}
            {task.is_completed && (
              <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                    <CheckCircle size={18} className="text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">Completion Summary</h3>
                    <p className="text-xs text-gray-400">Outcome recorded when task was marked done</p>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-[#0f0f0f] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 min-h-[100px]">
                  {task.completion_notes ? (
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{task.completion_notes}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No completion notes recorded.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 4. Mark Outcome Card (Only if not completed) */}
            {!task.is_completed && (
              <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
                <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                  <CheckCircle size={18} className="text-green-500" /> Mark as Done
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 px-1">Completion Notes</label>
                    <textarea
                      value={completeNotes}
                      onChange={e => setCompleteNotes(e.target.value)}
                      placeholder="Discussed pricing, client will visit site on Sunday..."
                      rows={4}
                      className="w-full px-4 py-3 text-sm bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-2xl outline-none focus:border-brand transition-all resize-none text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  
                  <Button 
                    className="w-full rounded-2xl py-3 font-bold shadow-lg shadow-blue-500/20" 
                    onClick={handleMarkDone} 
                    loading={actionLoading}
                  >
                    ✓ Complete Task
                  </Button>
                </div>
              </div>
            )}

            {/* 5. Lead Information */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
              <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <User size={18} className="text-blue-500" /> Lead Information
              </h3>
              
              <div className="p-4 rounded-[20px] bg-gray-50/50 dark:bg-[#0f0f0f]/50 border border-gray-50 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#0f0f0f] transition-all"
                onClick={() => navigate(`/leads/${task.lead_id}`)}>
                <div className="flex items-center gap-4">
                  <Avatar name={task.lead_name} size="lg" className="rounded-2xl" />
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">{task.lead_name || 'Lead Name'}</div>
                    <div className="text-[10px] font-bold text-brand uppercase tracking-wider mt-0.5">Prospect</div>
                    <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                      <ExternalLink size={10} /> View Profile
                    </div>
                  </div>
                </div>
              </div>

              {/* Phone Number Section */}
              {task.lead_phone && (
                <div className="mt-4">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Phone Number</p>
                  {isAdmin ? (
                    <a href={`tel:${task.lead_phone}`} className="text-sm font-semibold text-brand hover:underline">{task.lead_phone}</a>
                  ) : showPhone ? (
                    <a href={`tel:${task.lead_phone}`} className="text-sm font-semibold text-brand hover:underline">{task.lead_phone}</a>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">*****{task.lead_phone?.slice(-5)}</p>
                      <button onClick={() => setShowPhone(true)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-brand bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 px-2.5 py-1.5 rounded-lg transition-colors">
                        <Eye size={11}/> View
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 6. Quick Contact */}
            {task.lead_phone && (
              <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
                <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-5">Quick Contact</h3>
                {isAdmin || showPhone ? (
                  <a href={`tel:${task.lead_phone}`} className="flex items-center justify-between p-4 rounded-[20px] bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 group hover:bg-green-500 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center text-green-600 group-hover:bg-white/20 group-hover:text-white">
                        <Phone size={18} />
                      </div>
                      <div className="text-sm font-bold text-green-700 dark:text-green-400 group-hover:text-white">{task.lead_phone}</div>
                    </div>
                    <ArrowLeft size={16} className="text-green-400 rotate-180 group-hover:text-white" />
                  </a>
                ) : (
                  <div className="flex items-center justify-between p-4 rounded-[20px] bg-gray-50/50 dark:bg-[#0f0f0f]/50 border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-900/20 flex items-center justify-center text-gray-400">
                        <Phone size={18} />
                      </div>
                      <div className="text-sm font-bold text-gray-700 dark:text-gray-300">*****{task.lead_phone?.slice(-5)}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 7. Assigned To */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
              <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <UserCheck size={18} className="text-teal-500" /> Assigned To
              </h3>
              
              <div className="p-4 rounded-[20px] bg-gray-50/50 dark:bg-[#0f0f0f]/50 border border-gray-50 dark:border-gray-800">
                <div className="flex items-center gap-4">
                  <Avatar name={task.assigned_to_name} size="lg" className="rounded-2xl" />
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">{task.assigned_to_name || 'Team Member'}</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Sales Executive</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {showConvertModal && task && (
        <ConvertFollowUpModal
          task={task}
          onClose={() => setShowConvertModal(false)}
          onSuccess={() => {
            setShowConvertModal(false)
            dispatch(fetchFollowUpById(id))
          }}
        />
      )}

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Follow-up Task">
        <form onSubmit={handleEdit} className="space-y-4">
          <FollowUpForm 
            formData={editForm} 
            setFormData={setEditForm} 
            leads={leadList} 
            salesExecs={salesExecs} 
            isEdit={true} 
            selectedTask={task}
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={actionLoading}>Update</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
