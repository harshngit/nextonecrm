import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { 
  ArrowLeft, Building2, MapPin, Calendar, 
  Loader2, User, Phone, Mail, ExternalLink, 
  ShieldCheck, Info, Search, Filter, RefreshCw,
  FileText, FileImage, Download, Trash2, Plus, X, Check
} from 'lucide-react'
import { 
  fetchProjectLeads, 
  clearCurrentProject, 
  fetchProjectDocuments, 
  uploadProjectDocuments, 
  deleteProjectDocument 
} from '../store/projectSlice'
import api from '../api/axios'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import CustomSelect from '../components/ui/CustomSelect'
import ConfirmModal from '../components/ui/ConfirmModal'

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const { 
    currentProject: project, 
    projectLeads: leads, 
    projectDocuments: documents,
    detailLoading, 
    actionLoading,
    pagination 
  } = useSelector(s => s.projects)

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(1)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [docToDelete, setDocToDelete] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    dispatch(fetchProjectLeads({ id, params: { page } }))
    dispatch(fetchProjectDocuments(id))
    return () => dispatch(clearCurrentProject())
  }, [dispatch, id, page])

  const handleDownloadAll = async () => {
    try {
      const response = await api.get(`/projects/${id}/documents/download-all`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${project.name}_documents.zip`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Download failed', error)
    }
  }

  const handleDownloadSingle = async (docId, fileName) => {
    try {
      // Use the specific API: /api/v1/projects/{id}/documents/{docId}/download
      const response = await api.get(`/projects/${id}/documents/${docId}/download`, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed', error)
    }
  }

  const handleFileUpload = async (e) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    setUploadError('')

    const formData = new FormData()
    // By default, let's assume these are unit_plans as requested by the user
    // "unit_plans array<string> Unit plan documents (multiple)"
    Array.from(files).forEach(file => {
      formData.append('unit_plans', file)
    })

    try {
      await dispatch(uploadProjectDocuments({ id, formData })).unwrap()
      dispatch(fetchProjectDocuments(id))
    } catch (err) {
      setUploadError(err || 'Failed to upload documents')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteDoc = async () => {
    if (!docToDelete) return
    await dispatch(deleteProjectDocument({ id, docId: docToDelete.id }))
    setShowDeleteModal(false)
    setDocToDelete(null)
  }

  const confirmDelete = (doc) => {
    setDocToDelete(doc)
    setShowDeleteModal(true)
  }

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
        <h3 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-2">Project not found</h3>
        <Button variant="outline" onClick={() => navigate('/projects')} className="w-full rounded-xl">Back to Projects</Button>
      </div>
    </div>
  )

  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.name?.toLowerCase().includes(search.toLowerCase()) || 
                          l.assigned_to?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = !filterStatus || l.status === filterStatus
    return matchesSearch && matchesStatus
  })

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12">
      {/* Top Header / Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 flex items-center justify-center group-hover:border-brand/30 transition-all">
            <ArrowLeft size={16} />
          </div>
          Back to Projects
        </button>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-xl">
            Edit Project
          </Button>
        </div>
      </div>

      {project && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Main Info (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. Project Header Card */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] overflow-hidden shadow-sm hover:shadow-md transition-all">
              <div className="h-24 bg-gradient-to-r from-blue-500 to-[#0082f3] relative opacity-10 dark:opacity-20" />
              <div className="px-8 pb-8 relative">
                <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-10">
                  <div className="p-1.5 bg-white dark:bg-[#1a1a1a] rounded-[28px] shadow-xl">
                    <div className="w-24 h-24 md:w-32 md:h-32 bg-brand rounded-[22px] flex items-center justify-center text-white">
                      <Building2 size={48} />
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 mb-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
                      <Badge label={project.status || 'Active'} className={`px-3 py-1 text-xs ${project.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`} />
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-brand" /> ID: {project.id?.slice?.(0, 8) || project.id}</span>
                      <span className="flex items-center gap-1.5"><MapPin size={14} /> {project.location || project.city || 'Location not specified'}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-10">
                  {[
                    { icon: User, label: 'Total Leads', value: pagination.total || leads.length, color: 'text-blue-600 bg-blue-50' },
                    { icon: MapPin, label: 'City', value: project.city || '—', color: 'text-indigo-600 bg-indigo-50' },
                    { icon: Info, label: 'Type', value: project.type || 'Residential', color: 'text-purple-600 bg-purple-50' },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="p-4 rounded-2xl border border-gray-50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-[#0f0f0f]/50">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color} dark:bg-opacity-10`}>
                          <Icon size={14} />
                        </div>
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
                      </div>
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Leads Table / List */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <User size={18} className="text-brand" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">Project Leads</h3>
                    <p className="text-xs text-gray-400">Manage all leads interested in this project</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search leads..."
                      className="pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:border-brand w-44 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                    />
                  </div>
                  <button onClick={() => dispatch(fetchProjectLeads({ id, params: { page } }))} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 text-gray-400 hover:text-brand hover:border-brand transition-colors">
                    <RefreshCw size={14} className={detailLoading ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              {detailLoading && leads.length === 0 ? (
                <div className="py-12 flex flex-col items-center">
                   <Loader2 size={32} className="animate-spin text-brand mb-2" />
                   <p className="text-xs text-gray-400">Fetching project leads...</p>
                </div>
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
                        <tr className="text-left border-b border-gray-100 dark:border-gray-800 pb-4">
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
                                <Avatar name={lead.name} size="sm" />
                                <span className="font-bold text-gray-900 dark:text-white">{lead.name}</span>
                              </div>
                            </td>
                            <td className="py-4 px-2">
                              <Badge 
                                label={lead.status} 
                                variant={lead.status === 'booked' ? 'success' : lead.status === 'lost' ? 'danger' : 'warning'} 
                              />
                            </td>
                            <td className="py-4 px-2">
                              <div className="flex items-center gap-2">
                                <Avatar name={lead.assigned_to} size="xs" />
                                <span className="text-gray-600 dark:text-gray-400 font-medium">{lead.assigned_to || 'Unassigned'}</span>
                              </div>
                            </td>
                            <td className="py-4 px-2 text-right">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="rounded-lg text-xs h-8"
                                onClick={() => navigate(`/leads/${lead.id}`)}
                              >
                                View Details
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {pagination?.total_pages > 1 && (
                    <div className="flex items-center justify-between pt-8 px-2 text-xs text-gray-500">
                      <span>Page {pagination.page} of {pagination.total_pages} · {pagination.total} leads</span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                        <Button size="sm" variant="outline" disabled={page >= pagination.total_pages} onClick={() => setPage(p => p + 1)}>Next</Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 3. Project Summary Card */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
              <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <Info size={18} className="text-blue-500" /> Project Summary
              </h3>
              
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#0f0f0f] border border-gray-100 dark:border-gray-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic">
                    {project.description || 'No project description available.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-50 dark:border-gray-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Builder</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{project.builder || 'NextOne Realty'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Config</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{project.configuration || '1, 2, 3 BHK'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Possession</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{project.possession || 'Ready to Move'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Project Documents */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText size={18} className="text-blue-500" /> Documents
                </h3>
                {(documents?.unit_plans?.length > 0 || documents?.creatives?.length > 0) && (
                  <button 
                    onClick={handleDownloadAll}
                    className="text-xs font-bold text-brand hover:underline flex items-center gap-1"
                  >
                    <Download size={14} /> Download All
                  </button>
                )}
              </div>
              
              <div className="space-y-6">
                {/* Unit Plans Section */}
                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Unit Plans</h4>
                  <div className="space-y-2">
                    {(!documents?.unit_plans || documents.unit_plans.length === 0) ? (
                      <div className="text-center py-4 bg-gray-50/50 dark:bg-[#0f0f0f]/50 rounded-xl border border-dashed border-gray-100 dark:border-gray-800">
                        <p className="text-[10px] text-gray-400 italic">No unit plans available</p>
                      </div>
                    ) : (
                      documents.unit_plans.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50/50 dark:bg-[#0f0f0f]/50 border border-gray-100 dark:border-gray-800 group hover:border-brand/30 transition-all">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 flex-shrink-0">
                              <FileText size={14} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300 truncate" title={doc.file_name}>
                                {doc.file_name}
                              </p>
                              <p className="text-[9px] text-gray-400 font-medium">
                                {doc.file_size_mb} MB · {new Date(doc.uploaded_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleDownloadSingle(doc.id, doc.file_name)}
                              className="p-1.5 text-gray-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-colors"
                              title="Download"
                            >
                              <Download size={14} />
                            </button>
                            <button 
                              onClick={() => confirmDelete(doc)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Creatives Section */}
                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Creatives</h4>
                  <div className="space-y-2">
                    {(!documents?.creatives || documents.creatives.length === 0) ? (
                      <div className="text-center py-4 bg-gray-50/50 dark:bg-[#0f0f0f]/50 rounded-xl border border-dashed border-gray-100 dark:border-gray-800">
                        <p className="text-[10px] text-gray-400 italic">No creatives available</p>
                      </div>
                    ) : (
                      documents.creatives.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50/30 dark:bg-purple-900/5 border border-purple-100/50 dark:border-purple-900/20 group hover:border-purple-400 transition-all">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-500 flex-shrink-0">
                              <FileImage size={14} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300 truncate" title={doc.file_name}>
                                {doc.file_name}
                              </p>
                              <p className="text-[9px] text-gray-400 font-medium">
                                {doc.file_size_mb} MB · {new Date(doc.uploaded_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleDownloadSingle(doc.id, doc.file_name)}
                              className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                              title="Download"
                            >
                              <Download size={14} />
                            </button>
                            <button 
                              onClick={() => confirmDelete(doc)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Upload Section */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <input 
                    type="file" 
                    multiple 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    className="hidden" 
                  />
                  <div className="grid grid-cols-1 gap-2">
                    <Button 
                      variant="outline" 
                      className="w-full rounded-xl py-2.5 border-dashed text-xs font-bold"
                      onClick={() => fileInputRef.current?.click()}
                      loading={uploading}
                    >
                      <Plus size={14} className="mr-2" /> Add Project Documents
                    </Button>
                  </div>
                  {uploadError && <p className="text-[10px] text-red-500 mt-2 text-center">{uploadError}</p>}
                </div>
              </div>
            </div>

            {/* 5. Quick Actions */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
              <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <RefreshCw size={18} className="text-teal-500" /> Quick Actions
              </h3>
              
              <div className="grid grid-cols-1 gap-3">
                <Button variant="outline" className="w-full justify-start rounded-xl py-3 border-dashed">
                   <Phone size={14} className="mr-2" /> Download Brochure
                </Button>
                <Button variant="outline" className="w-full justify-start rounded-xl py-3 border-dashed">
                   <Mail size={14} className="mr-2" /> Share Project Details
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteDoc}
        title="Delete Document"
        message={`Are you sure you want to delete "${docToDelete?.file_name}"? This action cannot be undone.`}
        confirmText="Delete"
        loading={actionLoading}
      />
    </div>
  )
}
