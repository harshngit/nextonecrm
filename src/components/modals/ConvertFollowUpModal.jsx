import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { CalendarPlus, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import api from '../../api/axios'
import Modal from '../ui/Modal'
import CustomSelect from '../ui/CustomSelect'
import ClockPicker from '../ui/ClockPicker'

export default function ConvertFollowUpModal({ task, onClose, onSuccess }) {
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
