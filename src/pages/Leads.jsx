import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Eye, Edit2, UserCheck, ChevronDown, RefreshCw, Trash2, MapPin, Download, ArrowRightCircle, CalendarPlus, PhoneCall, Loader2, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { fetchLeads, createLead, updateLead, deleteLead, fetchLeadSources, clearLeadError } from '../store/leadSlice'
import { fetchProjects } from '../store/projectSlice'
import { fetchUsers } from '../store/userSlice'
import ListSkeleton from '../components/loaders/ListSkeleton'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import api from '../api/axios'
import Avatar from '../components/ui/Avatar'
import Modal from '../components/ui/Modal'
import ExportModal from '../components/ui/ExportModal'
import CustomSelect from '../components/ui/CustomSelect'
import ClockPicker from '../components/ui/ClockPicker'
import ConvertLeadModal from '../components/modals/ConvertLeadModal'

const leadStages = [
  'New', 'Contacted', 'Interested', 'Follow-up',
  'Site Visit Scheduled', 'Site Visit Done', 'Negotiation', 'Booked', 'Lost',
]

const stageOptions = leadStages.map(s => ({ value: s, label: s }))

const defaultSources = [
  { id: 'facebook', name: 'Facebook' },
  { id: 'instagram', name: 'Instagram' },
  { id: 'google_ads', name: 'Google Ads' },
  { id: 'youtube', name: 'YouTube' },
  { id: 'linkedin', name: 'LinkedIn' },
  { id: 'whatsapp', name: 'WhatsApp' },
  { id: 'twitter', name: 'Twitter / X' },
  { id: 'website', name: 'Website' },
  { id: 'ivr', name: 'IVR' },
  { id: 'walkin', name: 'Walk-in' },
  { id: 'referral', name: 'Referral' },
  { id: '99acres', name: '99acres' },
  { id: 'housing', name: 'Housing.com' },
  { id: 'magicbricks', name: 'MagicBricks' },
  { id: 'nobroker', name: 'NoBroker' },
]

const defaultForm = {
  name: '', phone: '', alternate_phone_number: '', email: '',
  source: '', source_id: '', project_id: '',
  assigned_to: '', budget: '', location_preference: '',
  notes: '', status: 'New',
}

// ─── LeadForm defined OUTSIDE component to prevent remount on every render ───
// This is the fix for the typing bug — defining a component inside another
// component causes React to treat it as a new component on every render,
// unmounting and remounting it, which kills input focus.
function LeadForm({ formData, setFormData, isEdit, sourceList, salesExecs }) {
  const inputClass = "w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm transition-all duration-200"
  const labelClass = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"

  const sourceOptions = sourceList.map(s => ({ value: s.id, label: s.name }))
  const execOptions = salesExecs.map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name}` }))

  return (
    <div className="space-y-4">
      {/* Name + Phone */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Full Name *</label>
          <input
            required
            value={formData.name}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Suresh Patel"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Phone *</label>
          <input
            required
            value={formData.phone}
            onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="+919876543210"
            className={inputClass}
          />
        </div>
      </div>

      {/* Alt Phone + Email */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Alternate Phone</label>
          <input
            value={formData.alternate_phone_number}
            onChange={e => setFormData(prev => ({ ...prev, alternate_phone_number: e.target.value }))}
            placeholder="+919876543211"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="suresh.patel@gmail.com"
            className={inputClass}
          />
        </div>
      </div>

      {/* Budget + Location */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Budget</label>
          <input
            value={formData.budget}
            onChange={e => setFormData(prev => ({ ...prev, budget: e.target.value }))}
            placeholder="80-100L"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Finding Location</label>
          <div className="relative">
            <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={formData.location_preference}
              onChange={e => setFormData(prev => ({ ...prev, location_preference: e.target.value }))}
              placeholder="Andheri West"
              className={inputClass + ' pl-8'}
            />
          </div>
        </div>
      </div>

      {/* Source + Status */}
      <div className={`grid gap-3 ${isEdit ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <CustomSelect
          label="Lead Source"
          value={formData.source_id || formData.source}
          onChange={val => {
            const selected = sourceList.find(s => s.id === val)
            setFormData(prev => ({
              ...prev,
              source_id: selected?.id || val,
              source: selected?.name || val,
            }))
          }}
          options={sourceOptions}
          placeholder="Select Platform"
        />
        {isEdit && (
          <CustomSelect
            label="Stage"
            value={formData.status}
            onChange={val => setFormData(prev => ({ ...prev, status: val }))}
            options={stageOptions}
          />
        )}
      </div>

      {/* Assign To */}
      <div className="grid grid-cols-1">
        <CustomSelect
          label="Assign To"
          value={formData.assigned_to}
          onChange={val => setFormData(prev => ({ ...prev, assigned_to: val }))}
          options={execOptions}
          placeholder="Select team member"
        />
      </div>

      {/* Configuration */}
      <div>
        <label className={labelClass}>Configuration</label>
        <textarea
          rows={3}
          value={formData.notes}
          onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Client is looking for 2BHK in a gated community. Ready for site visit next week."
          className={inputClass}
        />
      </div>
    </div>
  )
}


// ─── Conversion Modals ────────────────────────────────────────────────────────

function ConvertLeadModal({ lead, onClose, onSuccess }) {
  const [step, setStep] = useState('choose')  // 'choose' | 'follow_up' | 'site_visit'
  const [converting, setConverting] = useState(false)
  const [error, setError] = useState('')
  const [options, setOptions] = useState(null)
  const [loadingOptions, setLoadingOptions] = useState(true)

  // Follow-up form
  const [fuForm, setFuForm] = useState({ title: '', due_date: '', due_time: '10:00', priority: 'medium', assigned_to: '', notes: '' })
  // Site visit form
  const [svForm, setSvForm] = useState({ project_id: '', visit_date: '', visit_time: '10:00', assigned_to: '', transport_arranged: false, notes: '' })

  const { list: projectList } = useSelector(s => s.projects)
  const { list: userList }    = useSelector(s => s.users)
  const salesExecs = userList.filter(u => ['sales_executive','sales_manager'].includes(u.role) && u.is_active)

  useEffect(() => {
    // Fetch conversion options to pre-fill
    api.get(`/convert/lead/${lead.id}/options`)
      .then(r => {
        setOptions(r.data.data)
        const pf = r.data.data?.conversions?.to_follow_up?.prefill || {}
        const sv = r.data.data?.conversions?.to_site_visit?.prefill || {}
        setFuForm(f => ({
          ...f,
          title: pf.title || `Follow-up with ${lead.name}`,
          assigned_to: pf.assigned_to || lead.assigned_to || '',
        }))
        setSvForm(f => ({
          ...f,
          project_id:        sv.project_id || lead.project_id || '',
          assigned_to:       sv.assigned_to || lead.assigned_to || '',
          transport_arranged: sv.transport_arranged || false,
        }))
      })
      .catch(() => {})
      .finally(() => setLoadingOptions(false))
  }, [lead.id])

  const inputCls = "w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-[#0082f3] text-gray-700 dark:text-gray-300 transition-colors placeholder-gray-400"
  const labelCls = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5"

  const projectOptions = (options?.projects || projectList || []).map(p => ({ value: p.id, label: `${p.name}${p.city ? ` · ${p.city}` : ''}` }))
  const userOptions    = (options?.users    || salesExecs    || []).map(u => ({ value: u.id, label: u.name || `${u.first_name} ${u.last_name}` }))
  const priorityOpts   = [{ value:'low', label:'Low' }, { value:'medium', label:'Medium' }, { value:'high', label:'High' }]

  const handleConvertFollowUp = async () => {
    setError('')
    if (!fuForm.title.trim()) { setError('Title is required'); return }
    if (!fuForm.due_date)     { setError('Due date is required'); return }
    setConverting(true)
    try {
      const due_date = fuForm.due_time
        ? new Date(`${fuForm.due_date}T${fuForm.due_time}:00`).toISOString()
        : new Date(`${fuForm.due_date}T10:00:00`).toISOString()
      await api.post(`/convert/lead/${lead.id}/to-follow-up`, {
        title:       fuForm.title,
        due_date,
        priority:    fuForm.priority,
        assigned_to: fuForm.assigned_to || undefined,
        notes:       fuForm.notes || undefined,
      })
      onSuccess('follow_up')
    } catch (e) {
      setError(e.response?.data?.message || 'Conversion failed')
    } finally {
      setConverting(false)
    }
  }

  const handleConvertSiteVisit = async () => {
    setError('')
    if (!svForm.project_id)  { setError('Project is required'); return }
    if (!svForm.visit_date)  { setError('Visit date is required'); return }
    if (!svForm.visit_time)  { setError('Visit time is required'); return }
    setConverting(true)
    try {
      await api.post(`/convert/lead/${lead.id}/to-site-visit`, {
        project_id:        svForm.project_id,
        visit_date:        svForm.visit_date,
        visit_time:        svForm.visit_time,
        assigned_to:       svForm.assigned_to || undefined,
        transport_arranged: Boolean(svForm.transport_arranged),
        notes:             svForm.notes || undefined,
      })
      onSuccess('site_visit')
    } catch (e) {
      setError(e.response?.data?.message || 'Conversion failed')
    } finally {
      setConverting(false)
    }
  }

  const svAvailable = options?.conversions?.to_site_visit?.available !== false

  return (
    <Modal isOpen={true} onClose={onClose}
      title={step === 'choose' ? 'Convert Lead' : step === 'follow_up' ? 'Convert to Follow-Up' : 'Convert to Site Visit'}
      size="md"
    >
      {loadingOptions ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={22} className="animate-spin text-[#0082f3]" />
        </div>
      ) : step === 'choose' ? (
        <div className="space-y-4">
          {/* Lead info pill */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800">
            <div className="w-9 h-9 rounded-xl bg-[#0082f3] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{lead.name?.[0]}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{lead.name}</p>
              <p className="text-xs text-gray-400">{lead.phone} · {lead.status}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Choose what you want to convert this lead into:</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { setStep('follow_up'); setError('') }}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-gray-100 dark:border-gray-800 hover:border-[#0082f3] hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm shadow-green-500/30">
                <PhoneCall size={20} className="text-white" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Follow-Up</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Create a task with due date & priority</p>
              </div>
            </button>
            <button
              onClick={() => { if (svAvailable) { setStep('site_visit'); setError('') } }}
              disabled={!svAvailable}
              className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all group
                ${svAvailable
                  ? 'border-gray-100 dark:border-gray-800 hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-900/10'
                  : 'border-gray-100 dark:border-gray-800 opacity-50 cursor-not-allowed'}`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-transform ${svAvailable ? 'bg-gradient-to-br from-purple-400 to-violet-600 group-hover:scale-110 shadow-purple-500/30' : 'bg-gray-200 dark:bg-gray-700'}`}>
                <CalendarPlus size={20} className="text-white" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Site Visit</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {svAvailable ? 'Schedule a project visit' : options?.conversions?.to_site_visit?.unavailable_reason || 'Not available'}
                </p>
              </div>
            </button>
          </div>
        </div>
      ) : step === 'follow_up' ? (
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Follow-up Title *</label>
            <input type="text" value={fuForm.title} onChange={e => setFuForm(f => ({...f, title: e.target.value}))}
              placeholder="e.g. Call back about 2BHK pricing" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Due Date *</label>
              <input type="date" value={fuForm.due_date} onChange={e => setFuForm(f => ({...f, due_date: e.target.value}))}
                min={new Date().toISOString().split('T')[0]} className={inputCls} />
            </div>
            <div>
              <ClockPicker label="Due Time" value={fuForm.due_time} onChange={v => setFuForm(f => ({...f, due_time: v}))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <CustomSelect label="Priority" value={fuForm.priority} onChange={v => setFuForm(f => ({...f, priority: v}))} options={priorityOpts} />
            <CustomSelect label="Assign To" value={fuForm.assigned_to} onChange={v => setFuForm(f => ({...f, assigned_to: v}))} options={userOptions} placeholder="Keep current" />
          </div>
          <div>
            <label className={labelCls}>Notes <span className="font-normal text-gray-400">(optional)</span></label>
            <textarea rows={3} value={fuForm.notes} onChange={e => setFuForm(f => ({...f, notes: e.target.value}))}
              placeholder="Any additional context…" className={inputCls + ' resize-none'} />
          </div>
          {error && <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5"><AlertCircle size={13} className="text-red-500 flex-shrink-0"/><p className="text-xs text-red-600 dark:text-red-400">{error}</p></div>}
          <div className="flex gap-3 pt-1">
            <button onClick={() => { setStep('choose'); setError('') }} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">← Back</button>
            <button onClick={handleConvertFollowUp} disabled={converting}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60">
              {converting ? <><Loader2 size={14} className="animate-spin"/> Converting…</> : <><PhoneCall size={14}/> Create Follow-Up</>}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <CustomSelect label="Project *" value={svForm.project_id} onChange={v => setSvForm(f => ({...f, project_id: v}))} options={projectOptions} placeholder="Select project" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Visit Date *</label>
              <input type="date" value={svForm.visit_date} onChange={e => setSvForm(f => ({...f, visit_date: e.target.value}))}
                min={new Date().toISOString().split('T')[0]} className={inputCls} />
            </div>
            <div>
              <ClockPicker label="Visit Time *" value={svForm.visit_time} onChange={v => setSvForm(f => ({...f, visit_time: v}))} required />
            </div>
          </div>
          <CustomSelect label="Assign To" value={svForm.assigned_to} onChange={v => setSvForm(f => ({...f, assigned_to: v}))} options={userOptions} placeholder="Keep current" />
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800 cursor-pointer" onClick={() => setSvForm(f => ({...f, transport_arranged: !f.transport_arranged}))}>
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors flex-shrink-0 ${svForm.transport_arranged ? 'bg-[#0082f3] border-[#0082f3]' : 'border-gray-300 dark:border-gray-600'}`}>
              {svForm.transport_arranged && <CheckCircle2 size={12} className="text-white"/>}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Transport Arranged</p>
              <p className="text-[10px] text-gray-400">Check if you will arrange pick-up/drop for the client</p>
            </div>
          </div>
          <div>
            <label className={labelCls}>Notes <span className="font-normal text-gray-400">(optional)</span></label>
            <textarea rows={3} value={svForm.notes} onChange={e => setSvForm(f => ({...f, notes: e.target.value}))}
              placeholder="Any special instructions for the visit…" className={inputCls + ' resize-none'} />
          </div>
          {error && <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5"><AlertCircle size={13} className="text-red-500 flex-shrink-0"/><p className="text-xs text-red-600 dark:text-red-400">{error}</p></div>}
          <div className="flex gap-3 pt-1">
            <button onClick={() => { setStep('choose'); setError('') }} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">← Back</button>
            <button onClick={handleConvertSiteVisit} disabled={converting}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60">
              {converting ? <><Loader2 size={14} className="animate-spin"/> Converting…</> : <><CalendarPlus size={14}/> Schedule Visit</>}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
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

// ─── Bulk Convert Modal (for selected leads) ─────────────────────────────────

function BulkConvertLeadModal({ leadIds, leads, onClose, onSuccess }) {
  const [step, setStep]         = useState('choose')
  const [converting, setConverting] = useState(false)
  const [error, setError]       = useState('')
  const [results, setResults]   = useState(null)

  const { list: projectList }   = useSelector(s => s.projects)
  const { list: userList }      = useSelector(s => s.users)
  const salesExecs = userList.filter(u => ['sales_executive','sales_manager'].includes(u.role) && u.is_active)

  const [fuForm, setFuForm] = useState({ title_suffix: 'Follow-up', due_date: '', due_time: '10:00', priority: 'medium', assigned_to: '', notes: '' })
  const [svForm, setSvForm] = useState({ project_id: '', visit_date: '', visit_time: '10:00', assigned_to: '', transport_arranged: false, notes: '' })

  const inputCls = "w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-[#0082f3] text-gray-700 dark:text-gray-300 transition-colors placeholder-gray-400"
  const labelCls = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5"
  const projectOpts = projectList.map(p => ({ value: p.id, label: `${p.name}${p.city ? ` · ${p.city}` : ''}` }))
  const userOpts    = salesExecs.map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name}` }))
  const priorityOpts = [{ value:'low', label:'Low' }, { value:'medium', label:'Medium' }, { value:'high', label:'High' }]

  const selectedLeadNames = leads.filter(l => leadIds.includes(l.id))

  const handleBulkFollowUp = async () => {
    setError('')
    if (!fuForm.due_date) { setError('Due date is required'); return }
    setConverting(true)
    const due_date = new Date(`${fuForm.due_date}T${fuForm.due_time}:00`).toISOString()
    const settled = await Promise.allSettled(
      leadIds.map(id => {
        const lead = leads.find(l => l.id === id)
        return api.post(`/convert/lead/${id}/to-follow-up`, {
          title: `${fuForm.title_suffix} — ${lead?.name || ''}`.trim(),
          due_date,
          priority:    fuForm.priority,
          assigned_to: fuForm.assigned_to || undefined,
          notes:       fuForm.notes || undefined,
        })
      })
    )
    setConverting(false)
    const ok  = settled.filter(r => r.status === 'fulfilled').length
    const err = settled.filter(r => r.status === 'rejected').length
    setResults({ ok, err, type: 'follow_up' })
  }

  const handleBulkSiteVisit = async () => {
    setError('')
    if (!svForm.project_id)  { setError('Project is required'); return }
    if (!svForm.visit_date)  { setError('Visit date is required'); return }
    if (!svForm.visit_time)  { setError('Visit time is required'); return }
    setConverting(true)
    const settled = await Promise.allSettled(
      leadIds.map(id =>
        api.post(`/convert/lead/${id}/to-site-visit`, {
          project_id:        svForm.project_id,
          visit_date:        svForm.visit_date,
          visit_time:        svForm.visit_time,
          assigned_to:       svForm.assigned_to || undefined,
          transport_arranged: Boolean(svForm.transport_arranged),
          notes:             svForm.notes || undefined,
        })
      )
    )
    setConverting(false)
    const ok  = settled.filter(r => r.status === 'fulfilled').length
    const err = settled.filter(r => r.status === 'rejected').length
    setResults({ ok, err, type: 'site_visit' })
  }

  if (results) {
    return (
      <Modal isOpen={true} onClose={() => onSuccess(results.type)} title="Conversion Complete" size="sm">
        <div className="py-4 text-center space-y-4">
          <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${results.err === 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
            <CheckCircle2 size={28} className={results.err === 0 ? 'text-emerald-500' : 'text-amber-500'} />
          </div>
          <div>
            <p className="text-base font-bold text-gray-900 dark:text-white">
              {results.ok} of {leadIds.length} converted
            </p>
            {results.err > 0 && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{results.err} failed (already booked/lost)</p>}
          </div>
          <button onClick={() => onSuccess(results.type)}
            className="w-full py-2.5 rounded-xl bg-[#0082f3] text-white text-sm font-semibold">Done</button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={true} onClose={onClose}
      title={step === 'choose' ? `Convert ${leadIds.length} Lead${leadIds.length > 1 ? 's' : ''}` : step === 'follow_up' ? 'Bulk → Follow-Up' : 'Bulk → Site Visit'}
      size="md"
    >
      {step === 'choose' ? (
        <div className="space-y-4">
          {/* Selected leads preview */}
          <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
              {leadIds.length} lead{leadIds.length > 1 ? 's' : ''} selected
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
              {selectedLeadNames.slice(0, 8).map(l => (
                <span key={l.id} className="text-[10px] font-medium px-2 py-1 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300">{l.name}</span>
              ))}
              {selectedLeadNames.length > 8 && <span className="text-[10px] text-gray-400 px-2 py-1">+{selectedLeadNames.length - 8} more</span>}
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Choose what to convert these leads into:</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { setStep('follow_up'); setError('') }}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-gray-100 dark:border-gray-800 hover:border-[#0082f3] hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm shadow-green-500/30">
                <PhoneCall size={20} className="text-white" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Follow-Up</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Create a task for each lead</p>
              </div>
            </button>
            <button onClick={() => { setStep('site_visit'); setError('') }}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-gray-100 dark:border-gray-800 hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 to-violet-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm shadow-purple-500/30">
                <CalendarPlus size={20} className="text-white" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Site Visit</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Schedule a visit for each lead</p>
              </div>
            </button>
          </div>
        </div>
      ) : step === 'follow_up' ? (
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Follow-up Title <span className="text-gray-400 font-normal">(name will be appended)</span></label>
            <input type="text" value={fuForm.title_suffix} onChange={e => setFuForm(f => ({...f, title_suffix: e.target.value}))}
              placeholder="Follow-up" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Due Date *</label>
              <input type="date" value={fuForm.due_date} onChange={e => setFuForm(f => ({...f, due_date: e.target.value}))}
                min={new Date().toISOString().split('T')[0]} className={inputCls} />
            </div>
            <div>
              <ClockPicker label="Due Time" value={fuForm.due_time} onChange={v => setFuForm(f => ({...f, due_time: v}))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <CustomSelect label="Priority" value={fuForm.priority} onChange={v => setFuForm(f => ({...f, priority: v}))} options={priorityOpts} />
            <CustomSelect label="Assign To" value={fuForm.assigned_to} onChange={v => setFuForm(f => ({...f, assigned_to: v}))} options={userOpts} placeholder="Keep current" />
          </div>
          <div>
            <label className={labelCls}>Notes <span className="font-normal text-gray-400">(optional)</span></label>
            <textarea rows={2} value={fuForm.notes} onChange={e => setFuForm(f => ({...f, notes: e.target.value}))}
              placeholder="Any additional context…" className={inputCls + ' resize-none'} />
          </div>
          {error && <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5"><AlertCircle size={13} className="text-red-500"/><p className="text-xs text-red-600">{error}</p></div>}
          <div className="flex gap-3 pt-1">
            <button onClick={() => { setStep('choose'); setError('') }} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500">← Back</button>
            <button onClick={handleBulkFollowUp} disabled={converting}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
              {converting ? <><Loader2 size={14} className="animate-spin"/> Converting {leadIds.length}…</> : <><PhoneCall size={14}/> Create {leadIds.length} Follow-Up{leadIds.length > 1 ? 's' : ''}</>}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <CustomSelect label="Project *" value={svForm.project_id} onChange={v => setSvForm(f => ({...f, project_id: v}))} options={projectOpts} placeholder="Select project" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Visit Date *</label>
              <input type="date" value={svForm.visit_date} onChange={e => setSvForm(f => ({...f, visit_date: e.target.value}))}
                min={new Date().toISOString().split('T')[0]} className={inputCls} />
            </div>
            <div>
              <ClockPicker label="Visit Time *" value={svForm.visit_time} onChange={v => setSvForm(f => ({...f, visit_time: v}))} required />
            </div>
          </div>
          <CustomSelect label="Assign To" value={svForm.assigned_to} onChange={v => setSvForm(f => ({...f, assigned_to: v}))} options={userOpts} placeholder="Keep current" />
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800 cursor-pointer"
            onClick={() => setSvForm(f => ({...f, transport_arranged: !f.transport_arranged}))}>
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors flex-shrink-0 ${svForm.transport_arranged ? 'bg-[#0082f3] border-[#0082f3]' : 'border-gray-300 dark:border-gray-600'}`}>
              {svForm.transport_arranged && <CheckCircle2 size={12} className="text-white"/>}
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Transport Arranged</p>
          </div>
          <div>
            <label className={labelCls}>Notes <span className="font-normal text-gray-400">(optional)</span></label>
            <textarea rows={2} value={svForm.notes} onChange={e => setSvForm(f => ({...f, notes: e.target.value}))}
              placeholder="Any special instructions…" className={inputCls + ' resize-none'} />
          </div>
          {error && <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5"><AlertCircle size={13} className="text-red-500"/><p className="text-xs text-red-600">{error}</p></div>}
          <div className="flex gap-3 pt-1">
            <button onClick={() => { setStep('choose'); setError('') }} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500">← Back</button>
            <button onClick={handleBulkSiteVisit} disabled={converting}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
              {converting ? <><Loader2 size={14} className="animate-spin"/> Converting {leadIds.length}…</> : <><CalendarPlus size={14}/> Schedule {leadIds.length} Visit{leadIds.length > 1 ? 's' : ''}</>}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function Leads() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { list, loading, pagination, sources, actionLoading, actionError } = useSelector(s => s.leads)
  const { list: userList } = useSelector(s => s.users)
  const { user: currentUser } = useSelector(s => s.auth)

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [filterAssigned, setFilterAssigned] = useState('')
  const [page, setPage] = useState(1)

  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showReassignModal, setShowReassignModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)
  const [addForm, setAddForm] = useState(defaultForm)
  const [editForm, setEditForm] = useState(defaultForm)
  const [reassignTo, setReassignTo] = useState('')
  const [selectedLeads, setSelectedLeads] = useState([])
  const [exporting,  setExporting]  = useState(false)
  const [addSuccess, setAddSuccess] = useState('')
  const [showConvertModal,     setShowConvertModal]     = useState(false)
  const [convertLead,          setConvertLead]          = useState(null)
  const [convertSuccess,       setConvertSuccess]       = useState('')
  const [showBulkConvertModal, setShowBulkConvertModal] = useState(false)
  const [editSuccess, setEditSuccess] = useState('')

  useEffect(() => {
    const params = { page, per_page: 20 }
    if (search) params.search = search
    if (filterStatus) params.status = filterStatus
    if (filterSource) params.source_id = filterSource
    if (filterAssigned) params.assigned_to = filterAssigned
    dispatch(fetchLeads(params))
  }, [dispatch, search, filterStatus, filterSource, filterAssigned, page])

  useEffect(() => {
    dispatch(fetchLeadSources())
    dispatch(fetchUsers())
    dispatch(fetchProjects())
  }, [dispatch])

  const sourceList = sources?.length > 0 ? sources : defaultSources
  const salesExecs = userList.filter(u =>
    ['sales_executive', 'sales_manager'].includes(u.role) && u.is_active
  )

  const handleAddLead = async (e) => {
    e.preventDefault()
    dispatch(clearLeadError())
    const result = await dispatch(createLead(addForm))
    if (createLead.fulfilled.match(result)) {
      setAddSuccess('Lead created successfully!')
      dispatch(fetchLeads({ page, per_page: 20 }))
      setTimeout(() => { setShowAddModal(false); setAddSuccess(''); setAddForm(defaultForm) }, 800)
    }
  }

  const handleEditLead = async (e) => {
    e.preventDefault()
    dispatch(clearLeadError())
    const result = await dispatch(updateLead({ id: selectedLead.id, leadData: editForm }))
    if (updateLead.fulfilled.match(result)) {
      setEditSuccess('Lead updated!')
      dispatch(fetchLeads({ page, per_page: 20 }))
      setTimeout(() => { setShowEditModal(false); setEditSuccess('') }, 800)
    }
  }

  const handleDeleteLead = async (lead) => {
    if (window.confirm(`Delete lead "${lead.name}"?`)) {
      const result = await dispatch(deleteLead(lead.id))
      if (deleteLead.fulfilled.match(result)) dispatch(fetchLeads({ page, per_page: 20 }))
    }
  }

  const openEdit = (lead) => {
    setSelectedLead(lead)
    setEditForm({
      name: lead.name || '', 
      phone: lead.phone || '', 
      alternate_phone_number: lead.alternate_phone_number || '',
      email: lead.email || '',
      source: lead.source || '', 
      source_id: lead.source_id || '',
      project_id: lead.project_id || '', 
      assigned_to: lead.assigned_to || '',
      budget: lead.budget || '', 
      location_preference: lead.location_preference || '',
      notes: lead.notes || '', 
      status: lead.status || 'New',
    })
    setShowEditModal(true)
  }

  const handleReassign = async (e) => {
    e.preventDefault()
    const result = await dispatch(updateLead({ id: selectedLead.id, leadData: { assigned_to: reassignTo } }))
    if (updateLead.fulfilled.match(result)) {
      dispatch(fetchLeads({ page, per_page: 20 }))
      setShowReassignModal(false)
    }
  }

  const toggleSelect = (id) =>
    setSelectedLeads(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  const toggleAll = () =>
    setSelectedLeads(selectedLeads.length === list.length && list.length > 0 ? [] : list.map(l => l.id))

  const canEdit = ['super_admin', 'admin', 'sales_manager', 'sales_executive'].includes(currentUser?.role)
  const canDelete = ['super_admin', 'admin'].includes(currentUser?.role)

  const handleExport = async (dateRange) => {
    try {
      setExporting(true)
      const params = { ...dateRange }
      if (filterStatus) params.status = filterStatus
      if (filterSource) params.source = filterSource
      const res = await api.get('/export/leads', { params, responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a'); a.href = url; a.download = `Leads_${dateRange.from}_to_${dateRange.to}.xlsx`
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
      setShowExportModal(false)
    } catch (err) { console.error('Export failed:', err) } finally { setExporting(false) }
  }

  const handleBulkConvertSuccess = (type) => {
    setShowBulkConvertModal(false)
    setSelectedLeads([])
    setConvertSuccess(type === 'follow_up' ? `${selectedLeads.length} follow-ups created!` : `${selectedLeads.length} site visits scheduled!`)
    dispatch(fetchLeads({ page, per_page: 20 }))
    setTimeout(() => setConvertSuccess(''), 3000)
  }

  const handleConvertSuccess = (type) => {
    setShowConvertModal(false)
    setConvertLead(null)
    setConvertSuccess(type === 'follow_up' ? 'Lead converted to follow-up!' : 'Site visit scheduled!')
    dispatch(fetchLeads({ page, per_page: 20 }))
    setTimeout(() => setConvertSuccess(''), 3000)
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search leads..."
              className="pl-9 pr-4 py-2 text-sm bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-blue-100/50 dark:shadow-blue-900/20 rounded-xl outline-none focus:border-brand w-52 text-gray-900 dark:text-gray-100 placeholder-gray-400"
            />
          </div>
          <div className="w-44">
            <CustomSelect
              value={filterStatus}
              onChange={val => { setFilterStatus(val); setPage(1) }}
              options={[{ value: '', label: 'All Status' }, ...stageOptions]}
              placeholder="All Status"
            />
          </div>
          <div className="w-44">
            <CustomSelect
              value={filterSource}
              onChange={val => { setFilterSource(val); setPage(1) }}
              options={[{ value: '', label: 'All Sources' }, ...sourceList.map(s => ({ value: s.id, label: s.name }))]}
              placeholder="All Sources"
            />
          </div>
          <div className="w-44">
            <CustomSelect
              value={filterAssigned}
              onChange={val => { setFilterAssigned(val); setPage(1) }}
              options={[{ value: '', label: 'All Team' }, ...salesExecs.map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name}` }))]}
              placeholder="All Team"
            />
          </div>
          <button
            onClick={() => dispatch(fetchLeads({ page, per_page: 20 }))}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 text-gray-400 hover:text-brand hover:border-brand transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {/* Convert button — appears only when leads are selected */}
          {selectedLeads.length > 0 && canEdit && (
            <button
              onClick={() => setShowBulkConvertModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-semibold shadow-sm shadow-emerald-500/20 transition-all active:scale-[0.97]"
            >
              <ArrowRightCircle size={13} />
              Convert {selectedLeads.length}
            </button>
          )}
          <Button variant="outline" size="sm" icon={Download} loading={exporting} disabled={exporting} onClick={() => setShowExportModal(true)}>
            Export
          </Button>
          {canEdit && (
            <Button icon={Plus} onClick={() => { setAddForm(defaultForm); dispatch(clearLeadError()); setShowAddModal(true) }}>
              Add Lead
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      {!loading && (
        <div className="text-sm text-gray-500 dark:text-[#888]">
          Showing <span className="font-semibold text-gray-900 dark:text-white">{list.length}</span>
          {pagination?.total > 0 && <> of <span className="font-semibold text-gray-900 dark:text-white">{pagination.total}</span></>} leads
        </div>
      )}

      {/* Table */}
      <div className="bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-blue-100/50 dark:shadow-blue-900/20 rounded-2xl overflow-hidden shadow-md shadow-blue-100/50 dark:shadow-blue-900/20 hover:shadow-lg hover:shadow-blue-200/50 dark:hover:shadow-blue-900/30 transition-all duration-200">
        {loading ? (
          <div className="p-4"><ListSkeleton rows={8} /></div>
        ) : list.length === 0 ? (
          <div className="py-16 text-center text-gray-400 dark:text-[#888]">
            <Search size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
            <p className="font-medium">No leads found</p>
            <p className="text-sm mt-1">Try adjusting your filters or add a new lead</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-blue-50/50 dark:bg-blue-900/10">
                  <th className="py-3 pl-4 pr-2 w-8">
                    <input type="checkbox"
                      checked={selectedLeads.length === list.length && list.length > 0}
                      onChange={toggleAll} className="rounded border-gray-300 text-[#0082f3] focus:ring-[#0082f3]" />
                  </th>
                  {['Lead', 'Phone', 'Source', 'Assigned', 'Status', 'Finding Location', 'Actions'].map(h => (
                    <th key={h} className={`py-3 px-3 text-left text-xs font-medium text-blue-900/70 dark:text-blue-200/70 uppercase tracking-wide whitespace-nowrap
                      ${['Phone', 'Source', 'Assigned'].includes(h) ? 'hidden md:table-cell' : ''}
                      ${['Finding Location'].includes(h) ? 'hidden xl:table-cell' : ''}
                      ${h === 'Actions' ? 'text-right' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {list.map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-[#0f0f0f] transition-colors">
                    <td className="py-3 pl-4 pr-2">
                      <input type="checkbox" checked={selectedLeads.includes(lead.id)}
                        onChange={() => toggleSelect(lead.id)} className="rounded border-gray-300" />
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={lead.name} size="sm" />
                        <div>
                          <div 
                            className="font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:text-brand transition-colors"
                            onClick={() => navigate(`/leads/${lead.id}`)}
                          >
                            {lead.name}
                          </div>
                          <div className="text-xs text-gray-400">{lead.budget ? `₹ ${lead.budget}` : lead.email || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">
                      <div className="flex flex-col">
                        <span>{lead.phone}</span>
                        {lead.alternate_phone_number && (
                          <span className="text-[10px] text-gray-400">Alt: {lead.alternate_phone_number}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 hidden md:table-cell">
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400">
                        {lead.source_name || lead.source || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-3 hidden md:table-cell">
                      {lead.assigned_to_name ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar name={lead.assigned_to_name} size="xs" />
                          <span className="text-xs text-gray-600 dark:text-gray-400">{lead.assigned_to_name}</span>
                        </div>
                      ) : <span className="text-xs text-gray-400">Unassigned</span>}
                    </td>
                    <td className="py-3 px-3"><Badge label={lead.status || 'New'} /></td>
                    <td className="py-3 px-3 text-xs text-gray-400 hidden xl:table-cell">
                      {lead.location_preference || '—'}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`/leads/${lead.id}`)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand hover:bg-brand/10 transition-all hover:scale-110 active:scale-95" title="View Details">
                          <Eye size={16} />
                        </button>
                        {canEdit && (
                          <button onClick={() => { setConvertLead(lead); setShowConvertModal(true) }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors" title="Convert">
                            <ArrowRightCircle size={14} />
                          </button>
                        )}
                        {canEdit && (
                          <button onClick={() => openEdit(lead)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-[#0082f3] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Edit">
                            <Edit2 size={14} />
                          </button>
                        )}
                        {canEdit && (
                          <button onClick={() => { setSelectedLead(lead); setReassignTo(lead.assigned_to || ''); setShowReassignModal(true) }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors" title="Reassign">
                            <UserCheck size={14} />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => handleDeleteLead(lead)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        )}
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
      {pagination?.total_pages > 1 && (
        <div className="flex items-center justify-between px-2 text-xs text-gray-500">
          <span>Page {pagination.page} of {pagination.total_pages} · {pagination.total} total</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
            <Button size="sm" variant="outline" disabled={page >= pagination.total_pages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setAddSuccess('') }} title="Add New Lead" size="lg">
        <form onSubmit={handleAddLead} className="space-y-4">
          <LeadForm formData={addForm} setFormData={setAddForm} isEdit={false} sourceList={sourceList} salesExecs={salesExecs} />
          {addSuccess && <p className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 py-2 text-center rounded-xl">{addSuccess}</p>}
          {actionError && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 py-2 text-center rounded-xl">{actionError}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={actionLoading}>Add Lead</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Lead Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setEditSuccess('') }} title="Edit Lead" size="lg">
        <form onSubmit={handleEditLead} className="space-y-4">
          <LeadForm formData={editForm} setFormData={setEditForm} isEdit={true} sourceList={sourceList} salesExecs={salesExecs} />
          {editSuccess && <p className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 py-2 text-center rounded-xl">{editSuccess}</p>}
          {actionError && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 py-2 text-center rounded-xl">{actionError}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={actionLoading}>Update Lead</Button>
          </div>
        </form>
      </Modal>

      {/* Reassign Modal */}
      <Modal isOpen={showReassignModal} onClose={() => setShowReassignModal(false)} title={<span className="font-display">Reassign Lead</span>}>
        <form onSubmit={handleReassign} className="space-y-6">
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Reassigning: <span className="font-bold text-gray-900 dark:text-gray-100">{selectedLead?.name}</span>
            </p>
            
            <CustomSelect
              label="Assign To"
              value={reassignTo}
              onChange={setReassignTo}
              options={salesExecs.map(u => ({ 
                value: u.id, 
                label: `${u.first_name} ${u.last_name} (${u.role.replace('_', ' ')})` 
              }))}
              placeholder="Select team member..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 rounded-xl py-2.5" onClick={() => setShowReassignModal(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 rounded-xl py-2.5 font-bold" loading={actionLoading}>
              Reassign
            </Button>
          </div>
        </form>
      </Modal>

      {/* Convert Success Toast */}
      {convertSuccess && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-500 text-white px-5 py-3 rounded-2xl shadow-xl shadow-emerald-500/30 animate-in slide-in-from-bottom-2">
          <CheckCircle2 size={16}/> {convertSuccess}
        </div>
      )}

      {/* Bulk Convert Modal */}
      {showBulkConvertModal && (
        <BulkConvertLeadModal
          leadIds={selectedLeads}
          leads={list}
          onClose={() => setShowBulkConvertModal(false)}
          onSuccess={handleBulkConvertSuccess}
        />
      )}

      {/* Convert Lead Modal */}
      {showConvertModal && convertLead && (
        <ConvertLeadModal
          lead={convertLead}
          onClose={() => { setShowConvertModal(false); setConvertLead(null) }}
          onSuccess={handleConvertSuccess}
        />
      )}

      {/* Export Modal */}
      <ExportModal 
        isOpen={showExportModal} 
        onClose={() => setShowExportModal(false)} 
        onExport={handleExport} 
        loading={exporting}
        title="Export Leads"
      />
    </div>
  )
}