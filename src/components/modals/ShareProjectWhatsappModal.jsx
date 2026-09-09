import { useState, useEffect } from 'react'
import { MessageCircle, Loader2, AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import api from '../../api/axios'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

const TYPE_LABEL = { unit_plan: 'Unit Plan', creative: 'Creative', payment_plan: 'Payment Plan', video: 'Video', photo: 'Photo' }

// Sends the project's own detail (name, developer, location, price, etc. —
// never the lead's name/phone) plus any picked documents straight to a
// lead's WhatsApp via POST /projects/:id/share-whatsapp. No chat window
// opens — the message is pushed server-side through the WhatsApp Business
// API, so it only lands if that number is within Meta's 24-hour messaging
// window (surfaced below if it fails).
export default function ShareProjectWhatsappModal({ projectId, projectName, phone, onClose }) {
  const [documents, setDocuments] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [selectedIds, setSelectedIds] = useState([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    api.get(`/projects/${projectId}/documents`)
      .then(r => {
        const d = r.data.data?.documents || {}
        const flat = [
          ...(d.unit_plans || []), ...(d.creatives || []),
          ...(d.payment_plans || []), ...(d.videos || []),
        ]
        setDocuments(flat)
      })
      .catch(() => setDocuments([]))
      .finally(() => setLoadingDocs(false))
  }, [projectId])

  const toggle = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  const toggleAll = () => {
    setSelectedIds(prev => prev.length === documents.length ? [] : documents.map(d => d.id))
  }

  const handleSend = async () => {
    setSending(true); setError('')
    try {
      const res = await api.post(`/projects/${projectId}/share-whatsapp`, {
        phone, document_ids: selectedIds.length > 0 ? selectedIds : undefined,
      })
      setResult(res.data?.data || null)
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to send via WhatsApp')
    } finally {
      setSending(false)
    }
  }

  if (result) {
    return (
      <Modal isOpen onClose={onClose} title="WhatsApp Share Complete" size="sm">
        <div className="space-y-4">
          <div className={`flex items-center gap-3 rounded-xl p-3.5 ${result.text_sent ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
            {result.text_sent
              ? <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
              : <AlertCircle size={20} className="text-amber-500 flex-shrink-0" />}
            <p className={`text-sm ${result.text_sent ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
              {result.text_sent
                ? `Project details sent to ${result.sent_to}.`
                : `Project detail text failed to send${result.text_error ? `: ${result.text_error}` : ''}.`}
            </p>
          </div>

          {result.documents_sent?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Documents sent ({result.documents_sent.length})
              </p>
              <div className="space-y-1">
                {result.documents_sent.map(d => (
                  <div key={d.id} className="flex items-center gap-2 text-xs bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                    <CheckCircle2 size={12} className="text-emerald-500 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300 truncate">{d.file_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.documents_failed?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-red-500 uppercase tracking-wide">
                Failed ({result.documents_failed.length})
              </p>
              <div className="space-y-1">
                {result.documents_failed.map(d => (
                  <div key={d.id} className="flex items-center gap-2 text-xs bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                    <XCircle size={12} className="text-red-500 flex-shrink-0" />
                    <span className="text-red-700 dark:text-red-400 truncate">{d.file_name} — {d.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button className="w-full" onClick={onClose}>Done</Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen onClose={onClose} title="Send Project via WhatsApp" size="sm">
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-4 py-3 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/30">
          <div className="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
            <MessageCircle size={16} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{projectName}</p>
            <p className="text-xs text-gray-400">Sent to {phone}</p>
          </div>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Sends the project's own details (no lead info) as a WhatsApp message. Optionally pick documents to send along with it.
        </p>

        {loadingDocs ? (
          <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-brand" /></div>
        ) : documents.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Documents (optional)</label>
              <button type="button" onClick={toggleAll} className="text-[11px] font-medium text-brand hover:underline">
                {selectedIds.length === documents.length ? 'Clear all' : 'Select all'}
              </button>
            </div>
            <div className="border border-gray-200 dark:border-gray-800 rounded-xl max-h-48 overflow-y-auto">
              {documents.map(doc => (
                <label key={doc.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                  <input type="checkbox" checked={selectedIds.includes(doc.id)} onChange={() => toggle(doc.id)}
                    className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{doc.file_name}</p>
                  </div>
                  <span className="flex-shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {TYPE_LABEL[doc.document_type] || doc.document_type}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">No documents uploaded for this project yet — only the detail text will be sent.</p>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5">
            <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="button" className="flex-1" loading={sending} onClick={handleSend}>Send</Button>
        </div>
      </div>
    </Modal>
  )
}
