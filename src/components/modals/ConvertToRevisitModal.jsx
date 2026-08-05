import { useState } from 'react'
import { Clock, AlertCircle } from 'lucide-react'
import api from '../../api/axios'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Avatar from '../ui/Avatar'
import DatePicker from '../ui/DatePicker'
import ClockPicker from '../ui/ClockPicker'
import CustomSelect from '../ui/CustomSelect'
import AsyncSearchSelect from '../ui/AsyncSearchSelect'

const ic = 'w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm transition-all'
const lc = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'
const ROLE_LABEL = { super_admin: 'Super Admin', admin: 'Admin', associate_partner: 'Associate Partner', cluster_head: 'Cluster Head', partner: 'Partner', team_leader: 'Team Leader', sales_manager: 'Sales Manager', sales_executive: 'Sales Executive', external_caller: 'External Caller' }

// A lead's assigned_to can arrive either as a plain id or as
// { id, full_name, phone } depending on which endpoint fetched it — never
// use `typeof x === 'object'` alone here since typeof null is also 'object'.
const assignedIdOf = v => (v && typeof v === 'object') ? v.id : (v || '')

// Directly converts a lead into a scheduled re-visit via
// POST /site-revisits/from-lead — the lead doesn't need an existing
// site_visits record for this (unlike the regular Revisits "Schedule"
// flow, which requires picking an original visit).
export default function ConvertToRevisitModal({ lead, teamMembers = [], currentUser, onClose, onSuccess }) {
  const [form, setForm] = useState({
    visit_date: '', visit_time: '10:00',
    project_id: lead?.project_id || '',
    project_name: lead?.project_id ? '' : (lead?.project_name || ''),
    assigned_to: assignedIdOf(lead?.assigned_to),
    reason: '', notes: '', transport_arranged: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const execOptions = [
    ...(currentUser ? [{ value: currentUser.id, label: `Self · ${ROLE_LABEL[currentUser.role] || currentUser.role}` }] : []),
    ...teamMembers.filter(u => u.id !== currentUser?.id && !u.is_self).map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name} · ${ROLE_LABEL[u.role] || u.role}` }))
  ]

  const searchProjects = async q => {
    const res = await api.get('/projects', { params: { search: q, per_page: 20 } })
    return (res.data.data || []).map(p => ({ value: p.id, label: `${p.name}${p.city ? ` — ${p.city}` : ''}` }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.visit_date || !form.visit_time) { setError('Visit date and time are required'); return }
    setLoading(true); setError('')
    try {
      await api.post('/site-revisits/from-lead', {
        lead_id: lead.id,
        project_id: form.project_id || form.project_name || undefined,
        visit_date: form.visit_date,
        visit_time: form.visit_time,
        assigned_to: form.assigned_to || undefined,
        reason: form.reason || undefined,
        notes: form.notes || undefined,
        transport_arranged: Boolean(form.transport_arranged),
      })
      onSuccess()
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to schedule re-visit')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Convert to Re-visit" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-xl">
          <Avatar name={lead?.name} size="sm" />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{lead?.name}</p>
            <p className="text-xs text-gray-400">{lead?.phone}</p>
          </div>
        </div>

        <AsyncSearchSelect
          label="Project"
          value={form.project_id}
          onChange={val => setForm(p => ({ ...p, project_id: val, project_name: '' }))}
          onTextChange={text => setForm(p => ({ ...p, project_name: text, project_id: '' }))}
          onSearch={searchProjects}
          placeholder="Type to search projects..."
          fallbackToInput
          defaultText={form.project_id ? '' : (form.project_name || '')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DatePicker
            label="Visit Date"
            required
            value={form.visit_date}
            onChange={val => setForm(p => ({ ...p, visit_date: val }))}
            min={new Date().toISOString().split('T')[0]}
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
          options={execOptions} placeholder="Default: lead's current assignee" searchable />

        <div>
          <label className={lc}>Reason for Re-visit</label>
          <input value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
            placeholder="Client wants to revisit before finalizing..." className={ic} />
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

        {error && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2">
            <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" loading={loading}>Schedule Re-visit</Button>
        </div>
      </form>
    </Modal>
  )
}
