import { useState } from 'react'
import { Clock, AlertCircle } from 'lucide-react'
import api from '../../api/axios'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Avatar from '../ui/Avatar'
import DatePicker from '../ui/DatePicker'
import ClockPicker from '../ui/ClockPicker'

const ic = 'w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm transition-all'
const lc = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'

// Directly converts a lead into a scheduled re-visit via
// POST /site-revisits/from-lead — the lead doesn't need an existing
// site_visits record for this (unlike the regular Revisits "Schedule"
// flow, which requires picking an original visit).
export default function ConvertToRevisitModal({ lead, onClose, onSuccess }) {
  const [form, setForm] = useState({ visit_date: '', visit_time: '10:00', reason: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.visit_date || !form.visit_time) { setError('Visit date and time are required'); return }
    setLoading(true); setError('')
    try {
      await api.post('/site-revisits/from-lead', {
        lead_id: lead.id,
        visit_date: form.visit_date,
        visit_time: form.visit_time,
        reason: form.reason || undefined,
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

        <div>
          <label className={lc}>Reason for Re-visit</label>
          <input value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
            placeholder="Client wants to revisit before finalizing..." className={ic} />
        </div>

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
