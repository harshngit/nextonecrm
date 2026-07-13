import { useState, useEffect } from 'react'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  ArrowLeft, Building2, MapPin, Loader2, User,
  Info, Search, RefreshCw, Download, Trash2,
  FileText, FileImage, Upload, X, CheckCircle2,
  FolderOpen, FileArchive, Plus, ShieldCheck, AlertCircle,
  Share2, Mail, SendHorizonal, Layers, ChevronDown,
} from 'lucide-react'
import {
  fetchProjectById, fetchProjectLeads, clearCurrentProject,
  fetchProjectDocuments, deleteProjectDocument,
} from '../store/projectSlice'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import api from '../api/axios'

// ─── helpers ─────────────────────────────────────────────────────────────────
const fmtSize = (bytes) => {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const FileIcon = ({ mime, size = 16, className = '' }) => {
  const isImage = mime?.startsWith('image/')
  return isImage
    ? <FileImage size={size} className={className || 'text-blue-500'} />
    : <FileText  size={size} className={className || 'text-red-500'} />
}

// ─── Share Project Modal ──────────────────────────────────────────────────────
function ShareProjectModal({ projectId, projectName, onClose, projectDocuments }) {
  useEscapeKey(true, onClose)
  const ic = "w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-brand text-gray-900 shadow-sm transition-all"
  const [emailInput, setEmailInput] = useState('')
  const [emails,     setEmails]     = useState([])
  const [message,    setMessage]    = useState('Hi, here are the project details!')
  const [selectedDocuments, setSelectedDocuments] = useState([])
  const [selectedFields, setSelectedFields] = useState(['name', 'price_range', 'configurations'])
  const [sending,    setSending]    = useState(false)
  const [success,    setSuccess]    = useState('')
  const [error,      setError]      = useState('')
  const [showDocumentsDropdown, setShowDocumentsDropdown] = useState(false)
  const [showFieldsDropdown, setShowFieldsDropdown] = useState(false)

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const availableFields = [
    { key: 'name', label: 'Project Name' },
    { key: 'developer', label: 'Developer' },
    { key: 'city', label: 'City' },
    { key: 'locality', label: 'Locality' },
    { key: 'price_range', label: 'Price Range' },
    { key: 'total_units', label: 'Total Units' },
    { key: 'rera_number', label: 'RERA Number' },
    { key: 'configurations', label: 'Configurations' },
    { key: 'status', label: 'Status' },
    { key: 'description', label: 'Description' }
  ]

  const allDocuments = [
    ...(projectDocuments?.unit_plans || []),
    ...(projectDocuments?.creatives || []),
    ...(projectDocuments?.payment_plans || []),
    ...(projectDocuments?.videos || [])
  ]

  const addEmail = () => {
    const val = emailInput.trim()
    if (!val) return
    if (!emailRegex.test(val)) { setError(`"${val}" is not a valid email`); return }
    if (emails.includes(val))  { setError('This email is already added'); return }
    setEmails(prev => [...prev, val])
    setEmailInput('')
    setError('')
  }

  const handleKeyDown = e => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addEmail() }
  }

  const removeEmail = email => setEmails(prev => prev.filter(e => e !== email))

  const toggleDocument = (docId) => {
    setSelectedDocuments(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    )
  }

  const toggleField = (fieldKey) => {
    setSelectedFields(prev =>
      prev.includes(fieldKey)
        ? prev.filter(key => key !== fieldKey)
        : [...prev, fieldKey]
    )
  }

  const toggleAllDocuments = () => {
    if (selectedDocuments.length === allDocuments.length) {
      setSelectedDocuments([])
    } else {
      setSelectedDocuments(allDocuments.map(doc => doc.id))
    }
  }

  const handleSend = async () => {
    let finalEmails = [...emails]
    const typed = emailInput.trim()
    if (typed) {
      if (!emailRegex.test(typed)) { setError(`"${typed}" is not a valid email`); return }
      if (!finalEmails.includes(typed)) finalEmails.push(typed)
    }
    if (finalEmails.length === 0) { setError('Add at least one email address'); return }
    setSending(true); setError(''); setSuccess('')
    try {
      const res = await api.post(`/projects/${projectId}/share`, {
        emails: finalEmails,
        message: message.trim() || undefined,
        document_ids: selectedDocuments.length > 0 ? selectedDocuments : undefined,
        fields: selectedFields.length > 0 ? selectedFields : undefined
      })
      setSuccess(`Project shared with ${res.data.data?.total_sent || finalEmails.length} recipient${finalEmails.length > 1 ? 's' : ''}!`)
      setTimeout(() => onClose(), 2000)
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to send. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose} style={{ margin: '0px' }}>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
              <Share2 size={15} className="text-brand" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Share Project</h3>
              <p className="text-[11px] text-gray-400 truncate max-w-[220px]">{projectName}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              Send to <span className="text-gray-400 font-normal">(press Enter or comma to add multiple)</span>
            </label>
            {emails.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {emails.map(email => (
                  <span key={email} className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 bg-brand/10 text-brand text-xs font-medium rounded-full">
                    <Mail size={10} />
                    {email}
                    <button onClick={() => removeEmail(email)} className="ml-0.5 hover:text-red-500 transition-colors"><X size={11} /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={emailInput}
                onChange={e => { setEmailInput(e.target.value); setError('') }}
                onKeyDown={handleKeyDown}
                onBlur={addEmail}
                placeholder="client@example.com"
                type="email"
                className={ic + ' flex-1'}
              />
              <button onClick={addEmail} className="px-3 py-2 text-xs font-semibold text-brand border border-brand/30 hover:bg-brand/10 rounded-xl transition-colors">
                Add
              </button>
            </div>
          </div>

          {/* Personal message */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              Personal message <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea rows={3} value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Hi, here are the project details!"
              className={ic} />
          </div>

          {/* Fields to include */}
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              Fields to include
            </label>
            <button onClick={() => setShowFieldsDropdown(!showFieldsDropdown)}
              className={ic + " flex items-center justify-between"}>
              <span className="text-sm">
                {selectedFields.length === 0 ? 'Select fields' : `${selectedFields.length} field${selectedFields.length > 1 ? 's' : ''} selected`}
              </span>
              <ChevronDown size={14} className={`transition-transform ${showFieldsDropdown ? 'rotate-180' : ''}`}/>
            </button>
            {showFieldsDropdown && (
              <div className="absolute w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                {availableFields.map(field => (
                  <label key={field.key} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl">
                    <input type="checkbox"
                      checked={selectedFields.includes(field.key)}
                      onChange={() => toggleField(field.key)}
                      className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand"
                    />
                    <span className="text-sm text-gray-700">{field.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Documents to include */}
          {allDocuments.length > 0 && (
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                Documents to include
              </label>
              <button onClick={() => setShowDocumentsDropdown(!showDocumentsDropdown)}
                className={ic + " flex items-center justify-between"}>
                <span className="text-sm">
                  {selectedDocuments.length === 0 ? 'Select documents' : `${selectedDocuments.length} document${selectedDocuments.length > 1 ? 's' : ''} selected`}
                </span>
                <ChevronDown size={14} className={`transition-transform ${showDocumentsDropdown ? 'rotate-180' : ''}`}/>
              </button>
              {showDocumentsDropdown && (
                <div className="absolute w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                  <label className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 border-b border-gray-100">
                    <input type="checkbox"
                      checked={selectedDocuments.length === allDocuments.length && allDocuments.length > 0}
                      onChange={toggleAllDocuments}
                      className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand"
                    />
                    <span className="text-sm font-semibold text-gray-700">Select All</span>
                  </label>
                  {allDocuments.map(doc => (
                    <label key={doc.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50">
                      <input type="checkbox"
                        checked={selectedDocuments.includes(doc.id)}
                        onChange={() => toggleDocument(doc.id)}
                        className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate">{doc.file_name}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {error   && <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5"><AlertCircle size={13} className="text-red-500 flex-shrink-0"/><p className="text-xs text-red-600">{error}</p></div>}
          {success && <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5"><CheckCircle2 size={13} className="text-green-500 flex-shrink-0"/><p className="text-xs text-green-600">{success}</p></div>}
        </div>

        {/* Footer buttons */}
        <div className="px-6 pb-5 flex gap-3 sticky bottom-0 bg-white border-t border-gray-100 pt-4">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSend} disabled={sending || (emails.length === 0 && !emailInput.trim())}
            className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand/90 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">
            {sending ? <><Loader2 size={14} className="animate-spin"/>Sending…</> : <><SendHorizonal size={14}/>Share Project</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Document Upload Modal ────────────────────────────────────────────────────
function UploadDocsModal({ projectId, onClose, onSuccess, initialType = null }) {
  useEscapeKey(true, onClose)
  const [unitFiles,     setUnitFiles]     = useState([])
  const [creativeFiles, setCreativeFiles] = useState([])
  const [paymentPlanFiles, setPaymentPlanFiles] = useState([])
  const [videoFiles,    setVideoFiles]    = useState([])
  const [uploading,     setUploading]     = useState(false)
  const [error,         setError]         = useState('')
  const [success,       setSuccess]       = useState('')

  const addFiles = (prev, newFiles) => {
    const out = [...prev]
    Array.from(newFiles).forEach(f => {
      if (!out.find(x => x.name === f.name && x.size === f.size)) out.push(f)
    })
    return out
  }

  const upload = async () => {
    if (!unitFiles.length && !creativeFiles.length && !paymentPlanFiles.length && !videoFiles.length) { setError('Add at least one file'); return }
    setError(''); setUploading(true)
    try {
      const fd = new FormData()
      unitFiles.forEach(f     => fd.append('unit_plans', f))
      creativeFiles.forEach(f => fd.append('creatives', f))
      paymentPlanFiles.forEach(f => fd.append('payment_plans', f))
      videoFiles.forEach(f => fd.append('videos', f))
      await api.post(`/projects/${projectId}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setSuccess(`${unitFiles.length + creativeFiles.length + paymentPlanFiles.length + videoFiles.length} file(s) uploaded!`)
      setTimeout(() => { onSuccess(); onClose() }, 800)
    } catch (e) { setError(e.response?.data?.message || 'Upload failed') }
    finally { setUploading(false) }
  }

  const DropZone = ({ label, files, setFiles, color, accept = ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" }) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-gray-600">{label}</label>
        {files.length > 0 && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${color}`}>{files.length} file{files.length > 1 ? 's' : ''}</span>}
      </div>
      <label
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); setFiles(p => addFiles(p, e.dataTransfer.files)) }}
        className={`flex flex-col items-center gap-2 p-5 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${files.length ? 'border-green-300 bg-green-50/40' : 'border-gray-200 hover:border-brand hover:bg-brand/5'}`}
      >
        <input type="file" multiple accept={accept} className="hidden"
          onChange={e => setFiles(p => addFiles(p, e.target.files))}/>
        {files.length === 0 ? (
          <>
            <Upload size={20} className="text-gray-400"/>
            <p className="text-xs text-gray-500">Drag & drop or click</p>
          </>
        ) : (
          <div className="w-full space-y-1.5">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-gray-100">
                <FileIcon mime={f.type} size={13}/>
                <span className="text-xs text-gray-700 truncate flex-1">{f.name}</span>
                <span className="text-[10px] text-gray-400 flex-shrink-0">{fmtSize(f.size)}</span>
                <button type="button" onClick={e => { e.preventDefault(); setFiles(p => p.filter((_, j) => j !== i)) }}
                  className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"><X size={12}/></button>
              </div>
            ))}
            <label className="flex items-center gap-1.5 text-[11px] text-brand cursor-pointer hover:underline mt-1">
              <Plus size={11}/> Add more
              <input type="file" multiple accept={accept} className="hidden"
                onChange={e => setFiles(p => addFiles(p, e.target.files))}/>
            </label>
          </div>
        )}
      </label>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose} style={{ margin: '0px' }}>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-2 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Upload size={14} className="text-brand"/> Upload Documents
          </h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"><X size={13}/></button>
        </div>
        <div className="px-6 py-3 space-y-2">
          <DropZone label="Unit Plans" files={unitFiles} setFiles={setUnitFiles} color="text-blue-600 bg-blue-50"/>
          <DropZone label="Creatives"  files={creativeFiles} setFiles={setCreativeFiles} color="text-purple-600 bg-purple-50"/>
          <DropZone label="Payment Plans" files={paymentPlanFiles} setFiles={setPaymentPlanFiles} color="text-green-600 bg-green-50"/>
          <DropZone label="Videos"  files={videoFiles} setFiles={setVideoFiles} color="text-amber-600 bg-amber-50" accept="video/*,.mp4,.mov,.avi,.mkv"/>
          {error   && <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5"><AlertCircle size={13} className="text-red-500"/><p className="text-xs text-red-600">{error}</p></div>}
          {success && <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5"><CheckCircle2 size={13} className="text-green-500"/><p className="text-xs text-green-600">{success}</p></div>}
        </div>
        <div className="px-6 pb-5 flex gap-3 sticky bottom-0 bg-white border-t border-gray-100 pt-4">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={upload} disabled={uploading || (!unitFiles.length && !creativeFiles.length && !paymentPlanFiles.length && !videoFiles.length)}
            className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand/90 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">
            {uploading ? <><Loader2 size={14} className="animate-spin"/>Uploading…</> : <><Upload size={14}/>Upload {unitFiles.length + creativeFiles.length + paymentPlanFiles.length + videoFiles.length > 0 ? `${unitFiles.length + creativeFiles.length + paymentPlanFiles.length + videoFiles.length} File${unitFiles.length + creativeFiles.length + paymentPlanFiles.length + videoFiles.length > 1 ? 's' : ''}` : 'Files'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Document Row ─────────────────────────────────────────────────────────────
function DocRow({ doc, projectId, canDelete, onDeleted, onDownload }) {
  const [deleting, setDeleting] = useState(false)
  const dispatch = useDispatch()

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${doc.file_name}"?`)) return
    setDeleting(true)
    const r = await dispatch(deleteProjectDocument({ projectId, docId: doc.id }))
    if (deleteProjectDocument.fulfilled.match(r)) onDeleted()
    setDeleting(false)
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-brand/30 hover:bg-white transition-all group">
      <div className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm">
        <FileIcon mime={doc.mime_type} size={16}/>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{doc.file_name}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">
          {fmtSize(doc.file_size)} · {doc.uploaded_by_name || 'Unknown'} · {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button onClick={() => onDownload(doc)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-brand/10 hover:bg-brand/20 text-brand text-xs font-semibold transition-colors">
          <Download size={12}/> Download
        </button>
        {canDelete && (
          <button onClick={handleDelete} disabled={deleting}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40">
            {deleting ? <Loader2 size={13} className="animate-spin"/> : <Trash2 size={13}/>}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProjectDetail() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const dispatch   = useDispatch()
  const { user }   = useSelector(s => s.auth)

  const { currentProject: project, projectLeads: leads, detailLoading, pagination,
          projectDocuments, docsLoading } = useSelector(s => s.projects)

  const [search,     setSearch]     = useState('')
  const [page,       setPage]       = useState(1)
  const [showUpload, setShowUpload] = useState(false)
  const [showShare,  setShowShare]  = useState(false)
  const [dlError,    setDlError]    = useState('')
  const [activeTab,  setActiveTab]  = useState('unit_plans')
  const [directUploadInput, setDirectUploadInput] = useState(null)

  const canAdmin         = ['super_admin', 'admin'].includes(user?.role)
  const canUpload        = canAdmin
  const isRestrictedUser = ['sales_manager', 'sales_executive', 'external_caller'].includes(user?.role)

  const tabs = [
    { key: 'unit_plans', label: 'Unit Plans', countKey: 'unit_plans', color: 'blue', accept: ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" },
    { key: 'creatives', label: 'Creatives', countKey: 'creatives', color: 'purple', accept: ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" },
    { key: 'payment_plans', label: 'Payment Plans', countKey: 'payment_plans', color: 'green', accept: ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" },
    { key: 'videos', label: 'Videos', countKey: 'videos', color: 'amber', accept: "video/*,.mp4,.mov,.avi,.mkv" }
  ]

  useEffect(() => {
    dispatch(fetchProjectById(id))
    dispatch(fetchProjectLeads({ id, params: { page } }))
    dispatch(fetchProjectDocuments(id))
    return () => dispatch(clearCurrentProject())
  }, [dispatch, id, page])

  const downloadDoc = async (doc) => {
    try {
      const res = await api.get(`/projects/${id}/documents/${doc.id}/download`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a   = document.createElement('a'); a.href = url; a.download = doc.file_name
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    } catch { setDlError(`Failed to download "${doc.file_name}"`) }
  }

  const downloadAll = async (docType) => {
    try {
      setDlError('')
      let endpoint = `/projects/${id}/documents/download-all`
      
      if (docType === 'unit_plan') {
        endpoint = `/projects/${id}/documents/unit-plans/download-all`
      } else if (docType === 'creative') {
        endpoint = `/projects/${id}/documents/creatives/download-all`
      } else if (docType === 'payment_plan') {
        endpoint = `/projects/${id}/documents/payment-plans/download-all`
      } else if (docType === 'video') {
        endpoint = `/projects/${id}/documents/videos/download-all`
      }
      
      const res    = await api.get(endpoint, { responseType: 'blob' })
      const cd     = res.headers['content-disposition'] || ''
      const fname  = cd.match(/filename="?([^";\n]+)"?/)?.[1] || `${project?.name || 'project'}_${docType || 'all'}.zip`
      const url    = URL.createObjectURL(res.data)
      const a      = document.createElement('a'); a.href = url; a.download = fname
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    } catch { setDlError('Failed to download ZIP. Some files may be missing on the server.') }
  }

  const totalDocs    = (projectDocuments?.unit_plans?.length || 0) + (projectDocuments?.creatives?.length || 0) + (projectDocuments?.payment_plans?.length || 0) + (projectDocuments?.videos?.length || 0)
  const totalLeads   = project?.total_leads ? parseInt(project.total_leads, 10) : (pagination.total || leads.length)
  const filteredLeads = leads.filter(l =>
    l.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.assigned_to?.toLowerCase().includes(search.toLowerCase())
  )

  const handleDirectUpload = async (e, type) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    setDlError('')

    try {
      const fd = new FormData()
      files.forEach(f => fd.append(type, f))
      await api.post(`/projects/${id}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      dispatch(fetchProjectDocuments(id))
    } catch (err) {
      console.error('Upload failed:', err)
      setDlError('Failed to upload files')
    }
  }

  const getTabDocuments = () => {
    switch(activeTab) {
      case 'unit_plans': return projectDocuments?.unit_plans || []
      case 'creatives': return projectDocuments?.creatives || []
      case 'payment_plans': return projectDocuments?.payment_plans || []
      case 'videos': return projectDocuments?.videos || []
      default: return []
    }
  }

  if (detailLoading && !project) return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <Loader2 className="animate-spin text-brand mb-4" size={40}/>
      <p className="text-gray-500 font-medium">Loading project details...</p>
    </div>
  )

  if (!project && !detailLoading) return (
    <div className="flex items-center justify-center h-[60vh] text-gray-400">
      <div className="text-center max-w-sm px-6">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">🏢</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Project not found</h3>
        <Button variant="outline" onClick={() => navigate('/projects')} className="w-full rounded-xl">Back to Projects</Button>
      </div>
    </div>
  )

  const location = [project.locality, project.city].filter(Boolean).join(', ') || 'Location not set'
  const hasConfigs = Array.isArray(project.configurations) && project.configurations.length > 0
  const hasAmenities = Array.isArray(project.amenities) && project.amenities.length > 0

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12">

      {/* Nav bar */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/projects')}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand transition-colors group">
          <div className="w-8 h-8 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center group-hover:border-brand/40 transition-all">
            <ArrowLeft size={15}/>
          </div>
          Back to Projects
        </button>

        {project && (
          <button onClick={() => setShowShare(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand hover:bg-brand/90 text-white text-sm font-semibold transition-colors shadow-sm">
            <Share2 size={14}/> Share Project
          </button>
        )}
      </div>

      {project && (
        <>
          {/* ─── Hero Card ──────────────────────────────────────────────────── */}
          <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
            {/* Banner */}
            <div className="h-32 bg-gradient-to-r from-brand to-blue-400 relative overflow-hidden">
              <div className="absolute inset-0"
                style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '18px 18px' }}/>
            </div>

            <div className="px-8 pb-8">
              <div className="flex flex-col md:flex-row md:items-end gap-5 -mt-12">
                {/* Icon — floats above banner with strong shadow */}
                <div className="relative z-10 flex-shrink-0">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-brand to-blue-500 flex items-center justify-center text-white shadow-xl shadow-brand/40 border-4 border-white">
                    <Building2 size={44}/>
                  </div>
                </div>

                {/* Title block */}
                <div className="flex-1 pb-1 pt-2 relative z-10">
                  <div className="flex flex-wrap items-center gap-3 mb-1">
                    <h1 className="font-display text-2xl md:text-3xl font-bold text-gray-900 break-words">{project.name}</h1>
                    <Badge label={project.status || 'Active'}/>
                  </div>
                  {project.developer && (
                    <p className="text-sm font-semibold text-gray-500 mb-1">{project.developer}</p>
                  )}
                  <div className="flex items-center gap-1.5 text-sm text-gray-400">
                    <MapPin size={13} className="text-brand flex-shrink-0"/>
                    <span>{location}</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className={`grid grid-cols-2 ${isRestrictedUser ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-4 mt-7`}>
                {[
                  { label: 'Price Range',  value: project.price_range  || '—', bg: 'bg-green-50  border-green-100',  text: 'text-green-700',  sub: 'text-green-500'  },
                  { label: 'Total Units',  value: project.total_units  || '—', bg: 'bg-blue-50   border-blue-100',   text: 'text-blue-700',   sub: 'text-blue-500'   },
                  { label: 'RERA No.',     value: project.rera_number  || '—', bg: 'bg-purple-50 border-purple-100', text: 'text-purple-700', sub: 'text-purple-500' },
                  ...(!isRestrictedUser
                    ? [{ label: 'Total Leads', value: totalLeads,             bg: 'bg-orange-50 border-orange-100', text: 'text-orange-700', sub: 'text-orange-500' }]
                    : []),
                ].map(({ label, value, bg, text, sub }) => (
                  <div key={label} className={`rounded-2xl border px-4 py-3.5 ${bg}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${sub}`}>{label}</p>
                    <p className={`text-base font-bold truncate ${text}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ─── Body ───────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* LEFT COL */}
            <div className="lg:col-span-8 space-y-6">

              {/* About */}
              {project.description && (
                <div className="bg-white border border-gray-200 rounded-3xl p-7 shadow-sm">
                  <h3 className="font-display text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Info size={16} className="text-blue-500"/> About This Project
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line overflow-y-auto max-h-[200px]">{project.description}</p>
                </div>
              )}

              {/* Configurations */}
              {hasConfigs && (
                <div className="bg-white border border-gray-200 rounded-3xl p-7 shadow-sm">
                  <h3 className="font-display text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Layers size={16} className="text-indigo-500"/> Configurations
                  </h3>
                  {typeof project.configurations[0] === 'string' ? (
                    <div className="flex flex-wrap gap-2">
                      {project.configurations.map((c, i) => (
                        <span key={i} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-sm font-medium">{c}</span>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {project.configurations.map((c, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-3 bg-indigo-50/60 border border-indigo-100 rounded-2xl">
                          <span className="text-sm font-bold text-indigo-700">{c.configuration}</span>
                          <div className="text-right">
                            {c.carpet_area && <p className="text-xs text-gray-500">{c.carpet_area}</p>}
                            {c.price && <p className="text-sm font-semibold text-gray-800">{c.price}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Amenities */}
              {hasAmenities && (
                <div className="bg-white border border-gray-200 rounded-3xl p-7 shadow-sm">
                  <h3 className="font-display text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-teal-500"/> Amenities
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {project.amenities.map((a, i) => (
                      <span key={i} className="px-3 py-1.5 bg-teal-50 text-teal-700 border border-teal-100 rounded-full text-sm font-medium">{a}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents */}
              <div className="bg-white border border-gray-200 rounded-3xl p-7 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                      <FolderOpen size={18} className="text-teal-600"/>
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-gray-900">Project Documents</h3>
                      <p className="text-xs text-gray-400">
                        {docsLoading ? 'Loading…' : `${totalDocs} document${totalDocs !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {totalDocs > 0 && (
                      <button onClick={() => downloadAll()}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:border-brand hover:text-brand transition-colors">
                        <FileArchive size={13}/> ZIP All
                      </button>
                    )}
                    {canUpload && (
                      <button onClick={() => setShowUpload(true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand hover:bg-brand/90 text-white text-xs font-semibold transition-colors">
                        <Upload size={13}/> Upload
                      </button>
                    )}
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                  {tabs.map(tab => {
                    const count = projectDocuments?.[tab.countKey]?.length || 0
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                          activeTab === tab.key
                            ? `bg-${tab.color}-500 text-white`
                            : `bg-gray-100 text-gray-600 hover:bg-gray-200`
                        }`}
                      >
                        {tab.label}
                        <span className={`${activeTab === tab.key ? 'bg-white/20' : 'bg-white'} rounded-full px-2 py-0.5 text-[10px]`}>{count}</span>
                      </button>
                    )
                  })}
                </div>

                {dlError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-4">
                    <AlertCircle size={13} className="text-red-500"/><p className="text-xs text-red-600">{dlError}</p>
                    <button onClick={() => setDlError('')} className="ml-auto text-gray-400 hover:text-red-500"><X size={12}/></button>
                  </div>
                )}

                {docsLoading ? (
                  <div className="py-8 flex justify-center"><Loader2 size={24} className="animate-spin text-brand"/></div>
                ) : (
                  (() => {
                    const docs = getTabDocuments()
                    if (docs.length === 0) {
                      const currentTab = tabs.find(t => t.key === activeTab)
                      return (
                        <div className="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                          <div className="text-3xl mb-2">📁</div>
                          <p className="text-sm text-gray-500">No {currentTab?.label.toLowerCase()} uploaded yet</p>
                          {canUpload && (
                            <>
                              <input
                                ref={(el) => { if (el) setDirectUploadInput(el) }}
                                type="file"
                                multiple
                                accept={currentTab?.accept}
                                className="hidden"
                                onChange={(e) => handleDirectUpload(e, activeTab)}
                              />
                              <button
                                onClick={() => directUploadInput?.click()}
                                className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand/10 hover:bg-brand/20 text-brand text-xs font-semibold mx-auto transition-colors"
                              >
                                <Upload size={13}/> Upload first file
                              </button>
                            </>
                          )}
                        </div>
                      )
                    }
                    return (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                        {docs.map(doc => (
                          <DocRow key={doc.id} doc={doc} projectId={id} canDelete={canAdmin}
                            onDeleted={() => dispatch(fetchProjectDocuments(id))}
                            onDownload={downloadDoc}/>
                        ))}
                      </div>
                    )
                  })()
                )}
              </div>

              {/* Leads Table */}
              {!isRestrictedUser && (
                <div className="bg-white border border-gray-200 rounded-3xl p-7 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                        <User size={18} className="text-brand"/>
                      </div>
                      <div>
                        <h3 className="font-display text-base font-bold text-gray-900">Project Leads</h3>
                        <p className="text-xs text-gray-400">All leads interested in this project</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads..."
                          className="pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand w-44 text-gray-900 placeholder-gray-400"/>
                      </div>
                      <button onClick={() => dispatch(fetchProjectLeads({ id, params: { page } }))}
                        className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-brand hover:border-brand transition-colors">
                        <RefreshCw size={14} className={detailLoading ? 'animate-spin' : ''}/>
                      </button>
                    </div>
                  </div>

                  {detailLoading && leads.length === 0 ? (
                    <div className="py-12 flex flex-col items-center"><Loader2 size={32} className="animate-spin text-brand mb-2"/><p className="text-xs text-gray-400">Fetching leads…</p></div>
                  ) : filteredLeads.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                      <div className="text-4xl mb-3">👥</div>
                      <p className="text-sm font-medium text-gray-500">No leads found for this project</p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-white z-10">
                            <tr className="text-left border-b border-gray-100">
                              <th className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lead Name</th>
                              <th className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                              <th className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assigned To</th>
                              <th className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {filteredLeads.map(lead => (
                              <tr key={lead.id} className="hover:bg-gray-50/70 transition-colors">
                                <td className="py-3.5 px-2">
                                  <div className="flex items-center gap-3">
                                    <Avatar name={lead.name} size="sm"/>
                                    <span className="font-semibold text-gray-900">{lead.name}</span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-2"><Badge label={lead.status}/></td>
                                <td className="py-3.5 px-2">
                                  <div className="flex items-center gap-2">
                                    <Avatar name={lead.assigned_to} size="xs"/>
                                    <span className="text-gray-500 font-medium">{lead.assigned_to || 'Unassigned'}</span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-2 text-right">
                                  <Button variant="outline" size="sm" className="rounded-lg text-xs h-8"
                                    onClick={() => navigate(`/leads/${lead.id}`)}>View</Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {pagination?.total_pages > 1 && (
                        <div className="flex items-center justify-between pt-6 px-2 text-xs text-gray-500">
                          <span>Page {pagination.page} of {pagination.total_pages} · {pagination.total} leads</span>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" disabled={page===1} onClick={() => setPage(p=>p-1)}>Prev</Button>
                            <Button size="sm" variant="outline" disabled={page>=pagination.total_pages} onClick={() => setPage(p=>p+1)}>Next</Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT COL */}
            <div className="lg:col-span-4 space-y-5">

              {/* Project Details */}
              <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
                <h3 className="font-display text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-brand"/> Project Details
                </h3>
                <div className="space-y-0">
                  {[
                    { l: 'Developer',  v: project.developer   || '—' },
                    { l: 'City',       v: project.city        || '—' },
                    { l: 'Locality',   v: project.locality    || '—' },
                    { l: 'Address',    v: location     || '—' },
                    { l: 'Price Range', v: project.price_range || '—' },
                    { l: 'Total Units', v: project.total_units || '—' },
                    { l: 'Possession', v: project.possession_date
                      ? new Date(project.possession_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
                      : '—' },
                    { l: 'RERA',       v: project.rera_number || '—' },
                    { l: 'Config',     v: hasConfigs ? project.configurations.map(c => typeof c === 'string' ? c : c.configuration).filter(Boolean).join(', ') : '—' },
                  ].map(({ l, v }) => (
                    <div key={l} className="flex justify-between items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
                      <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider flex-shrink-0 pt-0.5">{l}</span>
                      <span className="text-sm font-semibold text-gray-800 text-right">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Download */}
              {totalDocs > 0 && (
                <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
                  <h3 className="font-display text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Download size={16} className="text-teal-500"/> Quick Download
                  </h3>
                  <div className="space-y-2.5">
                    {projectDocuments?.unit_plans?.length > 0 && (
                      <button onClick={() => downloadAll('unit_plan')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-100 transition-colors group">
                        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                          <FileArchive size={14} className="text-white"/>
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <p className="text-xs font-semibold text-blue-700">Unit Plans ZIP</p>
                          <p className="text-[10px] text-blue-500">{projectDocuments.unit_plans.length} file{projectDocuments.unit_plans.length > 1 ? 's' : ''}</p>
                        </div>
                        <Download size={14} className="text-blue-500 flex-shrink-0 group-hover:translate-y-0.5 transition-transform"/>
                      </button>
                    )}
                    {projectDocuments?.creatives?.length > 0 && (
                      <button onClick={() => downloadAll('creative')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-100 transition-colors group">
                        <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center flex-shrink-0">
                          <FileArchive size={14} className="text-white"/>
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <p className="text-xs font-semibold text-purple-700">Creatives ZIP</p>
                          <p className="text-[10px] text-purple-500">{projectDocuments.creatives.length} file{projectDocuments.creatives.length > 1 ? 's' : ''}</p>
                        </div>
                        <Download size={14} className="text-purple-500 flex-shrink-0 group-hover:translate-y-0.5 transition-transform"/>
                      </button>
                    )}
                    {projectDocuments?.payment_plans?.length > 0 && (
                      <button onClick={() => downloadAll('payment_plan')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-green-50 hover:bg-green-100 border border-green-100 transition-colors group">
                        <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
                          <FileArchive size={14} className="text-white"/>
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <p className="text-xs font-semibold text-green-700">Payment Plans ZIP</p>
                          <p className="text-[10px] text-green-500">{projectDocuments.payment_plans.length} file{projectDocuments.payment_plans.length > 1 ? 's' : ''}</p>
                        </div>
                        <Download size={14} className="text-green-500 flex-shrink-0 group-hover:translate-y-0.5 transition-transform"/>
                      </button>
                    )}
                    {projectDocuments?.videos?.length > 0 && (
                      <button onClick={() => downloadAll('video')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-100 transition-colors group">
                        <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
                          <FileArchive size={14} className="text-white"/>
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <p className="text-xs font-semibold text-amber-700">Videos ZIP</p>
                          <p className="text-[10px] text-amber-500">{projectDocuments.videos.length} file{projectDocuments.videos.length > 1 ? 's' : ''}</p>
                        </div>
                        <Download size={14} className="text-amber-500 flex-shrink-0 group-hover:translate-y-0.5 transition-transform"/>
                      </button>
                    )}
                    {totalDocs > 1 && (
                      <button onClick={() => downloadAll()}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:border-brand hover:text-brand transition-colors">
                        <Download size={13}/> Download All ({totalDocs} files)
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {showUpload && (
        <UploadDocsModal
          projectId={id}
          onClose={() => setShowUpload(false)}
          onSuccess={() => dispatch(fetchProjectDocuments(id))}
        />
      )}

      {showShare && project && (
        <ShareProjectModal
          projectId={id}
          projectName={project.name}
          projectDocuments={projectDocuments}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  )
}
