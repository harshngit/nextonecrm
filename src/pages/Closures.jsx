import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { useModulePermissions } from '../hooks/usePermission'
import { fetchTeamTree } from '../store/userSlice'
import {
  Plus, RefreshCw, Edit2, X, CheckCircle2, TrendingUp,
  Loader2, AlertCircle, IndianRupee, Building2, Calendar,
  Star, Banknote, Home, Search, Users, CircleDot,
  BadgeCheck, ChevronRight, Percent, CreditCard, Clock, Eye, MoreVertical, Download,
  Upload, FileText, Check, Trash2,
} from 'lucide-react'
import api from '../api/axios'
import Avatar from '../components/ui/Avatar'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import CustomSelect from '../components/ui/CustomSelect'
import ListSkeleton from '../components/loaders/ListSkeleton'
import AsyncSearchSelect from '../components/ui/AsyncSearchSelect'
import ExportModal from '../components/ui/ExportModal'
import ConfirmModal from '../components/ui/ConfirmModal'

// ── Constants ─────────────────────────────────────────────────────────────────
const CLOSURE_STATUSES = [
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'on_hold',   label: 'On Hold' },
  { value: 'cancelled', label: 'Cancelled' },
]
const STATUS_COLOR = {
  confirmed: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  on_hold:   'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400',
}
const PAYMENT_PLANS = [
  'Construction Linked Plan', 'Down Payment Plan', 'Time Linked Plan',
  'Flexi Pay Plan', 'Subvention Scheme', 'Custom',
]

const ic = 'w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm transition-all'
const lc = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'

const fmtCurrency = n => n ? `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—'
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

// Uploaded file URLs come back relative (e.g. "/uploads/closures/documents/x.pdf"),
// served from the API's origin rather than the frontend's — resolve to a full URL.
const fileOrigin = api.defaults.baseURL.replace(/\/api\/v1\/?$/, '')
const resolveFileUrl = path => {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return `${fileOrigin}${path.startsWith('/') ? '' : '/'}${path}`
}

// Compact Indian-style abbreviation (Cr / L / K) — used as a quick-read caption
// alongside the full amount, since deal values can run into crores.
const fmtCompact = n => {
  const num = Number(n)
  if (!num) return null
  if (num >= 1e7) return `₹${(num / 1e7).toFixed(2).replace(/\.?0+$/, '')} Cr`
  if (num >= 1e5) return `₹${(num / 1e5).toFixed(2).replace(/\.?0+$/, '')} L`
  if (num >= 1e3) return `₹${(num / 1e3).toFixed(2).replace(/\.?0+$/, '')} K`
  return null
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function ClosureStatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${STATUS_COLOR[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}

const DOCUMENT_TYPES = [
  { value: 'cost_sheet',    label: 'Cost Sheet' },
  { value: 'payment_proof', label: 'Payment Proof' },
  { value: 'booking_form',  label: 'Booking Form' },
]

// ── Closure Document Manager ──────────────────────────────────────────────────
// Two modes: closureId absent (create flow) → files are uploaded standalone via
// /closures/upload-document and their metadata held in `documents` until the
// closure is created; closureId present (edit / detail view) → files attach
// directly via /closures/{id}/documents and list/rename/delete hit real endpoints.
export function ClosureDocumentManager({ closureId, documents = [], setDocuments = () => {} }) {
  const isEdit = !!closureId
  const [existingDocs, setExistingDocs] = useState([])
  const [loadingDocs,  setLoadingDocs]  = useState(isEdit)
  const [uploading,    setUploading]    = useState(false)
  const [error,        setError]        = useState('')
  const [draftType,    setDraftType]    = useState('cost_sheet')
  const [draftName,    setDraftName]    = useState('')
  const [editingId,    setEditingId]    = useState(null)
  const [editName,     setEditName]     = useState('')

  const fetchDocs = async () => {
    if (!closureId) return
    setLoadingDocs(true)
    try {
      const res = await api.get(`/closures/${closureId}/documents`)
      // Response shape isn't fully consistent across endpoints in this API —
      // handle data being the array directly, or nested under .documents.
      const payload = res.data?.data ?? res.data
      const docs = Array.isArray(payload) ? payload
        : Array.isArray(payload?.documents) ? payload.documents
        : Array.isArray(res.data?.documents) ? res.data.documents
        : []
      setExistingDocs(docs)
    } catch {} finally { setLoadingDocs(false) }
  }

  useEffect(() => { if (isEdit) fetchDocs() }, [closureId])

  const handleFileSelect = async e => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    setUploading(true)
    try {
      if (isEdit) {
        const fd = new FormData()
        fd.append('document', file)
        fd.append('document_type', draftType)
        fd.append('name', draftName.trim() || file.name)
        await api.post(`/closures/${closureId}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        setDraftName('')
        await fetchDocs()
      } else {
        const fd = new FormData()
        fd.append('document', file)
        const res = await api.post('/closures/upload-document', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        const { url, filename } = res.data.data || {}
        setDocuments(prev => [...prev, { url, document_type: draftType, name: draftName.trim() || filename || file.name }])
        setDraftName('')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const removePending = idx => setDocuments(prev => prev.filter((_, i) => i !== idx))

  const saveEditName = async docId => {
    if (!editName.trim()) return
    try {
      await api.patch(`/closures/${closureId}/documents/${docId}`, { name: editName.trim() })
      setEditingId(null)
      await fetchDocs()
    } catch {}
  }

  const deleteDoc = async docId => {
    if (!window.confirm('Delete this document?')) return
    try {
      await api.delete(`/closures/${closureId}/documents/${docId}`)
      await fetchDocs()
    } catch {}
  }

  const rows = isEdit ? existingDocs : documents

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CustomSelect label="Document Type" value={draftType} onChange={setDraftType} options={DOCUMENT_TYPES} />
        <div>
          <label className={lc}>Document Name</label>
          <input value={draftName} onChange={e => setDraftName(e.target.value)}
            placeholder="Cost Sheet - Tower B" className={ic} />
        </div>
      </div>

      <label className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-brand hover:text-brand rounded-xl cursor-pointer w-fit ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
        {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
        {uploading ? 'Uploading…' : 'Upload Document'}
        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={handleFileSelect} />
      </label>

      {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg">{error}</p>}

      {loadingDocs ? (
        <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-brand" /></div>
      ) : rows.length > 0 ? (
        <div className="space-y-1.5">
          {rows.map((doc, idx) => (
            <div key={doc.id ?? idx} className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-[#0f0f0f] rounded-xl border border-gray-100 dark:border-gray-800">
              <a href={resolveFileUrl(doc.url || doc.file_path)} target="_blank" rel="noreferrer"
                className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 text-gray-500">
                <FileText size={14} />
              </a>
              <div className="flex-1 min-w-0">
                {isEdit && editingId === doc.id ? (
                  <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                    className="w-full px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-brand rounded-lg outline-none" />
                ) : (
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{doc.name || doc.file_name || 'Document'}</p>
                )}
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                  {DOCUMENT_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type}
                </p>
              </div>
              {isEdit ? (
                editingId === doc.id ? (
                  <>
                    <button type="button" onClick={() => saveEditName(doc.id)} className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"><Check size={13} /></button>
                    <button type="button" onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"><X size={13} /></button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => { setEditingId(doc.id); setEditName(doc.name || doc.file_name || '') }} className="p-1 text-gray-400 hover:text-brand transition-colors"><Edit2 size={12} /></button>
                    <button type="button" onClick={() => deleteDoc(doc.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                  </>
                )
              ) : (
                <button type="button" onClick={() => removePending(idx)} className="p-1 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center py-3">No documents yet</p>
      )}
    </div>
  )
}

// ── Create/Edit Closure Modal ─────────────────────────────────────────────────
function ClosureFormModal({ closure, leads, projects, managers, onClose, onSuccess }) {
  const isEdit = !!closure
  const [form, setForm] = useState({
    lead_id:              closure?.lead_id              || '',
    project_id:           closure?.project_id           || '',
    project_name:         closure?.project_name || closure?.project_name_text || '',
    site_visit_id:        closure?.site_visit_id        || '',
    booking_date:         closure?.booking_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    unit_number:          closure?.unit_number          || '',
    tower_block:          closure?.tower_block          || '',
    floor_number:         closure?.floor_number         || '',
    unit_type:            closure?.unit_type            || '',
    carpet_area_sqft:     closure?.carpet_area_sqft     || '',
    super_area_sqft:      closure?.super_area_sqft      || '',
    agreed_price:         closure?.agreed_price         || '',
    booking_amount:       closure?.booking_amount       || '',
    payment_plan:         closure?.payment_plan         || '',
    loan_required:        closure?.loan_required        || false,
    loan_bank:            closure?.loan_bank            || '',
    commission_amount:    closure?.commission_amount    || '',
    commission_percent:   closure?.commission_percent   || '',
    commission_paid:      closure?.commission_paid      || false,
    commission_paid_date: closure?.commission_paid_date?.split('T')[0] || '',
    closed_by_manager:    closure?.closed_by_manager    || closure?.closed_by_managers?.map(m => m.id) || [],
    closure_notes:        closure?.closure_notes        || '',
    documents:            [], // create-flow only — attached via /closures/upload-document, sent with the create payload
  })
  const [loading,       setLoading]       = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(isEdit)
  const [error,         setError]         = useState('')
  const [tab,           setTab]           = useState('booking') // booking | financials | commission | documents

  // The list row only carries summary fields — fetch the full closure by id
  // so the edit form is populated with true, up-to-date data.
  useEffect(() => {
    if (!isEdit || !closure?.id) return
    let cancelled = false
    setLoadingDetail(true)
    api.get(`/closures/${closure.id}`)
      .then(res => {
        if (cancelled) return
        const d = res.data.data || res.data
        const unit        = d.unit || {}
        const financials   = d.financials || {}
        const commission   = d.commission || {}
        const lead         = d.lead || {}
        const project      = d.project || {}
        setForm(p => ({
          ...p,
          lead_id:              lead.id || d.lead_id || p.lead_id,
          project_id:           project.id || d.project_id || p.project_id,
          project_name:         project.name || d.project_name || d.project_name_text || p.project_name,
          site_visit_id:        d.site_visit_id ?? p.site_visit_id,
          booking_date:         d.booking_date?.split('T')[0] || p.booking_date,
          unit_number:          unit.unit_number ?? d.unit_number ?? p.unit_number,
          tower_block:          unit.tower_block ?? d.tower_block ?? p.tower_block,
          floor_number:         unit.floor_number ?? d.floor_number ?? p.floor_number,
          unit_type:            unit.unit_type ?? d.unit_type ?? p.unit_type,
          carpet_area_sqft:     unit.carpet_area_sqft ?? d.carpet_area_sqft ?? p.carpet_area_sqft,
          super_area_sqft:      unit.super_area_sqft ?? d.super_area_sqft ?? p.super_area_sqft,
          agreed_price:         financials.agreed_price ?? d.agreed_price ?? p.agreed_price,
          booking_amount:       financials.booking_amount ?? d.booking_amount ?? p.booking_amount,
          payment_plan:         financials.payment_plan ?? d.payment_plan ?? p.payment_plan,
          loan_required:        financials.loan_required ?? d.loan_required ?? p.loan_required,
          loan_bank:            financials.loan_bank ?? d.loan_bank ?? p.loan_bank,
          commission_amount:    commission.amount ?? d.commission_amount ?? p.commission_amount,
          commission_percent:   commission.percent ?? d.commission_percent ?? p.commission_percent,
          commission_paid:      commission.paid ?? d.commission_paid ?? p.commission_paid,
          commission_paid_date: (commission.paid_date ?? d.commission_paid_date)?.split('T')[0] || p.commission_paid_date,
          closed_by_manager:    d.closed_by_managers?.map(m => m.id)
            || (d.closed_by_manager?.id ? [d.closed_by_manager.id] : null)
            || (Array.isArray(d.closed_by_manager) ? d.closed_by_manager : p.closed_by_manager),
          closure_notes:        d.closure_notes ?? p.closure_notes,
        }))
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingDetail(false) })
    return () => { cancelled = true }
  }, [isEdit, closure?.id])

  const leadOptions    = leads.map(l => ({ value: l.id,   label: `${l.name} — ${l.phone || ''}` }))
  const projectOptions = projects.map(p => ({ value: p.id, label: `${p.name}${p.city ? ` — ${p.city}` : ''}` }))

  const searchLeads    = async (q) => { const r = await api.get('/leads',    { params: { search: q, per_page: 20 } }); return (r.data.data || []).map(l => ({ value: l.id, label: `${l.name} — ${l.phone || ''}` })) }
  const searchProjects = async (q) => { const r = await api.get('/projects', { params: { search: q, per_page: 20 } }); return (r.data.data || []).map(p => ({ value: p.id, label: `${p.name}${p.city ? ` — ${p.city}` : ''}` })) }
  const managerOptions = managers.map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name}` }))
  const paymentOptions = PAYMENT_PLANS.map(p => ({ value: p, label: p }))

  // Auto-calc commission amount when % changes
  const handleCommPct = val => {
    setForm(p => {
      const amt = p.agreed_price && val
        ? (parseFloat(p.agreed_price) * parseFloat(val) / 100).toFixed(0)
        : p.commission_amount
      return { ...p, commission_percent: val, commission_amount: amt }
    })
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!isEdit && (!form.lead_id || !form.booking_date)) {
      setError('Lead and booking date are required'); return
    }
    setLoading(true); setError('')
    try {
      const payload = { ...form }
      // Project can come from a real selection or free-typed text — send whichever's set as project_id.
      payload.project_id = form.project_id || form.project_name || undefined
      delete payload.project_name
      // Clean empties
      Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = undefined })
      if (isEdit) {
        // Documents are managed via their own endpoints once the closure exists — don't touch them here.
        delete payload.documents
        await api.put(`/closures/${closure.id}`, payload)
      } else {
        if (!payload.documents?.length) delete payload.documents
        await api.post('/closures', payload)
      }
      onSuccess(); onClose()
    } catch (e) { setError(e.response?.data?.message || 'Failed to save closure') }
    finally { setLoading(false) }
  }

  const tabs = [
    { key: 'booking',    label: 'Booking Details' },
    { key: 'financials', label: 'Financials' },
    { key: 'commission', label: 'Commission' },
    { key: 'documents',  label: 'Documents' },
  ]

  return (
    <Modal isOpen onClose={onClose} title={isEdit ? 'Edit Closure' : 'Create Closure — Book Lead'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">

        {loadingDetail && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl text-xs text-blue-600 dark:text-blue-400">
            <Loader2 size={13} className="animate-spin" /> Loading latest details…
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-1 bg-gray-100 dark:bg-[#141414] p-1 rounded-xl">
          {tabs.map(t => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${tab === t.key ? 'bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Booking Details ── */}
        {tab === 'booking' && (
          <div className="space-y-4">
            {!isEdit && (
              <AsyncSearchSelect label="Lead *" required value={form.lead_id}
                onChange={async v => {
                  setForm(p => ({ ...p, lead_id: v }))
                  if (!v) return
                  try {
                    const res = await api.get(`/leads/${v}`)
                    const projId = res.data.data?.project?.id || res.data.data?.project_id
                    if (projId) setForm(p => ({ ...p, project_id: projId }))
                  } catch {}
                }}
                onSearch={searchLeads} initialOptions={leadOptions.slice(0, 20)}
                placeholder="Type to search leads..." />
            )}
            {!isEdit && (
              <AsyncSearchSelect label="Project" value={form.project_id}
                onChange={val => setForm(p => ({ ...p, project_id: val, project_name: '' }))}
                onTextChange={text => setForm(p => ({ ...p, project_name: text, project_id: '' }))}
                onSearch={searchProjects} initialOptions={projectOptions.slice(0, 20)}
                placeholder="Type to search projects (optional)..."
                fallbackToInput
                defaultText={form.project_id ? '' : (form.project_name || '')} />
            )}
            <div>
              <label className={lc}>Booking Date *</label>
              <input type="date" value={form.booking_date}
                onChange={e => setForm(p => ({ ...p, booking_date: e.target.value }))} className={ic} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={lc}>Unit Number</label>
                <input value={form.unit_number} onChange={e => setForm(p => ({ ...p, unit_number: e.target.value }))}
                  placeholder="B-1204" className={ic} />
              </div>
              <div>
                <label className={lc}>Tower / Block</label>
                <input value={form.tower_block} onChange={e => setForm(p => ({ ...p, tower_block: e.target.value }))}
                  placeholder="Tower B" className={ic} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={lc}>Floor</label>
                <input type="number" value={form.floor_number}
                  onChange={e => setForm(p => ({ ...p, floor_number: e.target.value }))}
                  placeholder="12" className={ic} />
              </div>
              <div>
                <label className={lc}>Unit Type</label>
                <input value={form.unit_type} onChange={e => setForm(p => ({ ...p, unit_type: e.target.value }))}
                  placeholder="3BHK" className={ic} />
              </div>
              <div>
                <label className={lc}>Carpet Area (sqft)</label>
                <input type="number" value={form.carpet_area_sqft}
                  onChange={e => setForm(p => ({ ...p, carpet_area_sqft: e.target.value }))}
                  placeholder="1250" className={ic} />
              </div>
            </div>

            <div>
              <label className={lc}>Super Area (sqft)</label>
              <input type="number" value={form.super_area_sqft}
                onChange={e => setForm(p => ({ ...p, super_area_sqft: e.target.value }))}
                placeholder="1650" className={ic} />
            </div>

            <div>
              <label className={lc}>Closure Notes</label>
              <textarea rows={2} value={form.closure_notes}
                onChange={e => setForm(p => ({ ...p, closure_notes: e.target.value }))}
                placeholder="Client opted for construction linked plan..." className={ic} />
            </div>
          </div>
        )}

        {/* ── Tab: Financials ── */}
        {tab === 'financials' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={lc}>Agreed Price (₹) *</label>
                <div className="relative">
                  <IndianRupee size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="number" value={form.agreed_price}
                    onChange={e => {
                      const v = e.target.value
                      setForm(p => ({
                        ...p, agreed_price: v,
                        commission_amount: p.commission_percent && v
                          ? (parseFloat(v) * parseFloat(p.commission_percent) / 100).toFixed(0)
                          : p.commission_amount,
                      }))
                    }}
                    placeholder="9500000" className={ic + ' pl-8'} />
                </div>
              </div>
              <div>
                <label className={lc}>Booking Amount (₹)</label>
                <div className="relative">
                  <IndianRupee size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="number" value={form.booking_amount}
                    onChange={e => setForm(p => ({ ...p, booking_amount: e.target.value }))}
                    placeholder="500000" className={ic + ' pl-8'} />
                </div>
              </div>
            </div>

            <CustomSelect label="Payment Plan" value={form.payment_plan}
              onChange={v => setForm(p => ({ ...p, payment_plan: v }))}
              options={paymentOptions} placeholder="Select payment plan..." />

            <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-xl cursor-pointer">
              <input type="checkbox" checked={form.loan_required}
                onChange={e => setForm(p => ({ ...p, loan_required: e.target.checked }))}
                className="w-4 h-4 accent-brand" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Home loan required</span>
            </label>

            {form.loan_required && (
              <div>
                <label className={lc}>Bank / NBFC</label>
                <input value={form.loan_bank} onChange={e => setForm(p => ({ ...p, loan_bank: e.target.value }))}
                  placeholder="HDFC Bank, SBI, LIC Housing..." className={ic} />
              </div>
            )}

            {/* Live preview */}
            {form.agreed_price && (
              <div className="bg-gradient-to-r from-[#0082f3]/5 to-blue-50 dark:from-blue-900/10 dark:to-blue-900/5 rounded-xl p-4 border border-blue-100 dark:border-blue-900/30 space-y-2">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Summary</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Deal Value</span>
                  <span className="font-bold text-gray-900 dark:text-white">{fmtCurrency(form.agreed_price)}</span>
                </div>
                {form.booking_amount && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Booking Amount</span>
                    <span className="font-semibold text-[#0082f3]">{fmtCurrency(form.booking_amount)}</span>
                  </div>
                )}
                {form.agreed_price && form.booking_amount && (
                  <div className="flex justify-between text-sm border-t border-blue-100 dark:border-blue-900/30 pt-2">
                    <span className="text-gray-500">Balance</span>
                    <span className="font-bold text-amber-600">{fmtCurrency(parseFloat(form.agreed_price) - parseFloat(form.booking_amount))}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Commission ── */}
        {tab === 'commission' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={lc}>Commission % <span className="font-normal text-gray-400">(auto-calcs amount)</span></label>
                <div className="relative">
                  <Percent size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="number" step="0.1" value={form.commission_percent}
                    onChange={e => handleCommPct(e.target.value)}
                    placeholder="2" className={ic + ' pl-8'} />
                </div>
              </div>
              <div>
                <label className={lc}>Commission Amount (₹)</label>
                <div className="relative">
                  <IndianRupee size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="number" value={form.commission_amount}
                    onChange={e => setForm(p => ({ ...p, commission_amount: e.target.value }))}
                    placeholder="Auto-calculated" className={ic + ' pl-8'} />
                </div>
              </div>
            </div>

            <CustomSelect label="Reporting Manager" value={form.closed_by_manager}
              onChange={v => setForm(p => ({ ...p, closed_by_manager: v }))}
              options={managerOptions} placeholder="Select manager(s)..." multiple searchable />

            <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-xl cursor-pointer">
              <input type="checkbox" checked={form.commission_paid}
                onChange={e => setForm(p => ({ ...p, commission_paid: e.target.checked }))}
                className="w-4 h-4 accent-brand" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Commission already paid</span>
            </label>

            {form.commission_paid && (
              <div>
                <label className={lc}>Commission Paid Date</label>
                <input type="date" value={form.commission_paid_date}
                  onChange={e => setForm(p => ({ ...p, commission_paid_date: e.target.value }))} className={ic} />
              </div>
            )}

            {form.commission_amount && (
              <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl p-4 border border-emerald-100 dark:border-emerald-900/30">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-bold">Commission</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{fmtCurrency(form.commission_amount)}</p>
                  </div>
                  <div className={`px-3 py-1.5 rounded-xl text-xs font-bold ${form.commission_paid ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'}`}>
                    {form.commission_paid ? '✓ Paid' : 'Pending'}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Documents ── */}
        {tab === 'documents' && (
          <ClosureDocumentManager
            closureId={closure?.id}
            documents={form.documents}
            setDocuments={updater => setForm(p => ({ ...p, documents: typeof updater === 'function' ? updater(p.documents) : updater }))}
          />
        )}

        {error && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5">
            <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" loading={loading}>
            {isEdit ? 'Update Closure' : 'Book Lead'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Status Change Modal ───────────────────────────────────────────────────────
function StatusChangeModal({ closure, onClose, onSuccess }) {
  const [status,  setStatus]  = useState(closure.status)
  const [note,    setNote]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await api.patch(`/closures/${closure.id}/status`, { status, note: note || undefined })
      onSuccess(); onClose()
    } catch (e) { setError(e.response?.data?.message || 'Failed to update status') }
    finally { setLoading(false) }
  }

  return (
    <Modal isOpen onClose={onClose} title="Change Closure Status" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0f0f0f] rounded-xl border border-gray-100 dark:border-gray-800">
          <Avatar name={closure.lead_name} size="sm" />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{closure.lead_name}</p>
            <p className="text-xs text-gray-400">{closure.project_name || closure.project_name_text} · {fmtDate(closure.booking_date)}</p>
          </div>
        </div>

        <CustomSelect label="New Status" value={status} onChange={setStatus} options={CLOSURE_STATUSES} />

        <div>
          <label className={lc}>Note <span className="font-normal text-gray-400">(optional)</span></label>
          <textarea rows={3} value={note} onChange={e => setNote(e.target.value)}
            placeholder="Reason for status change..." className={ic} />
        </div>

        {status === 'cancelled' && (
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
            ⚠️ Cancelling will revert the lead status to <strong>Negotiation</strong>
          </div>
        )}

        {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">{error}</p>}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" loading={loading}>Update Status</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Closure Detail Drawer ─────────────────────────────────────────────────────
function ClosureDrawer({ closure, onClose }) {
  if (!closure) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm m-0 p-0" onClick={onClose}  style={{ margin: '0px' }}>
      <div className="bg-white dark:bg-[#1a1a1a] w-full max-w-md h-full overflow-y-auto border-l border-gray-200 dark:border-gray-800 shadow-2xl m-0"
           onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-[#1a1a1a] border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between z-10 mt-0">
          <div className="flex items-center gap-2">
            <BadgeCheck size={18} className="text-brand" />
            <h2 className="font-bold text-gray-900 dark:text-white">Closure Details</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X size={15} />
          </button>
        </div>
        <div className="p-6 space-y-6">
          {/* Status + Lead */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar name={closure.lead_name} size="md" />
              <div>
                <p className="font-bold text-gray-900 dark:text-white">{closure.lead_name}</p>
                <p className="text-xs text-gray-400">{closure.lead_phone}</p>
              </div>
            </div>
            <ClosureStatusBadge status={closure.status} />
          </div>

          {/* Unit info */}
          <div className="bg-gray-50 dark:bg-[#141414] rounded-2xl p-4 space-y-3 border border-gray-100 dark:border-gray-800">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Unit Details</p>
            {[
              { l: 'Project',      v: closure.project_name || closure.project?.name || closure.project_name_text },
              { l: 'Unit',         v: [closure.unit_type, closure.unit_number].filter(Boolean).join(' — ') || '—' },
              { l: 'Tower/Block',  v: closure.tower_block },
              { l: 'Floor',        v: closure.floor_number },
              { l: 'Carpet Area',  v: closure.carpet_area_sqft ? `${closure.carpet_area_sqft} sqft` : null },
              { l: 'Super Area',   v: closure.super_area_sqft  ? `${closure.super_area_sqft} sqft`  : null },
              { l: 'Booking Date', v: fmtDate(closure.booking_date) },
            ].filter(x => x.v).map(({ l, v }) => (
              <div key={l} className="flex justify-between items-center text-sm">
                <span className="text-gray-400 text-xs font-medium">{l}</span>
                <span className="font-semibold text-gray-900 dark:text-white text-right max-w-[60%] truncate">{v}</span>
              </div>
            ))}
          </div>

          {/* Financials */}
          <div className="bg-gradient-to-br from-[#0082f3]/5 to-blue-50 dark:from-blue-900/10 dark:to-transparent rounded-2xl p-4 space-y-3 border border-blue-100 dark:border-blue-900/30">
            <p className="text-[10px] font-bold text-[#0082f3] uppercase tracking-widest">Financials</p>
            {[
              { l: 'Agreed Price',    v: fmtCurrency(closure.agreed_price),    bold: true },
              { l: 'Booking Amount',  v: fmtCurrency(closure.booking_amount) },
              { l: 'Payment Plan',    v: closure.payment_plan },
              { l: 'Loan Required',   v: closure.loan_required ? `Yes — ${closure.loan_bank || 'TBD'}` : 'No' },
            ].filter(x => x.v && x.v !== '—').map(({ l, v, bold }) => (
              <div key={l} className="flex justify-between text-sm">
                <span className="text-gray-400 text-xs font-medium">{l}</span>
                <span className={`${bold ? 'text-lg font-bold text-gray-900 dark:text-white' : 'font-semibold text-gray-700 dark:text-gray-300'}`}>{v}</span>
              </div>
            ))}
          </div>

          {/* Commission */}
          {closure.commission_amount && (
            <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl p-4 space-y-3 border border-emerald-100 dark:border-emerald-900/30">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Commission</p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Amount</span>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{fmtCurrency(closure.commission_amount)}</span>
              </div>
              {closure.commission_percent && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 text-xs">Rate</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{closure.commission_percent}%</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-400 text-xs">Status</span>
                <span className={`font-bold text-xs px-2 py-0.5 rounded-lg ${closure.commission_paid ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700' : 'bg-amber-100 dark:bg-amber-900/20 text-amber-700'}`}>
                  {closure.commission_paid ? `✓ Paid ${fmtDate(closure.commission_paid_date)}` : 'Pending'}
                </span>
              </div>
            </div>
          )}

          {/* Closed by */}
          {(closure.closed_by_name || closure.closed_by?.name) && (
            <div className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
              <Avatar name={closure.closed_by_name || closure.closed_by?.name} size="sm" />
              <div className="flex-1">
                <p className="text-xs text-gray-400">Closed by</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{closure.closed_by_name || closure.closed_by?.name}</p>
              </div>
              {(closure.closed_by_managers?.length > 0 || closure.closed_by_manager_name || closure.closed_by_manager?.name) && (
                <div className="text-right">
                  <p className="text-xs text-gray-400">Manager{closure.closed_by_managers?.length > 1 ? 's' : ''}</p>
                  <div className="flex flex-col gap-1">
                    {closure.closed_by_managers?.length > 0 ? (
                      closure.closed_by_managers.map((m, i) => (
                        <p key={i} className="text-xs font-medium text-gray-600 dark:text-gray-400">{m.name}</p>
                      ))
                    ) : (
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{closure.closed_by_manager_name || closure.closed_by_manager?.name}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {closure.closure_notes && (
            <div className="bg-gray-50 dark:bg-[#141414] rounded-xl p-4 border border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-400 font-medium mb-1">Notes</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{closure.closure_notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Closures() {
  const navigate  = useNavigate()
  const dispatch  = useDispatch()
  const { user }  = useSelector(s => s.auth)
  const { teamTree } = useSelector(s => s.users)

  const [closures,   setClosures]   = useState([])
  const [summary,    setSummary]    = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [pagination, setPagination] = useState({})
  const [page,       setPage]       = useState(1)

  const [filterStatus, setFilterStatus] = useState('')
  const [search,       setSearch]       = useState('')

  // Side data
  const [leads,    setLeads]    = useState([])
  const [projects, setProjects] = useState([])

  // Modals
  const [showCreate,  setShowCreate]  = useState(false)
  const [showEdit,    setShowEdit]    = useState(false)
  const [showStatus,  setShowStatus]  = useState(false)
  const [showDrawer,  setShowDrawer]  = useState(false)
  const [showDelete,  setShowDelete]  = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exporting,       setExporting]       = useState(false)
  const [selected,    setSelected]    = useState(null)
  const [openMenuId,  setOpenMenuId]  = useState(null)
  const [menuPos,     setMenuPos]     = useState(null)
  const menuRef = useRef(null)

  const canManage = true // All roles can manage closures
  const isAdmin   = ['super_admin','admin'].includes(user?.role)
  const perms = useModulePermissions('closures')
  
  // Reporting Manager options — everyone on the current user's team (any role)
  // can be credited for a closure's commission, so don't filter by role here.
  const managers = teamTree.filter(u => u.is_active !== false)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchClosures = async () => {
    setLoading(true)
    try {
      const params = { page, per_page: 10 }
      if (filterStatus) params.status = filterStatus
      const res = await api.get('/closures', { params })
      setClosures(res.data.data || [])
      setPagination(res.data.pagination || {})
    } catch { setClosures([]) }
    finally { setLoading(false) }
  }

  // Computed from the same /closures endpoint (and same role scoping) the table
  // below uses, rather than the separate /closures/summary endpoint — so the
  // top numbers always match what's actually visible/accessible to this role.
  const fetchSummary = async () => {
    if (!canManage) return
    try {
      const params = { per_page: 1000 }
      if (filterStatus) params.status = filterStatus
      const res = await api.get('/closures', { params })
      const all = res.data.data || []
      // Cancelled closures shouldn't count towards the summary totals.
      const active = all.filter(c => c.status !== 'cancelled')
      // Per-status breakdown — count + deal value for each status bucket.
      const byStatus = CLOSURE_STATUSES.reduce((acc, s) => {
        const items = all.filter(c => c.status === s.value)
        acc[s.value] = {
          count: items.length,
          value: items.reduce((sum, c) => sum + (Number(c.agreed_price) || 0), 0),
        }
        return acc
      }, {})
      setSummary({
        total_closures:     active.length,
        total_deal_value:   active.reduce((sum, c) => sum + (Number(c.agreed_price) || 0), 0),
        commission_paid:    active.reduce((sum, c) => sum + (c.commission_paid  ? (Number(c.commission_amount) || 0) : 0), 0),
        commission_pending: active.reduce((sum, c) => sum + (!c.commission_paid ? (Number(c.commission_amount) || 0) : 0), 0),
        byStatus,
      })
    } catch { setSummary(null) }
  }

  const fetchSideData = async () => {
    try {
      const [lRes, pRes] = await Promise.all([
        api.get('/leads', { params: { per_page: 100 } }),
        api.get('/projects', { params: { per_page: 100 } }),
      ])
      setLeads(lRes.data.data || [])
      setProjects(pRes.data.data || [])
    } catch {}
  }

  useEffect(() => { fetchClosures(); fetchSummary() }, [page, filterStatus])
  useEffect(() => { fetchSideData() }, [])
  useEffect(() => { if (user?.id) dispatch(fetchTeamTree(user.id)) }, [user?.id, dispatch])

  const handleExport = async (dateRange) => {
    try {
      setExporting(true)
      const params = { ...dateRange }
      if (filterStatus) params.status = filterStatus
      const res = await api.get('/export/closures', { params, responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a'); a.href = url; a.download = `Closures_${dateRange.from}_to_${dateRange.to}.xlsx`
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
      setShowExportModal(false)
    } catch (err) { console.error('Export failed:', err) } finally { setExporting(false) }
  }

  const handleDeleteClosure = async () => {
    if (!selected) return
    setDeleting(true)
    try {
      await api.delete(`/closures/${selected.id}`)
      setShowDelete(false)
      setSelected(null)
      fetchClosures(); fetchSummary()
    } catch (err) { console.error('Delete failed:', err) } finally { setDeleting(false) }
  }

  const displayed = search
    ? closures.filter(c =>
        c.lead_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.project_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.unit_number?.toLowerCase().includes(search.toLowerCase())
      )
    : closures

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BadgeCheck size={20} className="text-brand" /> Closures
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Booking records when leads are converted</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button variant="outline" size="sm" icon={Download} loading={exporting} disabled={exporting} onClick={() => setShowExportModal(true)}>
              Export
            </Button>
          )}
          {perms.create && <Button icon={Plus} onClick={() => setShowCreate(true)}>Book Lead</Button>}
        </div>
      </div>

      {/* Summary cards (admin/manager only) */}
      {summary && canManage && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Closures',  value: summary.total_closures,                     compact: null,                                  icon: BadgeCheck, color: 'text-[#0082f3] bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Total Deal Value',value: fmtCurrency(summary.total_deal_value),       compact: fmtCompact(summary.total_deal_value),   icon: IndianRupee,color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
            { label: 'Commission Paid', value: fmtCurrency(summary.commission_paid),        compact: fmtCompact(summary.commission_paid),    icon: Banknote,   color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
            { label: 'Comm. Pending',   value: fmtCurrency(summary.commission_pending),     compact: fmtCompact(summary.commission_pending), icon: Clock,      color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
          ].map(({ label, value, compact, icon: Icon, color }) => (
            <div key={label} className="bg-card border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">{label}</p>
                <p className="text-base font-bold text-gray-900 dark:text-white">{value}</p>
                {compact && <p className="text-[11px] text-gray-400 font-medium mt-0.5">{compact}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Status breakdown cards (admin/manager only) */}
      {summary?.byStatus && canManage && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { key: 'confirmed', label: 'Confirmed', color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
            { key: 'on_hold',   label: 'On Hold',    color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
            { key: 'cancelled', label: 'Cancelled',  color: 'text-red-500 bg-red-50 dark:bg-red-900/20' },
          ].map(({ key, label, color }) => (
            <button key={key}
              onClick={() => { setFilterStatus(filterStatus === key ? '' : key); setPage(1) }}
              className={`text-left bg-card border rounded-2xl p-4 shadow-sm flex items-center justify-between transition-all ${
                filterStatus === key ? 'border-brand ring-1 ring-brand/20 bg-brand/5' : 'border-gray-200 dark:border-gray-700 hover:border-brand/40'
              }`}>
              <div>
                <p className="text-xs text-gray-400 font-medium">{label}</p>
                <p className="text-base font-bold text-gray-900 dark:text-white">{summary.byStatus[key]?.count || 0}</p>
                {key !== 'on_hold' && (
                  <p className="text-[11px] text-gray-400 font-medium mt-0.5">{fmtCurrency(summary.byStatus[key]?.value)}</p>
                )}
              </div>
              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${color}`}>{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search lead, project, unit..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-brand placeholder-gray-400" />
        </div>
        <div className="w-44">
          <CustomSelect value={filterStatus} onChange={v => { setFilterStatus(v); setPage(1) }}
            options={[{ value: '', label: 'All Status' }, ...CLOSURE_STATUSES]}
            placeholder="All Status" />
        </div>
        <button onClick={() => { fetchClosures(); fetchSummary() }}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-brand hover:border-brand transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
        {filterStatus && (
          <button onClick={() => { setFilterStatus(''); setPage(1) }}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Summary */}
      {!loading && (
        <div className="text-sm text-gray-500 dark:text-[#888]">
          Showing <span className="font-semibold text-gray-900 dark:text-white">{displayed.length}</span>
          {pagination?.total > 0 && <> of <span className="font-semibold text-gray-900 dark:text-white">{pagination.total}</span></>} closures
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm">
        {loading ? (
          <div className="p-4"><ListSkeleton rows={5} /></div>
        ) : displayed.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <BadgeCheck size={28} className="text-gray-400" strokeWidth={1.5} />
            </div>
            <p className="text-gray-500 font-medium">No closures found</p>
            <p className="text-sm text-gray-400 mt-1">Create a closure when a lead is booked</p>
            {perms.create && (
              <button onClick={() => setShowCreate(true)}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-brand/10 hover:bg-brand/20 text-brand text-sm font-semibold rounded-xl mx-auto transition-colors">
                <Plus size={14} /> Book Lead
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#0f0f0f] border-b border-gray-200 dark:border-gray-800">
                  {['Lead', 'Project', 'Unit', 'Booking Date', 'Deal Value', 'Commission', 'Status', 'Closed By', 'Actions'].map(h => (
                    <th key={h} className="py-3 px-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {displayed.map((c, cIdx) => (
                  <tr key={c.id} className="hover:bg-gray-50/60 dark:hover:bg-[#0f0f0f]/60 transition-colors group cursor-pointer"
                      onClick={() => { setSelected(c); setShowDrawer(true) }}>

                    {/* Lead */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.lead_name || c['lead name'] || '?'} size="sm" />
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white text-sm cursor-pointer hover:text-brand transition-colors"
                             onClick={() => navigate(`/leads/${c.lead_id}`)}>
                            {c.lead_name || c['lead name'] || '—'}
                          </p>
                          <p className="text-[11px] text-gray-400">{c.lead_phone || ''}</p>
                        </div>
                      </div>
                    </td>

                    {/* Project */}
                    <td className="py-3 px-4">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{c.project_name || c.project_name_text || '—'}</p>
                      <p className="text-[11px] text-gray-400">{c.project_city || ''}</p>
                    </td>

                    {/* Unit */}
                    <td className="py-3 px-4">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{c.unit_number || '—'}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {c.unit_type && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-brand/10 text-brand rounded-md">{c.unit_type}</span>}
                        {c.tower_block && <span className="text-[11px] text-gray-400">{c.tower_block}</span>}
                      </div>
                    </td>

                    {/* Booking Date */}
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{fmtDate(c.booking_date)}</p>
                    </td>

                    {/* Deal Value */}
                    <td className="py-3 px-4">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{fmtCurrency(c.agreed_price)}</p>
                      {c.booking_amount && <p className="text-[11px] text-gray-400">Token: {fmtCurrency(c.booking_amount)}</p>}
                    </td>

                    {/* Commission */}
                    <td className="py-3 px-4">
                      {c.commission_amount ? (
                        <div>
                          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{fmtCurrency(c.commission_amount)}</p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${c.commission_paid ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-amber-100 dark:bg-amber-900/20 text-amber-600'}`}>
                            {c.commission_paid ? 'Paid' : 'Pending'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300 dark:text-gray-700">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4"><ClosureStatusBadge status={c.status} /></td>

                    {/* Closed By */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <Avatar name={c.closed_by_name || '?'} size="xs" />
                        <span className="text-xs text-gray-600 dark:text-gray-400">{c.closed_by_name || '—'}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4" onClick={e => e.stopPropagation()} ref={openMenuId === c.id ? menuRef : null}>
                      <div className="flex items-center justify-end">
                        <div className="relative">
                          <button
                            onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); const below = window.innerHeight - r.bottom; setMenuPos({ right: window.innerWidth - r.right, ...(below > 200 ? { top: r.bottom + 4 } : { bottom: window.innerHeight - r.top + 4 }) }); setOpenMenuId(openMenuId === c.id ? null : c.id) }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand hover:bg-brand/10 transition-all"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {openMenuId === c.id && (
                            <div style={{ top: menuPos?.top, bottom: menuPos?.bottom, right: menuPos?.right }} className="fixed w-48 max-h-64 overflow-y-auto bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg z-[9999] py-1">
                              <button
                                onClick={() => { navigate(`/closures/${c.id}`); setOpenMenuId(null); }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                <Eye size={14} />
                                View Details
                              </button>
                              <button
                                onClick={() => { setSelected(c); setShowDrawer(true); setOpenMenuId(null); }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                <ChevronRight size={14} />
                                Quick View
                              </button>
                              {perms.edit && (
                                <button
                                  onClick={() => { setSelected(c); setShowEdit(true); setOpenMenuId(null); }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                  <Edit2 size={14} />
                                  Edit
                                </button>
                              )}
                              <button
                                onClick={() => { setSelected(c); setShowStatus(true); setOpenMenuId(null); }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                <CircleDot size={14} />
                                Change Status
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => { setSelected(c); setShowDelete(true); setOpenMenuId(null); }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                  <Trash2 size={14} />
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
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
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Page {pagination.page} of {pagination.total_pages} · {pagination.total} total</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
            <Button size="sm" variant="outline" disabled={page >= pagination.total_pages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        loading={exporting}
        title="Export Closures"
      />

      {/* Modals */}
      {showCreate && (
        <ClosureFormModal leads={leads} projects={projects} managers={managers}
          onClose={() => setShowCreate(false)} onSuccess={() => { fetchClosures(); fetchSummary() }} />
      )}
      {showEdit && selected && (
        <ClosureFormModal closure={selected} leads={leads} projects={projects} managers={managers}
          onClose={() => setShowEdit(false)} onSuccess={() => { fetchClosures(); fetchSummary() }} />
      )}
      {showStatus && selected && (
        <StatusChangeModal closure={selected}
          onClose={() => setShowStatus(false)} onSuccess={() => { fetchClosures(); fetchSummary() }} />
      )}
      {showDrawer && selected && (
        <ClosureDrawer closure={selected} onClose={() => setShowDrawer(false)} />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDelete}
        onClose={() => { setShowDelete(false); setSelected(null) }}
        onConfirm={handleDeleteClosure}
        title="Delete Closure"
        message={`Delete the closure for "${selected?.lead_name || selected?.['lead name'] || 'this lead'}"? This cannot be undone.`}
        confirmText="Delete Closure"
        loading={deleting}
      />
    </div>
  )
}
