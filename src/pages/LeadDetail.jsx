import { useState, useEffect, useRef, useMemo } from 'react'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  ArrowLeft, Phone, Mail, MapPin, Calendar, Send,
  ChevronDown, Loader2, UserCheck, MessageSquare,
  Clock, CheckCircle, Info, ExternalLink, ShieldCheck,
  PlusCircle, CalendarPlus, ArrowRight, RefreshCw, History, Users, PhoneCall as PhoneCallIcon,
  Mic, MicOff, Play, Pause, Upload, Trash, Edit2, Plus, X, Settings2,
  Eye, FileText
} from 'lucide-react'
import api from '../api/axios'
import CustomSelect from '../components/ui/CustomSelect'
import {
  fetchLeadById, fetchLeadActivities, addLeadNote, updateLeadStatus, clearCurrentLead,
  fetchLeadStatuses
} from '../store/leadSlice'
import { fetchTeamTree } from '../store/userSlice'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ConvertLeadModal from '../components/modals/ConvertLeadModal'
import LeadStatusManagementModal from '../components/modals/LeadStatusManagementModal'
import PhoneActions from '../components/ui/PhoneActions'

const defaultLeadStages = [
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

// Parses configuration values that may arrive as a real array, a Postgres
// text-array literal (e.g. `{"1RK","1BHK"}`), or a plain string.
const parseConfigList = (raw) => {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw !== 'string') return []
  const trimmed = raw.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed.slice(1, -1)
      .split(',')
      .map(s => s.trim().replace(/^"|"$/g, ''))
      .filter(Boolean)
  }
  return trimmed ? [trimmed] : []
}

// ── EOI Documents — Payment Proof + Booking Form Photo (visible once a lead
// reaches the EOI stage) ────────────────────────────────────────────────────
// Uploaded file URLs come back relative (e.g. "/uploads/leads/photos/x.png"),
// served from the API's origin rather than the frontend's — resolve to a full,
// clickable URL. Leaves already-absolute URLs untouched.
const fileOrigin = api.defaults.baseURL.replace(/\/api\/v1\/?$/, '')
const resolveFileUrl = url => {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `${fileOrigin}${url.startsWith('/') ? '' : '/'}${url}`
}

const docIc = 'w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm'
const docLc = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'

function DocLinkCard({ url, name, sub, onDelete, deleting }) {
  return (
    <div className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-[#0f0f0f] rounded-xl border border-gray-100 dark:border-gray-800 hover:border-brand transition-colors">
      <a href={resolveFileUrl(url)} target="_blank" rel="noreferrer" className="flex items-center gap-2 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 text-gray-500">
          <FileText size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{name || 'File'}</p>
          {sub && <p className="text-[10px] text-brand font-semibold">{sub}</p>}
        </div>
      </a>
      {onDelete && (
        <button type="button" onClick={onDelete} disabled={deleting}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 transition-colors flex-shrink-0" title="Delete">
          {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash size={13} />}
        </button>
      )}
    </div>
  )
}

// Shared upload modal — payment proof asks for an amount, photo asks for a name.
function UploadDocModal({ title, accept, fieldLabel, fieldPlaceholder, onClose, onSubmit }) {
  const [field,     setField]     = useState('')
  const [file,       setFile]      = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState('')

  const handleSubmit = async () => {
    if (!file) { setError('Please choose a file'); return }
    setError(''); setUploading(true)
    try {
      await onSubmit({ file, field: field.trim() })
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed')
      setUploading(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <div>
          <label className={docLc}>{fieldLabel}</label>
          <input value={field} onChange={e => setField(e.target.value)} placeholder={fieldPlaceholder} className={docIc} />
        </div>
        <div>
          <label className={docLc}>File *</label>
          <input type="file" accept={accept} onChange={e => setFile(e.target.files?.[0] || null)} className={docIc} />
        </div>
        {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">{error}</p>}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="button" className="flex-1" loading={uploading} onClick={handleSubmit}>Upload</Button>
        </div>
      </div>
    </Modal>
  )
}

function EoiDocumentsSection({ lead, onUploaded }) {
  const [showProofModal, setShowProofModal] = useState(false)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [deletingId,     setDeletingId]     = useState(null)
  const [error,          setError]          = useState('')
  const [uploading,      setUploading]      = useState(false)

  const photos = lead.photos || []

  const uploadPaymentProof = async ({ file, field: amount }) => {
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('payment_proof', file)
      const uploadRes = await api.post('/upload/payment-proof', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      const { url } = uploadRes.data.data || {}
      
      // Update lead with payment proof url and amount
      await api.patch(`/leads/${lead.id}`, {
        payment_proof_url: url,
        payment_proof_amount: amount || null
      })
      
      onUploaded()
      setShowProofModal(false)
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const uploadPhoto = async ({ file, field: name }) => {
    const fd = new FormData()
    fd.append('photo', file)
    fd.append('name', name || file.name)
    await api.post(`/leads/${lead.id}/photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    onUploaded()
  }

  const deletePaymentProof = async () => {
    setError(''); setUploading(true)
    try {
      await api.patch(`/leads/${lead.id}`, {
        payment_proof_url: null,
        payment_proof_amount: null
      })
      onUploaded()
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed')
    } finally {
      setUploading(false)
    }
  }

  const deletePhoto = async docId => {
    setError(''); setDeletingId(docId)
    try {
      await api.delete(`/leads/${lead.id}/photos/${docId}`)
      onUploaded()
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
          <FileText size={18} className="text-amber-500" />
        </div>
        <div>
          <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">EOI Documents</h3>
          <p className="text-xs text-gray-400">Payment proof and booking form photo for this EOI</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5 mb-4">
          <Info size={13} className="text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Payment Proof */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Payment Proof</p>
          <div className="space-y-3">
            {/* Document */}
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-gray-400">Document</p>
              {lead.payment_proof_url ? (
                <div className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-[#0f0f0f] rounded-xl border border-gray-100 dark:border-gray-800 hover:border-brand transition-colors">
                  <a href={resolveFileUrl(lead.payment_proof_url)} target="_blank" rel="noreferrer" className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 text-gray-500">
                      <FileText size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">Payment Proof</p>
                    </div>
                  </a>
                  <button type="button" onClick={deletePaymentProof} disabled={uploading}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 transition-colors flex-shrink-0" title="Delete">
                    {uploading ? <Loader2 size={13} className="animate-spin" /> : <Trash size={13} />}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-400">--</p>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-gray-400">Amount</p>
              {lead.payment_proof_amount ? (
                <p className="text-sm font-semibold text-brand">₹{Number(lead.payment_proof_amount).toLocaleString('en-IN')}</p>
              ) : (
                <p className="text-sm text-gray-400">--</p>
              )}
            </div>
          </div>

          {/* Upload Button */}
          <button type="button" onClick={() => setShowProofModal(true)} disabled={uploading}
            className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-brand hover:text-brand rounded-xl transition-colors disabled:opacity-50">
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Upload Payment Proof
          </button>
        </div>

        {/* Booking Form Photo */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Booking Form Photo</p>
          {photos.length > 0 ? (
            <div className="space-y-1.5 mb-3">
              {photos.map(p => (
                <DocLinkCard key={p.id} url={p.url} name={p.name}
                  onDelete={() => deletePhoto(p.id)} deleting={deletingId === p.id} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 mb-3">--</p>
          )}
          <button type="button" onClick={() => setShowPhotoModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-brand hover:text-brand rounded-xl transition-colors">
            <Upload size={12} /> Upload Photo
          </button>
        </div>
      </div>

      {showProofModal && (
        <UploadDocModal
          title="Upload Payment Proof"
          accept="application/pdf,image/*"
          fieldLabel="Amount"
          fieldPlaceholder="e.g. 50000"
          onClose={() => setShowProofModal(false)}
          onSubmit={uploadPaymentProof}
        />
      )}
      {showPhotoModal && (
        <UploadDocModal
          title="Upload Photo"
          accept="image/jpeg,image/png,image/webp"
          fieldLabel="Name"
          fieldPlaceholder="e.g. Booking form front page"
          onClose={() => setShowPhotoModal(false)}
          onSubmit={uploadPhoto}
        />
      )}
    </div>
  )
}

const activityIconMap = {
  status_change: { emoji: '🔄', color: 'bg-blue-50 dark:bg-blue-900/20', icon: Clock },
  note: { emoji: '📝', color: 'bg-gray-50 dark:bg-gray-800', icon: Info },
  followup: { emoji: '📞', color: 'bg-purple-50 dark:bg-purple-900/20', icon: Phone },
  visit_scheduled: { emoji: '📅', color: 'bg-teal-50 dark:bg-teal-900/20', icon: Calendar },
  visit_done: { emoji: '✅', color: 'bg-green-50 dark:bg-green-900/20', icon: CheckCircle },
  created: { emoji: '🆕', color: 'bg-blue-50 dark:bg-blue-900/20', icon: PlusCircle },
  reassigned: { emoji: '👤', color: 'bg-indigo-50 dark:bg-indigo-900/20', icon: UserCheck },
}

export default function LeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const { currentLead: lead, activities, detailLoading, actionLoading, statuses } = useSelector(s => s.leads)
  const { teamTree: teamMembers = [] } = useSelector(s => s.users)

  const { user: currentUser } = useSelector(s => s.auth)
  const [note, setNote] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [noteError, setNoteError] = useState('')
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)

  const isAdmin = ['admin', 'super_admin'].includes(currentUser?.role)
  const leadStages = statuses?.length > 0 
    ? statuses.filter(s => s.is_active).map(s => ({ value: s.key, label: s.label, color: s.color }))
    : defaultLeadStages

  const statusMap = useMemo(() => {
    const map = {}
    leadStages.forEach(s => { map[s.value] = s })
    return map
  }, [leadStages])

  const currentStatusObj = statusMap[lead?.status] || statusMap[lead?.status?.toLowerCase()]

  // Reassignment history — visible for admin, super_admin, sales_manager
  const canSeeHistory = ['admin', 'super_admin', 'sales_manager'].includes(currentUser?.role)
  const canSeePhone   = ['admin', 'super_admin'].includes(currentUser?.role)
  const [showPhone, setShowPhone] = useState(false)
  const [showAltPhone, setShowAltPhone] = useState(false)
  const [reassignHistory,     setReassignHistory]     = useState([])
  const [historyLoading,      setHistoryLoading]      = useState(false)
  const [historyTotal,        setHistoryTotal]         = useState(0)
  const [historyPage,         setHistoryPage]         = useState(1)
  const [historyTotalPages,   setHistoryTotalPages]   = useState(1)

  const [showReassignAction, setShowReassignAction] = useState(false)
  useEscapeKey(showReassignAction, () => setShowReassignAction(false))
  const [reassignTo,         setReassignTo]         = useState('')
  const [reassignReason,     setReassignReason]     = useState('')
  const [reassigning,        setReassigning]        = useState(false)
  const [reassignError,      setReassignError]      = useState('')
  const [reassignSuccess,    setReassignSuccess]    = useState('')
  const [activeTab,          setActiveTab]          = useState('activity')

  // ── Call Recordings ────────────────────────────────────────────────────────
  const [recordings,     setRecordings]     = useState([])
  const [recsLoading,    setRecsLoading]    = useState(false)
  const [recsUploading,  setRecsUploading]  = useState(false)
  const [recsRecording,  setRecsRecording]  = useState(false)
  const [recDuration,    setRecDuration]    = useState(0)
  const [recsError,      setRecsError]      = useState('')
  const [deletingRecId,  setDeletingRecId]  = useState(null)
  const [playingUrl,     setPlayingUrl]     = useState(null)
  const [editRecId,      setEditRecId]      = useState(null)
  const [editName,       setEditName]       = useState('')
  const [editPhone,      setEditPhone]      = useState('')
  const mediaRecRef = useRef(null)
  const chunksRef   = useRef([])
  const timerRef    = useRef(null)
  const audioRef    = useRef(null)
  const fileInputRef = useRef(null)
  const fmtDur = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const fetchRecordings = async () => {
    setRecsLoading(true)
    try {
      const res = await api.get(`/leads/${id}/call-recordings`)
      setRecordings(res.data.data?.recordings || [])
    } catch { setRecordings([]) }
    finally { setRecsLoading(false) }
  }

  const uploadRecordingFile = async (fileOrBlob, filename) => {
    setRecsError('')
    setRecsUploading(true)
    try {
      const fd = new FormData()
      fd.append('voice_recording', fileOrBlob, filename)
      const uploadRes = await api.post('/leads/upload-recording', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const { url, filename: savedName } = uploadRes.data.data
      await api.post(`/leads/${id}/call-recordings`, {
        call_recording: [{ url, name: savedName || filename, phone_number: '' }],
      })
      fetchRecordings()
      dispatch(fetchLeadActivities(id))
    } catch (e) {
      setRecsError(e.response?.data?.message || 'Upload failed')
    } finally {
      setRecsUploading(false)
    }
  }

  const startRecording = async () => {
    setRecsError('')
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
        await uploadRecordingFile(blob, `recording_${Date.now()}.${mime.includes('webm') ? 'webm' : 'ogg'}`)
      }
      mr.start()
      mediaRecRef.current = mr
      setRecsRecording(true)
      setRecDuration(0)
      timerRef.current = setInterval(() => setRecDuration(d => d + 1), 1000)
    } catch {
      setRecsError('Microphone access denied.')
    }
  }

  const stopRecording = () => { mediaRecRef.current?.stop(); setRecsRecording(false) }

  const deleteRecording = async (recId) => {
    setDeletingRecId(recId)
    try {
      await api.delete(`/leads/${id}/call-recordings/${recId}`)
      setRecordings(prev => prev.filter(r => r.id !== recId))
      dispatch(fetchLeadActivities(id))
    } catch (e) {
      setRecsError(e.response?.data?.message || 'Delete failed')
    } finally {
      setDeletingRecId(null)
    }
  }

  const saveRecordingMeta = async () => {
    try {
      await api.patch(`/leads/${id}/call-recordings/${editRecId}`, { name: editName, phone_number: editPhone })
      setRecordings(prev => prev.map(r => r.id === editRecId ? { ...r, name: editName, phone_number: editPhone } : r))
      setEditRecId(null)
    } catch (e) {
      setRecsError(e.response?.data?.message || 'Update failed')
    }
  }

  const togglePlay = (url) => {
    if (playingUrl === url) {
      audioRef.current?.pause(); setPlayingUrl(null)
    } else {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
      const a = new Audio(url)
      a.onended = () => setPlayingUrl(null)
      a.play()
      audioRef.current = a
      setPlayingUrl(url)
    }
  }

  const fetchReassignHistory = async (pg = 1) => {
    if (!canSeeHistory || !id) return
    try {
      setHistoryLoading(true)
      const res = await api.get(`/leads/${id}/reassignment-history`, { params: { page: pg, per_page: 5 } })
      const d = res.data.data
      setReassignHistory(d.history || [])
      setHistoryTotal(d.total_reassignments || 0)
      setHistoryPage(d.pagination?.page || 1)
      setHistoryTotalPages(d.pagination?.total_pages || 1)
    } catch (e) { console.error('Reassign history failed:', e.message) }
    finally { setHistoryLoading(false) }
  }

  useEffect(() => {
    dispatch(fetchLeadById(id))
    dispatch(fetchLeadActivities(id))
    if (currentUser?.id) dispatch(fetchTeamTree(currentUser.id))
    dispatch(fetchLeadStatuses())
    fetchReassignHistory(1)
    fetchRecordings()
    return () => dispatch(clearCurrentLead())
  }, [dispatch, id, currentUser?.id])



  useEffect(() => {
    if (lead?.status) setNewStatus(lead.status)
  }, [lead])

  if (detailLoading && !lead) return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <Loader2 className="animate-spin text-brand mb-4" size={40} />
      <p className="text-gray-500 font-medium">Loading lead profile...</p>
    </div>
  )

  if (!lead && !detailLoading) return (
    <div className="flex items-center justify-center h-[60vh] text-gray-400 dark:text-[#888]">
      <div className="text-center max-w-sm px-6">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">🔍</div>
        <h3 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-2">Lead not found</h3>
        <p className="text-sm mb-6">The lead you're looking for doesn't exist or has been moved.</p>
        <Button variant="outline" onClick={() => navigate('/leads')} className="w-full rounded-xl">Back to Leads</Button>
      </div>
    </div>
  )

  const stageIndex = leadStages.findIndex(s => s.value === lead?.status)
  // assigned_to from API is an object { id, full_name, phone } — read directly
  const assignedUser = lead?.assigned_to && typeof lead.assigned_to === 'object'
    ? lead.assigned_to
    : null

  const salesExecs = teamMembers.filter(u => !u.is_self)



  const handleReassign = async () => {
    if (!reassignTo) { setReassignError('Please select a team member'); return }
    setReassignError(''); setReassigning(true)
    try {
      await api.patch(`/leads/${id}/reassign`, { assigned_to: reassignTo, reason: reassignReason || undefined })
      setReassignSuccess('Lead reassigned successfully!')
      fetchReassignHistory(1)
      dispatch(fetchLeadById(id))
      setTimeout(() => { setShowReassignAction(false); setReassignTo(''); setReassignReason(''); setReassignSuccess('') }, 800)
    } catch (e) { setReassignError(e.response?.data?.message || 'Reassignment failed') }
    finally { setReassigning(false) }
  }

  const handleAddNote = async () => {
    if (!note.trim()) { setNoteError('Note cannot be empty'); return }
    setNoteError('')
    const result = await dispatch(addLeadNote({ id, note }))
    if (addLeadNote.fulfilled.match(result)) {
      setNote('')
      dispatch(fetchLeadActivities(id))
    }
  }

  const handleStatusChange = async () => {
    if (newStatus === lead.status) return
    await dispatch(updateLeadStatus({ id, status: newStatus }))
    dispatch(fetchLeadById(id))
    dispatch(fetchLeadActivities(id))
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12">
      {/* Top Header / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <button
          onClick={() => navigate('/leads')}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand transition-colors group flex-shrink-0"
        >
          <div className="w-8 h-8 rounded-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 flex items-center justify-center group-hover:border-brand/30 transition-all">
            <ArrowLeft size={16} />
          </div>
          Back to Leads
        </button>

        <div className="flex gap-2 overflow-x-auto whitespace-nowrap pb-1 -mb-1 sm:pb-0 sm:-mb-0">
          {lead?.status !== 'Booked' && lead?.status !== 'Lost' && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-purple-200 hover:border-purple-300 hover:bg-purple-50 text-purple-600 dark:border-purple-900/30 dark:hover:bg-purple-900/20 flex-shrink-0"
              onClick={() => setShowConvertModal(true)}
            >
              <CalendarPlus size={14} className="mr-2" /> Convert Lead
            </Button>
          )}
          <Button variant="outline" size="sm" className="rounded-xl flex-shrink-0">
            <ExternalLink size={14} className="mr-2" /> Share
          </Button>
          <Button size="sm" className="rounded-xl px-5 font-bold shadow-lg shadow-blue-100/50 flex-shrink-0">
            Edit Lead
          </Button>
        </div>
      </div>

      {lead && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Main Info (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. Profile Header Card */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] overflow-hidden shadow-sm hover:shadow-md transition-all">
              <div className="h-24 bg-gradient-to-r from-blue-500 to-[#0082f3] relative opacity-10 dark:opacity-20" />
              <div className="px-8 pb-8 relative">
                <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-10">
                  <div className="p-1.5 bg-white dark:bg-[#1a1a1a] rounded-[28px] shadow-xl">
                    <Avatar name={lead.name} size="2xl" className="rounded-[22px] w-24 h-24 md:w-32 md:h-32 text-3xl" />
                  </div>
                  <div className="flex-1 space-y-2 mb-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">{lead.name}</h1>
                      <Badge 
                        label={lead.status || 'New'} 
                        color={currentStatusObj?.color} 
                        className="px-3 py-1 text-xs" 
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-brand" /> ID: {lead.id?.slice?.(0, 8) || lead.id}</span>
                      <span className="flex items-center gap-1.5"><Calendar size={14} /> Created {new Date(lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-10">
                  {/* Phone Number tile — smart: admin sees full, others see masked + view */}
                  <div className="p-4 rounded-2xl border border-gray-50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-[#0f0f0f]/50">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-600 bg-blue-50 dark:bg-opacity-10"><Phone size={14}/></div>
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Phone Number</span>
                    </div>
                    {canSeePhone ? (
                      <PhoneActions phone={lead.phone}><span className="text-sm font-semibold text-brand hover:underline">{lead.phone}</span></PhoneActions>
                    ) : showPhone ? (
                      <PhoneActions phone={lead.phone}><span className="text-sm font-semibold text-brand hover:underline">{lead.phone}</span></PhoneActions>
                    ) : (
                      <div>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">*****{lead.phone?.slice(-5)}</p>
                        <button onClick={() => { setShowPhone(true); setShowAltPhone(false); }}
                          className="flex items-center gap-1.5 text-xs font-semibold text-brand bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 px-2.5 py-1.5 rounded-lg transition-colors">
                          <Eye size={11}/> View
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Alt Phone tile */}
                  <div className="p-4 rounded-2xl border border-gray-50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-[#0f0f0f]/50">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-indigo-600 bg-indigo-50 dark:bg-opacity-10"><Phone size={14}/></div>
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Alt Phone</span>
                    </div>
                    {lead.alternate_phone_number ? (
                      canSeePhone ? (
                        <PhoneActions phone={lead.alternate_phone_number}><span className="text-sm font-semibold text-brand hover:underline">{lead.alternate_phone_number}</span></PhoneActions>
                      ) : showAltPhone ? (
                        <PhoneActions phone={lead.alternate_phone_number}><span className="text-sm font-semibold text-brand hover:underline">{lead.alternate_phone_number}</span></PhoneActions>
                      ) : (
                        <div>
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">*****{lead.alternate_phone_number?.slice(-5)}</p>
                          <button onClick={() => { setShowAltPhone(true); setShowPhone(false); }}
                            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 px-2.5 py-1.5 rounded-lg transition-colors">
                            <Eye size={11}/> View
                          </button>
                        </div>
                      )
                    ) : <p className="text-sm font-semibold text-gray-400">--</p>}
                  </div>

                  {/* Email + Location + Budget tiles */}
                  {[
                    { icon: Mail,   label: 'Email Address',    color: 'text-purple-600 bg-purple-50', value: lead.email, href: lead.email ? `mailto:${lead.email}` : null },
                    { icon: MapPin, label: 'Finding Location', color: 'text-teal-600 bg-teal-50',     value: lead.location_preference, href: null },
                  ].map(({ icon: Icon, label, value, color, href }) => (
                    <div key={label} className="p-4 rounded-2xl border border-gray-50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-[#0f0f0f]/50">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color} dark:bg-opacity-10`}><Icon size={14}/></div>
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
                      </div>
                      {href ? <a href={href} className="text-sm font-semibold text-brand hover:underline truncate block">{value}</a>
                             : <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{value || '--'}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Configuration / Notes */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <MessageSquare size={18} className="text-brand" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">Configuration & Notes</h3>
                  <p className="text-xs text-gray-400">Additional lead requirements and notes</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-[#0f0f0f] rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Configuration</p>
                  {parseConfigList(lead.configuration).length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {parseConfigList(lead.configuration).map((c, i) => (
                        <span key={i} className="px-2.5 py-1 bg-brand/10 text-brand text-xs font-semibold rounded-full">{c}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">--</p>
                  )}
                </div>
                <div className="bg-gray-50 dark:bg-[#0f0f0f] rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Notes</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{lead.notes || '--'}</p>
                </div>
              </div>
            </div>

            {/* EOI Documents — payment proof + booking form photo, once the lead reaches EOI stage */}
            {lead.status === 'eoi' && (
              <EoiDocumentsSection lead={lead} onUploaded={() => dispatch(fetchLeadById(id))} />
            )}

            {/* 3. Activity History + Reassignment History — tabbed */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-8 shadow-sm">

              {/* Tab header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div className="flex gap-1 p-1 bg-gray-100 dark:bg-[#0f0f0f] rounded-xl w-full sm:w-fit overflow-x-auto whitespace-nowrap">
                  <button onClick={() => setActiveTab('activity')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-shrink-0 ${activeTab === 'activity' ? 'bg-white dark:bg-[#1a1a1a] text-brand shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                    <Clock size={14} /> Activity
                  </button>
                  <button onClick={() => { setActiveTab('recordings'); if (recordings.length === 0) fetchRecordings() }}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-shrink-0 ${activeTab === 'recordings' ? 'bg-white dark:bg-[#1a1a1a] text-brand shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                    <Mic size={14} /> Recordings
                    {recordings.length > 0 && <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand/10 text-brand">{recordings.length}</span>}
                  </button>
                  {canSeeHistory && (
                    <button onClick={() => { setActiveTab('history'); if (reassignHistory.length === 0) fetchReassignHistory(1) }}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-shrink-0 ${activeTab === 'history' ? 'bg-white dark:bg-[#1a1a1a] text-brand shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                      <History size={14} /> Reassign History
                      {historyTotal > 0 && <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">{historyTotal}</span>}
                    </button>
                  )}
                </div>

                {/* Reassign action button — only on history tab for canSeeHistory */}
                {canSeeHistory && activeTab === 'history' && (
                  <button onClick={() => { setShowReassignAction(true); setReassignTo(''); setReassignReason(''); setReassignError(''); setReassignSuccess('') }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold transition-colors border border-indigo-100 dark:border-indigo-800/40 flex-shrink-0 self-start sm:self-auto">
                    <Users size={13} /> Reassign Lead
                  </button>
                )}
              </div>

              {/* ── Activity tab ── */}
              {activeTab === 'activity' && (
                <div>
                  {/* Add Note Input */}
                  <div className="relative mb-10">
                    <textarea
                      value={note}
                      onChange={e => { setNote(e.target.value); setNoteError('') }}
                      placeholder="Type a new update or note here..."
                      rows={2}
                      className="w-full pl-5 pr-14 py-4 text-sm bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-2xl outline-none focus:border-brand focus:ring-4 focus:ring-brand/5 transition-all resize-none text-gray-900 dark:text-gray-100 placeholder-gray-400 shadow-inner"
                    />
                    <button
                      onClick={handleAddNote}
                      disabled={actionLoading || !note.trim()}
                      className="absolute right-3 bottom-3 w-10 h-10 bg-brand text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all"
                    >
                      {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                    {noteError && <p className="text-xs text-red-500 mt-2 ml-2">{noteError}</p>}
                  </div>

                  {activities.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 dark:bg-[#0f0f0f] rounded-[24px] border-2 border-dashed border-gray-100 dark:border-gray-800">
                      <div className="text-4xl mb-3">📋</div>
                      <p className="text-sm font-medium text-gray-500">No activity recorded yet</p>
                    </div>
                  ) : (
                    <div className="relative ml-4">
                      <div className="absolute left-0 top-2 bottom-0 w-[2px] bg-gray-100 dark:bg-gray-800" />
                      <div className="space-y-8 max-h-[calc(100vh-400px)] overflow-auto overflow-x-hidden">
                        {activities.map((activity, idx) => {
                          const config = activityIconMap[activity.type] || { emoji: '📌', color: 'bg-gray-50 dark:bg-gray-800', icon: Info }
                          return (
                            <div key={activity.id} className="relative pl-10 group">
                              <div className={`absolute left-[-5px] top-2 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#1a1a1a] z-10 transition-transform group-hover:scale-125 ${idx === 0 ? 'bg-brand shadow-[0_0_0_4px_rgba(0,130,243,0.15)]' : 'bg-gray-300 dark:bg-gray-600'}`} />
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500">
                                    {activity.created_at ? new Date(activity.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : activity.timestamp}
                                  </span>
                                  <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${config.color} dark:bg-opacity-10 border border-current opacity-60`}>
                                    {activity.type?.replace('_', ' ')}
                                  </div>
                                </div>
                                <div className="bg-gray-50/50 dark:bg-[#0f0f0f]/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 group-hover:border-brand/20 transition-all group-hover:bg-white dark:group-hover:bg-[#1a1a1a]">
                                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed">{activity.note}</p>
                                  {activity.performed_by && (
                                    <div className="mt-3 flex items-center gap-2">
                                      <Avatar name={activity.performed_by} size="xs" />
                                      <span className="text-[11px] text-gray-400">Added by <span className="text-gray-600 dark:text-gray-200 font-semibold">{activity.performed_by}</span></span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}


              {/* ── Recordings tab ── */}
              {activeTab === 'recordings' && (
                <div className="space-y-4">
                  {/* Upload/Record actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {recsRecording ? (
                      <button type="button" onClick={stopRecording}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white rounded-xl animate-pulse">
                        <MicOff size={13} /> Stop · {fmtDur(recDuration)}
                      </button>
                    ) : (
                      <button type="button" onClick={startRecording} disabled={recsUploading}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-brand hover:text-brand rounded-xl disabled:opacity-50 transition-all">
                        <Mic size={13} /> Record
                      </button>
                    )}
                    <label className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-brand hover:text-brand rounded-xl cursor-pointer transition-all ${recsUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                      {recsUploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                      {recsUploading ? 'Uploading…' : 'Upload file'}
                      <input ref={fileInputRef} type="file" accept="audio/*,.webm,.ogg,.mp3,.wav,.aac,.m4a" className="hidden"
                        onChange={async e => {
                          const f = e.target.files?.[0]
                          if (!f) return
                          e.target.value = ''
                          await uploadRecordingFile(f, f.name)
                        }} />
                    </label>
                    <button onClick={fetchRecordings} className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-brand transition-colors">
                      <RefreshCw size={13} className={recsLoading ? 'animate-spin' : ''} />
                    </button>
                  </div>

                  {recsError && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600">
                      <X size={12} /> {recsError}
                      <button onClick={() => setRecsError('')} className="ml-auto"><X size={11} /></button>
                    </div>
                  )}

                  {/* Edit metadata inline */}
                  {editRecId && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl space-y-2">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Edit recording details</p>
                      <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Label e.g. First call - Suresh"
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100" />
                      <input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Phone e.g. +919876543210"
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100" />
                      <div className="flex gap-2">
                        <button onClick={() => setEditRecId(null)} className="flex-1 py-1.5 text-xs text-gray-500 border border-gray-200 dark:border-gray-700 rounded-lg">Cancel</button>
                        <button onClick={saveRecordingMeta} className="flex-1 py-1.5 text-xs font-semibold bg-brand text-white rounded-lg">Save</button>
                      </div>
                    </div>
                  )}

                  {/* Recordings list */}
                  {recsLoading ? (
                    <div className="flex items-center justify-center py-8 text-gray-400">
                      <Loader2 size={20} className="animate-spin" />
                    </div>
                  ) : recordings.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
                        <Mic size={20} className="opacity-40" />
                      </div>
                      <p className="text-sm">No recordings yet</p>
                      <p className="text-xs mt-1">Record or upload a call above</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recordings.map(rec => (
                        <div key={rec.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#141414] border border-gray-100 dark:border-gray-800 rounded-xl">
                          <button onClick={() => togglePlay(rec.url)}
                            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${playingUrl === rec.url ? 'bg-brand text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-brand hover:text-white hover:border-brand'}`}>
                            {playingUrl === rec.url ? <Pause size={14} /> : <Play size={14} />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{rec.name || 'Recording'}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {rec.phone_number && <span className="text-xs text-gray-400">{rec.phone_number}</span>}
                              <span className="text-[11px] text-gray-300 dark:text-gray-600">
                                {new Date(rec.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {rec.uploaded_by_name && <span className="text-[11px] text-gray-400">· {rec.uploaded_by_name}</span>}
                            </div>
                          </div>
                          <button onClick={() => { setEditRecId(rec.id); setEditName(rec.name || ''); setEditPhone(rec.phone_number || '') }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-brand transition-colors" title="Edit">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => deleteRecording(rec.id)} disabled={deletingRecId === rec.id}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                            {deletingRecId === rec.id ? <Loader2 size={13} className="animate-spin" /> : <Trash size={13} />}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Reassignment History tab ── */}
              {activeTab === 'history' && canSeeHistory && (
                <div>
                  {historyLoading ? (
                    <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse"/>)}</div>
                  ) : reassignHistory.length === 0 ? (
                    <div className="text-center py-10 bg-gray-50 dark:bg-[#0f0f0f] rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                      <div className="text-3xl mb-2">🔄</div>
                      <p className="text-sm text-gray-400">This lead has never been reassigned</p>
                      <button onClick={() => setShowReassignAction(true)}
                        className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 text-xs font-semibold mx-auto transition-colors hover:bg-indigo-100">
                        <Users size={13}/> Reassign now
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {reassignHistory.map((h, i) => (
                        <div key={h.id} className="p-4 rounded-2xl bg-gray-50 dark:bg-[#0f0f0f] border border-gray-100 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-900/40 transition-all">
                          {/* From → To */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar name={h.from?.name || 'Unassigned'} size="xs"/>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{h.from?.name || <span className="italic text-gray-400">Unassigned</span>}</p>
                                {h.from?.role && <p className="text-[9px] text-gray-400 capitalize">{h.from.role.replace(/_/g,' ')}</p>}
                              </div>
                            </div>
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                              <ArrowRight size={11} className="text-indigo-500"/>
                            </div>
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar name={h.to?.name} size="xs"/>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{h.to?.name}</p>
                                {h.to?.role && <p className="text-[9px] text-gray-400 capitalize">{h.to.role.replace(/_/g,' ')}</p>}
                              </div>
                            </div>
                            {i === 0 && <span className="ml-auto flex-shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Latest</span>}
                          </div>
                          {h.reason && (
                            <div className="mt-2.5 flex items-start gap-1.5">
                              <Info size={11} className="text-gray-400 mt-0.5 flex-shrink-0"/>
                              <p className="text-xs text-gray-500 dark:text-gray-400 italic">"{h.reason}"</p>
                            </div>
                          )}
                          <div className="mt-2.5 flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-1.5">
                              <Avatar name={h.performed_by?.name} size="xs"/>
                              <span className="text-[10px] text-gray-400">By <span className="font-medium text-gray-600 dark:text-gray-300">{h.performed_by?.name}</span>
                                {h.performed_by?.role && <span> · {h.performed_by.role.replace(/_/g,' ')}</span>}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400 flex-shrink-0">
                              {h.reassigned_at ? new Date(h.reassigned_at).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'}
                            </span>
                          </div>
                        </div>
                      ))}
                      {historyTotalPages > 1 && (
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-xs text-gray-400">Page {historyPage} of {historyTotalPages}</span>
                          <div className="flex gap-2">
                            <button disabled={historyPage<=1} onClick={()=>{const p=historyPage-1;setHistoryPage(p);fetchReassignHistory(p)}} className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-40 hover:border-indigo-300 hover:text-indigo-500 transition-colors">Prev</button>
                            <button disabled={historyPage>=historyTotalPages} onClick={()=>{const p=historyPage+1;setHistoryPage(p);fetchReassignHistory(p)}} className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-40 hover:border-indigo-300 hover:text-indigo-500 transition-colors">Next</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 4. Status Update Card */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <CheckCircle size={18} className="text-green-500" /> Pipeline Status
                </h3>
                {isAdmin && (
                  <button onClick={() => setShowStatusModal(true)} 
                    className="p-2 text-gray-400 hover:text-brand hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                    title="Manage Statuses"
                  >
                    <Settings2 size={16} />
                  </button>
                )}
              </div>
              
              <div className="space-y-5">
                <div className="flex items-center gap-3 p-3 bg-gray-50/50 dark:bg-[#0f0f0f]/50 border border-gray-100 dark:border-gray-800 rounded-2xl">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                    style={{ backgroundColor: currentStatusObj?.color || '#6b7280' }}
                  >
                    <RefreshCw size={18} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Current Stage</div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">{currentStatusObj?.label || 'New'}</div>
                  </div>
                </div>

                <CustomSelect
                  value={newStatus}
                  onChange={setNewStatus}
                  options={leadStages}
                  placeholder="Select new stage..."
                />
                
                <Button 
                  className="w-full rounded-2xl py-3 font-bold shadow-lg shadow-blue-500/20" 
                  onClick={handleStatusChange} 
                  loading={actionLoading} 
                  disabled={newStatus === lead.status}
                >
                  Update Stage
                </Button>

                <div className="pt-4 border-t border-gray-50 dark:border-gray-800">
                  <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 px-1">
                    <span>Progress</span>
                    <span>{stageIndex >= 0 ? Math.round(((stageIndex + 1) / leadStages.length) * 100) : 0}%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-brand rounded-full transition-all duration-700 ease-out shadow-[0_0_12px_rgba(0,130,243,0.4)]"
                      style={{ width: `${stageIndex >= 0 ? ((stageIndex + 1) / leadStages.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Assigned Team Member */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
              <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <UserCheck size={18} className="text-blue-500" /> Ownership
              </h3>
              
              <div className="p-4 rounded-[20px] bg-gray-50/50 dark:bg-[#0f0f0f]/50 border border-gray-50 dark:border-gray-800">
                {assignedUser ? (
                  <div className="flex items-center gap-4">
                    <Avatar name={assignedUser.full_name} size="lg" className="rounded-2xl" />
                    <div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">{assignedUser.full_name}</div>
                      <div className="text-[10px] font-bold text-brand uppercase tracking-wider mt-0.5">Sales Executive</div>
                      {assignedUser.phone && <div className="text-[11px] text-gray-400 mt-1">{assignedUser.phone}</div>}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-400 italic mb-3">No one assigned yet</p>
                    <Button variant="outline" size="sm" className="rounded-xl w-full text-xs">Assign Member</Button>
                  </div>
                )}
              </div>
            </div>

            {/* 6. Schedule — Callback & Follow-up */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
              <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <Clock size={18} className="text-amber-500" /> Schedule
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Callback Time', value: lead.callback_time, icon: PhoneCallIcon, color: 'text-amber-600 bg-amber-50' },
                  { label: 'Next Follow-up', value: lead.next_followup_time, icon: Calendar, color: 'text-purple-600 bg-purple-50' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/50 dark:bg-[#0f0f0f]/50 border border-gray-50 dark:border-gray-800">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color} dark:bg-opacity-10 flex-shrink-0`}>
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                        {value ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 7. Lead Details — Source, Budget, Project, Conversion */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
              <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <Info size={18} className="text-teal-500" /> Lead Details
              </h3>

              <div className="space-y-3">
                {[
                  { label: 'Source',    value: lead.source_name || lead.source || '--' },
                  { label: 'Budget',    value: lead.budget || '--' },
                  { label: 'Project',   value: lead.project_name || '--' },
                  { label: 'City',      value: lead.project_city || lead.project?.city || '--' },
                  { label: 'Locality',  value: lead.project_locality || lead.project?.locality || '--' },
                  { label: 'Converted', value: lead.is_converted ? `Yes · ${new Date(lead.converted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : 'No' },
                  { label: 'Created',   value: lead.created_at ? new Date(lead.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                    <span className="text-xs font-medium text-gray-400">{label}</span>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 text-right max-w-[60%] truncate">{value}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}



      {/* Reassign Action Modal */}
      {showReassignAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowReassignAction(false)}>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl w-full max-w-md"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-display text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Users size={16} className="text-indigo-500"/> Reassign Lead
              </h3>
              <button onClick={() => setShowReassignAction(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <ChevronDown size={16} className="rotate-90"/>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Current lead info */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-[#0f0f0f] border border-gray-100 dark:border-gray-800">
                <Avatar name={lead?.name} size="sm"/>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{lead?.name}</p>
                  <p className="text-xs text-gray-400">{canSeePhone ? lead?.phone : '*****' + lead?.phone?.slice(-5)}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-[10px] text-gray-400">Currently assigned to</p>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {assignedUser?.full_name || 'Unassigned'}
                  </p>
                </div>
              </div>

              <CustomSelect
                label="Assign To *"
                value={reassignTo}
                onChange={setReassignTo}
                options={salesExecs.map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name} · ${u.role.replace(/_/g,' ')}` }))}
                placeholder="Select team member"
              />

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Reason <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  value={reassignReason}
                  onChange={e => setReassignReason(e.target.value)}
                  placeholder="e.g. Better territorial alignment"
                  className="w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm"
                />
              </div>

              {reassignError   && <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5"><Info size={13} className="text-red-500"/><p className="text-xs text-red-600">{reassignError}</p></div>}
              {reassignSuccess && <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-2.5"><CheckCircle size={13} className="text-green-500"/><p className="text-xs text-green-600">{reassignSuccess}</p></div>}
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button onClick={() => setShowReassignAction(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button onClick={handleReassign} disabled={!reassignTo || reassigning}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">
                {reassigning ? <><Loader2 size={14} className="animate-spin"/> Reassigning…</> : <><Users size={14}/> Reassign</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {showConvertModal && lead && (
        <ConvertLeadModal
          lead={lead}
          onClose={() => setShowConvertModal(false)}
          onSuccess={(type) => {
            setShowConvertModal(false)
            dispatch(fetchLeadById(id))
            dispatch(fetchLeadActivities(id))
          }}
        />
      )}

      {/* Lead Status Management Modal */}
      <LeadStatusManagementModal 
        isOpen={showStatusModal} 
        onClose={() => setShowStatusModal(false)} 
      />
    </div>
  )
}