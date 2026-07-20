import React, { useState, useEffect, useRef } from 'react'
import { useModulePermissions } from '../hooks/usePermission'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay } from 'swiper/modules'
import 'swiper/css'
import { Plus, MapPin, Building2, IndianRupee, Users, Edit2, Trash2, RefreshCw, Search, ChevronDown, Download, Upload, FileImage, FileText, X, CheckCircle2, Loader2, Eye, Paperclip, Share2, Mail, SendHorizonal, AlertCircle } from 'lucide-react'
import { fetchProjects, createProject, updateProject, deleteProject, clearProjectError, fetchProjectDocuments } from '../store/projectSlice'
import CardSkeleton from '../components/loaders/CardSkeleton'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import api from '../api/axios'
import Modal from '../components/ui/Modal'
import ExportModal from '../components/ui/ExportModal'
import ConfirmModal from '../components/ui/ConfirmModal'
import CustomSelect from '../components/ui/CustomSelect'
import DatePicker from '../components/ui/DatePicker'
import PageSizeSelect, { resolvePerPage } from '../components/ui/PageSizeSelect'

// Uploaded file paths come back relative (e.g. "/uploads/projects/x.png"),
// served from the API's origin rather than the frontend's — resolve to a full URL.
const fileOrigin = api.defaults.baseURL.replace(/\/api\/v1\/?$/, '')
const resolveFileUrl = path => {
  let urlPath
  if (typeof path === 'object' && path !== null) {
    urlPath = path?.url || path?.file_path || path?.path || path?.file
  } else {
    urlPath = path
  }
  if (!urlPath || typeof urlPath !== 'string') return ''
  // Also handle any leading/trailing backticks or whitespace!
  urlPath = urlPath.trim().replace(/^`+|`+$/g, '')
  if (/^https?:\/\//i.test(urlPath)) return urlPath
  return `${fileOrigin}${urlPath.startsWith('/') ? '' : '/'}${urlPath}`
}

// Renders the document's own url directly (fast path, no extra round trip).
// Some uploaded files are served from a route that requires an auth token —
// when the direct request fails to load, fall back to fetching it through
// the authenticated api client and rendering it as a blob URL.
function AuthImage({ path, alt, className, onClick }) {
  const normalizedPath = typeof path === 'object' ? (path?.url || path?.file_path) : path
  const directSrc = normalizedPath && typeof normalizedPath === 'string' ? resolveFileUrl(normalizedPath) : null
  const [src, setSrc] = useState(directSrc)
  const [blobTried, setBlobTried] = useState(false)
  const [failed, setFailed] = useState(false)
  const blobUrlRef = useRef(null)

  useEffect(() => {
    setSrc(directSrc)
    setBlobTried(false)
    setFailed(false)
    return () => {
      if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null }
    }
  }, [directSrc])

  const handleError = () => {
    if (blobTried || !normalizedPath) { setFailed(true); return }
    setBlobTried(true)
    api.get(resolveFileUrl(normalizedPath), { responseType: 'blob' })
      .then(res => {
        const objectUrl = URL.createObjectURL(res.data)
        blobUrlRef.current = objectUrl
        setSrc(objectUrl)
      })
      .catch(() => setFailed(true))
  }

  if (!src || failed) return <div className={`${className} bg-gray-100 dark:bg-gray-800 animate-pulse`} />
  return <img src={src} alt={alt} className={className} onClick={onClick ? () => onClick(src) : undefined} onError={handleError} />
}

// Single protected file path to blob URL
function useAuthImage(path) {
  const [src, setSrc] = useState(null)
  // Normalize path to string (handle object cases first)
  const normalizedPath = typeof path === 'object' ? (path?.url || path?.file_path) : path
  useEffect(() => {
    if (!normalizedPath || typeof normalizedPath !== 'string') { setSrc(null); return }
    let cancelled = false
    let objectUrl
    api.get(resolveFileUrl(normalizedPath), { responseType: 'blob' })
      .then(res => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(res.data)
        setSrc(objectUrl)
      })
      .catch(() => { if (!cancelled) setSrc(null) })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [normalizedPath])
  return src
}

// Resolves a batch of protected file paths to blob URLs once, so a slider can
// cycle through pre-fetched images instead of re-fetching on every rotation.
// Silently drops any path that fails so a single broken file doesn't blank the whole set.
function useAuthImages(paths) {
  const normalizedPaths = (paths || []).map(p => typeof p === 'object' ? (p?.url || p?.file_path) : p).filter(Boolean)
  const [srcs, setSrcs] = useState([])
  const key = normalizedPaths.join('|')

  useEffect(() => {
    if (!normalizedPaths || normalizedPaths.length === 0) { setSrcs([]); return }
    let cancelled = false
    const objectUrls = []
    Promise.all(normalizedPaths.map(p =>
      api.get(resolveFileUrl(p), { responseType: 'blob' })
        .then(res => URL.createObjectURL(res.data))
        .catch(() => null)
    )).then(results => {
      if (cancelled) return
      const valid = results.filter(Boolean)
      objectUrls.push(...valid)
      setSrcs(valid)
    })
    return () => {
      cancelled = true
      objectUrls.forEach(u => URL.revokeObjectURL(u))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return srcs
}

// Project logo component to use inside map loops (can call hooks!)
function ProjectLogo({ logo, alt }) {
  return (
    <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
      {logo ? (
        <AuthImage path={logo} alt={alt || 'Developer logo'} className="w-full h-full object-contain p-0.5" />
      ) : (
        <Building2 size={16} className="text-gray-400" />
      )}
    </div>
  )
}

// Project card cover — auto-rotating Swiper carousel (drag/swipe + autoplay)
// when there's more than one photo, a single static image for exactly one,
// and the gradient + icon placeholder when there are none. Each slide renders
// the document's url directly via AuthImage (falls back to an authenticated
// fetch on its own if the direct load fails).
function ProjectCardCover({ photos, colorClass, children }) {
  const validPhotos = (photos || []).filter(p => (typeof p === 'object' ? (p?.url || p?.file_path) : p))
  const [index, setIndex] = useState(0)

  return (
    <div className={`h-40 relative flex-shrink-0 overflow-hidden ${validPhotos.length === 0 ? `bg-gradient-to-br ${colorClass} flex items-center justify-center` : 'bg-gray-100 dark:bg-gray-800'}`}>
      {validPhotos.length === 0 ? (
        <div className="w-12 h-12 rounded-2xl bg-white/80 dark:bg-black/30 backdrop-blur flex items-center justify-center shadow-sm">
          <Building2 size={22} className="text-brand" />
        </div>
      ) : validPhotos.length === 1 ? (
        <>
          <AuthImage path={validPhotos[0]} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-black/0 pointer-events-none" />
        </>
      ) : (
        <>
          <Swiper
            modules={[Autoplay]}
            autoplay={{ delay: 3000, disableOnInteraction: false }}
            loop
            onSlideChange={(swiper) => setIndex(swiper.realIndex)}
            className="absolute inset-0 w-full h-full"
          >
            {validPhotos.map((p, i) => (
              <SwiperSlide key={i}>
                <AuthImage path={p} alt="" className="w-full h-full object-cover" />
              </SwiperSlide>
            ))}
          </Swiper>
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-black/0 pointer-events-none" />
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10 pointer-events-none">
            {validPhotos.map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === index ? 'bg-white' : 'bg-white/40'}`} />
            ))}
          </div>
        </>
      )}
      {children}
    </div>
  )
}

// Small developer-logo badge shown next to "by {developer}" — hides itself
// entirely if there's no logo or it fails to load, rather than showing a
// permanently broken/empty box.
function DeveloperBadge({ logo, name }) {
  const srcs = useAuthImages(logo ? [logo.url || logo.file_path].filter(Boolean) : [])
  return (
    <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1.5">
      {srcs[0] && (
        <img src={srcs[0]} alt="" className="w-4 h-4 rounded object-contain bg-white border border-gray-200 dark:border-gray-700 flex-shrink-0" />
      )}
      by {name}
    </p>
  )
}

const projectColors = [
  'from-blue-400/20 to-blue-600/20',
  'from-green-400/20 to-teal-400/20',
  'from-blue-400/20 to-purple-400/20',
  'from-rose-400/20 to-pink-400/20',
]

const projectStatuses = [
  { value: 'pre_launch',         label: 'Pre Launch' },
  { value: 'under_construction', label: 'Under Construction' },
  { value: 'nearby_possession',  label: 'Nearby Possession' },
  { value: 'ready_to_move',      label: 'Ready To Move' },
]

// The upload-* endpoints (developer logo, photos, unit plans, etc.) return
// the full file record ({ file_name, file_path, file_size, mime_type, url,
// document_type }) so the form can preview it (name, thumbnail) before the
// project is saved — but the create/update project endpoints only want the
// plain `url` string back.
const fileUrl = (file) => {
  if (!file) return undefined
  if (typeof file === 'string') return file
  return file.url || file.file_path || undefined
}

const defaultForm = {
  name: '',
  developer: '',
  city: '',
  locality: '',
  address: '',
  configurations: [],
  price_range: '',
  total_units: '',
  possession_date: '',
  rera_number: '',
  amenities: [],
  status: 'pre_launch',
  description: '',
  brochure_url: '',
  video_url: '',
  payment_plan_url: '',
  home_loan_info: '',
  unit_plans: [],
  creatives: [],
  payment_plans: [],
  videos: [],
  photos: [],
  developer_logo: null,
}

// ── ShareProjectModal ─────────────────────────────────────────────────────────
function ShareProjectModal({ projectId, projectName, onClose, projectDocuments }) {
  const ic  = "w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm transition-all"
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
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-[#1a1a1a]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
              <Share2 size={15} className="text-brand" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Share Project</h3>
              <p className="text-[11px] text-gray-400 truncate max-w-[220px]">{projectName}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* Email input + tags */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Send to <span className="text-gray-400 font-normal">(press Enter or comma to add multiple)</span>
            </label>

            {/* Email tag pills */}
            {emails.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {emails.map(email => (
                  <span key={email} className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 bg-brand/10 text-brand text-xs font-medium rounded-full">
                    <Mail size={10} />
                    {email}
                    <button onClick={() => removeEmail(email)} className="ml-0.5 hover:text-red-500 transition-colors">
                      <X size={11} />
                    </button>
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
              <button
                onClick={addEmail}
                className="px-3 py-2 text-xs font-semibold text-brand border border-brand/30 hover:bg-brand/10 rounded-xl transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Personal message */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Personal message <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea rows={3} value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Hi, here are the project details!"
              className={ic} />
          </div>

          {/* Fields to include */}
          <div className="relative">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
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
              <div className="absolute w-full mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                {availableFields.map(field => (
                  <label key={field.key} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 first:rounded-t-xl last:rounded-b-xl">
                    <input type="checkbox"
                      checked={selectedFields.includes(field.key)}
                      onChange={() => toggleField(field.key)}
                      className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{field.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Documents to include */}
          {allDocuments.length > 0 && (
            <div className="relative">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
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
                <div className="absolute w-full mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                  <label className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800">
                    <input type="checkbox"
                      checked={selectedDocuments.length === allDocuments.length && allDocuments.length > 0}
                      onChange={toggleAllDocuments}
                      className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand"
                    />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Select All</span>
                  </label>
                  {allDocuments.map(doc => (
                    <label key={doc.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                      <input type="checkbox"
                        checked={selectedDocuments.includes(doc.id)}
                        onChange={() => toggleDocument(doc.id)}
                        className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{doc.file_name}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {error   && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5">
              <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-2.5">
              <CheckCircle2 size={13} className="text-green-500 flex-shrink-0" />
              <p className="text-xs text-green-600 dark:text-green-400">{success}</p>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="px-6 pb-5 flex gap-3 sticky bottom-0 bg-white dark:bg-[#1a1a1a] border-t border-gray-100 dark:border-gray-800 pt-4">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || (emails.length === 0 && !emailInput.trim())}
            className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand/90 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
          >
            {sending
              ? <><Loader2 size={14} className="animate-spin" /> Sending…</>
              : <><SendHorizonal size={14} /> Share Project</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// Static class lookup so Tailwind's compiler can see the full class names
// (dynamically interpolated `bg-${color}-50` strings are not detected at build time)
const fileTypeClasses = {
  blue:   { bg: 'bg-blue-50/50 dark:bg-blue-900/10',     border: 'border-blue-100 dark:border-blue-900/30',     icon: 'text-blue-500',   text: 'text-blue-600 dark:text-blue-400' },
  purple: { bg: 'bg-purple-50/50 dark:bg-purple-900/10', border: 'border-purple-100 dark:border-purple-900/30', icon: 'text-purple-500', text: 'text-purple-600 dark:text-purple-400' },
  green:  { bg: 'bg-green-50/50 dark:bg-green-900/10',   border: 'border-green-100 dark:border-green-900/30',   icon: 'text-green-500',  text: 'text-green-600 dark:text-green-400' },
  amber:  { bg: 'bg-amber-50/50 dark:bg-amber-900/10',   border: 'border-amber-100 dark:border-amber-900/30',   icon: 'text-amber-500',  text: 'text-amber-600 dark:text-amber-400' },
}

// Standalone upload endpoints used before a project exists (create flow)
const standaloneUploadEndpoints = {
  unit_plans:    { url: '/projects/upload-unit-plan',   field: 'unit_plan' },
  creatives:     { url: '/projects/upload-creative',    field: 'creative' },
  payment_plans: { url: '/projects/upload-payment-plan', field: 'payment_plan' },
  videos:        { url: '/projects/upload-video',        field: 'video' },
  photos:        { url: '/projects/upload-photo',        field: 'photo' },
}

// Project card download/upload buttons — docType matches handleDownloadAll,
// field matches the multi-file field name POST /projects/{id}/documents expects
const documentTypeMap = [
  { docType: 'unit_plan',    field: 'unit_plans',    label: 'Unit Plans',
    btn:    'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40',
    upload: 'border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20' },
  { docType: 'creative',     field: 'creatives',     label: 'Creatives',
    btn:    'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40',
    upload: 'border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20' },
  { docType: 'payment_plan', field: 'payment_plans', label: 'Payment Plans',
    btn:    'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40',
    upload: 'border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20' },
  { docType: 'video',        field: 'videos',        label: 'Videos',
    btn:    'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40',
    upload: 'border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20' },
]

// ── Form defined OUTSIDE to prevent typing/focus loss bug ────────────────────
function ProjectForm({ formData, setFormData, projectId, existingFiles = {}, onDeleteExisting, onFilesUploaded }) {
  const ic = "w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm transition-all duration-200"
  const lc = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"

  const [uploading, setUploading] = useState({})
  const [uploadErrors, setUploadErrors] = useState({})
  const [configDraft, setConfigDraft] = useState({ configuration: '', carpet_area: '', price: '' })
  const [amenityDraft, setAmenityDraft] = useState('')

  // Files are uploaded as soon as they're picked — never sent as raw
  // multipart through the project create/update JSON body.
  const handleFileChange = async (e, type) => {
    const files = Array.from(e.target.files)
    e.target.value = ''
    if (files.length === 0) return
    setUploadErrors(prev => ({ ...prev, [type]: '' }))
    setUploading(prev => ({ ...prev, [type]: true }))
    try {
      if (type === 'photos') {
        // Photos always go through the standalone /projects/upload-photo
        // endpoint (the generic /projects/{id}/documents endpoint doesn't
        // handle the photos field correctly).
        const { url, field } = standaloneUploadEndpoints.photos
        const docs = []
        for (const file of files) {
          const fd = new FormData()
          fd.append(field, file)
          const res = await api.post(url, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
          if (res.data.success) docs.push(res.data.data)
        }
        if (projectId) {
          // Attach immediately, same as the other document types — merge
          // with whatever photos already exist so the save doesn't drop them.
          // Each entry must keep its full { file_name, file_path, ... }
          // shape — the backend rejects plain URL strings here.
          await api.put(`/projects/${projectId}`, { photos: [...(existingFiles.photos || []), ...docs] })
          await onFilesUploaded?.()
        } else {
          setFormData(p => ({ ...p, photos: [...(p.photos || []), ...docs] }))
        }
      } else if (projectId) {
        // Project already exists — this call attaches the files directly.
        const fd = new FormData()
        files.forEach(file => fd.append(type, file))
        await api.post(`/projects/${projectId}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        await onFilesUploaded?.()
      } else {
        // No project yet — upload standalone, then carry the returned
        // metadata (real file_path) in formData for the create request.
        const { url, field } = standaloneUploadEndpoints[type]
        const docs = []
        for (const file of files) {
          const fd = new FormData()
          fd.append(field, file)
          const res = await api.post(url, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
          if (res.data.success) docs.push(res.data.data)
        }
        setFormData(p => ({ ...p, [type]: [...(p[type] || []), ...docs] }))
      }
    } catch (err) {
      setUploadErrors(prev => ({ ...prev, [type]: err.response?.data?.message || 'Upload failed' }))
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }))
    }
  }

  const removePendingFile = (type, index) => {
    setFormData(p => ({ ...p, [type]: p[type].filter((_, i) => i !== index) }))
  }

  // Developer logo is a single file (not an array), so it gets its own
  // upload/remove logic instead of going through handleFileChange.
  const handleLogoChange = async e => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadErrors(prev => ({ ...prev, developer_logo: '' }))
    setUploading(prev => ({ ...prev, developer_logo: true }))
    try {
      if (projectId) {
        const fd = new FormData()
        fd.append('developer_logo', file)
        await api.post(`/projects/${projectId}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        await onFilesUploaded?.()
      } else {
        const fd = new FormData()
        fd.append('file', file)
        const res = await api.post('/projects/upload-developer-logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        if (res.data.success) setFormData(p => ({ ...p, developer_logo: res.data.data }))
      }
    } catch (err) {
      setUploadErrors(prev => ({ ...prev, developer_logo: err.response?.data?.message || 'Upload failed' }))
    } finally {
      setUploading(prev => ({ ...prev, developer_logo: false }))
    }
  }

  const removePendingLogo = () => setFormData(p => ({ ...p, developer_logo: null }))

  const addTag = (field, value) => {
    if (!value.trim()) return
    setFormData(p => ({
      ...p,
      [field]: [...(p[field] || []), value.trim()]
    }))
  }

  const removeTag = (field, index) => {
    setFormData(p => ({
      ...p,
      [field]: p[field].filter((_, i) => i !== index)
    }))
  }

  const addConfigRow = () => {
    if (!configDraft.configuration.trim()) return
    setFormData(p => ({
      ...p,
      configurations: [...(p.configurations || []), {
        configuration: configDraft.configuration.trim(),
        carpet_area:   configDraft.carpet_area.trim(),
        price:         configDraft.price.trim(),
      }]
    }))
    setConfigDraft({ configuration: '', carpet_area: '', price: '' })
  }

  const addAmenityRow = () => {
    if (!amenityDraft.trim()) return
    addTag('amenities', amenityDraft)
    setAmenityDraft('')
  }

  return (
    <div className="space-y-3">

      {/* Name + Developer */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={lc}>Project Name *</label>
          <input required value={formData.name}
            onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
            placeholder="Skyline Heights"
            className={ic} />
        </div>
        <div>
          <label className={lc}>Developer</label>
          <input value={formData.developer}
            onChange={e => setFormData(p => ({ ...p, developer: e.target.value }))}
            placeholder="Lodha Group"
            className={ic} />
        </div>
      </div>

      {/* Developer Logo */}
      <div>
        <label className={lc}>Developer Logo</label>
        {(() => {
          const logo = projectId ? existingFiles.developer_logo : formData.developer_logo
          return logo ? (
            <div className="flex items-center gap-3 mb-1.5 p-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-xl">
              <AuthImage path={resolveFileUrl(logo)} alt="Developer logo"
                className="w-10 h-10 rounded-lg object-contain bg-white border border-gray-200 dark:border-gray-700 flex-shrink-0" />
              <span className="text-xs text-gray-600 dark:text-gray-300 truncate flex-1">{logo.file_name || 'Uploaded logo'}</span>
              {!projectId && (
                <button type="button" onClick={removePendingLogo} className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                  <X size={12} />
                </button>
              )}
            </div>
          ) : null
        })()}
        <div className="relative group">
          <input type="file" accept="image/*" disabled={uploading.developer_logo}
            onChange={handleLogoChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-wait" />
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl group-hover:border-brand group-hover:bg-brand/5 transition-all">
            {uploading.developer_logo
              ? <Loader2 size={14} className="text-brand animate-spin" />
              : <Paperclip size={14} className="text-gray-400 group-hover:text-brand" />}
            <span className="text-xs text-gray-500 group-hover:text-brand">
              {uploading.developer_logo ? 'Uploading…' : ((projectId ? existingFiles.developer_logo : formData.developer_logo) ? 'Replace Logo' : 'Upload Logo')}
            </span>
          </div>
        </div>
        {uploadErrors.developer_logo && <p className="text-[10px] text-red-500 mt-1">{uploadErrors.developer_logo}</p>}
      </div>

      {/* City + Locality */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={lc}>City *</label>
          <input required value={formData.city}
            onChange={e => setFormData(p => ({ ...p, city: e.target.value }))}
            placeholder="Mumbai"
            className={ic} />
        </div>
        <div>
          <label className={lc}>Locality</label>
          <input value={formData.locality}
            onChange={e => setFormData(p => ({ ...p, locality: e.target.value }))}
            placeholder="Andheri West"
            className={ic} />
        </div>
      </div>

      {/* Address + Possession Date */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={lc}>Address</label>
          <input value={formData.address}
            onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
            placeholder="Plot 14, Veera Desai Road"
            className={ic} />
        </div>
        <DatePicker
          label="Possession Date"
          value={formData.possession_date}
          onChange={(v) => setFormData(p => ({ ...p, possession_date: v }))}
        />
      </div>

      {/* Status */}
      <div className="grid grid-cols-1 gap-2">
        <CustomSelect
          label="Status"
          value={formData.status}
          onChange={val => setFormData(p => ({ ...p, status: val }))}
          options={projectStatuses}
        />
      </div>

      {/* Price Range */}
      <div>
        <label className={lc}>Price Range (e.g. 90L - 2.2Cr)</label>
        <input value={formData.price_range}
          onChange={e => setFormData(p => ({ ...p, price_range: e.target.value }))}
          placeholder="90L - 2.2Cr"
          className={ic} />
      </div>

      {/* Total Units + RERA */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={lc}>Total Units</label>
          <input type="number" value={formData.total_units}
            onChange={e => setFormData(p => ({ ...p, total_units: e.target.value }))}
            placeholder="240"
            className={ic} />
        </div>
        <div>
          <label className={lc}>RERA Number</label>
          <input value={formData.rera_number}
            onChange={e => setFormData(p => ({ ...p, rera_number: e.target.value }))}
            placeholder="P51800045678"
            className={ic} />
        </div>
      </div>

      {/* Configurations (Structured rows: configuration + carpet area + price) */}
      <div>
        <label className={lc}>Configurations</label>
        {(formData.configurations || []).length > 0 && (
          <div className="space-y-1.5 mb-2">
            {formData.configurations.map((cfg, idx) => (
              <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-xl">
                <span className="flex-1 text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{typeof cfg === 'string' ? cfg : cfg.configuration}</span>
                {typeof cfg !== 'string' && cfg.carpet_area && <span className="text-xs text-gray-400 flex-shrink-0">{cfg.carpet_area}</span>}
                {typeof cfg !== 'string' && cfg.price && <span className="text-xs text-brand font-semibold flex-shrink-0">{cfg.price}</span>}
                <button type="button" onClick={() => removeTag('configurations', idx)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          <input value={configDraft.configuration}
            onChange={e => setConfigDraft(d => ({ ...d, configuration: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addConfigRow() } }}
            placeholder="1BHK" className={ic} />
          <input value={configDraft.carpet_area}
            onChange={e => setConfigDraft(d => ({ ...d, carpet_area: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addConfigRow() } }}
            placeholder="450 sqft" className={ic} />
          <input value={configDraft.price}
            onChange={e => setConfigDraft(d => ({ ...d, price: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addConfigRow() } }}
            placeholder="65L" className={ic} />
        </div>
        <button type="button" onClick={addConfigRow} disabled={!configDraft.configuration.trim()}
          className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand border border-brand/30 hover:bg-brand/10 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          <Plus size={12} /> Add Configuration
        </button>
      </div>

      {/* Amenities (Tags) */}
      <div>
        <label className={lc}>Amenities</label>
        <div className="flex flex-wrap gap-1 mb-1">
          {(formData.amenities || []).map((amenity, idx) => (
            <span key={idx} className="flex items-center gap-1 px-2 py-1 bg-brand/10 text-brand text-xs rounded-full">
              {amenity}
              <button type="button" onClick={() => removeTag('amenities', idx)} className="hover:text-red-500">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={amenityDraft}
            onChange={e => setAmenityDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAmenityRow() } }}
            placeholder="Enter amenity (e.g. Swimming Pool, Gym)"
            className={ic + ' flex-1'} />
          <button type="button" onClick={addAmenityRow} disabled={!amenityDraft.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand border border-brand/30 hover:bg-brand/10 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">
            <Plus size={12} /> Add
          </button>
        </div>
      </div>

      {/* Project Photos */}
      <div>
        <label className={lc}>Project Photos</label>
        {(() => {
          const photoItems = projectId ? (existingFiles.photos || []) : (formData.photos || [])
          return photoItems.length > 0 ? (
            <div className="grid grid-cols-4 gap-2 mb-1.5">
              {photoItems.map((photo, idx) => (
                <div key={photo.id ?? idx} className="relative group/photo aspect-square rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-100 dark:bg-gray-800">
                  <AuthImage path={resolveFileUrl(photo)} alt={photo.file_name || 'Project photo'}
                    className="w-full h-full object-cover" />
                  <button type="button"
                    onClick={() => projectId ? onDeleteExisting?.('photos', photo.id) : removePendingFile('photos', idx)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity">
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          ) : null
        })()}
        <div className="relative group">
          <input type="file" accept="image/*" multiple disabled={uploading.photos}
            onChange={(e) => handleFileChange(e, 'photos')}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-wait" />
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl group-hover:border-brand group-hover:bg-brand/5 transition-all">
            {uploading.photos
              ? <Loader2 size={14} className="text-brand animate-spin" />
              : <Paperclip size={14} className="text-gray-400 group-hover:text-brand" />}
            <span className="text-xs text-gray-500 group-hover:text-brand">
              {uploading.photos ? 'Uploading…' : 'Upload Photos'}
            </span>
          </div>
        </div>
        {uploadErrors.photos && <p className="text-[10px] text-red-500 mt-1">{uploadErrors.photos}</p>}
      </div>

      {/* Home Loan Info */}
      <div>
        <label className={lc}>Home Loan Info</label>
        <textarea rows={2} value={formData.home_loan_info}
          onChange={e => setFormData(p => ({ ...p, home_loan_info: e.target.value }))}
          placeholder="Available through HDFC, SBI, ICICI"
          className={ic} />
      </div>

      {/* Description */}
      <div>
        <label className={lc}>Description</label>
        <textarea rows={3} value={formData.description}
          onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
          placeholder="Premium residential project in the heart of Andheri West"
          className={ic} />
      </div>

      {/* File Uploads */}
      <div className="grid grid-cols-1 gap-2 pt-1">
        {[
          { type: 'unit_plans',    label: 'Unit Plans',         icon: FileText,  accept: undefined, classes: fileTypeClasses.blue },
          { type: 'creatives',     label: 'Creatives',          icon: FileImage, accept: undefined, classes: fileTypeClasses.purple },
          { type: 'payment_plans', label: 'Payment Plan Files', icon: FileText,  accept: undefined, classes: fileTypeClasses.green },
          { type: 'videos',        label: 'Video Files',        icon: FileImage, accept: 'video/*',  classes: fileTypeClasses.amber },
        ].map(({ type, label, icon: Icon, accept, classes }) => {
          const items = projectId ? (existingFiles[type] || []) : (formData[type] || [])
          return (
            <div key={type}>
              <label className={lc}>{label}</label>
              {items.length > 0 && (
                <div className="mb-1.5 space-y-1">
                  {items.map((file, idx) => (
                    <div key={file.id ?? idx} className={`flex items-center justify-between px-2 py-1 rounded-lg border ${classes.bg} ${classes.border}`}>
                      <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-2">
                        <Icon size={10} className={`flex-shrink-0 ${classes.icon}`} />
                        <span className={`text-[10px] truncate ${classes.text}`}>{file.file_name}</span>
                      </div>
                      <button type="button"
                        onClick={() => projectId ? onDeleteExisting?.(type, file.id) : removePendingFile(type, idx)}
                        className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="relative group">
                <input
                  type="file"
                  multiple
                  accept={accept}
                  disabled={uploading[type]}
                  onChange={(e) => handleFileChange(e, type)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-wait"
                />
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl group-hover:border-brand group-hover:bg-brand/5 transition-all">
                  {uploading[type]
                    ? <Loader2 size={14} className="text-brand animate-spin" />
                    : <Paperclip size={14} className="text-gray-400 group-hover:text-brand" />}
                  <span className="text-xs text-gray-500 group-hover:text-brand">
                    {uploading[type] ? 'Uploading…' : `Upload ${label}`}
                  </span>
                </div>
              </div>
              {uploadErrors[type] && <p className="text-[10px] text-red-500 mt-1">{uploadErrors[type]}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────


export default function Projects() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { list, loading, pagination, actionLoading, actionError, projectDocuments } = useSelector(s => s.projects)
  const { user: currentUser } = useSelector(s => s.auth)

  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCity,   setFilterCity]   = useState('')
  const [page,         setPage]         = useState(1)
  const [perPage,      setPerPage]      = useState('10')

  const [showAddModal,  setShowAddModal]  = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState(null)
  const [selectedProject, setSelectedProject] = useState(null)
  const [shareProject,    setShareProject]    = useState(null)  // project to share

  const [addForm,  setAddForm]  = useState(defaultForm)
  const [editForm, setEditForm] = useState(defaultForm)
  const [existingFiles,   setExistingFiles]   = useState({ unit_plans: [], creatives: [], payment_plans: [], videos: [], photos: [], developer_logo: null })
  const [success,    setSuccess]    = useState('')
  const [downloadError, setDownloadError] = useState('')
  const [localError, setLocalError] = useState('')
  const [exporting,  setExporting]  = useState(false)
  const [downloading, setDownloading] = useState({}) // { [projectId]: { unit_plan: bool, creative: false, payment_plan: bool, video: false } }
  const [creatingProject, setCreatingProject] = useState(false)
  const [docCounts, setDocCounts] = useState({}) // { [projectId]: { unit_plans: n, creatives: n, payment_plans: n, videos: n } }
  const [cardMedia, setCardMedia] = useState({}) // { [projectId]: { photos, logo } } — cover photos + developer logo for the card
  const [cardUploading, setCardUploading] = useState({}) // { [`${projectId}_${field}`]: bool }

  useEffect(() => {
    const params = { page, per_page: resolvePerPage(perPage) }
    if (search) params.search = search
    if (filterStatus) params.status = filterStatus
    if (filterCity) params.city = filterCity
    dispatch(fetchProjects(params))
  }, [dispatch, search, filterStatus, filterCity, page, perPage])

  useEffect(() => {
    if (actionError) {
      setLocalError(actionError)
      setTimeout(() => {
        dispatch(clearProjectError())
        setLocalError('')
      }, 5000)
    }
  }, [actionError, dispatch])

  useEffect(() => {
    if (shareProject) {
      dispatch(fetchProjectDocuments(shareProject.id))
    }
  }, [shareProject, dispatch])

  // Card cover photos, developer logo, and document counts all come straight
  // off each project object returned by the list endpoint — no separate
  // per-project /documents fetch needed.
  useEffect(() => {
    const media = {}
    const counts = {}
    list.forEach(p => {
      media[p.id] = {
        photos: [...(p.photos || [])],
        logo: p.developer_logo || null,
      }
      counts[p.id] = {
        unit_plans:    (p.unit_plans    || []).length,
        creatives:     (p.creatives     || []).length,
        payment_plans: (p.payment_plans || []).length,
        videos:        (p.videos        || []).length,
      }
    })
    setCardMedia(media)
    setDocCounts(counts)
  }, [list])

  const canManage = ['super_admin', 'admin'].includes(currentUser?.role)
  const isViewOnly = !canManage  // sales roles have view-only access
  const perms = useModulePermissions('projects')
  const canShareProject = true

  const handleAdd = async (e) => {
    e.preventDefault()
    dispatch(clearProjectError())
    setCreatingProject(true)
    try {
      // Files were already uploaded (and their metadata stored in addForm)
      // as soon as they were picked — just create the project now.
      const projectData = {
        ...addForm,
        total_units: addForm.total_units ? parseInt(addForm.total_units) : 0,
        developer_logo: fileUrl(addForm.developer_logo),
        // Each photo entry must keep its full { file_name, file_path, ... }
        // shape — the backend rejects plain URL strings here.
        photos: addForm.photos || [],
      }
      const result = await dispatch(createProject(projectData))
      if (createProject.fulfilled.match(result)) {
        setSuccess('Project created!')
        dispatch(fetchProjects({ page, per_page: resolvePerPage(perPage) }))
        setTimeout(() => {
          setShowAddModal(false)
          setSuccess('')
          setAddForm(defaultForm)
        }, 800)
      }
    } catch (err) {
      console.error('Project creation failed:', err)
      // error is handled by projectSlice actionError
    } finally {
      setCreatingProject(false)
    }
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    dispatch(clearProjectError())
    setCreatingProject(true)
    try {
      // New documents (including photos and the developer logo) are already
      // attached as soon as they were picked — the PUT only carries plain
      // fields. editForm never holds `photos`/`developer_logo` (those live
      // in existingFiles instead), so they're deliberately left out here.
      const updateData = {
        ...editForm,
        total_units: editForm.total_units ? parseInt(editForm.total_units) : 0,
      }
      const result = await dispatch(updateProject({ id: selectedProject.id, data: updateData }))
      if (updateProject.fulfilled.match(result)) {
        setSuccess('Project updated!')
        dispatch(fetchProjects({ page, per_page: resolvePerPage(perPage) }))
        setTimeout(() => {
          setShowEditModal(false); setSuccess('')
          setExistingFiles({ unit_plans: [], creatives: [], payment_plans: [], videos: [], photos: [], developer_logo: null })
        }, 800)
      }
    } catch (err) {
      console.error('Project update failed:', err)
    } finally {
      setCreatingProject(false)
    }
  }

  const handleDelete = (project) => {
    setProjectToDelete(project)
    setShowDeleteModal(true)
  }

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return
    const result = await dispatch(deleteProject(projectToDelete.id))
    if (deleteProject.fulfilled.match(result)) {
      dispatch(fetchProjects({ page, per_page: resolvePerPage(perPage) }))
      setShowDeleteModal(false)
      setProjectToDelete(null)
    }
  }

  const openEdit = async (project) => {
    setSelectedProject(project)
    setEditForm({
      name:              project.name || '',
      developer:         project.developer || '',
      city:              project.city || '',
      locality:          project.locality || '',
      address:           project.address || '',
      configurations:    project.configurations || [],
      price_range:       project.price_range || '',
      total_units:       project.total_units || '',
      possession_date:   project.possession_date || '',
      rera_number:       project.rera_number || '',
      amenities:         project.amenities || [],
      status:            project.status || 'pre_launch',
      description:       project.description || '',
      brochure_url:      project.brochure_url || '',
      video_url:         project.video_url || '',
      payment_plan_url:  project.payment_plan_url || '',
      home_loan_info:    project.home_loan_info || '',
    })
    setShowEditModal(true)
    try {
      const res = await api.get(`/projects/${project.id}`)
      const d = res.data.data || res.data
      setSelectedProject({ ...project, ...d })
      setEditForm({
        name:              d.name || '',
        developer:         d.developer || '',
        city:              d.city || '',
        locality:          d.locality || '',
        address:           d.address || '',
        configurations:    d.configurations || [],
        price_range:       d.price_range || '',
        total_units:       d.total_units || '',
        possession_date:   d.possession_date || '',
        rera_number:       d.rera_number || '',
        amenities:         d.amenities || [],
        status:            d.status || 'pre_launch',
        description:       d.description || '',
        brochure_url:      d.brochure_url || '',
        video_url:         d.video_url || '',
        payment_plan_url:  d.payment_plan_url || '',
        home_loan_info:    d.home_loan_info || '',
      })
      setExistingFiles({
        unit_plans:     d.unit_plans     || [],
        creatives:      d.creatives      || [],
        payment_plans:  d.payment_plans  || [],
        videos:         d.videos         || [],
        photos:         d.photos         || [],
        developer_logo: d.developer_logo || null,
      })
    } catch {}
  }

  const handleDeleteExistingFile = async (type, docId) => {
    try {
      await api.delete(`/projects/${selectedProject.id}/documents/${docId}`)
      setExistingFiles(prev => ({ ...prev, [type]: prev[type].filter(f => f.id !== docId) }))
    } catch {}
  }

  const refreshExistingFiles = async () => {
    try {
      const res = await api.get(`/projects/${selectedProject.id}`)
      const d = res.data.data || res.data
      setExistingFiles({
        unit_plans:     d.unit_plans     || [],
        creatives:      d.creatives      || [],
        payment_plans:  d.payment_plans  || [],
        videos:         d.videos         || [],
        photos:         d.photos         || [],
        developer_logo: d.developer_logo || null,
      })
    } catch {}
  }

  // Format price range for display
  const formatPrice = (project) => {
    if (project.price_range) return project.price_range
    return '—'
  }

  const formatConfig = (project) => {
    if (Array.isArray(project.configurations) && project.configurations.length > 0) {
      return project.configurations.map(c => typeof c === 'string' ? c : c.configuration).filter(Boolean).join(', ')
    }
    return project.config || project.type || '—'
  }

  const statusBadgeColor = {
    pre_launch:         'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    under_construction: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    nearby_possession:  'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    ready_to_move:      'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  }

  const isAdminUser = ['admin','super_admin'].includes(currentUser?.role)

  const handleExport = async (dateRange) => {
    if (!isAdminUser) return
    try {
      setExporting(true)
      const params = { ...dateRange }
      if (filterStatus) params.status = filterStatus
      if (filterCity) params.city = filterCity
      const res = await api.get('/export/projects', { params, responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a'); a.href = url; a.download = `Projects_${dateRange.from}_to_${dateRange.to}.xlsx`
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
      setShowExportModal(false)
    } catch (err) { console.error('Export failed:', err) } finally { setExporting(false) }
  }

  const handleDownloadAll = async (projectId, projectName, docType) => {
    try {
      setDownloading(prev => ({ ...prev, [projectId]: { ...prev[projectId], [docType]: true } }))
      setDownloadError('')
      
      let endpoint = `/projects/${projectId}/documents/download-all`
      if (docType === 'unit_plan') {
        endpoint = `/projects/${projectId}/documents/unit-plans/download-all`
      } else if (docType === 'creative') {
        endpoint = `/projects/${projectId}/documents/creatives/download-all`
      } else if (docType === 'payment_plan') {
        endpoint = `/projects/${projectId}/documents/payment-plans/download-all`
      } else if (docType === 'video') {
        endpoint = `/projects/${projectId}/documents/videos/download-all`
      }
      
      const res = await api.get(endpoint, { responseType: 'blob' })
      
      // Check if blob is empty or too small (e.g., error message instead of ZIP)
      if (res.data.size < 100) {
        const text = await res.data.text()
        if (text.includes('No documents found')) {
          setDownloadError(`No ${docType.replace('_', ' ')}s found for this project.`)
          setTimeout(() => setDownloadError(''), 5000)
          return
        }
      }

      const cd  = res.headers['content-disposition'] || ''
      const fname = cd.match(/filename="?([^";\n]+)"?/)?.[1] || `${projectName}_${docType}.zip`
      const url = URL.createObjectURL(res.data)
      const a   = document.createElement('a'); a.href = url; a.download = fname
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download failed:', err)
      setDownloadError('Download failed. No files might be available.')
      setTimeout(() => setDownloadError(''), 5000)
    } finally {
      setDownloading(prev => ({ ...prev, [projectId]: { ...prev[projectId], [docType]: false } }))
    }
  }

  const handleCardUpload = async (e, project, field) => {
    const files = Array.from(e.target.files)
    e.target.value = ''
    if (files.length === 0) return
    const key = `${project.id}_${field}`
    setCardUploading(prev => ({ ...prev, [key]: true }))
    try {
      const fd = new FormData()
      files.forEach(file => fd.append(field, file))
      await api.post(`/projects/${project.id}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setDocCounts(prev => ({
        ...prev,
        [project.id]: { ...prev[project.id], [field]: (prev[project.id]?.[field] || 0) + files.length }
      }))
      setSuccess('Files uploaded!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setDownloadError(err.response?.data?.message || 'Upload failed. Please try again.')
      setTimeout(() => setDownloadError(''), 5000)
    } finally {
      setCardUploading(prev => ({ ...prev, [key]: false }))
    }
  }

  return (
    <div className="space-y-4">

      {/* Error notification */}
      {(downloadError || localError) && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400 flex-1">{downloadError || localError}</p>
          <button onClick={() => { setDownloadError(''); setLocalError(''); dispatch(clearProjectError()) }} className="text-red-400 hover:text-red-600 flex-shrink-0"><X size={14} /></button>
        </div>
      )}

      {/* Success notification */}
      {success && (
        <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
          <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-600 dark:text-green-400 flex-1">{success}</p>
          <button onClick={() => setSuccess('')} className="text-green-400 hover:text-green-600 flex-shrink-0"><X size={14} /></button>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search projects..."
              className="pl-9 pr-4 py-2 text-sm bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 rounded-xl outline-none focus:border-brand w-48 text-gray-900 dark:text-gray-100 placeholder-gray-400" />
          </div>

          {/* Status filter */}
          <div className="w-44">
            <CustomSelect
              value={filterStatus}
              onChange={val => { setFilterStatus(val); setPage(1) }}
              options={[{ value: '', label: 'All Status' }, ...projectStatuses]}
              placeholder="All Status"
            />
          </div>

          {/* City filter */}
          <div className="relative">
            <input value={filterCity} onChange={e => { setFilterCity(e.target.value); setPage(1) }}
              placeholder="City..."
              className="px-3 py-2 text-sm bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 rounded-xl outline-none focus:border-brand w-28 text-gray-900 dark:text-gray-100 placeholder-gray-400" />
          </div>

          <button onClick={() => dispatch(fetchProjects({ page, per_page: resolvePerPage(perPage) }))}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 text-gray-400 hover:text-brand hover:border-brand transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* {isAdminUser && (
            <Button variant="outline" size="sm" icon={Download} loading={exporting} disabled={exporting} onClick={() => setShowExportModal(true)}>
              Export
            </Button>
          )} */}
          {perms.create && (
            <Button icon={Plus} onClick={() => { setAddForm(defaultForm); dispatch(clearProjectError()); setShowAddModal(true) }}>
              Add Project
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      {!loading && (
        <div className="text-sm text-gray-500 dark:text-[#888] flex items-center gap-3">
          <span>
            <span className="font-semibold text-gray-900 dark:text-white">{list.length}</span> projects
            {pagination?.total > list.length && <> of <span className="font-semibold text-gray-900 dark:text-white">{pagination.total}</span> total</>}
          </span>
          <PageSizeSelect value={perPage} onChange={v => { setPerPage(v); setPage(1) }} />
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <CardSkeleton count={4} />
      ) : list.length === 0 ? (
        <div className="py-20 text-center text-gray-400 dark:text-[#888]">
          <Building2 size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
          <p className="font-medium text-lg">No projects found</p>
          <p className="text-sm mt-1">Add your first project to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {list.map((project, i) => {
            return (
              <div key={project.id}
                className="bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 rounded-2xl overflow-hidden flex flex-col shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 hover:shadow-lg hover:shadow-gray-300/50 dark:hover:shadow-gray-900/50 transition-all duration-200">

                {/* Header — auto-rotating photo slider when available, gradient + icon fallback */}
                <ProjectCardCover photos={cardMedia[project.id]?.photos} colorClass={projectColors[i % projectColors.length]}>
                  <div className="absolute top-3 right-3 z-20">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-wider ${statusBadgeColor[project.status] || statusBadgeColor.pre_launch}`}>
                      {project.status?.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                  {(perms.edit || perms.delete || canShareProject) && (
                    <div className="absolute top-3 left-3 z-20 flex gap-1">
                      {perms.edit && (
                        <button onClick={() => openEdit(project)}
                          className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/80 dark:bg-black/40 text-gray-600 hover:text-blue-600 transition-colors" title="Edit">
                          <Edit2 size={11} />
                        </button>
                      )}
                      <button onClick={() => setShareProject(project)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/80 dark:bg-black/40 text-gray-600 hover:text-brand transition-colors" title="Share via email">
                        <Share2 size={11} />
                      </button>
                      {perms.delete && (
                        <button onClick={() => handleDelete(project)}
                          className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/80 dark:bg-black/40 text-gray-600 hover:text-red-500 transition-colors" title="Delete">
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  )}
                </ProjectCardCover>

                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    {/* Developer logo next to project name */}
                    {cardMedia[project.id]?.logo && <ProjectLogo logo={cardMedia[project.id]?.logo} alt={project.developer} />}
                    <h3 onClick={() => navigate(`/projects/${project.id}`)} className="font-display font-semibold text-gray-900 dark:text-white text-base truncate cursor-pointer hover:text-brand transition-colors flex-1">{project.name}</h3>
                  </div>
                  {project.developer && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5">{project.developer}</p>
                  )}
                  <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-[#888] mb-3">
                    <MapPin size={11} />
                    <span className="truncate">{project.locality || project.location || project.city || '—'}</span>
                    {project.city && project.locality && (
                      <span className="text-gray-300 dark:text-[#555]">· {project.city}</span>
                    )}
                  </div>

                  <div className="space-y-2 mb-4 flex-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                      <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-medium">{project.type || 'Residential'}</span>
                      <span className="text-gray-300 dark:text-[#555]">·</span>
                      <span className="truncate">{formatConfig(project)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                      <IndianRupee size={11} className="text-brand flex-shrink-0" />
                      <span>{formatPrice(project)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                      <Users size={11} className="text-blue-500 flex-shrink-0" />
                      <span>{project.total_leads || 0} active leads</span>
                    </div>
                    {project.rera_number && (
                      <div className="text-[10px] text-gray-400 truncate">RERA: {project.rera_number}</div>
                    )}
                  </div>

                  {/* Download / Upload Options */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {documentTypeMap.map(({ docType, field, label, btn, upload }) => {
                      const count = docCounts[project.id]?.[field]
                      const hasDocs = count === undefined || count > 0
                      if (hasDocs) {
                        return (
                          <button key={docType} onClick={(e) => { e.stopPropagation(); handleDownloadAll(project.id, project.name, docType) }}
                            disabled={downloading[project.id]?.[docType]}
                            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-50 ${btn}`}>
                            {downloading[project.id]?.[docType] ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                            {label}
                          </button>
                        )
                      }
                      if (!perms.edit) {
                        return (
                          <div key={docType} className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-gray-400 text-[10px] font-bold">
                            No {label}
                          </div>
                        )
                      }
                      const uploading = cardUploading[`${project.id}_${field}`]
                      return (
                        <label key={docType} onClick={(e) => e.stopPropagation()}
                          className={`relative flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed text-[10px] font-bold cursor-pointer transition-colors ${upload} ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                          <input type="file" multiple
                            onChange={(e) => handleCardUpload(e, project, field)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                          {label}
                        </label>
                      )
                    })}
                  </div>

                  <Button onClick={() => navigate(`/projects/${project.id}`)} variant="outline" size="sm" className="w-full mt-auto">View Project</Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination?.total > 0 && (
        <div className="flex items-center justify-between px-2 text-xs text-gray-500 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span>Page {pagination.page} of {pagination.total_pages || 1} · {pagination.total} total</span>
            <PageSizeSelect value={perPage} onChange={v => { setPerPage(v); setPage(1) }} />
          </div>
          {pagination.total_pages > 1 && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button size="sm" variant="outline" disabled={page >= pagination.total_pages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setSuccess('') }} title="Add New Project" size="lg">
        <form onSubmit={handleAdd} className="space-y-4">
          <ProjectForm formData={addForm} setFormData={setAddForm} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddModal(false)} disabled={creatingProject}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={creatingProject}>Add Project</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => {
        setShowEditModal(false); setSuccess('')
        setExistingFiles({ unit_plans: [], creatives: [], payment_plans: [], videos: [], photos: [], developer_logo: null })
      }} title="Edit Project" size="lg">
        <form onSubmit={handleEdit} className="space-y-4">
          <ProjectForm
            formData={editForm}
            setFormData={setEditForm}
            projectId={selectedProject?.id}
            existingFiles={existingFiles}
            onDeleteExisting={handleDeleteExistingFile}
            onFilesUploaded={refreshExistingFiles}
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowEditModal(false); setExistingFiles({ unit_plans: [], creatives: [], payment_plans: [], videos: [], photos: [], developer_logo: null }) }} disabled={creatingProject}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={creatingProject}>Update Project</Button>
          </div>
        </form>
      </Modal>

      {/* Export Modal */}
      <ExportModal 
        isOpen={showExportModal} 
        onClose={() => setShowExportModal(false)} 
        onExport={handleExport} 
        loading={exporting}
        title="Export Projects"
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setProjectToDelete(null) }}
        onConfirm={confirmDeleteProject}
        title="Delete Project"
        message={`Are you sure you want to delete project "${projectToDelete?.name}"? This will also remove all associated data. This action cannot be undone.`}
        confirmText="Delete Project"
        loading={actionLoading}
      />

      {/* Share Modal */}
      {shareProject && (
        <ShareProjectModal
          projectId={shareProject.id}
          projectName={shareProject.name}
          onClose={() => setShareProject(null)}
          projectDocuments={projectDocuments}
        />
      )}
    </div>
  )
}