import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  ArrowLeft, Building2, MapPin, Loader2, User,
  Info, Search, RefreshCw, Download, Trash2,
  FileText, FileImage, Upload, X, CheckCircle2,
  FolderOpen, FileArchive, Plus, ShieldCheck, AlertCircle,
} from 'lucide-react'
import {
  fetchProjectLeads, clearCurrentProject,
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

// ─── Document Upload Modal ────────────────────────────────────────────────────
function UploadDocsModal({ projectId, onClose, onSuccess }) {
  const [unitFiles,    setUnitFiles]    = useState([])
  const [creativeFiles,setCreativeFiles]= useState([])
  const [uploading,    setUploading]    = useState(false)
  const [error,        setError]        = useState('')
  const [success,      setSuccess]      = useState('')

  const addFiles = (prev, newFiles) => {
    const out = [...prev]
    Array.from(newFiles).forEach(f => {
      if (!out.find(x => x.name === f.name && x.size === f.size)) out.push(f)
    })
    return out
  }

  const upload = async () => {
    if (!unitFiles.length && !creativeFiles.length) { setError('Add at least one file'); return }
    setError(''); setUploading(true)
    try {
      const fd = new FormData()
      unitFiles.forEach(f     => fd.append('unit_plans', f))
      creativeFiles.forEach(f => fd.append('creatives', f))
      await api.post(`/projects/${projectId}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setSuccess(`${unitFiles.length + creativeFiles.length} file(s) uploaded!`)
      setTimeout(() => { onSuccess(); onClose() }, 800)
    } catch (e) { setError(e.response?.data?.message || 'Upload failed') }
    finally { setUploading(false) }
  }

  const DropZone = ({ label, files, setFiles, color }) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">{label}</label>
        {files.length > 0 && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${color}`}>{files.length} file{files.length > 1 ? 's' : ''}</span>}
      </div>
      <label
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); setFiles(p => addFiles(p, e.dataTransfer.files)) }}
        className={`flex flex-col items-center gap-2 p-5 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${files.length ? 'border-green-300 bg-green-50/40 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-brand hover:bg-brand/5'}`}>
        <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" className="hidden"
          onChange={e => setFiles(p => addFiles(p, e.target.files))}/>
        {files.length === 0 ? (
          <>
            <Upload size={20} className="text-gray-400"/>
            <p className="text-xs text-gray-500">Drag & drop or click · PDF, JPEG, PNG, Word</p>
          </>
        ) : (
          <div className="w-full space-y-1.5">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl px-3 py-2 border border-gray-100 dark:border-gray-700">
                <FileIcon mime={f.type} size={13}/>
                <span className="text-xs text-gray-700 dark:text-gray-200 truncate flex-1">{f.name}</span>
                <span className="text-[10px] text-gray-400 flex-shrink-0">{fmtSize(f.size)}</span>
                <button type="button" onClick={e => { e.preventDefault(); setFiles(p => p.filter((_, j) => j !== i)) }}
                  className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"><X size={12}/></button>
              </div>
            ))}
            <label className="flex items-center gap-1.5 text-[11px] text-brand cursor-pointer hover:underline mt-1">
              <Plus size={11}/> Add more
              <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" className="hidden"
                onChange={e => setFiles(p => addFiles(p, e.target.files))}/>
            </label>
          </div>
        )}
      </label>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Upload size={15} className="text-brand"/> Upload Documents
          </h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X size={15}/></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <DropZone label="Unit Plans" files={unitFiles} setFiles={setUnitFiles} color="text-blue-600 bg-blue-50 dark:bg-blue-900/20"/>
          <DropZone label="Creatives"  files={creativeFiles} setFiles={setCreativeFiles} color="text-purple-600 bg-purple-50 dark:bg-purple-900/20"/>
          {error   && <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5"><AlertCircle size={13} className="text-red-500"/><p className="text-xs text-red-600">{error}</p></div>}
          {success && <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-2.5"><CheckCircle2 size={13} className="text-green-500"/><p className="text-xs text-green-600">{success}</p></div>}
        </div>
        <div className="px-6 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
          <button onClick={upload} disabled={uploading || (!unitFiles.length && !creativeFiles.length)}
            className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand/90 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">
            {uploading ? <><Loader2 size={14} className="animate-spin"/>Uploading…</> : <><Upload size={14}/>Upload {unitFiles.length + creativeFiles.length > 0 ? `${unitFiles.length + creativeFiles.length} File${unitFiles.length + creativeFiles.length > 1 ? 's' : ''}` : 'Files'}</>}
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
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#0f0f0f] border border-gray-100 dark:border-gray-800 hover:border-brand/30 hover:bg-white dark:hover:bg-[#1a1a1a] transition-all group">
      <div className="w-9 h-9 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0 shadow-sm">
        <FileIcon mime={doc.mime_type} size={16}/>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{doc.file_name}</p>
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
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40">
            {deleting ? <Loader2 size={13} className="animate-spin"/> : <Trash2 size={13}/>}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProjectDetail() {
  const { id } = useParams()
  const navigate  = useNavigate()
  const dispatch  = useDispatch()
  const { user }  = useSelector(s => s.auth)

  const { currentProject: project, projectLeads: leads, detailLoading, pagination,
          projectDocuments, docsLoading } = useSelector(s => s.projects)

  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page,         setPage]         = useState(1)
  const [showUpload,   setShowUpload]   = useState(false)
  const [dlError,      setDlError]      = useState('')

  const canAdmin  = ['super_admin', 'admin'].includes(user?.role)
  const canUpload = canAdmin

  useEffect(() => {
    dispatch(fetchProjectLeads({ id, params: { page } }))
    dispatch(fetchProjectDocuments(id))
    return () => dispatch(clearCurrentProject())
  }, [dispatch, id, page])

  // ── Download single file ──────────────────────────────────────────────────
  const downloadDoc = async (doc) => {
    try {
      const res = await api.get(`/projects/${id}/documents/${doc.id}/download`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a   = document.createElement('a'); a.href = url; a.download = doc.file_name
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    } catch { setDlError(`Failed to download "${doc.file_name}"`) }
  }

  // ── Download all as ZIP ───────────────────────────────────────────────────
  const downloadAll = async (docType) => {
    try {
      setDlError('')
      const params = docType ? `?document_type=${docType}` : ''
      const res = await api.get(`/projects/${id}/documents/download-all${params}`, { responseType: 'blob' })
      const cd  = res.headers['content-disposition'] || ''
      const fname = cd.match(/filename="?([^";\n]+)"?/)?.[1] || `${project?.name || 'project'}_${docType || 'all'}.zip`
      const url = URL.createObjectURL(res.data)
      const a   = document.createElement('a'); a.href = url; a.download = fname
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    } catch { setDlError('Failed to download ZIP. Some files may be missing on the server.') }
  }

  const totalDocs = (projectDocuments?.unit_plans?.length || 0) + (projectDocuments?.creatives?.length || 0)

  const filteredLeads = leads.filter(l => {
    const ms = l.name?.toLowerCase().includes(search.toLowerCase()) || l.assigned_to?.toLowerCase().includes(search.toLowerCase())
    const mf = !filterStatus || l.status === filterStatus
    return ms && mf
  })

  if (detailLoading && !project) return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <Loader2 className="animate-spin text-brand mb-4" size={40} />
      <p className="text-gray-500 font-medium">Loading project details...</p>
    </div>
  )

  if (!project && !detailLoading) return (
    <div className="flex items-center justify-center h-[60vh] text-gray-400 dark:text-[#888]">
      <div className="text-center max-w-sm px-6">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">🏢</div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Project not found</h3>
        <Button variant="outline" onClick={() => navigate('/projects')} className="w-full rounded-xl">Back to Projects</Button>
      </div>
    </div>
  )

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12">

      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/projects')}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand transition-colors group">
          <div className="w-8 h-8 rounded-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 flex items-center justify-center group-hover:border-brand/30 transition-all">
            <ArrowLeft size={16}/>
          </div>
          Back to Projects
        </button>
      </div>

      {project && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT COLUMN */}
          <div className="lg:col-span-8 space-y-6">

            {/* 1. Project Header Card */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] overflow-hidden shadow-sm">
              <div className="h-24 bg-gradient-to-r from-blue-500 to-[#0082f3] opacity-10 dark:opacity-20"/>
              <div className="px-8 pb-8 relative">
                <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-10">
                  <div className="p-1.5 bg-white dark:bg-[#1a1a1a] rounded-[28px] shadow-xl">
                    <div className="w-24 h-24 md:w-32 md:h-32 bg-brand rounded-[22px] flex items-center justify-center text-white">
                      <Building2 size={48}/>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 mb-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
                      <Badge label={project.status || 'Active'}/>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-brand"/> {project.id?.slice?.(0,8)}</span>
                      <span className="flex items-center gap-1.5"><MapPin size={14}/>{project.city || 'Location not set'}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10">
                  {[
                    { icon: User,     label: 'Total Leads',    value: pagination.total || leads.length, color: 'text-blue-600 bg-blue-50' },
                    { icon: MapPin,   label: 'City',           value: project.city || '—',             color: 'text-indigo-600 bg-indigo-50' },
                    { icon: FolderOpen,label: 'Documents',     value: docsLoading ? '…' : totalDocs,   color: 'text-teal-600 bg-teal-50' },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="p-4 rounded-2xl border border-gray-50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-[#0f0f0f]/50">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color} dark:bg-opacity-10`}><Icon size={14}/></div>
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
                      </div>
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Documents Card */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
                    <FolderOpen size={18} className="text-teal-600 dark:text-teal-400"/>
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">Project Documents</h3>
                    <p className="text-xs text-gray-400">
                      {docsLoading ? 'Loading…' : `${totalDocs} document${totalDocs !== 1 ? 's' : ''} · Unit Plans & Creatives`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {totalDocs > 0 && (
                    <button onClick={() => downloadAll()}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:border-brand hover:text-brand transition-colors">
                      <FileArchive size={13}/> Download All ZIP
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

              {dlError && (
                <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5 mb-4">
                  <AlertCircle size={13} className="text-red-500"/><p className="text-xs text-red-600">{dlError}</p>
                  <button onClick={() => setDlError('')} className="ml-auto text-gray-400 hover:text-red-500"><X size={12}/></button>
                </div>
              )}

              {docsLoading ? (
                <div className="py-8 flex justify-center"><Loader2 size={24} className="animate-spin text-brand"/></div>
              ) : totalDocs === 0 ? (
                <div className="text-center py-10 bg-gray-50 dark:bg-[#0f0f0f] rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                  <div className="text-3xl mb-2">📁</div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">No documents uploaded yet</p>
                  {canUpload && (
                    <button onClick={() => setShowUpload(true)}
                      className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand/10 hover:bg-brand/20 text-brand text-xs font-semibold mx-auto transition-colors">
                      <Upload size={13}/> Upload first document
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-6">

                  {/* Unit Plans */}
                  {projectDocuments.unit_plans?.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Unit Plans</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                            {projectDocuments.unit_plans.length}
                          </span>
                        </div>
                        <button onClick={() => downloadAll('unit_plan')}
                          className="flex items-center gap-1 text-[11px] text-blue-600 hover:underline">
                          <Download size={11}/> Download all
                        </button>
                      </div>
                      <div className="space-y-2">
                        {projectDocuments.unit_plans.map(doc => (
                          <DocRow key={doc.id} doc={doc} projectId={id} canDelete={canAdmin}
                            onDeleted={() => dispatch(fetchProjectDocuments(id))}
                            onDownload={downloadDoc}/>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Creatives */}
                  {projectDocuments.creatives?.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Creatives</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                            {projectDocuments.creatives.length}
                          </span>
                        </div>
                        <button onClick={() => downloadAll('creative')}
                          className="flex items-center gap-1 text-[11px] text-purple-600 hover:underline">
                          <Download size={11}/> Download all
                        </button>
                      </div>
                      <div className="space-y-2">
                        {projectDocuments.creatives.map(doc => (
                          <DocRow key={doc.id} doc={doc} projectId={id} canDelete={canAdmin}
                            onDeleted={() => dispatch(fetchProjectDocuments(id))}
                            onDownload={downloadDoc}/>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. Leads Table */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <User size={18} className="text-brand"/>
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">Project Leads</h3>
                    <p className="text-xs text-gray-400">All leads interested in this project</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads..."
                      className="pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:border-brand w-44 text-gray-900 dark:text-gray-100 placeholder-gray-400"/>
                  </div>
                  <button onClick={() => dispatch(fetchProjectLeads({ id, params: { page } }))}
                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 text-gray-400 hover:text-brand hover:border-brand transition-colors">
                    <RefreshCw size={14} className={detailLoading ? 'animate-spin' : ''}/>
                  </button>
                </div>
              </div>

              {detailLoading && leads.length === 0 ? (
                <div className="py-12 flex flex-col items-center"><Loader2 size={32} className="animate-spin text-brand mb-2"/><p className="text-xs text-gray-400">Fetching leads…</p></div>
              ) : filteredLeads.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-[#0f0f0f] rounded-[24px] border-2 border-dashed border-gray-100 dark:border-gray-800">
                  <div className="text-4xl mb-3">👥</div>
                  <p className="text-sm font-medium text-gray-500">No leads found for this project</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b border-gray-100 dark:border-gray-800">
                          <th className="py-4 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lead Name</th>
                          <th className="py-4 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                          <th className="py-4 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assigned To</th>
                          <th className="py-4 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                        {filteredLeads.map(lead => (
                          <tr key={lead.id} className="group hover:bg-gray-50/50 dark:hover:bg-[#0f0f0f]/50 transition-colors">
                            <td className="py-4 px-2">
                              <div className="flex items-center gap-3">
                                <Avatar name={lead.name} size="sm"/>
                                <span className="font-bold text-gray-900 dark:text-white">{lead.name}</span>
                              </div>
                            </td>
                            <td className="py-4 px-2"><Badge label={lead.status}/></td>
                            <td className="py-4 px-2">
                              <div className="flex items-center gap-2">
                                <Avatar name={lead.assigned_to} size="xs"/>
                                <span className="text-gray-600 dark:text-gray-400 font-medium">{lead.assigned_to || 'Unassigned'}</span>
                              </div>
                            </td>
                            <td className="py-4 px-2 text-right">
                              <Button variant="outline" size="sm" className="rounded-lg text-xs h-8"
                                onClick={() => navigate(`/leads/${lead.id}`)}>View</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {pagination?.total_pages > 1 && (
                    <div className="flex items-center justify-between pt-8 px-2 text-xs text-gray-500">
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
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-4 space-y-6">

            {/* Project Summary */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
              <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <Info size={18} className="text-blue-500"/> Project Summary
              </h3>
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#0f0f0f] border border-gray-100 dark:border-gray-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic">
                    {project.description || 'No project description available.'}
                  </p>
                </div>
                <div className="pt-4 border-t border-gray-50 dark:border-gray-800 space-y-3">
                  {[
                    { l:'Developer',   v: project.developer    || '—' },
                    { l:'Config',      v: Array.isArray(project.configurations) ? project.configurations.join(', ') : project.configurations || '—' },
                    { l:'Price Range', v: project.price_range  || '—' },
                    { l:'Total Units', v: project.total_units  || '—' },
                    { l:'Possession',  v: project.possession_date ? new Date(project.possession_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—' },
                    { l:'RERA',        v: project.rera_number  || '—' },
                  ].map(({ l, v }) => (
                    <div key={l} className="flex justify-between items-start gap-3">
                      <span className="text-xs text-gray-400 font-medium uppercase tracking-wider flex-shrink-0">{l}</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white text-right truncate">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Download panel — sidebar */}
            {totalDocs > 0 && (
              <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
                <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Download size={16} className="text-teal-500"/> Quick Download
                </h3>
                <div className="space-y-2.5">
                  {projectDocuments.unit_plans?.length > 0 && (
                    <button onClick={() => downloadAll('unit_plan')}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 transition-colors group">
                      <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                        <FileArchive size={14} className="text-white"/>
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Unit Plans ZIP</p>
                        <p className="text-[10px] text-blue-500">{projectDocuments.unit_plans.length} file{projectDocuments.unit_plans.length > 1 ? 's' : ''}</p>
                      </div>
                      <Download size={14} className="text-blue-500 flex-shrink-0 group-hover:translate-y-0.5 transition-transform"/>
                    </button>
                  )}
                  {projectDocuments.creatives?.length > 0 && (
                    <button onClick={() => downloadAll('creative')}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-50 dark:bg-purple-900/10 hover:bg-purple-100 dark:hover:bg-purple-900/20 border border-purple-100 dark:border-purple-800/30 transition-colors group">
                      <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center flex-shrink-0">
                        <FileArchive size={14} className="text-white"/>
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-xs font-semibold text-purple-700 dark:text-purple-300">Creatives ZIP</p>
                        <p className="text-[10px] text-purple-500">{projectDocuments.creatives.length} file{projectDocuments.creatives.length > 1 ? 's' : ''}</p>
                      </div>
                      <Download size={14} className="text-purple-500 flex-shrink-0 group-hover:translate-y-0.5 transition-transform"/>
                    </button>
                  )}
                  {totalDocs > 1 && (
                    <button onClick={() => downloadAll()}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:border-brand hover:text-brand transition-colors">
                      <Download size={13}/> Download All ({totalDocs} files)
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <UploadDocsModal
          projectId={id}
          onClose={() => setShowUpload(false)}
          onSuccess={() => dispatch(fetchProjectDocuments(id))}
        />
      )}
    </div>
  )
}