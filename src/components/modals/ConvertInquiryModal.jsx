import { useState } from 'react'
import { UserPlus, PhoneCall, CalendarPlus, Loader2, AlertCircle } from 'lucide-react'
import api from '../../api/axios'
import Modal from '../ui/Modal'
import DatePicker from '../ui/DatePicker'
import ClockPicker from '../ui/ClockPicker'

export default function ConvertInquiryModal({ inquiry, onClose, onSuccess }) {
  const [step, setStep] = useState('choose') // 'choose' | 'follow_up' | 'site_visit'
  const [converting, setConverting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ visit_date: '', visit_time: '10:00' })

  const submit = async (convertTo) => {
    setError('')
    if (convertTo !== 'lead' && !form.visit_date) {
      setError('Date is required')
      return
    }
    setConverting(true)
    try {
      const body = convertTo === 'lead'
        ? { convert_to: 'lead' }
        : { convert_to: convertTo, visit_date: form.visit_date, visit_time: form.visit_time }
      await api.post(`/website-inquiries/${inquiry.id}/convert`, body)
      onSuccess(convertTo)
    } catch (e) {
      setError(e.response?.data?.message || 'Conversion failed')
    } finally {
      setConverting(false)
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose}
      title={step === 'choose' ? 'Convert Inquiry' : step === 'follow_up' ? 'Convert to Follow-Up' : 'Convert to Site Visit'}
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

          <button onClick={() => submit('lead')} disabled={converting}
            className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-gray-100 dark:border-gray-800 hover:border-brand hover:bg-brand/5 transition-all disabled:opacity-60">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-500/30">
              {converting ? <Loader2 size={18} className="text-white animate-spin" /> : <UserPlus size={18} className="text-white" />}
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Lead Only</p>
              <p className="text-[11px] text-gray-400">Just create a lead from this inquiry</p>
            </div>
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={() => { setStep('follow_up'); setError('') }}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-gray-100 dark:border-gray-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm shadow-emerald-500/30">
                <PhoneCall size={20} className="text-white" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Lead + Follow-Up</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Also create a follow-up task</p>
              </div>
            </button>
            <button onClick={() => { setStep('site_visit'); setError('') }}
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

          {error && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5">
              <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DatePicker
              label={step === 'follow_up' ? 'Due Date' : 'Visit Date'}
              required
              value={form.visit_date}
              onChange={(v) => setForm(f => ({ ...f, visit_date: v }))}
              min={new Date().toISOString().split('T')[0]}
            />
            <ClockPicker
              label={step === 'follow_up' ? 'Due Time' : 'Visit Time'}
              value={form.visit_time}
              onChange={(v) => setForm(f => ({ ...f, visit_time: v }))}
            />
          </div>

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
            <button onClick={() => submit(step)} disabled={converting}
              className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60 ${
                step === 'follow_up'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600'
                  : 'bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700'
              }`}>
              {converting ? <><Loader2 size={14} className="animate-spin" /> Converting…</> : <><CalendarPlus size={14} /> Convert</>}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
