import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { CalendarPlus, PhoneCall, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import api from '../../api/axios'
import Modal from '../ui/Modal'
import CustomSelect from '../ui/CustomSelect'
import ClockPicker from '../ui/ClockPicker'

export default function ConvertLeadModal({ lead, onClose, onSuccess }) {
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
