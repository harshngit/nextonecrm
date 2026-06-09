import React, { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
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

const projectColors = [
  'from-blue-400/20 to-blue-600/20',
  'from-green-400/20 to-teal-400/20',
  'from-blue-400/20 to-purple-400/20',
  'from-rose-400/20 to-pink-400/20',
]

const projectStatuses = [
  { value: 'active', label: 'Active' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'completed', label: 'Completed' },
  { value: 'inactive', label: 'Inactive' },
]

const defaultForm = {
  name: '',
  developer: '',
  city: '',
  locality: '',
  price_range: '',
  total_units: '',
  description: '',
  status: 'active',
  rera_number: '',
  brochure_url: '',
  video_url: '',
  payment_plan: '',
  home_loan_info: '',
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

// ── Form defined OUTSIDE to prevent typing/focus loss bug ────────────────────
function ProjectForm({ formData, setFormData, uploadFiles, setUploadFiles }) {
  const ic = "w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm transition-all duration-200"
  const lc = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"

  const handleFileChange = (e, type) => {
    const files = Array.from(e.target.files)
    setUploadFiles(prev => ({
      ...prev,
      [type]: [...prev[type], ...files]
    }))
  }

  const removeFile = (type, index) => {
    setUploadFiles(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }))
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

      {/* Status */}
      <div className="grid grid-cols-1 gap-2">
        <CustomSelect
          label="Status"
          value={formData.status}
          onChange={val => setFormData(p => ({ ...p, status: val }))}
          options={projectStatuses}
        />
      </div>

      {/* Price Range (Simplified as per user request) */}
      <div>
        <label className={lc}>Price Range (e.g. 80L - 1.5Cr)</label>
        <input value={formData.price_range}
          onChange={e => setFormData(p => ({ ...p, price_range: e.target.value }))}
          placeholder="80L - 1.5Cr"
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
            placeholder="P51900012345"
            className={ic} />
        </div>
      </div>

      {/* Brochure URL + Video URL */}
      

      {/* Payment Plan + Home Loan Info */}
      <div className="grid grid-cols-1 gap-2">
        <div>
          <label className={lc}>Payment Plan Text</label>
          <textarea rows={2} value={formData.payment_plan}
            onChange={e => setFormData(p => ({ ...p, payment_plan: e.target.value }))}
            placeholder="20% on booking, 30% on construction, 50% on possession..."
            className={ic} />
        </div>
        <div>
          <label className={lc}>Home Loan Info</label>
          <textarea rows={2} value={formData.home_loan_info}
            onChange={e => setFormData(p => ({ ...p, home_loan_info: e.target.value }))}
            placeholder="80% loan available from HDFC, ICICI at 8.5% interest..."
            className={ic} />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className={lc}>Description</label>
        <textarea rows={3} value={formData.description}
          onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
          placeholder="Brief overview of project features, amenities..."
          className={ic} />
      </div>

      {/* File Uploads */}
      <div className="grid grid-cols-1 gap-2 pt-1">
        {/* Unit Plans */}
        <div>
          <label className={lc}>Unit Plans</label>
          <div className="relative group">
            <input 
              type="file" 
              multiple 
              onChange={(e) => handleFileChange(e, 'unit_plans')}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl group-hover:border-brand group-hover:bg-brand/5 transition-all">
              <Paperclip size={14} className="text-gray-400 group-hover:text-brand" />
              <span className="text-xs text-gray-500 group-hover:text-brand">Upload Unit Plans</span>
            </div>
          </div>
          {uploadFiles.unit_plans?.length > 0 && (
            <div className="mt-1.5 space-y-1">
              {uploadFiles.unit_plans.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between px-2 py-1 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg group">
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 truncate flex-1 mr-2">{file.name}</span>
                  <button onClick={() => removeFile('unit_plans', idx)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Creatives */}
        <div>
          <label className={lc}>Creatives</label>
          <div className="relative group">
            <input 
              type="file" 
              multiple 
              onChange={(e) => handleFileChange(e, 'creatives')}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl group-hover:border-brand group-hover:bg-brand/5 transition-all">
              <Paperclip size={14} className="text-gray-400 group-hover:text-brand" />
              <span className="text-xs text-gray-500 group-hover:text-brand">Upload Creatives</span>
            </div>
          </div>
          {uploadFiles.creatives?.length > 0 && (
            <div className="mt-1.5 space-y-1">
              {uploadFiles.creatives.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between px-2 py-1 bg-purple-50/50 dark:bg-purple-900/10 rounded-lg group">
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 truncate flex-1 mr-2">{file.name}</span>
                  <button onClick={() => removeFile('creatives', idx)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Plans */}
        <div>
          <label className={lc}>Payment Plan Files</label>
          <div className="relative group">
            <input 
              type="file" 
              multiple 
              onChange={(e) => handleFileChange(e, 'payment_plans')}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl group-hover:border-brand group-hover:bg-brand/5 transition-all">
              <Paperclip size={14} className="text-gray-400 group-hover:text-brand" />
              <span className="text-xs text-gray-500 group-hover:text-brand">Upload Payment Plans</span>
            </div>
          </div>
          {uploadFiles.payment_plans?.length > 0 && (
            <div className="mt-1.5 space-y-1">
              {uploadFiles.payment_plans.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between px-2 py-1 bg-green-50/50 dark:bg-green-900/10 rounded-lg group">
                  <span className="text-[10px] text-green-600 dark:text-green-400 truncate flex-1 mr-2">{file.name}</span>
                  <button onClick={() => removeFile('payment_plans', idx)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Videos */}
        <div>
          <label className={lc}>Video Files</label>
          <div className="relative group">
            <input 
              type="file" 
              multiple 
              accept="video/*"
              onChange={(e) => handleFileChange(e, 'videos')}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl group-hover:border-brand group-hover:bg-brand/5 transition-all">
              <Paperclip size={14} className="text-gray-400 group-hover:text-brand" />
              <span className="text-xs text-gray-500 group-hover:text-brand">Upload Videos</span>
            </div>
          </div>
          {uploadFiles.videos?.length > 0 && (
            <div className="mt-1.5 space-y-1">
              {uploadFiles.videos.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between px-2 py-1 bg-amber-50/50 dark:bg-amber-900/10 rounded-lg group">
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 truncate flex-1 mr-2">{file.name}</span>
                  <button onClick={() => removeFile('videos', idx)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
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

  const [showAddModal,  setShowAddModal]  = useState(false)
  const [uploadFiles, setUploadFiles] = useState({ unit_plans: [], creatives: [], payment_plans: [], videos: [] })
  const [showEditModal, setShowEditModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState(null)
  const [selectedProject, setSelectedProject] = useState(null)
  const [shareProject,    setShareProject]    = useState(null)  // project to share

  const [addForm,  setAddForm]  = useState(defaultForm)
  const [editForm, setEditForm] = useState(defaultForm)
  const [success,    setSuccess]    = useState('')
  const [downloadError, setDownloadError] = useState('')
  const [localError, setLocalError] = useState('')
  const [exporting,  setExporting]  = useState(false)
  const [downloading, setDownloading] = useState({}) // { [projectId]: { unit_plan: bool, creative: false, payment_plan: bool, video: false } }

  useEffect(() => {
    const params = { page, per_page: 10 }
    if (search) params.search = search
    if (filterStatus) params.status = filterStatus
    if (filterCity) params.city = filterCity
    dispatch(fetchProjects(params))
  }, [dispatch, search, filterStatus, filterCity, page])

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

  const canManage = ['super_admin', 'admin'].includes(currentUser?.role)
  const isViewOnly = !canManage  // sales roles have view-only access

  const handleAdd = async (e) => {
    e.preventDefault()
    dispatch(clearProjectError())
    
    try {
      // 1. Upload Unit Plans first
      const unitPlanDetails = []
      for (const file of uploadFiles.unit_plans) {
        const formData = new FormData()
        formData.append('unit_plan', file)
        const res = await api.post('/projects/upload-unit-plan', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        if (res.data.success) {
          unitPlanDetails.push(res.data.data)
        }
      }

      // 2. Upload Creatives
      const creativeDetails = []
      for (const file of uploadFiles.creatives) {
        const formData = new FormData()
        formData.append('creative', file)
        const res = await api.post('/projects/upload-creative', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        if (res.data.success) {
          creativeDetails.push(res.data.data)
        }
      }

      // 3. Upload Payment Plans
      const paymentPlanDetails = []
      for (const file of uploadFiles.payment_plans) {
        const formData = new FormData()
        formData.append('payment_plan', file)
        const res = await api.post('/projects/upload-payment-plan', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        if (res.data.success) {
          paymentPlanDetails.push(res.data.data)
        }
      }

      // 4. Upload Videos
      const videoDetails = []
      for (const file of uploadFiles.videos) {
        const formData = new FormData()
        formData.append('video', file)
        const res = await api.post('/projects/upload-video', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        if (res.data.success) {
          videoDetails.push(res.data.data)
        }
      }

      // 5. Prepare project data with file details
      const projectData = {
        ...addForm,
        unit_plans: unitPlanDetails,
        creatives: creativeDetails,
        payment_plans: paymentPlanDetails,
        videos: videoDetails,
        total_units: addForm.total_units ? parseInt(addForm.total_units) : 0
      }

      // 6. Create Project
      const result = await dispatch(createProject(projectData))
      if (createProject.fulfilled.match(result)) {
        setSuccess('Project created!')
        setUploadFiles({ unit_plans: [], creatives: [], payment_plans: [], videos: [] })
        dispatch(fetchProjects({ page, per_page: 10 }))
        setTimeout(() => { 
          setShowAddModal(false)
          setSuccess('')
          setAddForm(defaultForm) 
        }, 800)
      }
    } catch (err) {
      console.error('Project creation failed:', err)
      // error is handled by projectSlice actionError
    }
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    dispatch(clearProjectError())
    const result = await dispatch(updateProject({ id: selectedProject.id, data: editForm }))
    if (updateProject.fulfilled.match(result)) {
      setSuccess('Project updated!')
      dispatch(fetchProjects({ page, per_page: 10 }))
      setTimeout(() => { setShowEditModal(false); setSuccess('') }, 800)
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
      dispatch(fetchProjects({ page, per_page: 10 }))
      setShowDeleteModal(false)
      setProjectToDelete(null)
    }
  }

  const openEdit = (project) => {
    setSelectedProject(project)
    setEditForm({
      name:           project.name || '',
      developer:      project.developer || '',
      city:           project.city || '',
      locality:       project.locality || '',
      type:           project.type || 'Residential',
      price_range:    project.price_range || '',
      total_units:    project.total_units || '',
      description:    project.description || '',
      status:         project.status || 'active',
      rera_number:    project.rera_number || '',
      brochure_url:   project.brochure_url || '',
      video_url:      project.video_url || '',
      payment_plan:   project.payment_plan || '',
      home_loan_info: project.home_loan_info || '',
    })
    setShowEditModal(true)
  }

  // Format price range for display
  const formatPrice = (project) => {
    if (project.price_range) return project.price_range
    return '—'
  }

  const formatConfig = (project) => {
    if (Array.isArray(project.configurations)) return project.configurations.join(', ')
    return project.configurations || project.config || project.type || '—'
  }

  const statusBadgeColor = {
    active:    'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    upcoming:  'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    completed: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
    inactive:  'bg-red-100 dark:bg-red-900/20 text-red-500 dark:text-red-400',
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
              options={[
                { value: '', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'upcoming', label: 'Upcoming' },
                { value: 'completed', label: 'Completed' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              placeholder="All Status"
            />
          </div>

          {/* City filter */}
          <div className="relative">
            <input value={filterCity} onChange={e => { setFilterCity(e.target.value); setPage(1) }}
              placeholder="City..."
              className="px-3 py-2 text-sm bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 rounded-xl outline-none focus:border-brand w-28 text-gray-900 dark:text-gray-100 placeholder-gray-400" />
          </div>

          <button onClick={() => dispatch(fetchProjects({ page, per_page: 10 }))}
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
          {canManage && (
            <Button icon={Plus} onClick={() => { setAddForm(defaultForm); dispatch(clearProjectError()); setShowAddModal(true) }}>
              Add Project
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      {!loading && (
        <div className="text-sm text-gray-500 dark:text-[#888]">
          <span className="font-semibold text-gray-900 dark:text-white">{list.length}</span> projects
          {pagination?.total > list.length && <> of <span className="font-semibold text-gray-900 dark:text-white">{pagination.total}</span> total</>}
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

                {/* Header gradient */}
                <div className={`h-24 bg-gradient-to-br ${projectColors[i % projectColors.length]} flex items-center justify-center relative flex-shrink-0`}>
                  <div className="w-12 h-12 rounded-2xl bg-white/80 dark:bg-black/30 backdrop-blur flex items-center justify-center shadow-sm">
                    <Building2 size={22} className="text-brand" />
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${statusBadgeColor[project.status] || statusBadgeColor.active}`}>
                      {project.status}
                    </span>
                  </div>
                  {canManage && (
                    <div className="absolute top-3 left-3 flex gap-1">
                      <button onClick={() => openEdit(project)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/80 dark:bg-black/40 text-gray-600 hover:text-blue-600 transition-colors" title="Edit">
                        <Edit2 size={11} />
                      </button>
                      <button onClick={() => setShareProject(project)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/80 dark:bg-black/40 text-gray-600 hover:text-brand transition-colors" title="Share via email">
                        <Share2 size={11} />
                      </button>
                      <button onClick={() => handleDelete(project)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/80 dark:bg-black/40 text-gray-600 hover:text-red-500 transition-colors" title="Delete">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-4 flex flex-col flex-1">
                  <h3 onClick={() => navigate(`/projects/${project.id}`)} className="font-display font-semibold text-gray-900 dark:text-white text-base mb-0.5 truncate cursor-pointer hover:text-brand transition-colors">{project.name}</h3>
                  {project.developer && (
                    <p className="text-xs text-gray-400 mb-0.5">by {project.developer}</p>
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

                  {/* Download Options for Sales roles */}
      {['sales_manager', 'sales_executive', 'external_caller', 'admin', 'super_admin'].includes(currentUser?.role) && (
        <div className="grid grid-cols-2 md:grid-cols-2 gap-2 mb-3">
          <button 
            onClick={(e) => { e.stopPropagation(); handleDownloadAll(project.id, project.name, 'unit_plan') }}
            disabled={downloading[project.id]?.unit_plan}
            className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50"
          >
            {downloading[project.id]?.unit_plan ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            Unit Plans
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleDownloadAll(project.id, project.name, 'creative') }}
            disabled={downloading[project.id]?.creative}
            className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-[10px] font-bold hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors disabled:opacity-50"
          >
            {downloading[project.id]?.creative ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            Creatives
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleDownloadAll(project.id, project.name, 'payment_plan') }}
            disabled={downloading[project.id]?.payment_plan}
            className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-[10px] font-bold hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors disabled:opacity-50"
          >
            {downloading[project.id]?.payment_plan ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            Payment Plans
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleDownloadAll(project.id, project.name, 'video') }}
            disabled={downloading[project.id]?.video}
            className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors disabled:opacity-50"
          >
            {downloading[project.id]?.video ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            Videos
          </button>
        </div>
      )}

                  <Button onClick={() => navigate(`/projects/${project.id}`)} variant="outline" size="sm" className="w-full mt-auto">View Project</Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination?.total_pages > 1 && (
        <div className="flex items-center justify-between px-2 text-xs text-gray-500">
          <span>Page {pagination.page} of {pagination.total_pages} · {pagination.total} total</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
            <Button size="sm" variant="outline" disabled={page >= pagination.total_pages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setSuccess('') }} title="Add New Project" size="lg">
        <form onSubmit={handleAdd} className="space-y-4">
          <ProjectForm formData={addForm} setFormData={setAddForm} uploadFiles={uploadFiles} setUploadFiles={setUploadFiles} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={actionLoading}>Add Project</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSuccess('') }} title="Edit Project" size="lg">
        <form onSubmit={handleEdit} className="space-y-4">
          <ProjectForm formData={editForm} setFormData={setEditForm} uploadFiles={{ unit_plans: [], creatives: [] }} setUploadFiles={() => {}} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={actionLoading}>Update Project</Button>
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