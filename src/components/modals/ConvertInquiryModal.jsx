import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { UserPlus, PhoneCall, CalendarPlus, Loader2, AlertCircle } from 'lucide-react'
import api from '../../api/axios'
import { fetchLeadStatuses } from '../../store/leadSlice'
import Modal from '../ui/Modal'
import DatePicker from '../ui/DatePicker'
import ClockPicker from '../ui/ClockPicker'
import CustomSelect from '../ui/CustomSelect'
import AsyncSearchSelect from '../ui/AsyncSearchSelect'

// Matches the API's documented status enum — merged below with any active
// custom statuses from GET /config/lead-statuses.
const BUILTIN_STATUSES = [
  { value: 'new',                  label: 'New' },
  { value: 'contacted',            label: 'Contacted' },
  { value: 'interested',           label: 'Interested' },
  { value: 'follow_up',            label: 'Follow-up' },
  { value: 'site_visit_scheduled', label: 'Site Visit Scheduled' },
  { value: 'site_visit_done',      label: 'Site Visit Done' },
  { value: 'negotiation',          label: 'Negotiation' },
  { value: 'booked',               label: 'Booked' },
  { value: 'lost',                 label: 'Lost' },
]

const CONFIGURATION_OPTIONS = ['1RK', '1BHK', '2BHK', '3BHK', '4BHK', '5BHK', 'Duplex', 'Penthouse', 'Villa', 'Plot', 'Office', 'Shop', 'Warehouse']
  .map(c => ({ value: c, label: c }))

const PRIORITY_OPTIONS = [{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]

const ic = 'w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-[#0082f3] text-gray-700 dark:text-gray-300 transition-colors placeholder-gray-400'
const labelCls = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5'

export default function ConvertInquiryModal({ inquiry, onClose, onSuccess }) {
  const dispatch = useDispatch()
  const { statuses: customStatuses = [] } = useSelector(s => s.leads)

  const [step, setStep] = useState('choose') // 'choose' | 'lead' | 'follow_up' | 'site_visit'
  const [converting, setConverting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    assigned_to: inquiry.assigned_to || '',
    status: '',
    budget: '',
    location_preference: inquiry.location_preference || '',
    configuration: '',
    project_id: inquiry.project_id || '',
    project_name: inquiry.project_id ? '' : (inquiry.project_name || ''),
    notes: '',
    title: `Call back — ${inquiry.name || 'Website Inquiry'}`,
    due_date: '', due_time: '10:00',
    priority: 'medium',
    visit_date: '', visit_time: '10:00',
    transport_arranged: false,
  })

  useEffect(() => { dispatch(fetchLeadStatuses()) }, [dispatch])

  const statusOptions = [
    ...BUILTIN_STATUSES,
    ...customStatuses
      .filter(s => s.is_active && !BUILTIN_STATUSES.some(b => b.value === s.key))
      .map(s => ({ value: s.key, label: s.label })),
  ]

  const searchProjects = async (q) => {
    const res = await api.get('/projects', { params: { search: q, per_page: 20 } })
    return (res.data.data || []).map(p => ({ value: p.id, label: `${p.name}${p.city ? ` · ${p.city}` : ''}` }))
  }
  const searchUsers = async (q) => {
    const res = await api.get('/users', { params: { search: q, per_page: 20 } })
    return (res.data.data || []).map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name}${u.role ? ` · ${u.role.replace(/_/g, ' ')}` : ''}` }))
  }

  const submit = async (convertTo) => {
    setError('')
    if (convertTo === 'follow_up' && !form.title.trim()) { setError('Title is required'); return }
    if (convertTo === 'follow_up' && !form.due_date)     { setError('Due date is required'); return }
    if (convertTo === 'site_visit' && !form.visit_date)  { setError('Visit date is required'); return }
    if (convertTo === 'site_visit' && !form.visit_time)  { setError('Visit time is required'); return }

    setConverting(true)
    try {
      const body = { convert_to: convertTo }
      if (form.assigned_to)         body.assigned_to = form.assigned_to
      if (form.status)              body.status = form.status
      if (form.budget)              body.budget = form.budget
      if (form.location_preference) body.location_preference = form.location_preference
      if (form.configuration)       body.configuration = form.configuration
      if (form.project_id)          body.project_id = form.project_id
      else if (form.project_name)   body.project_name = form.project_name
      if (form.notes)               body.notes = form.notes

      if (convertTo === 'follow_up') {
        body.title = form.title
        body.due_date = form.due_time
          ? new Date(`${form.due_date}T${form.due_time}:00`).toISOString()
          : new Date(`${form.due_date}T10:00:00`).toISOString()
        if (form.priority) body.priority = form.priority
      }
      if (convertTo === 'site_visit') {
        body.visit_date = form.visit_date
        body.visit_time = form.visit_time
        body.transport_arranged = Boolean(form.transport_arranged)
      }

      await api.post(`/website-inquiries/${inquiry.id}/convert`, body)
      onSuccess(convertTo)
    } catch (e) {
      setError(e.response?.data?.message || 'Conversion failed')
    } finally {
      setConverting(false)
    }
  }

  // Shared across all three steps — assignment, lead status override, and
  // the general lead fields the API accepts regardless of convert_to.
  const CommonFields = () => (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AsyncSearchSelect
          label="Assign To"
          value={form.assigned_to}
          onChange={val => setForm(f => ({ ...f, assigned_to: val }))}
          onSearch={searchUsers}
          initialOptions={inquiry.assigned_to && inquiry.assigned_to_name ? [{ value: inquiry.assigned_to, label: inquiry.assigned_to_name }] : []}
          placeholder="Keep existing assignment"
        />
        <CustomSelect label="Status" value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))}
          options={statusOptions} placeholder="Default for this conversion" searchable />
      </div>
      <AsyncSearchSelect
        label="Project"
        value={form.project_id}
        onChange={val => setForm(f => ({ ...f, project_id: val, project_name: '' }))}
        onTextChange={text => setForm(f => ({ ...f, project_name: text, project_id: '' }))}
        onSearch={searchProjects}
        placeholder="Keep inquiry's project — type to override..."
        fallbackToInput
        defaultText={form.project_id ? '' : (form.project_name || '')}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Budget</label>
          <input value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
            placeholder="e.g. 60-80 Lakhs" className={ic} />
        </div>
        <div>
          <label className={labelCls}>Location Preference</label>
          <input value={form.location_preference} onChange={e => setForm(f => ({ ...f, location_preference: e.target.value }))}
            placeholder="e.g. Andheri West" className={ic} />
        </div>
      </div>
      <CustomSelect label="Configuration" value={form.configuration} onChange={v => setForm(f => ({ ...f, configuration: v }))}
        options={CONFIGURATION_OPTIONS} placeholder="Select configuration" />
      <div>
        <label className={labelCls}>Notes <span className="font-normal text-gray-400">(optional)</span></label>
        <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Any additional context…" className={ic + ' resize-none'} />
      </div>
    </>
  )

  return (
    <Modal isOpen={true} onClose={onClose}
      title={step === 'choose' ? 'Convert Inquiry' : step === 'lead' ? 'Convert to Lead' : step === 'follow_up' ? 'Convert to Follow-Up' : 'Convert to Site Visit'}
      size="md"
    >
      {step === 'choose' ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800">
            <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{inquiry.name?.[0]?.toUpperCase() || '?'}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{inquiry.name}</p>
              <p className="text-xs text-gray-400">{inquiry.phone}{inquiry.project_name ? ` · ${inquiry.project_name}` : ''}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            This always creates a Lead. Optionally schedule a follow-up or site visit at the same time.
          </p>

          <button onClick={() => setStep('lead')}
            className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-gray-100 dark:border-gray-800 hover:border-brand hover:bg-brand/5 transition-all">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-500/30">
              <UserPlus size={18} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Lead Only</p>
              <p className="text-[11px] text-gray-400">Just create a lead from this inquiry</p>
            </div>
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={() => setStep('follow_up')}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-gray-100 dark:border-gray-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm shadow-emerald-500/30">
                <PhoneCall size={20} className="text-white" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Lead + Follow-Up</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Also create a follow-up task</p>
              </div>
            </button>
            <button onClick={() => setStep('site_visit')}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-gray-100 dark:border-gray-800 hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 to-violet-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm shadow-purple-500/30">
                <CalendarPlus size={20} className="text-white" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Lead + Site Visit</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Also schedule a site visit</p>
              </div>
            </button>
          </div>
        </div>
      ) : step === 'lead' ? (
        <div className="space-y-4">
          <CommonFields />
          {error && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5">
              <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={() => { setStep('choose'); setError('') }}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              ← Back
            </button>
            <button onClick={() => submit('lead')} disabled={converting}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-brand to-blue-600 hover:from-brand-dark hover:to-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60">
              {converting ? <><Loader2 size={14} className="animate-spin" /> Converting…</> : <><UserPlus size={14} /> Create Lead</>}
            </button>
          </div>
        </div>
      ) : step === 'follow_up' ? (
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Follow-up Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Call back about 2BHK options" className={ic} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DatePicker label="Due Date" required value={form.due_date} onChange={v => setForm(f => ({ ...f, due_date: v }))} />
            <ClockPicker label="Due Time" value={form.due_time} onChange={v => setForm(f => ({ ...f, due_time: v }))} />
          </div>
          <CustomSelect label="Priority" value={form.priority} onChange={v => setForm(f => ({ ...f, priority: v }))} options={PRIORITY_OPTIONS} />
          <CommonFields />
          {error && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5">
              <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={() => { setStep('choose'); setError('') }}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              ← Back
            </button>
            <button onClick={() => submit('follow_up')} disabled={converting}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60">
              {converting ? <><Loader2 size={14} className="animate-spin" /> Converting…</> : <><PhoneCall size={14} /> Create Follow-Up</>}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DatePicker label="Visit Date" required value={form.visit_date} onChange={v => setForm(f => ({ ...f, visit_date: v }))} />
            <ClockPicker label="Visit Time *" value={form.visit_time} onChange={v => setForm(f => ({ ...f, visit_time: v }))} required />
          </div>
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800 cursor-pointer"
            onClick={() => setForm(f => ({ ...f, transport_arranged: !f.transport_arranged }))}>
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors flex-shrink-0 ${form.transport_arranged ? 'bg-purple-500 border-purple-500' : 'border-gray-300 dark:border-gray-600'}`}>
              {form.transport_arranged && <span className="text-white text-xs">✓</span>}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Transport Arranged</p>
              <p className="text-[10px] text-gray-400">Check if you will arrange pick-up/drop for the client</p>
            </div>
          </div>
          <CommonFields />
          {error && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5">
              <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={() => { setStep('choose'); setError('') }}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              ← Back
            </button>
            <button onClick={() => submit('site_visit')} disabled={converting}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60">
              {converting ? <><Loader2 size={14} className="animate-spin" /> Converting…</> : <><CalendarPlus size={14} /> Schedule Visit</>}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
