import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Plus, MapPin, Building2, IndianRupee, Users, Edit2, Trash2, RefreshCw, Search, ChevronDown, Download } from 'lucide-react'
import { fetchProjects, createProject, updateProject, deleteProject, clearProjectError } from '../store/projectSlice'
import CardSkeleton from '../components/loaders/CardSkeleton'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import api from '../api/axios'
import Modal from '../components/ui/Modal'
import ExportModal from '../components/ui/ExportModal'
import CustomSelect from '../components/ui/CustomSelect'

const projectColors = [
  'from-blue-400/20 to-blue-600/20',
  'from-green-400/20 to-teal-400/20',
  'from-blue-400/20 to-purple-400/20',
  'from-rose-400/20 to-pink-400/20',
]

const projectTypes = [
  { value: 'Residential', label: 'Residential' },
  { value: 'Commercial', label: 'Commercial' },
  { value: 'Mixed', label: 'Mixed Use' },
  { value: 'Plots', label: 'Plots / Land' },
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
  type: 'Residential',
  configurations: '',
  price_min: '',
  price_max: '',
  total_units: '',
  description: '',
  status: 'active',
  rera_number: '',
}

// ── Form defined OUTSIDE to prevent typing/focus loss bug ────────────────────
function ProjectForm({ formData, setFormData }) {
  const ic = "w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm transition-all duration-200"
  const lc = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"

  return (
    <div className="space-y-4">

      {/* Name + Developer */}
      <div className="grid grid-cols-2 gap-3">
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
      <div className="grid grid-cols-2 gap-3">
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

      {/* Type + Status */}
      <div className="grid grid-cols-2 gap-3">
        <CustomSelect
          label="Type"
          value={formData.type}
          onChange={val => setFormData(p => ({ ...p, type: val }))}
          options={projectTypes}
        />
        <CustomSelect
          label="Status"
          value={formData.status}
          onChange={val => setFormData(p => ({ ...p, status: val }))}
          options={projectStatuses}
        />
      </div>

      {/* Configurations */}
      <div>
        <label className={lc}>Configurations</label>
        <input value={formData.configurations}
          onChange={e => setFormData(p => ({ ...p, configurations: e.target.value }))}
          placeholder="2BHK, 3BHK, 4BHK"
          className={ic} />
      </div>

      {/* Price Min + Max */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lc}>Price Min (₹)</label>
          <input value={formData.price_min}
            onChange={e => setFormData(p => ({ ...p, price_min: e.target.value }))}
            placeholder="8500000"
            className={ic} />
        </div>
        <div>
          <label className={lc}>Price Max (₹)</label>
          <input value={formData.price_max}
            onChange={e => setFormData(p => ({ ...p, price_max: e.target.value }))}
            className={ic}
            placeholder="24000000" />
        </div>
      </div>

      {/* Total Units + RERA */}
      <div className="grid grid-cols-2 gap-3">
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

      {/* Description */}
      <div>
        <label className={lc}>Description</label>
        <textarea rows={3} value={formData.description}
          onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
          placeholder="Brief overview of project features, amenities..."
          className={ic} />
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Projects() {
  const dispatch = useDispatch()
  const { list, loading, pagination, actionLoading, actionError } = useSelector(s => s.projects)
  const { user: currentUser } = useSelector(s => s.auth)

  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCity,   setFilterCity]   = useState('')
  const [page,         setPage]         = useState(1)

  const [showAddModal,  setShowAddModal]  = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)

  const [addForm,  setAddForm]  = useState(defaultForm)
  const [editForm, setEditForm] = useState(defaultForm)
  const [success,    setSuccess]    = useState('')
  const [exporting,  setExporting]  = useState(false)

  useEffect(() => {
    const params = { page, per_page: 20 }
    if (search) params.search = search
    if (filterStatus) params.status = filterStatus
    if (filterCity) params.city = filterCity
    dispatch(fetchProjects(params))
  }, [dispatch, search, filterStatus, filterCity, page])

  const canManage = ['super_admin', 'admin'].includes(currentUser?.role)

  const handleAdd = async (e) => {
    e.preventDefault()
    dispatch(clearProjectError())
    const result = await dispatch(createProject(addForm))
    if (createProject.fulfilled.match(result)) {
      setSuccess('Project created!')
      dispatch(fetchProjects({ page, per_page: 20 }))
      setTimeout(() => { setShowAddModal(false); setSuccess(''); setAddForm(defaultForm) }, 800)
    }
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    dispatch(clearProjectError())
    const result = await dispatch(updateProject({ id: selectedProject.id, data: editForm }))
    if (updateProject.fulfilled.match(result)) {
      setSuccess('Project updated!')
      dispatch(fetchProjects({ page, per_page: 20 }))
      setTimeout(() => { setShowEditModal(false); setSuccess('') }, 800)
    }
  }

  const handleDelete = async (project) => {
    if (window.confirm(`Delete "${project.name}"? This cannot be undone.`)) {
      const result = await dispatch(deleteProject(project.id))
      if (deleteProject.fulfilled.match(result)) {
        dispatch(fetchProjects({ page, per_page: 20 }))
      }
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
      configurations: Array.isArray(project.configurations)
        ? project.configurations.join(', ')
        : project.configurations || project.config || '',
      price_min:      project.price_min || '',
      price_max:      project.price_max || '',
      total_units:    project.total_units || project.totalUnits || '',
      description:    project.description || '',
      status:         project.status || 'active',
      rera_number:    project.rera_number || '',
    })
    setShowEditModal(true)
  }

  // Format price range for display
  const formatPrice = (project) => {
    if (project.price_range) return project.price_range
    if (project.price_min && project.price_max) {
      const fmt = (v) => {
        const n = Number(v)
        if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`
        if (n >= 100000) return `₹${(n / 100000).toFixed(0)}L`
        return `₹${n.toLocaleString()}`
      }
      return `${fmt(project.price_min)} – ${fmt(project.price_max)}`
    }
    return project.priceRange || '—'
  }

  const formatConfig = (project) => {
    if (Array.isArray(project.configurations)) return project.configurations.join(', ')
    return project.configurations || project.config || '—'
  }

  const soldPct = (project) => {
    const total = project.total_units || project.totalUnits || 0
    const sold  = project.sold_units  || project.soldUnits  || 0
    return total > 0 ? Math.round((sold / total) * 100) : 0
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

  return (
    <div className="space-y-4">

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

          <button onClick={() => dispatch(fetchProjects({ page, per_page: 20 }))}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 text-gray-400 hover:text-brand hover:border-brand transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isAdminUser && (
            <Button variant="outline" size="sm" icon={Download} loading={exporting} disabled={exporting} onClick={() => setShowExportModal(true)}>
              Export
            </Button>
          )}
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
            const pct = soldPct(project)
            const total = project.total_units || project.totalUnits || 0
            const sold  = project.sold_units  || project.soldUnits  || 0
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
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/80 dark:bg-black/40 text-gray-600 hover:text-blue-600 transition-colors">
                        <Edit2 size={11} />
                      </button>
                      <button onClick={() => handleDelete(project)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/80 dark:bg-black/40 text-gray-600 hover:text-red-500 transition-colors">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-display font-semibold text-gray-900 dark:text-white text-base mb-0.5 truncate">{project.name}</h3>
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

                  {/* Units progress */}
                  {total > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500 dark:text-[#888]">Units Sold</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{sold}/{total}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-[10px] text-gray-400 dark:text-[#888] mt-0.5 text-right">{pct}% sold</div>
                    </div>
                  )}

                  <Button variant="outline" size="sm" className="w-full mt-auto">View Leads</Button>
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
          <ProjectForm formData={addForm} setFormData={setAddForm} />
          {success && <p className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 py-2 text-center rounded-xl">{success}</p>}
          {actionError && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 py-2 text-center rounded-xl">{actionError}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={actionLoading}>Add Project</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSuccess('') }} title="Edit Project" size="lg">
        <form onSubmit={handleEdit} className="space-y-4">
          <ProjectForm formData={editForm} setFormData={setEditForm} />
          {success && <p className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 py-2 text-center rounded-xl">{success}</p>}
          {actionError && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 py-2 text-center rounded-xl">{actionError}</p>}
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
    </div>
  )
}