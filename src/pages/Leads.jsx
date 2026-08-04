import { useState, useEffect, useRef, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Eye, Edit2, UserCheck, RefreshCw, Trash2, MapPin, Download, ArrowRightCircle, CalendarPlus, PhoneCall, Phone, Loader2, AlertCircle, CheckCircle2, Upload, FileSpreadsheet, X, Users, Mic, MicOff, Play, Pause, Trash, Clock, CalendarClock, Settings2, MoreVertical } from 'lucide-react'
import { fetchLeads, fetchMyLeads, createLead, updateLead, deleteLead, bulkDeleteLeads, fetchLeadSources, clearLeadError, fetchLeadStatuses, fetchLeadConfigurations } from '../store/leadSlice'
import { fetchTeamTree } from '../store/userSlice'
import { useModulePermissions } from '../hooks/usePermission'
import { fetchProjects } from '../store/projectSlice'
import ListSkeleton from '../components/loaders/ListSkeleton'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import api from '../api/axios'
import Avatar from '../components/ui/Avatar'
import Modal from '../components/ui/Modal'
import ExportModal from '../components/ui/ExportModal'
import ConfirmModal from '../components/ui/ConfirmModal'
import CustomSelect from '../components/ui/CustomSelect'
import ClockPicker from '../components/ui/ClockPicker'
import DatePicker from '../components/ui/DatePicker'
import DateTimePicker from '../components/ui/DateTimePicker'
import AsyncSearchSelect from '../components/ui/AsyncSearchSelect'
import PhoneActions from '../components/ui/PhoneActions'
import PageSizeSelect, { resolvePerPage } from '../components/ui/PageSizeSelect'
import ConvertLeadModal from '../components/modals/ConvertLeadModal'
import ConvertToRevisitModal from '../components/modals/ConvertToRevisitModal'
import LeadStatusManagementModal from '../components/modals/LeadStatusManagementModal'
import LeadSourceManagementModal from '../components/modals/LeadSourceManagementModal'
import LeadConfigurationManagementModal from '../components/modals/LeadConfigurationManagementModal'
import { EoiDocumentsSection } from './LeadDetail'

const leadStages = [
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
const stageOptions = leadStages

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

const configurationOptions = [
  { value: '1RK', label: '1RK' },
  { value: '1BHK', label: '1BHK' },
  { value: '2BHK', label: '2BHK' },
  { value: '3BHK', label: '3BHK' },
  { value: '4BHK', label: '4BHK' },
  { value: 'Penta House / Duplex', label: 'Penta House / Duplex' },
  { value: 'Commercial shop', label: 'Commercial shop' },
  { value: 'Office space', label: 'Office space' },
]

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const defaultForm = {
  name: '', phone: '', alternate_phone_number: '', email: '',
  source: '', source_id: '', project_id: '', project_name: '',
  assigned_to: '', budget: '', location_preference: '', configuration: [],
  notes: '', status: 'new',
  callback_time: '', next_followup_time: '',
  photos: [], payment_proof_url: '', payment_proof_amount: '',
  // Shown only when status is set to site_visit_scheduled
  visit_date: '', visit_time: '10:00', transport_arranged: false,
  // Shown only when status is set to follow_up
  followup_title: '', due_date: '', due_time: '10:00', priority: 'medium',
}

// ─── CallRecordingsManager ────────────────────────────────────────────────────
function CallRecordingsManager({ mode, leadId, pending, setPending, existingRecs, onExistingChange }) {
  const ic = 'w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm'
  const [uploading,  setUploading]  = useState(false)
  const [recording,  setRecording]  = useState(false)
  const [duration,   setDuration]   = useState(0)
  const [error,      setError]      = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [editIdx,    setEditIdx]    = useState(null)
  const [metaPhone,  setMetaPhone]  = useState('')
  const [metaName,   setMetaName]   = useState('')
  const [playingUrl, setPlayingUrl] = useState(null)
  const mediaRef  = useRef(null)
  const chunksRef = useRef([])
  const timerRef  = useRef(null)
  const audioRef  = useRef(null)
  const fileRef   = useRef(null)
  const fmtDur = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const startRecording = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
      const mr = new MediaRecorder(stream, { mimeType: mime })
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        clearInterval(timerRef.current)
        const blob = new Blob(chunksRef.current, { type: mime })
        const ext  = mime.includes('webm') ? 'webm' : 'ogg'
        await handleFileReady(blob, `recording_${Date.now()}.${ext}`)
      }
      mr.start()
      mediaRef.current = mr
      setRecording(true)
      setDuration(0)
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
    } catch {
      setError('Microphone access denied.')
    }
  }

  const stopRecording = () => { mediaRef.current?.stop(); setRecording(false) }

  const handleFileReady = async (fileOrBlob, filename) => {
    setError('')
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('voice_recording', fileOrBlob, filename)
      const res = await api.post('/leads/upload-recording', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const { url, filename: savedName } = res.data.data
      const blobUrl = fileOrBlob instanceof Blob ? URL.createObjectURL(fileOrBlob) : null
      if (mode === 'add') {
        setPending(prev => [...prev, { url, phone_number: '', name: savedName || filename, _blobUrl: blobUrl }])
      } else {
        await api.post(`/leads/${leadId}/call-recordings`, {
          call_recording: [{ url, name: savedName || filename, phone_number: '' }],
        })
        onExistingChange?.()
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const onFileInput = async e => {
    const f = e.target.files?.[0]
    if (!f) return
    e.target.value = ''
    await handleFileReady(f, f.name)
  }

  const deleteExisting = async recId => {
    setDeletingId(recId)
    try {
      await api.delete(`/leads/${leadId}/call-recordings/${recId}`)
      onExistingChange?.()
    } catch (e) {
      setError(e.response?.data?.message || 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  const removePending = idx => setPending(prev => prev.filter((_, i) => i !== idx))

  const openMeta = (idx, phone, name) => { setEditIdx(idx); setMetaPhone(phone || ''); setMetaName(name || '') }
  const saveMeta = () => {
    if (mode === 'add') {
      setPending(prev => prev.map((r, i) => i === editIdx ? { ...r, phone_number: metaPhone, name: metaName } : r))
    }
    setEditIdx(null)
  }

  const togglePlay = url => {
    if (playingUrl === url) {
      audioRef.current?.pause()
      setPlayingUrl(null)
    } else {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
      const a = new Audio(url)
      a.onended = () => setPlayingUrl(null)
      a.play()
      audioRef.current = a
      setPlayingUrl(url)
    }
  }

  const RecCard = ({ url, phone, name, playUrl, onPlay, onDelete, onEdit, deleting }) => (
    <div className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-[#141414] rounded-xl border border-gray-100 dark:border-gray-800">
      <button type="button" onClick={onPlay}
        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${playingUrl === playUrl ? 'bg-brand text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-brand hover:text-white'}`}>
        {playingUrl === playUrl ? <Pause size={11} /> : <Play size={11} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{name || 'Recording'}</p>
        {phone && <p className="text-[11px] text-gray-400">{phone}</p>}
      </div>
      <button type="button" onClick={onEdit} className="p-1 rounded-lg text-gray-400 hover:text-brand transition-colors">
        <Edit2 size={11} />
      </button>
      <button type="button" onClick={onDelete} disabled={deleting} className="p-1 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
        {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash size={11} />}
      </button>
    </div>
  )

  const recs = mode === 'edit' ? existingRecs : pending

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
          Call Recordings <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        {recs.length > 0 && <span className="text-[11px] text-gray-400">{recs.length} recording{recs.length > 1 ? 's' : ''}</span>}
      </div>

      {recs.length > 0 && (
        <div className="space-y-1.5">
          {mode === 'edit'
            ? existingRecs.map(rec => (
                <RecCard key={rec.id}
                  url={rec.url} phone={rec.phone_number} name={rec.name} playUrl={rec.url}
                  onPlay={() => togglePlay(rec.url)}
                  onDelete={() => deleteExisting(rec.id)}
                  onEdit={() => openMeta(rec.id, rec.phone_number, rec.name)}
                  deleting={deletingId === rec.id} />
              ))
            : pending.map((rec, idx) => (
                <RecCard key={idx}
                  url={rec._blobUrl || rec.url} phone={rec.phone_number} name={rec.name}
                  playUrl={rec._blobUrl || rec.url}
                  onPlay={() => togglePlay(rec._blobUrl || rec.url)}
                  onDelete={() => removePending(idx)}
                  onEdit={() => openMeta(idx, rec.phone_number, rec.name)}
                  deleting={false} />
              ))
          }
        </div>
      )}

      {editIdx !== null && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl space-y-2">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Edit recording details</p>
          <input value={metaName} onChange={e => setMetaName(e.target.value)} placeholder="Label e.g. First call - Suresh" className={ic} />
          <input value={metaPhone} onChange={e => setMetaPhone(e.target.value)} placeholder="Phone e.g. +919876543210" className={ic} />
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditIdx(null)} className="flex-1 py-1.5 text-xs text-gray-500 border border-gray-200 dark:border-gray-700 rounded-lg">Cancel</button>
            <button type="button" onClick={saveMeta} className="flex-1 py-1.5 text-xs font-semibold bg-brand text-white rounded-lg">Save</button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {/* {recording ? (
          <button type="button" onClick={stopRecording}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white rounded-xl animate-pulse">
            <MicOff size={12} /> Stop · {fmtDur(duration)}
          </button>
        ) : (
          <button type="button" onClick={startRecording} disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-brand hover:text-brand rounded-xl disabled:opacity-50">
            <Mic size={12} /> Record
          </button>
        )} */}
        <label className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-brand hover:text-brand rounded-xl cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          {uploading ? 'Uploading…' : 'Upload file'}
          <input ref={fileRef} type="file" accept="audio/*,.webm,.ogg,.mp3,.wav,.aac,.m4a" className="hidden" onChange={onFileInput} />
        </label>
      </div>

      {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg">{error}</p>}
      {mode === 'add' && pending.length > 0 && (
        <p className="text-[11px] text-gray-400">{pending.length} recording{pending.length > 1 ? 's' : ''} will be attached when you save the lead.</p>
      )}
    </div>
  )
}

// ─── LeadFileManager (Photos / Payment Proof) ──────────────────────────────────
function LeadFileManager({ label, items, onChange, uploadUrl, fieldName, accept, showAmount = false }) {
  const ic = 'w-full px-2.5 py-1.5 text-xs bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-lg outline-none focus:border-brand text-gray-900 dark:text-gray-100'
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState('')

  const onFileInput = async e => {
    const f = e.target.files?.[0]
    if (!f) return
    e.target.value = ''
    setError('')
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append(fieldName, f)
      const res = await api.post(uploadUrl, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      const { url, filename } = res.data.data || {}
      onChange([...items, { url, name: filename || f.name, ...(showAmount ? { amount: '' } : {}) }])
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const updateItem = (idx, patch) => onChange(items.map((it, i) => i === idx ? { ...it, ...patch } : it))
  const removeItem = idx => onChange(items.filter((_, i) => i !== idx))

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
          {label} <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        {items.length > 0 && <span className="text-[11px] text-gray-400">{items.length} file{items.length > 1 ? 's' : ''}</span>}
      </div>

      {items.length > 0 && (
        <div className="space-y-1.5">
          {items.map((it, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-[#141414] rounded-xl border border-gray-100 dark:border-gray-800">
              <a href={it.url} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <img src={it.url} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none' }} />
              </a>
              <input value={it.name || ''} onChange={e => updateItem(idx, { name: e.target.value })} placeholder="Label" className={ic + ' flex-1'} />
              {showAmount && (
                <input value={it.amount || ''} onChange={e => updateItem(idx, { amount: e.target.value })} placeholder="Amount" className={ic + ' w-24'} />
              )}
              <button type="button" onClick={() => removeItem(idx)} className="p-1 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                <Trash size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <label className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-brand hover:text-brand rounded-xl cursor-pointer w-fit ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
        {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
        {uploading ? 'Uploading…' : `Upload ${label}`}
        <input type="file" accept={accept} className="hidden" onChange={onFileInput} />
      </label>

      {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg">{error}</p>}
    </div>
  )
}

// ─── PaymentProofManager (Single URL + Amount) ─────────────────────────────────
function PaymentProofManager({ url, amount, onUrlChange, onAmountChange }) {
  const ic = 'w-full px-2.5 py-1.5 text-xs bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-lg outline-none focus:border-brand text-gray-900 dark:text-gray-100'
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState('')

  const onFileInput = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    e.target.value = ''
    setError('')
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('payment_proof', f)
      const res = await api.post('/upload/payment-proof', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      const { url: newUrl } = res.data.data || {}
      onUrlChange(newUrl)
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
          Payment Proof <span className="text-gray-400 font-normal">(optional)</span>
        </label>
      </div>

      {/* Uploaded Document Preview */}
      {url && (
        <div className="space-y-1">
          <label className="block text-[10px] font-medium text-gray-400">Document</label>
          <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-[#141414] rounded-xl border border-gray-100 dark:border-gray-800">
            <a href={url} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <img src={url} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none' }} />
            </a>
            <a href={url} target="_blank" rel="noreferrer" className="flex-1 text-xs text-brand hover:underline truncate">
              View payment proof
            </a>
            <button type="button" onClick={() => onUrlChange('')} className="p-1 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
              <Trash size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Amount Field */}
      <div className="space-y-1">
        <label className="block text-[10px] font-medium text-gray-400">Amount</label>
        <input 
          value={amount || ''} 
          onChange={e => onAmountChange(e.target.value)} 
          placeholder="Amount" 
          className={ic} 
        />
      </div>

      {/* Upload Button */}
      <label className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-brand hover:text-brand rounded-xl cursor-pointer w-fit ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
        {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
        {uploading ? 'Uploading…' : 'Upload Payment Proof'}
        <input type="file" accept="image/*,.pdf" className="hidden" onChange={onFileInput} />
      </label>

      {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg">{error}</p>}
    </div>
  )
}

// ─── LeadForm ─────────────────────────────────────────────────────────────────
function LeadForm({ formData, setFormData, isEdit, sourceList, configOptions, stageOptions, teamMembers = [], projects, currentUser, leadId, pendingRecordings, setPendingRecordings, existingRecordings, onExistingChange }) {
  const inputClass = 'w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm transition-all duration-200'
  const labelClass = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'
  const isRestricted = ['sales_executive', 'external_caller'].includes(currentUser?.role)
  const sourceOptions = sourceList.map(s => ({ value: s.id, label: s.name }))
  const ROLE_LABEL = { super_admin: 'Super Admin', admin: 'Admin', associate_partner: 'Associate Partner', cluster_head: 'Cluster Head', partner: 'Partner', team_leader: 'Team Leader', sales_manager: 'Sales Manager', sales_executive: 'Sales Executive', external_caller: 'External Caller' }
  const execOptions   = [
    ...(currentUser ? [{ value: currentUser.id, label: `Self · ${ROLE_LABEL[currentUser.role] || currentUser.role}` }] : []),
    ...teamMembers.filter(u => u.id !== currentUser?.id && !u.is_self).map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name} · ${ROLE_LABEL[u.role] || u.role}` }))
  ]
  const projectOptions = projects.map(p => ({ value: p.id, label: p.name || p.project_name }))
  const searchProjects = async (q) => {
    const res = await api.get('/projects', { params: { search: q, per_page: 20 } })
    return (res.data.data || []).map(p => ({ value: p.id, label: `${p.name}${p.city ? ` — ${p.city}` : ''}` }))
  }

  useEffect(() => {
    if (isRestricted && !formData.assigned_to && currentUser?.id) {
      setFormData(prev => ({ ...prev, assigned_to: currentUser.id }))
    }
  }, [isRestricted, currentUser?.id])

  return (
    <div className="space-y-4">
      {/* Name + Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Full Name *</label>
          <input required value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="Suresh Patel" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Phone *</label>
          <input required value={formData.phone} onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))} placeholder="+919876543210" className={inputClass} />
        </div>
      </div>

      {/* Alt Phone + Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Alternate Phone</label>
          <input value={formData.alternate_phone_number} onChange={e => setFormData(prev => ({ ...prev, alternate_phone_number: e.target.value }))} placeholder="+919876543211" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input type="email" value={formData.email} onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))} placeholder="suresh.patel@gmail.com" className={inputClass} />
        </div>
      </div>

      {/* Budget + Location + Configuration */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Budget</label>
          <input value={formData.budget} onChange={e => setFormData(prev => ({ ...prev, budget: e.target.value }))} placeholder="80-100L" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Finding Location</label>
          <div className="relative">
            <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={formData.location_preference} onChange={e => setFormData(prev => ({ ...prev, location_preference: e.target.value }))} placeholder="Andheri West" className={inputClass + ' pl-8'} />
          </div>
        </div>
      </div>

      {/* Configuration (Multi-select) */}
      <div>
        <CustomSelect
          label="Configuration"
          value={formData.configuration}
          onChange={val => setFormData(prev => ({ ...prev, configuration: val }))}
          options={configOptions}
          placeholder="Select configuration(s)"
          multiple
        />
      </div>
      
      {/* Project Name — autocomplete with plain-text fallback when no results */}
      <div>
        <AsyncSearchSelect
          label="Project Name"
          value={formData.project_id}
          onChange={val => setFormData(prev => ({ ...prev, project_id: val, project_name: '' }))}
          onTextChange={text => setFormData(prev => ({ ...prev, project_name: text }))}
          onSearch={searchProjects}
          initialOptions={projectOptions.slice(0, 20)}
          placeholder="Type to search projects..."
          fallbackToInput
          defaultText={formData.project_id ? '' : (formData.project_name || '')}
        />
      </div>

      {/* Callback + Follow-up */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DateTimePicker
          label="Callback Time"
          value={formData.callback_time}
          onChange={val => setFormData(prev => ({ ...prev, callback_time: val }))}
        />
        <DateTimePicker
          label="Next Follow-up"
          value={formData.next_followup_time}
          onChange={val => setFormData(prev => ({ ...prev, next_followup_time: val }))}
        />
      </div>

      {/* Source + Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CustomSelect
          label="Lead Source"
          value={(() => {
            // Try to find source by ID first, then by name
            if (formData.source_id) {
              const hasMatchingId = sourceOptions.some(opt => opt.value === formData.source_id)
              if (hasMatchingId) return formData.source_id
            }
            if (formData.source) {
              const matchedOpt = sourceOptions.find(opt =>
                opt.label.toLowerCase() === formData.source.toLowerCase()
              )
              if (matchedOpt) return matchedOpt.value
            }
            return ''
          })()}
          onChange={val => {
            const selected = sourceList.find(s => s.id === val)
            setFormData(prev => ({ ...prev, source_id: selected?.id || val, source: selected?.name || val }))
          }}
          options={sourceOptions}
          placeholder="Select Platform"
        />
        <CustomSelect label="Status" value={formData.status} onChange={val => setFormData(prev => ({ ...prev, status: val }))} options={stageOptions} placeholder="Select status" />
      </div>

      {/* Site Visit Details — shown when status is set to Site Visit Scheduled.
          Submitting schedules an actual site visit via the same API the
          Site Visits page uses, instead of just changing the status label. */}
      {formData.status === 'site_visit_scheduled' && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl space-y-3">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">📅 Site Visit Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DatePicker
              label="Visit Date"
              required
              value={formData.visit_date}
              onChange={val => setFormData(prev => ({ ...prev, visit_date: val }))}
              min={new Date().toISOString().split('T')[0]}
            />
            <ClockPicker
              label="Visit Time"
              value={formData.visit_time}
              onChange={val => setFormData(prev => ({ ...prev, visit_time: val }))}
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
            <input type="checkbox" checked={formData.transport_arranged}
              onChange={e => setFormData(prev => ({ ...prev, transport_arranged: e.target.checked }))}
              className="w-4 h-4 accent-brand rounded" />
            Transport arranged for client
          </label>
        </div>
      )}

      {/* Follow-up Details — shown when status is set to Follow-up. Submitting
          creates an actual follow-up task via the same API the Follow-ups
          page uses, instead of just changing the status label. */}
      {formData.status === 'follow_up' && (
        <div className="p-3 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/30 rounded-xl space-y-3">
          <p className="text-xs font-semibold text-purple-700 dark:text-purple-400">📞 Follow-up Details</p>
          <div>
            <label className={labelClass}>Task Title</label>
            <input value={formData.followup_title} onChange={e => setFormData(prev => ({ ...prev, followup_title: e.target.value }))}
              placeholder={`Follow up with ${formData.name || 'lead'}`} className={inputClass} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DatePicker
              label="Due Date"
              required
              value={formData.due_date}
              onChange={val => setFormData(prev => ({ ...prev, due_date: val }))}
              min={new Date().toISOString().split('T')[0]}
            />
            <ClockPicker
              label="Due Time"
              value={formData.due_time}
              onChange={val => setFormData(prev => ({ ...prev, due_time: val }))}
            />
          </div>
          <CustomSelect label="Priority" value={formData.priority}
            onChange={val => setFormData(prev => ({ ...prev, priority: val }))}
            options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]} />
        </div>
      )}

      {/* Assign To */}
      <div>
        {isRestricted ? (
          <div>
            <label className={labelClass}>Assign To</label>
            <input readOnly value={`${currentUser?.first_name ?? ''} ${currentUser?.last_name ?? ''}`.trim()} className={inputClass + ' cursor-not-allowed opacity-60 bg-gray-50 dark:bg-gray-800/40'} />
          </div>
        ) : (
          <CustomSelect label="Assign To" value={formData.assigned_to} onChange={val => setFormData(prev => ({ ...prev, assigned_to: val }))} options={execOptions} placeholder="Select team member" searchable />
        )}
      </div>

      {/* Remark */}
      <div>
        <label className={labelClass}>Remark</label>
        <textarea rows={3} value={formData.notes} onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Client is looking for 2BHK in a gated community." className={inputClass} />
      </div>

      {/* EOI Documents — only relevant once the lead has reached the EOI stage */}
      {formData.status === 'eoi' && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-xl space-y-4">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">📋 EOI Documents</p>

          {/* EOI Front Page Photo */}
          <LeadFileManager
            label="EOI Front Page Photo"
            items={formData.photos || []}
            onChange={items => setFormData(prev => ({ ...prev, photos: items }))}
            uploadUrl="/leads/upload-photo"
            fieldName="photo"
            accept="image/jpeg,image/png,image/webp"
          />

          {/* Payment Proof */}
          <PaymentProofManager
            url={formData.payment_proof_url}
            amount={formData.payment_proof_amount}
            onUrlChange={(url) => setFormData(prev => ({ ...prev, payment_proof_url: url }))}
            onAmountChange={(amount) => setFormData(prev => ({ ...prev, payment_proof_amount: amount }))}
          />
        </div>
      )}

      {/* Call Recordings */}
      <CallRecordingsManager
        mode={isEdit ? 'edit' : 'add'}
        leadId={leadId}
        pending={pendingRecordings || []}
        setPending={setPendingRecordings || (() => {})}
        existingRecs={existingRecordings || []}
        onExistingChange={onExistingChange}
      />
    </div>
  )
}


// ─── Closing Manager Modal ────────────────────────────────────────────────────
function ClosingManagerModal({ lead, onClose, onSuccess }) {
  const [closingPerson, setClosingPerson] = useState(lead.closing_person || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!closingPerson.trim()) { setError('Please enter the closing manager name'); return }
    setLoading(true); setError('')
    try {
      await api.patch(`/leads/${lead.id}/closing-manager`, { closing_person: closingPerson.trim() })
      onSuccess()
      onClose()
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to set closing manager')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} title={lead.closing_person ? 'Edit Closing Manager' : 'Add Closing Manager'} size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30">
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <UserCheck size={18} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Closing Manager for <span className="text-brand">{lead.name}</span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              This person will handle the final negotiation and closing for this lead.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">
            Closing Manager Name *
          </label>
          <input
            autoFocus
            value={closingPerson}
            onChange={e => setClosingPerson(e.target.value)}
            placeholder="e.g. Priya Mehta"
            className="w-full px-4 py-3.5 text-sm bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-2xl outline-none focus:border-brand focus:ring-4 focus:ring-brand/5 transition-all text-gray-900 dark:text-gray-100 font-semibold"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
            <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1 rounded-2xl py-3" onClick={onClose}>Cancel</Button>
          <Button type="button" className="flex-1 rounded-2xl py-3 font-bold" loading={loading} onClick={handleSave}>
            {lead.closing_person ? 'Update' : 'Add'} Closing Manager
          </Button>
        </div>
      </div>
    </Modal>
  )
}


// Shows full number (clickable) if admin.
// Shows masked + View button for others.
// Shows last 5 digits when View is clicked.
function PhoneCell({ lead, canSeePhone, visiblePhoneLeadId, setVisiblePhoneLeadId }) {
  if (canSeePhone) {
    return (
      <div className="flex flex-col gap-0.5">
        <PhoneActions phone={lead.phone} email={lead.email}>
          <span className="text-brand hover:underline font-medium text-sm">{lead.phone}</span>
        </PhoneActions>
        {lead.alternate_phone_number && (
          <span className="text-[10px] text-gray-400">Alt: {lead.alternate_phone_number}</span>
        )}
      </div>
    )
  }

  if (visiblePhoneLeadId === lead.id) {
    return (
      <div className="flex flex-col gap-1">
        <PhoneActions phone={lead.phone} email={lead.email}>
          <span className="text-brand hover:underline font-medium text-sm">{lead.phone}</span>
        </PhoneActions>
        {lead.alternate_phone_number && (
          <span className="text-[10px] text-gray-400">Alt: {lead.alternate_phone_number}</span>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-gray-500 dark:text-gray-400">*****{lead.phone?.slice(-5)}</span>
      <button onClick={() => setVisiblePhoneLeadId(lead.id)}
        className="text-[11px] font-semibold text-brand hover:text-brand/80 flex items-center gap-1 w-fit transition-colors">
        <Eye size={11}/> View
      </button>
    </div>
  )
}

function BulkUploadModal({ onClose, onSuccess, teamMembers = [], currentUser = null }) {
  const [step,       setStep]      = useState('upload')  // upload | result
  const [file,       setFile]      = useState(null)
  const [dragging,   setDragging]  = useState(false)
  const [uploading,  setUploading] = useState(false)
  const [dlding,     setDlding]    = useState(false)
  const [error,      setError]     = useState('')
  const [result,     setResult]    = useState(null)

  // Pre-upload assignment (sent with the file to the API)
  // For sales_exec / external_caller: always assign to themselves
  const isSelfAssign = ['sales_executive', 'external_caller'].includes(currentUser?.role)
  const [assignTo,       setAssignTo]     = useState(isSelfAssign ? (currentUser?.id || '') : '')
  const [assignReason,   setAssignReason] = useState('')

  const fileRef = useRef(null)

  const downloadTemplate = async () => {
    try {
      setDlding(true)
      const r = await api.get('/leads/bulk/template', { responseType: 'blob' })
      const u = URL.createObjectURL(r.data)
      const a = document.createElement('a'); a.href = u; a.download = 'Lead_Bulk_Upload_Template.xlsx'
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u)
    } catch { setError('Failed to download template') } finally { setDlding(false) }
  }

  const handleFile = (f) => {
    if (!f) return
    const ok = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    if (!ok.includes(f.type)) { setError('Only .xlsx or .xls files are allowed'); return }
    if (f.size > 10 * 1024 * 1024) { setError('File must be under 10 MB'); return }
    setError(''); setFile(f)
  }

  const handleUpload = async () => {
    if (!file) { setError('Please select a file first'); return }
    setError(''); setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      // Pass assign_to UUID so the API assigns every imported lead immediately
      if (assignTo) fd.append('assign_to', assignTo)

      const r = await api.post('/leads/bulk/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(r.data.data)
      setStep('result')
    } catch (e) {
      setError(e.response?.data?.message || 'Upload failed. Check your file.')
    } finally { setUploading(false) }
  }

  const downloadResult = async () => {
    if (!result?.resultFile) return
    const fname = result.resultFile.split('/').pop()
    try {
      const r = await api.get(`/leads/bulk/result/${fname}`, { responseType: 'blob' })
      const u = URL.createObjectURL(r.data)
      const a = document.createElement('a'); a.href = u; a.download = fname
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u)
    } catch { setError('Failed to download result file') }
  }

  const assignedUser = teamMembers.find(u => u.id === assignTo)

  return (
    <Modal isOpen={true} onClose={onClose} title="Bulk Upload Leads" size="md">
      {step === 'upload' ? (
        <div className="space-y-4">

          {/* Step 1 — Download template */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/40">
            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">1</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Download the template</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Template has real project names &amp; team members from your system.
                You can also fill the <span className="font-semibold">Assign To</span> column per-row in Excel.
              </p>
              <button onClick={downloadTemplate} disabled={dlding}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-60 transition-colors">
                {dlding ? <Loader2 size={12} className="animate-spin"/> : <Download size={12}/>}
                {dlding ? 'Downloading…' : 'Download Template (.xlsx)'}
              </button>
            </div>
          </div>

          {/* Step 2 — Upload file */}
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-gray-500">2</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Select your filled Excel</p>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]) }}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                  dragging ? 'border-brand bg-brand/5'
                  : file    ? 'border-green-400 bg-green-50 dark:bg-green-900/10'
                            : 'border-gray-200 dark:border-gray-700 hover:border-brand hover:bg-brand/5'
                }`}>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
                  onChange={e => handleFile(e.target.files?.[0])}/>
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <FileSpreadsheet size={18} className="text-green-600"/>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{file.name}</p>
                      <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button type="button" onClick={e => { e.stopPropagation(); setFile(null) }}
                      className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 hover:bg-red-100 hover:text-red-500 transition-colors">
                      <X size={12}/>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-11 h-11 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-2">
                      <Upload size={18} className="text-gray-400"/>
                    </div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Drag & drop your Excel file here</p>
                    <p className="text-xs text-gray-400 mt-0.5">or click to browse · .xlsx / .xls · max 10 MB</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Step 3 — Assign leads */}
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">3</span>
            </div>
            <div className="flex-1">
              {isSelfAssign ? (
                /* sales_executive / external_caller — auto-assigned to themselves */
                <>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    Assign all leads to
                  </p>
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800/40 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">
                        {currentUser?.first_name?.[0]}{currentUser?.last_name?.[0]}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {currentUser?.first_name} {currentUser?.last_name}
                        <span className="ml-2 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded-full capitalize">
                          {currentUser?.role?.replace(/_/g, ' ')}
                        </span>
                      </p>
                      <p className="text-xs text-gray-400">All uploaded leads will be assigned to you</p>
                    </div>
                    <CheckCircle2 size={16} className="ml-auto text-indigo-500 flex-shrink-0"/>
                  </div>
                </>
              ) : (
                /* admin / sales_manager — choose who to assign to */
                <>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Assign all leads to <span className="font-normal text-gray-400">(optional)</span>
                  </p>
                  <p className="text-xs text-gray-500 mb-2">
                    Overrides the Assign To column in Excel — all leads go to this person.
                    Leave empty to use per-row assignment from Excel or keep unassigned.
                  </p>
                  {(() => {
                    const isAdminCaller = ['admin', 'super_admin'].includes(currentUser?.role)
                    const filtered = teamMembers.filter(u => !u.is_self)
                    if (filtered.length === 0) {
                      return (
                        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-xl px-3 py-2.5">
                          <AlertCircle size={13} className="text-amber-500 flex-shrink-0"/>
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            No team members found.
                          </p>
                        </div>
                      )
                    }
                    const groups = isAdminCaller ? [
                      { label: 'Sales Managers',   role: 'sales_manager'   },
                      { label: 'Sales Executives',  role: 'sales_executive'  },
                      { label: 'External Callers',  role: 'external_caller'  },
                    ] : [{ label: 'Your Team Members', role: null }]
                    const options = []
                    groups.forEach(g => {
                      const members = g.role ? filtered.filter(u => u.role === g.role) : filtered
                      if (!members.length) return
                      options.push({ value: `__hdr_${g.role || 'team'}`, label: `── ${g.label} ──`, disabled: true })
                      members.forEach(u => options.push({ value: u.id, label: `${u.first_name} ${u.last_name}` }))
                    })
                    return (
                      <CustomSelect
                        value={assignTo}
                        onChange={v => { if (!v.startsWith('__hdr_')) setAssignTo(v) }}
                        options={options}
                        placeholder="Select team member (optional)"
                      />
                    )
                  })()}
                </>
              )}
              {assignTo && (
                <div className="mt-2 flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 rounded-xl px-3 py-2">
                  <Users size={12} className="text-indigo-500 flex-shrink-0"/>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400">
                    All imported leads will be assigned to <span className="font-semibold">{assignedUser?.first_name} {assignedUser?.last_name}</span>
                  </p>
                  <button onClick={() => setAssignTo('')} className="ml-auto text-indigo-400 hover:text-indigo-600">
                    <X size={11}/>
                  </button>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0"/>
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={handleUpload} loading={uploading}
              disabled={!file || uploading} icon={!uploading ? Upload : undefined}>
              {uploading ? 'Uploading…' : assignTo ? `Upload & Assign to ${assignedUser?.first_name}` : 'Upload & Import'}
            </Button>
          </div>
        </div>

      ) : (
        /* ── Result screen ── */
        <div className="space-y-4">

          {/* Success header */}
          <div className="flex flex-col items-center gap-2 py-2">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
              result?.errors === 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-amber-50 dark:bg-amber-900/20'
            }`}>
              <CheckCircle2 size={28} className={result?.errors === 0 ? 'text-green-500' : 'text-amber-500'}/>
            </div>
            <p className="text-base font-bold text-gray-900 dark:text-white">Upload Complete</p>
            <p className="text-xs text-gray-400">
              {result?.inserted} of {result?.total} leads imported
              {result?.summary?.insertedLeads?.filter(l => l.assigned_to).length > 0 &&
                ` · ${result.summary.insertedLeads.filter(l => l.assigned_to).length} assigned`}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Inserted', val: result?.inserted, c: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
              { label: 'Skipped',  val: result?.skipped,  c: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
              { label: 'Errors',   val: result?.errors,   c: 'text-red-600 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-900/20' },
            ].map(x => (
              <div key={x.label} className={`rounded-xl px-4 py-3 text-center ${x.bg}`}>
                <p className={`text-2xl font-bold ${x.c}`}>{x.val ?? 0}</p>
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mt-0.5">{x.label}</p>
              </div>
            ))}
          </div>

          {/* Assignment summary */}
          {result?.inserted > 0 && (() => {
            const assignedCount   = result?.summary?.insertedLeads?.filter(l => l.assigned_to).length || 0
            const unassignedCount = (result?.inserted || 0) - assignedCount
            return assignedCount > 0 ? (
              <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                  <Users size={14} className="text-indigo-600 dark:text-indigo-400"/>
                </div>
                <div>
                  <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                    {assignedCount} lead{assignedCount > 1 ? 's' : ''} assigned
                    {assignedUser ? ` to ${assignedUser.first_name} ${assignedUser.last_name}` : ''}
                  </p>
                  {unassignedCount > 0 && (
                    <p className="text-[10px] text-indigo-400">{unassignedCount} left unassigned</p>
                  )}
                </div>
              </div>
            ) : null
          })()}

          {/* Sample errors */}
          {result?.summary?.errors?.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/40 rounded-xl p-3">
              <p className="text-xs font-semibold text-red-600 mb-1.5">Sample errors:</p>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {result.summary.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-500">Row {e.row}: {e.error}</p>
                ))}
              </div>
            </div>
          )}

          {/* Skipped */}
          {result?.summary?.skipped?.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/40 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-600 mb-1.5">Skipped (duplicate phones):</p>
              <div className="space-y-1 max-h-16 overflow-y-auto">
                {result.summary.skipped.map((s, i) => (
                  <p key={i} className="text-xs text-amber-500">Row {s.row}: {s.phone}</p>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {result?.resultFile && (
              <Button variant="outline" className="flex-1" icon={Download} onClick={downloadResult}>
                Download Result
              </Button>
            )}
            <Button className="flex-1" onClick={() => { onSuccess(); onClose() }}>
              Done
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}


// ─── Single Reassign Modal (uses /leads/:id/reassign) ─────────────────────────
function ReassignModal({ lead, teamMembers = [], currentUser, onClose, onSuccess }) {
  const [assignTo,setAssignTo]=useState(lead?.assigned_to?.id||(typeof lead?.assigned_to==='string'?lead.assigned_to:''))
  const [reason,setReason]=useState('')
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const [success,setSuccess]=useState('')
  const IC="w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm"
  const LC="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
  const curName=typeof lead?.assigned_to==='object'?lead.assigned_to?.full_name:teamMembers.find(u=>u.id===lead?.assigned_to)?`${teamMembers.find(u=>u.id===lead.assigned_to).first_name} ${teamMembers.find(u=>u.id===lead.assigned_to).last_name}`:'Unassigned'
  const submit=async(e)=>{e.preventDefault();if(!assignTo){setError('Please select a team member');return}setError('');setLoading(true)
    try{await api.patch(`/leads/${lead.id}/reassign`,{assigned_to:assignTo,reason:reason||undefined});setSuccess('Reassigned!');setTimeout(()=>{onSuccess();onClose()},700)}
    catch(e){setError(e.response?.data?.message||'Reassignment failed')}finally{setLoading(false)}}
  return (
    <Modal isOpen={true} onClose={onClose} title="Reassign Lead">
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-[#111] border border-gray-100 dark:border-gray-800">
          <Avatar name={lead?.name} size="sm"/>
          <div><p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{lead?.name}</p><p className="text-xs text-gray-400">{lead?.phone}</p></div>
          <div className="ml-auto text-right"><p className="text-[10px] text-gray-400">Currently assigned to</p><p className="text-xs font-medium text-gray-600 dark:text-gray-300">{curName}</p></div>
        </div>
        <CustomSelect label="Assign To *" value={assignTo} onChange={setAssignTo} options={[
          ...(currentUser ? [{ value: currentUser.id, label: `Self · ${currentUser.role.replace(/_/g,' ')}` }] : []),
          ...teamMembers.filter(u => u.id !== currentUser?.id && !u.is_self).map(u=>({value:u.id,label:`${u.first_name} ${u.last_name} · ${u.role.replace(/_/g,' ')}`}))
        ]} placeholder="Select team member" searchable />
        <div><label className={LC}>Reason <span className="font-normal text-gray-400">(optional)</span></label><input value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. Better territorial alignment" className={IC}/></div>
        {error&&<div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5"><AlertCircle size={13} className="text-red-500"/><p className="text-xs text-red-600">{error}</p></div>}
        {success&&<div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-2.5"><CheckCircle2 size={13} className="text-green-500"/><p className="text-xs text-green-600">{success}</p></div>}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" loading={loading} disabled={!assignTo}>Reassign</Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Change Status Modal (uses PATCH /leads/:id/status) ───────────────────────
function ChangeStatusModal({ lead, stageOptions, statusMap, onClose, onSuccess }) {
  const [status,  setStatus]  = useState(lead?.status || '')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')
  const currentLabel = statusMap[lead?.status?.toLowerCase()]?.label || lead?.status || 'New'

  const submit = async (e) => {
    e.preventDefault()
    if (!status || status === lead.status) return
    setError(''); setLoading(true)
    try {
      await api.patch(`/leads/${lead.id}/status`, { status })
      setSuccess('Status updated!')
      setTimeout(() => { onSuccess(status); onClose() }, 700)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Change Lead Status">
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-[#111] border border-gray-100 dark:border-gray-800">
          <Avatar name={lead?.name} size="sm"/>
          <div><p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{lead?.name}</p><p className="text-xs text-gray-400">{lead?.phone}</p></div>
          <div className="ml-auto text-right"><p className="text-[10px] text-gray-400">Current status</p><p className="text-xs font-medium text-gray-600 dark:text-gray-300">{currentLabel}</p></div>
        </div>
        <CustomSelect label="New Status *" value={status} onChange={setStatus} options={stageOptions} placeholder="Select status" />
        {error && <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5"><AlertCircle size={13} className="text-red-500"/><p className="text-xs text-red-600">{error}</p></div>}
        {success && <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-2.5"><CheckCircle2 size={13} className="text-green-500"/><p className="text-xs text-green-600">{success}</p></div>}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" loading={loading} disabled={!status || status === lead.status}>Update Status</Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Bulk Reassign Modal (uses /leads/bulk-reassign) ──────────────────────────
function BulkReassignModal({ leadIds, leads, teamMembers = [], currentUser, onClose, onSuccess }) {
  const [assignTo,setAssignTo]=useState('')
  const [reason,setReason]=useState('')
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const [result,setResult]=useState(null)
  const IC="w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm"
  const LC="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
  const sel=leads.filter(l=>leadIds.includes(l.id))
  const submit=async(e)=>{e.preventDefault();if(!assignTo){setError('Please select a team member');return}setError('');setLoading(true)
    try{const r=await api.post('/leads/bulk-reassign',{lead_ids:leadIds,assigned_to:assignTo,reason:reason||undefined});setResult(r.data.data)}
    catch(e){setError(e.response?.data?.message||'Bulk reassignment failed')}finally{setLoading(false)}}
  if(result) return (
    <Modal isOpen={true} onClose={()=>{onSuccess();onClose()}} title="Reassignment Complete">
      <div className="space-y-4 py-2">
        <div className="flex flex-col items-center gap-2"><div className="w-14 h-14 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center"><CheckCircle2 size={28} className="text-green-500"/></div><p className="text-base font-bold text-gray-900 dark:text-white">Done!</p></div>
        <div className="grid grid-cols-3 gap-3">
          {[{label:'Reassigned',val:result.successful,c:'text-green-600 dark:text-green-400',bg:'bg-green-50 dark:bg-green-900/20'},{label:'Skipped',val:result.skipped,c:'text-amber-600 dark:text-amber-400',bg:'bg-amber-50 dark:bg-amber-900/20'},{label:'Requested',val:result.totalRequested,c:'text-brand',bg:'bg-brand/5'}].map(x=>(
            <div key={x.label} className={`rounded-xl px-3 py-3 text-center ${x.bg}`}><p className={`text-2xl font-bold ${x.c}`}>{x.val??0}</p><p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mt-0.5">{x.label}</p></div>
          ))}
        </div>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-[#111] border border-gray-100 dark:border-gray-800">
          <Avatar name={result.newAssignee?.name} size="sm"/>
          <div><p className="text-xs text-gray-400">Assigned to</p><p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{result.newAssignee?.name}</p></div>
        </div>
        <Button className="w-full" onClick={()=>{onSuccess();onClose()}}>Done</Button>
      </div>
    </Modal>
  )
  return (
    <Modal isOpen={true} onClose={onClose} title={`Reassign ${leadIds.length} Lead${leadIds.length>1?'s':''}`}>
      <form onSubmit={submit} className="space-y-4">
        <div className="bg-gray-50 dark:bg-[#111] rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3">
          <p className="text-xs font-semibold text-gray-500 mb-2">{leadIds.length} lead{leadIds.length>1?'s':''} selected</p>
          <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
            {sel.slice(0,8).map(l=><span key={l.id} className="text-[10px] font-medium px-2 py-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">{l.name}</span>)}
            {sel.length>8&&<span className="text-[10px] text-gray-400 px-2 py-1">+{sel.length-8} more</span>}
          </div>
        </div>
        <CustomSelect label="Assign To *" value={assignTo} onChange={setAssignTo} options={[
          ...(currentUser ? [{ value: currentUser.id, label: `Self · ${currentUser.role.replace(/_/g,' ')}` }] : []),
          ...teamMembers.filter(u => u.id !== currentUser?.id && !u.is_self).map(u=>({value:u.id,label:`${u.first_name} ${u.last_name} · ${u.role.replace(/_/g,' ')}`}))
        ]} placeholder="Select team member" searchable />
        <div><label className={LC}>Reason <span className="font-normal text-gray-400">(optional)</span></label><input value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. Workload balancing" className={IC}/></div>
        {error&&<div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5"><AlertCircle size={13} className="text-red-500"/><p className="text-xs text-red-600">{error}</p></div>}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" loading={loading} disabled={!assignTo}>Reassign {leadIds.length} Lead{leadIds.length>1?'s':''}</Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Bulk Convert Modal (for selected leads) ─────────────────────────────────

function BulkConvertLeadModal({ leadIds, leads, onClose, onSuccess, teamMembers = [] }) {
  const [step, setStep]         = useState('choose')
  const [converting, setConverting] = useState(false)
  const [error, setError]       = useState('')
  const [results, setResults]   = useState(null)

  const { list: projectList }   = useSelector(s => s.projects)
  const { user: currentUser }   = useSelector(s => s.auth)
  const _roleLabel = { super_admin: 'Super Admin', admin: 'Admin', associate_partner: 'Associate Partner', cluster_head: 'Cluster Head', partner: 'Partner', team_leader: 'Team Leader', sales_manager: 'Sales Manager', sales_executive: 'Sales Executive', external_caller: 'External Caller' }

  const [fuForm, setFuForm] = useState({ title_suffix: 'Follow-up', due_date: '', due_time: '10:00', priority: 'medium', assigned_to: '', notes: '' })
  const [svForm, setSvForm] = useState({ project_id: '', visit_date: '', visit_time: '10:00', assigned_to: '', transport_arranged: false, notes: '' })

  const inputCls = "w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-[#0082f3] text-gray-700 dark:text-gray-300 transition-colors placeholder-gray-400"
  const labelCls = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5"
  const projectOpts = projectList.map(p => ({ value: p.id, label: `${p.name}${p.city ? ` · ${p.city}` : ''}` }))
  const userOpts    = [
    ...(currentUser ? [{ value: currentUser.id, label: `Self · ${_roleLabel[currentUser.role] || currentUser.role}` }] : []),
    ...teamMembers.filter(u => u.id !== currentUser?.id && !u.is_self).map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name} · ${_roleLabel[u.role] || u.role}` }))
  ]
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DatePicker label="Due Date" value={fuForm.due_date} onChange={v => setFuForm(f => ({...f, due_date: v}))}
              min={new Date().toISOString().split('T')[0]} />
            <div>
              <ClockPicker label="Due Time" value={fuForm.due_time} onChange={v => setFuForm(f => ({...f, due_time: v}))} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CustomSelect label="Priority" value={fuForm.priority} onChange={v => setFuForm(f => ({...f, priority: v}))} options={priorityOpts} />
            <CustomSelect label="Assign To" value={fuForm.assigned_to} onChange={v => setFuForm(f => ({...f, assigned_to: v}))} options={userOpts} placeholder="Keep current" searchable />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DatePicker label="Visit Date" value={svForm.visit_date} onChange={v => setSvForm(f => ({...f, visit_date: v}))}
              min={new Date().toISOString().split('T')[0]} />
            <div>
              <ClockPicker label="Visit Time *" value={svForm.visit_time} onChange={v => setSvForm(f => ({...f, visit_time: v}))} required />
            </div>
          </div>
          <CustomSelect label="Assign To" value={svForm.assigned_to} onChange={v => setSvForm(f => ({...f, assigned_to: v}))} options={userOpts} placeholder="Keep current" searchable />
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

// ─── Bulk Lead Phone Request Modal ───────────────────────────────────────────
// Sends POST /phone-reveal/bulk-request for all selected lead IDs
function BulkLeadPhoneRequestModal({ leadIds, leads, onClose, onSuccess }) {
  const [reason,  setReason]  = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [result,  setResult]  = useState(null)

  const selected = leads.filter(l => leadIds.includes(l.id))

  const submit = async () => {
    setError(''); setLoading(true)
    try {
      const r = await api.post('/phone-reveal/bulk-request', {
        lead_ids: leadIds,
        reason:   reason || undefined,
      })
      setResult(r.data.data)
    } catch(e) { setError(e.response?.data?.message || 'Bulk request failed') }
    finally { setLoading(false) }
  }

  if (result) return (
    <Modal isOpen={true} onClose={() => { onSuccess(); onClose() }} title="Bulk Request Submitted">
      <div className="space-y-4 py-2">
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
            <CheckCircle2 size={28} className="text-green-500"/>
          </div>
          <p className="text-base font-bold text-gray-900 dark:text-white">Requests Submitted!</p>
          <p className="text-xs text-gray-400">Admin has been notified and will review shortly</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Submitted', val: result.inserted, c: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
            { label: 'Skipped',   val: result.skipped,  c: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          ].map(x => (
            <div key={x.label} className={`rounded-xl px-4 py-3 text-center ${x.bg}`}>
              <p className={`text-2xl font-bold ${x.c}`}>{x.val ?? 0}</p>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mt-0.5">{x.label}</p>
            </div>
          ))}
        </div>
        {result.skipped_details?.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-xl p-3 max-h-28 overflow-y-auto">
            <p className="text-xs font-semibold text-amber-600 mb-1.5">Skipped:</p>
            {result.skipped_details.map((s, i) => (
              <p key={i} className="text-xs text-amber-500">{s.lead_name}: {s.reason}</p>
            ))}
          </div>
        )}
        <Button className="w-full" onClick={() => { onSuccess(); onClose() }}>Done</Button>
      </div>
    </Modal>
  )

  return (
    <Modal isOpen={true} onClose={onClose} title={`Request ${leadIds.length} Phone Number${leadIds.length > 1 ? 's' : ''}`}>
      <div className="space-y-4">

        {/* Selected leads preview */}
        <div className="bg-gray-50 dark:bg-[#111] rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
            {leadIds.length} lead{leadIds.length > 1 ? 's' : ''} selected
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
            {selected.slice(0, 8).map(l => (
              <span key={l.id} className="text-[10px] font-medium px-2 py-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                {l.name}
              </span>
            ))}
            {selected.length > 8 && (
              <span className="text-[10px] text-gray-400 px-2 py-1">+{selected.length - 8} more</span>
            )}
          </div>
        </div>

        {/* Info note */}
        <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl px-3 py-2.5">
          <AlertCircle size={13} className="text-blue-500 flex-shrink-0 mt-0.5"/>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Admins will be notified and can approve or decline your request. Phone numbers are revealed once approved.
          </p>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
            Reason <span className="font-normal text-gray-400">(optional — applies to all)</span>
          </label>
          <input
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. Bulk follow-up campaign"
            className="w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2.5">
            <AlertCircle size={13} className="text-red-500 flex-shrink-0"/>
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" loading={loading} onClick={submit} icon={!loading ? Phone : undefined}>
            {loading ? 'Submitting…' : `Request ${leadIds.length} Number${leadIds.length > 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function Leads() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { list, loading, pagination, sources, statuses, configurations, actionLoading, actionError,
          myList, myLoading, myPagination } = useSelector(s => s.leads)
  const { list: projectList } = useSelector(s => s.projects)
  const { user: currentUser } = useSelector(s => s.auth)
  const { teamTree: teamMembers = [], teamTreeLoading } = useSelector(s => s.users)

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [filterAssigned, setFilterAssigned] = useState('')
  const [filterProjectId, setFilterProjectId] = useState('')
  const [filterProjectName, setFilterProjectName] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState('10')

  const searchProjectsFilter = async (q) => {
    const res = await api.get('/projects', { params: { search: q, per_page: 20 } })
    return (res.data.data || []).map(p => ({ value: p.id, label: `${p.name}${p.city ? ` · ${p.city}` : ''}` }))
  }

  const isAdminOrManager = ['admin', 'super_admin', 'manager'].includes(currentUser?.role)
  const isExternalCaller = currentUser?.role === 'external_caller'
  const showLeadsTabs = !['super_admin', 'admin', 'external_caller'].includes(currentUser?.role)
  const activeLeadListRef = useRef([])
  const activeLeadList = activeLeadListRef.current
  const [leadsTab, setLeadsTab] = useState(showLeadsTabs ? 'my' : 'team') // 'my' | 'team'
  const [myPage,   setMyPage]   = useState(1)

  const stageOptions = useMemo(() => {
    if (statuses?.length > 0) {
      return statuses.filter(s => s.is_active).map(s => ({ value: s.key, label: s.label }))
    }
    return leadStages
  }, [statuses])

  const statusMap = useMemo(() => {
    const map = {}
    if (statuses?.length > 0) {
      statuses.forEach(s => { map[s.key] = s })
    }
    return map
  }, [statuses])

  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showSourceModal, setShowSourceModal] = useState(false)
  const [showStatusManageModal, setShowStatusManageModal] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [showManageMenu, setShowManageMenu] = useState(false)
  const [showReassignModal,     setShowReassignModal]     = useState(false)
  const [showStatusChangeModal, setShowStatusChangeModal] = useState(false)
  const [convertInitialStep,    setConvertInitialStep]    = useState('choose')
  const [showEoiDocModal,       setShowEoiDocModal]       = useState(false)
  const [eoiDocLead,            setEoiDocLead]            = useState(null)
  const [showRevisitModal,      setShowRevisitModal]      = useState(false)
  const [revisitLead,           setRevisitLead]           = useState(null)
  const [showBulkReassignModal, setShowBulkReassignModal] = useState(false)
  const [showBulkUploadModal,   setShowBulkUploadModal]   = useState(false)
  const [showBulkPhoneReqModal, setShowBulkPhoneReqModal] = useState(false)
  const [showExportModal,       setShowExportModal]        = useState(false)
  const [showDeleteModal,       setShowDeleteModal]        = useState(false)
  const [leadToDelete,          setLeadToDelete]           = useState(null)
  const [deleting,              setDeleting]               = useState(false)
  const [showBulkDeleteModal,   setShowBulkDeleteModal]    = useState(false)
  const [bulkDeleting,          setBulkDeleting]           = useState(false)
  const [bulkDeleteSuccess,     setBulkDeleteSuccess]      = useState('')
  const [selectedLead, setSelectedLead] = useState(null)
  const [addForm, setAddForm] = useState(defaultForm)
  const [editForm, setEditForm] = useState(defaultForm)
  const [editOriginalStatus, setEditOriginalStatus] = useState('')
  const [addSubmitError, setAddSubmitError] = useState('')
  const [editSubmitError, setEditSubmitError] = useState('')
  const [reassignTo, setReassignTo] = useState('')
  const [selectedLeads, setSelectedLeads] = useState([])
  const [exporting,  setExporting]  = useState(false)
  const [addSuccess, setAddSuccess] = useState('')
  const [showConvertModal,     setShowConvertModal]     = useState(false)
  const [convertLead,          setConvertLead]          = useState(null)
  const [convertSuccess,       setConvertSuccess]       = useState('')
  const [showBulkConvertModal, setShowBulkConvertModal] = useState(false)
  const [editSuccess, setEditSuccess] = useState('')
  const [pendingRecordings,  setPendingRecordings]  = useState([])   // add mode — recordings to attach on create
  const [existingRecordings, setExistingRecordings] = useState([])   // edit mode — recordings from API
  const [visiblePhoneLeadId, setVisiblePhoneLeadId] = useState(null) // track which lead's phone is visible
  const [openMenuLeadId, setOpenMenuLeadId] = useState(null)
  const [menuPos,        setMenuPos]        = useState(null)
  const menuRef = useRef(null)
  const [showClosingManagerModal, setShowClosingManagerModal] = useState(false)
  const [closingManagerLead, setClosingManagerLead] = useState(null)

  useEffect(() => {
    dispatch(fetchProjects())
  }, [dispatch])

  useEffect(() => {
    if (!currentUser?.id) return
    dispatch(fetchTeamTree(currentUser.id))
  }, [currentUser?.id, dispatch])

  useEffect(() => {
    const params = { page, per_page: resolvePerPage(perPage) }
    if (search)         params.search      = search
    if (filterStatus)   params.status      = filterStatus
    if (filterAssigned) params.assigned_to = filterAssigned
    if (filterSource) {
      // Send both — some backends filter leads by the source's name, others
      // by its id; sending both means whichever the API reads actually works.
      params.source_id = filterSource
      const matchedSource = sourceList.find(s => s.id === filterSource)
      if (matchedSource) params.source = matchedSource.name
    }
    if (filterProjectId)        params.project_id = filterProjectId
    else if (filterProjectName) params.project     = filterProjectName
    if (isExternalCaller) {
      dispatch(fetchMyLeads(params))
    } else {
      dispatch(fetchLeads(params))
    }
    if (showLeadsTabs) {
      const myParams = { page: myPage, per_page: resolvePerPage(perPage) }
      if (search)       myParams.search = search
      if (filterStatus) myParams.status = filterStatus
      if (filterProjectId)        myParams.project_id = filterProjectId
      else if (filterProjectName) myParams.project     = filterProjectName
      dispatch(fetchMyLeads(myParams))
    }
  }, [dispatch, search, filterStatus, filterSource, filterAssigned, filterProjectId, filterProjectName, page, myPage, perPage, showLeadsTabs, isExternalCaller])

  useEffect(() => {
    dispatch(fetchLeadSources())
    dispatch(fetchLeadStatuses())
    dispatch(fetchLeadConfigurations())
    dispatch(fetchProjects())
  }, [dispatch])

  const sourceList = sources?.length > 0 ? sources : defaultSources
  const configList = configurations?.length > 0
    ? configurations.filter(c => c.is_active !== false).map(c => ({ value: c.name, label: c.name }))
    : configurationOptions

  const reloadLeads = () => {
    dispatch(fetchLeads({ page, per_page: resolvePerPage(perPage) }))
    if (showLeadsTabs) dispatch(fetchMyLeads({ page: myPage, per_page: resolvePerPage(perPage) }))
  }

  // Shared lead fields carried over into the create-with-lead payloads below
  // (mirrors the "New Lead + Site Visit" / "New Lead + Follow-up" flows).
  const buildLeadFieldsFor = (payload) => ({
    name: payload.name,
    phone: payload.phone,
    ...(payload.alternate_phone_number && { alternate_phone_number: payload.alternate_phone_number }),
    ...(payload.email && { email: payload.email }),
    ...(payload.source && { source: payload.source }),
    ...(payload.source_id && { source_id: payload.source_id }),
    ...(payload.project_id ? { project_id: payload.project_id } : payload.project_name ? { project_name: payload.project_name } : {}),
    ...(payload.assigned_to && { assigned_to: payload.assigned_to }),
    ...(payload.budget && { budget: payload.budget }),
    ...(payload.location_preference && { location_preference: payload.location_preference }),
    ...(payload.configuration?.length && { configuration: payload.configuration }),
    ...(payload.notes && { lead_notes: payload.notes }),
    ...(payload.callback_time && { callback_time: payload.callback_time }),
    ...(payload.next_followup_time && { next_followup_time: payload.next_followup_time }),
  })

  const handleAddLead = async (e) => {
    e.preventDefault()
    dispatch(clearLeadError())
    setAddSubmitError('')
    const payload = { ...addForm }
    if (payload.project_id) {
      delete payload.project_name
    } else if (payload.project_name) {
      delete payload.project_id
    } else {
      delete payload.project_id
      delete payload.project_name
    }
    if (pendingRecordings.length > 0) {
      payload.call_recordings = pendingRecordings.map(({ url, phone_number, name }) => ({
        url, phone_number: phone_number || undefined, name: name || undefined,
      }))
    }
    if (!payload.photos?.length) delete payload.photos
    if (!payload.payment_proof_url) delete payload.payment_proof_url
    if (!payload.payment_proof_amount) delete payload.payment_proof_amount

    // Status set to Site Visit Scheduled — create the lead and the visit
    // together via the same API the Site Visits page's "New Lead + Site
    // Visit" flow uses, instead of leaving the status with no real visit.
    if (payload.status === 'site_visit_scheduled' && payload.visit_date) {
      try {
        await api.post('/site-visits/create-with-lead', {
          ...buildLeadFieldsFor(payload),
          visit_date: payload.visit_date,
          visit_time: payload.visit_time || '10:00',
          transport_arranged: Boolean(payload.transport_arranged),
        })
        setAddSuccess('Lead created and site visit scheduled!')
        setPendingRecordings([])
        reloadLeads()
        setTimeout(() => { setShowAddModal(false); setAddSuccess(''); setAddForm(defaultForm) }, 800)
      } catch (err) {
        setAddSubmitError(err.response?.data?.message || 'Failed to create lead with site visit')
      }
      return
    }

    // Status set to Follow-up — same idea via the Follow-ups page's
    // "New Lead + Follow-up" API.
    if (payload.status === 'follow_up' && payload.due_date) {
      try {
        await api.post('/tasks/create-with-lead', {
          ...buildLeadFieldsFor(payload),
          title: payload.followup_title || `Follow up with ${payload.name}`,
          due_date: `${payload.due_date}T${payload.due_time || '10:00'}:00`,
          priority: payload.priority || 'medium',
        })
        setAddSuccess('Lead created and follow-up scheduled!')
        setPendingRecordings([])
        reloadLeads()
        setTimeout(() => { setShowAddModal(false); setAddSuccess(''); setAddForm(defaultForm) }, 800)
      } catch (err) {
        setAddSubmitError(err.response?.data?.message || 'Failed to create lead with follow-up')
      }
      return
    }

    const result = await dispatch(createLead(payload))
    if (createLead.fulfilled.match(result)) {
      setAddSuccess('Lead created successfully!')
      setPendingRecordings([])
      reloadLeads()
      setTimeout(() => { setShowAddModal(false); setAddSuccess(''); setAddForm(defaultForm) }, 800)
    }
  }

  const handleEditLead = async (e) => {
    e.preventDefault()
    dispatch(clearLeadError())
    setEditSubmitError('')
    const leadData = { ...editForm }
    if (leadData.project_id) {
      delete leadData.project_name
    } else if (leadData.project_name) {
      delete leadData.project_id
    } else {
      delete leadData.project_id
      delete leadData.project_name
    }
    if (!leadData.photos?.length) delete leadData.photos
    if (!leadData.payment_proof_url) delete leadData.payment_proof_url
    if (!leadData.payment_proof_amount) delete leadData.payment_proof_amount

    // Only schedule a companion visit/follow-up when the status is actually
    // being changed into that stage this save — not on every subsequent edit
    // of a lead that's already sitting in that status.
    const schedulingVisit  = leadData.status === 'site_visit_scheduled' && editOriginalStatus !== 'site_visit_scheduled' && leadData.visit_date
    const schedulingFollow = leadData.status === 'follow_up' && editOriginalStatus !== 'follow_up' && leadData.due_date

    const result = await dispatch(updateLead({ id: selectedLead.id, leadData }))
    if (updateLead.fulfilled.match(result)) {
      if (schedulingVisit) {
        try {
          await api.post('/site-visits', {
            lead_id: selectedLead.id,
            project_id: leadData.project_id || leadData.project_name,
            visit_date: leadData.visit_date,
            visit_time: leadData.visit_time || '10:00',
            transport_arranged: Boolean(leadData.transport_arranged),
            ...(leadData.assigned_to && { assigned_to: leadData.assigned_to }),
          })
          setEditSuccess('Lead updated and site visit scheduled!')
        } catch (err) {
          setEditSubmitError(err.response?.data?.message || 'Lead updated, but scheduling the site visit failed')
        }
      } else if (schedulingFollow) {
        try {
          await api.post('/tasks', {
            lead_id: selectedLead.id,
            title: leadData.followup_title || `Follow up with ${leadData.name}`,
            due_date: `${leadData.due_date}T${leadData.due_time || '10:00'}:00`,
            priority: leadData.priority || 'medium',
            ...(leadData.assigned_to && { assigned_to: leadData.assigned_to }),
          })
          setEditSuccess('Lead updated and follow-up scheduled!')
        } catch (err) {
          setEditSubmitError(err.response?.data?.message || 'Lead updated, but scheduling the follow-up failed')
        }
      } else {
        setEditSuccess('Lead updated!')
      }
      reloadLeads()
      setTimeout(() => { setShowEditModal(false); setEditSuccess('') }, 800)
    }
  }

  const handleDeleteLead = (lead) => {
    setLeadToDelete(lead)
    setShowDeleteModal(true)
  }

  const confirmDeleteLead = async () => {
    if (!leadToDelete) return
    setDeleting(true)
    const result = await dispatch(deleteLead(leadToDelete.id))
    setDeleting(false)
    if (deleteLead.fulfilled.match(result)) {
      reloadLeads()
      setShowDeleteModal(false)
      setLeadToDelete(null)
    }
  }

  const confirmBulkDeleteLeads = async () => {
    if (selectedLeads.length === 0) return
    setBulkDeleting(true)
    const result = await dispatch(bulkDeleteLeads(selectedLeads))
    setBulkDeleting(false)
    if (bulkDeleteLeads.fulfilled.match(result)) {
      const { deleted_count, not_found_ids } = result.payload?.data || {}
      setBulkDeleteSuccess(
        not_found_ids?.length
          ? `${deleted_count} lead(s) deleted · ${not_found_ids.length} not found`
          : `${deleted_count ?? selectedLeads.length} lead(s) deleted`
      )
      setSelectedLeads([])
      reloadLeads()
      setShowBulkDeleteModal(false)
      setTimeout(() => setBulkDeleteSuccess(''), 4000)
    }
  }

  const openEdit = async (lead) => {
    setSelectedLead(lead)
    try {
      // Fetch lead details from API
      const res = await api.get(`/leads/${lead.id}`)
      const leadData = res.data.data
      
      // Find matching source from sourceList by either ID or name
      let sourceId = leadData.source_id || ''
      let sourceName = leadData.source || ''
      
      if (sourceList && (!sourceId || sourceId === '')) {
        // Try to find by name if we don't have source_id
        const matchedSource = sourceList.find(s => 
          s.name.toLowerCase() === (leadData.source || '').toLowerCase()
        )
        if (matchedSource) {
          sourceId = matchedSource.id
          sourceName = matchedSource.name
        }
      }
      
      // Set edit form with fetched data
      setEditForm({
        name: leadData.name || '',
        phone: leadData.phone || '',
        alternate_phone_number: leadData.alternate_phone_number || '',
        email: leadData.email || '',
        source: sourceName,
        source_id: sourceId,
        project_id: leadData.project?.id || leadData.project_id || '',
        project_name: '',
        assigned_to: leadData.assigned_to?.id || leadData.assigned_to || '',
        budget: leadData.budget || '',
        location_preference: leadData.location_preference || '',
        notes: leadData.notes || '',
        status: leadData.status || 'new',
        callback_time: leadData.callback_time || '',
        next_followup_time: leadData.next_followup_time || '',
        photos: leadData.photos || [],
        payment_proof_url: leadData.payment_proof_url || '',
        payment_proof_amount: leadData.payment_proof_amount || '',
        visit_date: '', visit_time: '10:00', transport_arranged: false,
        followup_title: '', due_date: '', due_time: '10:00', priority: 'medium',
      })
      setEditOriginalStatus(leadData.status || 'new')
    } catch (err) {
      // Fall back to the original lead data if API fails
      let sourceId = lead.source_id || ''
      let sourceName = lead.source || ''
      
      if (sourceList && (!sourceId || sourceId === '')) {
        const matchedSource = sourceList.find(s => 
          s.name.toLowerCase() === (lead.source || '').toLowerCase()
        )
        if (matchedSource) {
          sourceId = matchedSource.id
          sourceName = matchedSource.name
        }
      }
      
      setEditForm({
        name: lead.name || '',
        phone: lead.phone || '',
        alternate_phone_number: lead.alternate_phone_number || '',
        email: lead.email || '',
        source: sourceName,
        source_id: sourceId,
        project_id: lead.project_id || '',
        project_name: '',
        assigned_to: lead.assigned_to || '',
        budget: lead.budget || '',
        location_preference: lead.location_preference || '',
        notes: lead.notes || '',
        status: lead.status || 'new',
        photos: lead.photos || [],
        payment_proof_url: lead.payment_proof_url || '',
        payment_proof_amount: lead.payment_proof_amount || '',
        callback_time: lead.callback_time || '',
        next_followup_time: lead.next_followup_time || '',
        visit_date: '', visit_time: '10:00', transport_arranged: false,
        followup_title: '', due_date: '', due_time: '10:00', priority: 'medium',
      })
      setEditOriginalStatus(lead.status || 'new')
    }
    // Fetch existing call recordings for this lead
    try {
      const res = await api.get(`/leads/${lead.id}/call-recordings`)
      setExistingRecordings(res.data.data?.recordings || [])
    } catch { setExistingRecordings([]) }
    setShowEditModal(true)
  }

  const handleReassign = async (e) => {
    e.preventDefault()
    // Uses new /leads/:id/reassign API for audit trail
    const result = await dispatch(updateLead({ id: selectedLead.id, leadData: { assigned_to: reassignTo } }))
    if (updateLead.fulfilled.match(result)) {
      reloadLeads()
      setShowReassignModal(false)
    }
  }

  const toggleSelect = (id) =>
    setSelectedLeads(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  const toggleAll = () =>
    setSelectedLeads(selectedLeads.length === list.length && list.length > 0 ? [] : list.map(l => l.id))

  const perms        = useModulePermissions('leads')
  const canReassign     = ['super_admin', 'admin', 'sales_manager'].includes(currentUser?.role)
  const canRequestPhone = ['sales_manager', 'sales_executive', 'external_caller'].includes(currentUser?.role)
  const canBulkUpload = true  // all authenticated users can bulk upload — exec/caller auto-assigned to self
  const canSeePhone  = ['super_admin', 'admin'].includes(currentUser?.role)

  const handleExport = async (dateRange) => {
    try {
      setExporting(true)
      const params = { ...dateRange }
      if (filterStatus) params.status = filterStatus
      if (filterSource) {
        params.source_id = filterSource
        const matchedSource = sourceList.find(s => s.id === filterSource)
        if (matchedSource) params.source = matchedSource.name
      }
      if (filterProjectId)        params.project_id = filterProjectId
      else if (filterProjectName) params.project     = filterProjectName
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
    reloadLeads()
    setTimeout(() => setConvertSuccess(''), 3000)
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuLeadId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleConvertSuccess = (type) => {
    setShowConvertModal(false)
    setConvertLead(null)
    setConvertSuccess(type === 'follow_up' ? 'Lead converted to follow-up!' : 'Site visit scheduled!')
    reloadLeads()
    setTimeout(() => setConvertSuccess(''), 3000)
  }

  // Fires after ChangeStatusModal's PATCH succeeds. The status itself is
  // already saved at this point — for site_visit_scheduled / follow_up /
  // eoi we chain straight into the follow-on flow (schedule the visit,
  // create the follow-up task, or upload EOI docs) instead of leaving the
  // admin to hunt for a separate button to finish the job.
  const handleStatusChangeSuccess = (lead, status) => {
    setShowStatusChangeModal(false)
    reloadLeads()
    if (status === 'site_visit_scheduled') {
      setConvertLead(lead)
      setConvertInitialStep('site_visit')
      setShowConvertModal(true)
    } else if (status === 'follow_up') {
      setConvertLead(lead)
      setConvertInitialStep('follow_up')
      setShowConvertModal(true)
    } else if (status === 'eoi') {
      // The list row is a trimmed lead shape (no `photos` / payment proof
      // fields) — show it immediately, then swap in the full record once
      // fetched so EoiDocumentsSection reflects any existing uploads.
      setEoiDocLead(lead)
      setShowEoiDocModal(true)
      api.get(`/leads/${lead.id}`).then(res => setEoiDocLead(res.data.data)).catch(() => {})
    } else if (status === 're_visit') {
      setRevisitLead(lead)
      setShowRevisitModal(true)
    } else {
      setSelectedLead(null)
    }
  }

  const refreshEoiDocLead = async () => {
    reloadLeads()
    if (!eoiDocLead) return
    try {
      const res = await api.get(`/leads/${eoiDocLead.id}`)
      setEoiDocLead(res.data.data)
    } catch { /* keep showing the last known lead state */ }
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
              options={[{ value: '', label: 'All Team' }, ...teamMembers.filter(u => !u.is_self).map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name} · ${u.role.replace(/_/g,' ')}` }))]}
              placeholder="All Team"
              searchable
            />
          </div>
          <div className="w-52">
            <AsyncSearchSelect
              value={filterProjectId}
              onChange={val => { setFilterProjectId(val); setFilterProjectName(''); setPage(1) }}
              onTextChange={text => { setFilterProjectName(text); if (text) setFilterProjectId(''); setPage(1) }}
              onSearch={searchProjectsFilter}
              initialOptions={projectList.slice(0, 20).map(p => ({ value: p.id, label: `${p.name}${p.city ? ` · ${p.city}` : ''}` }))}
              placeholder="Filter by project..."
              fallbackToInput
            />
          </div>
          <button
            onClick={() => dispatch(fetchLeads({ page, per_page: resolvePerPage(perPage) }))}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 text-gray-400 hover:text-brand hover:border-brand transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdminOrManager && (
            <div className="relative">
              <Button variant="outline" size="sm" icon={Settings2} onClick={() => setShowManageMenu(o => !o)}>
                Manage
              </Button>
              {showManageMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowManageMenu(false)} />
                  <div className="absolute left-0 top-full mt-2 z-50 w-52 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg py-1">
                    <button
                      onClick={() => { setShowSourceModal(true); setShowManageMenu(false) }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      Manage Sources
                    </button>
                    <button
                      onClick={() => { setShowConfigModal(true); setShowManageMenu(false) }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      Manage Configuration
                    </button>
                    {['admin', 'super_admin'].includes(currentUser?.role) && (
                      <button
                        onClick={() => { setShowStatusManageModal(true); setShowManageMenu(false) }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        Manage Status
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          {perms.create && (
            <Button variant="outline" size="sm" icon={Upload} onClick={() => setShowBulkUploadModal(true)}>
              Bulk Upload
            </Button>
          )}
          {['admin', 'super_admin'].includes(currentUser?.role) && (
            <Button variant="outline" size="sm" icon={Download} loading={exporting} disabled={exporting} onClick={() => setShowExportModal(true)}>
              Export
            </Button>
          )}
          {perms.create && (
            <Button icon={Plus} onClick={() => {
              const r = ['sales_executive','external_caller','sales_manager'].includes(currentUser?.role)
              setAddForm({ ...defaultForm, assigned_to: r ? currentUser?.id : '' })
              dispatch(clearLeadError()); setShowAddModal(true)
            }}>
              Add Lead
            </Button>
          )}
        </div>
      </div>

      {/* Sales Manager tab switcher — My Leads vs Team Leads */}
      {showLeadsTabs && (
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-[#111] rounded-xl w-fit">
          <button onClick={() => setLeadsTab('my')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${leadsTab === 'my' ? 'bg-white dark:bg-[#1a1a1a] text-brand shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
            My Leads
            {myPagination?.total > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand/10 text-brand">{myPagination.total}</span>}
          </button>
          <button onClick={() => setLeadsTab('team')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${leadsTab === 'team' ? 'bg-white dark:bg-[#1a1a1a] text-brand shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
            Team Leads
            {pagination?.total > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand/10 text-brand">{pagination.total}</span>}
          </button>
        </div>
      )}

      {/* Summary row + inline selection actions */}
      {!(showLeadsTabs ? (leadsTab === 'my' ? myLoading : loading) : loading) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-sm text-gray-500 dark:text-[#888] flex-shrink-0 flex items-center gap-3">
            <span>
              {(() => {
                const activeList = showLeadsTabs && leadsTab === 'my' ? myList : list
                const activePag  = showLeadsTabs && leadsTab === 'my' ? myPagination : pagination
                return <>Showing <span className="font-semibold text-gray-900 dark:text-white">{activeList.length}</span>
                  {activePag?.total > 0 && <> of <span className="font-semibold text-gray-900 dark:text-white">{activePag.total}</span></>} leads</>
              })()}
            </span>
            <PageSizeSelect value={perPage} onChange={v => { setPerPage(v); setPage(1); setMyPage(1) }} />
          </div>

          {/* Inline bulk-action pills — only visible when rows are checked */}
          {selectedLeads.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 -mb-1 sm:pb-0 sm:-mb-0">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">
                {selectedLeads.length} selected
              </span>
              <button onClick={() => setShowBulkConvertModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.97] flex-shrink-0">
                <ArrowRightCircle size={13} /> Convert {selectedLeads.length}
              </button>
              <button onClick={() => setShowBulkReassignModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.97] flex-shrink-0">
                <Users size={13} /> Reassign {selectedLeads.length}
              </button>
              <button onClick={() => setShowBulkPhoneReqModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.97] flex-shrink-0">
                <Phone size={13} /> Request Phones {selectedLeads.length}
              </button>
              {['admin', 'super_admin'].includes(currentUser?.role) && (
                <button onClick={() => setShowBulkDeleteModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.97] flex-shrink-0">
                  <Trash2 size={13} /> Delete {selectedLeads.length}
                </button>
              )}
              <button onClick={() => setSelectedLeads([])}
                className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0">
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Table — uses activeList/activePag based on role + tab */}
      {(({ activeList, activeLoading, activePag, activePage, setActivePage, visiblePhoneLeadId, setVisiblePhoneLeadId }) => {
      // Expose activeList so modals outside the IIFE can access it
      // eslint-disable-next-line no-unused-expressions
      activeLeadListRef.current = activeList
      return (<>
      <div className="bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-blue-100/50 dark:shadow-blue-900/20 rounded-2xl hover:shadow-lg transition-all duration-200">
        {activeLoading ? (
          <div className="p-4"><ListSkeleton rows={8} /></div>
        ) : activeList.length === 0 ? (
          <div className="py-16 text-center text-gray-400 dark:text-[#888]">
            <Search size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
            <p className="font-medium">No leads found</p>
            <p className="text-sm mt-1">Try adjusting your filters or add a new lead</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-blue-50/50 dark:bg-blue-900/10">
                  <th className="py-3 pl-4 pr-2 w-8">
                    <input type="checkbox"
                      checked={selectedLeads.length === list.length && list.length > 0}
                      onChange={toggleAll} className="rounded border-gray-300 text-[#0082f3] focus:ring-[#0082f3]" />
                  </th>
                  {['Lead', 'Phone', 'Source', 'Assigned', 'Status', 'Project', 'Closing Manager', 'Created', 'Actions']
                    .filter(h => !(h === 'Assigned' && showLeadsTabs && leadsTab === 'my'))
                    .map(h => (
                    <th key={h} className={`py-3 px-3 text-left text-xs font-medium text-blue-900/70 dark:text-blue-200/70 uppercase tracking-wide whitespace-nowrap
                      ${h === 'Actions' ? 'text-right' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {activeList.map((lead, leadIdx) => (
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
                    <td className="py-3 px-3 text-gray-600 dark:text-gray-400">
                      <PhoneCell lead={lead} canSeePhone={canSeePhone} visiblePhoneLeadId={visiblePhoneLeadId} setVisiblePhoneLeadId={setVisiblePhoneLeadId}/>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400">
                        {lead.source_name || lead.source || '—'}
                      </span>
                    </td>
                    {!(showLeadsTabs && leadsTab === 'my') && (
                      <td className="py-3 px-3">
                        {(lead.assigned_name || lead.assigned_to_name || (typeof lead.assigned_to === 'object' && lead.assigned_to?.full_name)) ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar name={lead.assigned_name || lead.assigned_to_name || lead.assigned_to?.full_name} size="xs" />
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {lead.assigned_name || lead.assigned_to_name || lead.assigned_to?.full_name}
                            </span>
                          </div>
                        ) : <span className="text-xs text-gray-400">Unassigned</span>}
                      </td>
                    )}
                    <td className="py-3 px-3">
                      <Badge 
                        label={lead.status || 'New'} 
                        color={statusMap[lead.status?.toLowerCase()]?.color} 
                      />
                    </td>
                    <td className="py-3 px-3 text-xs text-gray-400">
                      {lead.project_name || '—'}
                    </td>
                    <td className="py-3 px-3">
                      {lead.closing_person ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                            <UserCheck size={11} className="text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            {lead.closing_person}
                          </span>
                        </div>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="py-3 px-3 text-xs text-gray-400 whitespace-nowrap">
                      {fmtDate(lead.created_at)}
                    </td>
                    <td className="py-3 px-3" ref={openMenuLeadId === lead.id ? menuRef : null}>
                      <div className="flex items-center justify-end">
                        <div className="relative">
                          <button
                            onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); const below = window.innerHeight - r.bottom; setMenuPos({ right: window.innerWidth - r.right, ...(below > 200 ? { top: r.bottom + 4 } : { bottom: window.innerHeight - r.top + 4 }) }); setOpenMenuLeadId(openMenuLeadId === lead.id ? null : lead.id) }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand hover:bg-brand/10 transition-all"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {openMenuLeadId === lead.id && (
                            <div style={{ top: menuPos?.top, bottom: menuPos?.bottom, right: menuPos?.right }} className="fixed w-48 max-h-64 overflow-y-auto bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg z-[9999] py-1">
                              <button
                                onClick={() => { navigate(`/leads/${lead.id}`); setOpenMenuLeadId(null); }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                <Eye size={14} />
                                View Details
                              </button>
                              <button 
                                onClick={() => { setConvertLead(lead); setConvertInitialStep('choose'); setShowConvertModal(true); setOpenMenuLeadId(null); }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                <ArrowRightCircle size={14} />
                                Convert
                              </button>
                              {perms.edit && (
                                <button
                                  onClick={() => { openEdit(lead); setOpenMenuLeadId(null); }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                  <Edit2 size={14} />
                                  Edit
                                </button>
                              )}
                              {perms.edit && (
                                <button
                                  onClick={() => { setSelectedLead(lead); setShowStatusChangeModal(true); setOpenMenuLeadId(null); }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                  <RefreshCw size={14} />
                                  Change Status
                                </button>
                              )}
                              {canReassign && (
                                <button
                                  onClick={() => { setSelectedLead(lead); setReassignTo(lead.assigned_to || ''); setShowReassignModal(true); setOpenMenuLeadId(null); }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                  <Users size={14} />
                                  Reassign
                                </button>
                              )}
                              {(lead.status === 'site_visit_done' || lead.status === 'negotiation' || lead.status === 'booked') && perms.edit && (
                                <button
                                  onClick={() => { setClosingManagerLead(lead); setShowClosingManagerModal(true); setOpenMenuLeadId(null); }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-t border-gray-100 dark:border-gray-800"
                                >
                                  <UserCheck size={14} />
                                  {lead.closing_person ? 'Edit Closing Manager' : 'Add Closing Manager'}
                                </button>
                              )}
                              {perms.delete && (
                                <button
                                  onClick={() => { handleDeleteLead(lead); setOpenMenuLeadId(null); }}
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
      {activePag?.total > 0 && (
        <div className="flex items-center justify-between px-2 text-xs text-gray-500 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span>Page {activePage} of {activePag.total_pages || 1} · {activePag.total} total</span>
            <PageSizeSelect value={perPage} onChange={v => { setPerPage(v); setPage(1); setMyPage(1) }} />
          </div>
          {activePag.total_pages > 1 && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={activePage===1} onClick={()=>setActivePage(p=>p-1)}>Prev</Button>
              <Button size="sm" variant="outline" disabled={activePage>=activePag.total_pages} onClick={()=>setActivePage(p=>p+1)}>Next</Button>
            </div>
          )}
        </div>
      )}
      </>)})({
        activeList:    isExternalCaller ? myList : (showLeadsTabs && leadsTab === 'my' ? myList     : list),
        activeLoading: isExternalCaller ? myLoading : (showLeadsTabs && leadsTab === 'my' ? myLoading  : loading),
        activePag:     isExternalCaller ? myPagination : (showLeadsTabs && leadsTab === 'my' ? myPagination : pagination),
        activePage:    isExternalCaller ? page : (showLeadsTabs && leadsTab === 'my' ? myPage     : page),
        setActivePage: isExternalCaller ? setPage : (showLeadsTabs && leadsTab === 'my' ? setMyPage  : setPage),
        visiblePhoneLeadId: visiblePhoneLeadId,
        setVisiblePhoneLeadId: setVisiblePhoneLeadId,
      })}

      {/* Add Lead Modal */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setAddSuccess(''); setPendingRecordings([]) }} title="Add New Lead" size="lg">
        <form onSubmit={handleAddLead} className="space-y-4">
          <LeadForm formData={addForm} setFormData={setAddForm} isEdit={false}
            sourceList={sourceList.filter(s => s.is_active !== false)}
            configOptions={configList}
            stageOptions={stageOptions}
            teamMembers={teamMembers} projects={projectList} currentUser={currentUser} leadId={null}
            pendingRecordings={pendingRecordings} setPendingRecordings={setPendingRecordings}
          />
          {addSuccess && <p className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 py-2 text-center rounded-xl">{addSuccess}</p>}
          {(actionError || addSubmitError) && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 py-2 text-center rounded-xl">{actionError || addSubmitError}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={actionLoading}>Add Lead</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Lead Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setEditSuccess('') }} title="Edit Lead" size="lg">
        <form onSubmit={handleEditLead} className="space-y-4">
          <LeadForm formData={editForm} setFormData={setEditForm} isEdit={true}
            sourceList={sourceList.filter(s => s.is_active !== false || s.id === editForm.source_id)}
            configOptions={configList}
            stageOptions={stageOptions}
            teamMembers={teamMembers} projects={projectList} currentUser={currentUser} leadId={selectedLead?.id}
            existingRecordings={existingRecordings}
            onExistingChange={async () => {
              try {
                const res = await api.get(`/leads/${selectedLead?.id}/call-recordings`)
                setExistingRecordings(res.data.data?.recordings || [])
              } catch { setExistingRecordings([]) }
            }}
          />
          {editSuccess && <p className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 py-2 text-center rounded-xl">{editSuccess}</p>}
          {(actionError || editSubmitError) && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 py-2 text-center rounded-xl">{actionError || editSubmitError}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={actionLoading}>Update Lead</Button>
          </div>
        </form>
      </Modal>

      {/* Single Reassign Modal — uses /leads/:id/reassign API with reason + audit trail */}
      {showReassignModal && selectedLead && (
        <ReassignModal
          lead={selectedLead}
          teamMembers={teamMembers}
          currentUser={currentUser}
          onClose={() => { setShowReassignModal(false); setSelectedLead(null) }}
          onSuccess={() => reloadLeads()}
        />
      )}

      {/* Change Status Modal — uses PATCH /leads/:id/status. On success, chains
          into the Convert modal (site visit / follow-up) or the EOI documents
          modal when the new status calls for it — see handleStatusChangeSuccess. */}
      {showStatusChangeModal && selectedLead && (
        <ChangeStatusModal
          lead={selectedLead}
          stageOptions={stageOptions}
          statusMap={statusMap}
          onClose={() => { setShowStatusChangeModal(false); setSelectedLead(null) }}
          onSuccess={(status) => handleStatusChangeSuccess(selectedLead, status)}
        />
      )}

      {/* Bulk Reassign Modal — uses /leads/bulk-reassign API */}
      {showBulkReassignModal && (
        <BulkReassignModal
          leadIds={selectedLeads}
          leads={list}
          teamMembers={teamMembers}
          currentUser={currentUser}
          onClose={() => setShowBulkReassignModal(false)}
          onSuccess={() => { setSelectedLeads([]); reloadLeads() }}
        />
      )}

      {/* Bulk Phone Request Modal — for selected leads */}
      {showBulkPhoneReqModal && (
        <BulkLeadPhoneRequestModal
          leadIds={selectedLeads}
          leads={activeLeadList}
          onClose={() => setShowBulkPhoneReqModal(false)}
          onSuccess={() => { setSelectedLeads([]); reloadLeads() }}
        />
      )}

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <BulkUploadModal
          teamMembers={teamMembers}
          currentUser={currentUser}
          onClose={() => setShowBulkUploadModal(false)}
          onSuccess={() => { reloadLeads(); setPage(1) }}
        />
      )}

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
          teamMembers={teamMembers}
        />
      )}

      {/* Convert Lead Modal */}
      {showConvertModal && convertLead && (
        <ConvertLeadModal
          lead={convertLead}
          initialStep={convertInitialStep}
          onClose={() => { setShowConvertModal(false); setConvertLead(null); setConvertInitialStep('choose') }}
          onSuccess={handleConvertSuccess}
        />
      )}

      {/* EOI Documents Modal — opened automatically after a lead's status is
          changed to "eoi" via Change Status, reusing the same upload UI as
          the Lead Detail page's EOI section. */}
      {showEoiDocModal && eoiDocLead && (
        <Modal isOpen={true} onClose={() => { setShowEoiDocModal(false); setEoiDocLead(null) }} title="EOI Documents" size="lg">
          <EoiDocumentsSection lead={eoiDocLead} onUploaded={refreshEoiDocLead} />
        </Modal>
      )}

      {/* Convert-to-Revisit Modal — opened automatically after a lead's
          status is changed to "re_visit" via Change Status. */}
      {showRevisitModal && revisitLead && (
        <ConvertToRevisitModal
          lead={revisitLead}
          teamMembers={teamMembers}
          currentUser={currentUser}
          onClose={() => { setShowRevisitModal(false); setRevisitLead(null) }}
          onSuccess={reloadLeads}
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

      {/* Lead Source Management Modal */}
      <LeadSourceManagementModal
        isOpen={showSourceModal}
        onClose={() => setShowSourceModal(false)}
      />

      {/* Lead Configuration Management Modal */}
      <LeadConfigurationManagementModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />

      {/* Lead Status Management Modal */}
      <LeadStatusManagementModal
        isOpen={showStatusManageModal}
        onClose={() => setShowStatusManageModal(false)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setLeadToDelete(null) }}
        onConfirm={confirmDeleteLead}
        title="Delete Lead"
        message={`Are you sure you want to delete lead "${leadToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete Lead"
        loading={deleting}
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={confirmBulkDeleteLeads}
        title="Delete Leads"
        message={`Are you sure you want to delete ${selectedLeads.length} lead(s)? This action cannot be undone.`}
        confirmText={`Delete ${selectedLeads.length}`}
        loading={bulkDeleting}
      />

      {/* Bulk Delete Success Toast */}
      {bulkDeleteSuccess && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-500 text-white px-5 py-3 rounded-2xl shadow-xl shadow-emerald-500/30 animate-in slide-in-from-bottom-2">
          <CheckCircle2 size={16}/> {bulkDeleteSuccess}
        </div>
      )}

      {/* Closing Manager Modal */}
      {showClosingManagerModal && closingManagerLead && (
        <ClosingManagerModal
          lead={closingManagerLead}
          onClose={() => { setShowClosingManagerModal(false); setClosingManagerLead(null) }}
          onSuccess={() => { reloadLeads() }}
        />
      )}
    </div>
  )
}