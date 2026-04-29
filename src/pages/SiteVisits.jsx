import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Plus, List, CalendarDays, ChevronDown, Edit2, X, CheckCircle, RefreshCw } from 'lucide-react'
import {
  fetchSiteVisits, createSiteVisit, updateSiteVisit,
  updateSiteVisitStatus, cancelSiteVisit, clearSiteVisitError,
} from '../store/siteVisitSlice'
import { fetchLeads } from '../store/leadSlice'
import { fetchProjects } from '../store/projectSlice'
import { fetchUsers } from '../store/userSlice'
import ListSkeleton from '../components/loaders/ListSkeleton'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'
import Modal from '../components/ui/Modal'
import CustomSelect from '../components/ui/CustomSelect'

const visitStatuses = ['scheduled', 'done', 'cancelled', 'rescheduled', 'no_show']
const statusLabel = { scheduled: 'Scheduled', done: 'Completed', cancelled: 'Cancelled', rescheduled: 'Rescheduled', no_show: 'No Show' }
const statusOptions = visitStatuses.map(s => ({ value: s, label: statusLabel[s] }))
const statusColor = {
  scheduled:   'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  done:        'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  cancelled:   'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400',
  rescheduled: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
  no_show:     'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
}

const defaultForm = {
  lead_id: '',
  project_id: '',
  visit_date: '',
  visit_time: '',
  assigned_to: '',
  notes: '',
  transport_arranged: false,
}
const defaultFeedback = { status: 'done', feedback: '' }

// ── Forms defined OUTSIDE to prevent typing/focus loss bug ───────────────────

function VisitForm({ formData, setFormData, leads, projects, salesExecs, isEdit }) {
  const ic = "w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm transition-all duration-200"
  const lc = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"

  const leadOptions = leads.map(l => ({
    value: l.id,
    label: `${l.name} ${l.phone ? `— ${l.phone}` : ''}`
  }))

  const projectOptions = projects.map(p => ({
    value: p.id,
    label: `${p.name} ${p.locality ? `— ${p.locality}` : p.location ? `— ${p.location}` : ''}`
  }))

  const execOptions = salesExecs.map(u => ({
    value: u.id,
    label: `${u.first_name} ${u.last_name}`
  }))

  return (
    <div className="space-y-4">

      {/* Lead dropdown */}
      <CustomSelect
        label="Lead"
        required
        value={formData.lead_id}
        onChange={val => setFormData(p => ({ ...p, lead_id: val }))}
        options={leadOptions}
        placeholder="Select lead..."
      />

      {/* Project dropdown */}
      <CustomSelect
        label="Project"
        required
        value={formData.project_id}
        onChange={val => setFormData(p => ({ ...p, project_id: val }))}
        options={projectOptions}
        placeholder="Select project..."
      />

      {/* Date + Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lc}>Visit Date *</label>
          <input required type="date" value={formData.visit_date}
            onChange={e => setFormData(p => ({ ...p, visit_date: e.target.value }))}
            className={ic} />
        </div>
        <div>
          <label className={lc}>Visit Time *</label>
          <input required type="time" value={formData.visit_time}
            onChange={e => setFormData(p => ({ ...p, visit_time: e.target.value }))}
            className={ic} />
        </div>
      </div>

      {/* Assign To */}
      <CustomSelect
        label="Assign To"
        value={formData.assigned_to}
        onChange={val => setFormData(p => ({ ...p, assigned_to: val }))}
        options={execOptions}
        placeholder="Select team member"
      />

      {/* Status (edit only) */}
      {isEdit && (
        <CustomSelect
          label="Status"
          value={formData.status || 'scheduled'}
          onChange={val => setFormData(p => ({ ...p, status: val }))}
          options={statusOptions}
        />
      )}

      {/* Transport arranged */}
      <div className="flex items-center gap-3 p-3 bg-[#f8fafc] dark:bg-[#0f0f0f] border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl">
        <input
          type="checkbox"
          id="transport"
          checked={formData.transport_arranged}
          onChange={e => setFormData(p => ({ ...p, transport_arranged: e.target.checked }))}
          className="w-4 h-4 accent-brand rounded border-gray-300"
        />
        <label htmlFor="transport" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none font-medium">
          Transport arranged for client
        </label>
      </div>

      {/* Notes */}
      <div>
        <label className={lc}>Notes</label>
        <textarea rows={3} value={formData.notes}
          onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
          placeholder="Client wants to see 2BHK and 3BHK units. Prefers upper floors."
          className={ic} />
      </div>
    </div>
  )
}

function FeedbackForm({ formData, setFormData }) {
  const ic = "w-full px-3 py-2 text-sm bg-background border-input rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100"
  const lc = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"

  return (
    <div className="space-y-4">
      <div>
        <label className={lc}>Outcome *</label>
        <div className="relative">
          <select value={formData.status}
            onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}
            className={ic + ' appearance-none pr-8'}>
            {visitStatuses.filter(s => s !== 'scheduled').map(s => (
              <option key={s} value={s}>{statusLabel[s]}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>
      <div>
        <label className={lc}>Feedback</label>
        <textarea rows={4} value={formData.feedback}
          onChange={e => setFormData(p => ({ ...p, feedback: e.target.value }))}
          placeholder="Client liked the property, interested in 3BHK on 8th floor..."
          className={ic + ' resize-none'} />
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SiteVisits() {
  const dispatch = useDispatch()
  const { list, loading, pagination, actionLoading, actionError } = useSelector(s => s.siteVisits)
  const { list: leadList }    = useSelector(s => s.leads)
  const { list: projectList } = useSelector(s => s.projects)
  const { list: userList }    = useSelector(s => s.users)
  const { user: currentUser } = useSelector(s => s.auth)

  const [viewMode,      setViewMode]      = useState('list')
  const [filterStatus,  setFilterStatus]  = useState('')
  const [page,          setPage]          = useState(1)

  const [showAddModal,      setShowAddModal]      = useState(false)
  const [showEditModal,     setShowEditModal]      = useState(false)
  const [showFeedbackModal, setShowFeedbackModal]  = useState(false)
  const [selectedVisit,     setSelectedVisit]      = useState(null)

  const [addForm,      setAddForm]      = useState(defaultForm)
  const [editForm,     setEditForm]     = useState({ ...defaultForm, status: 'scheduled' })
  const [feedbackForm, setFeedbackForm] = useState(defaultFeedback)
  const [success,      setSuccess]      = useState('')

  useEffect(() => {
    const params = { page, per_page: 20 }
    if (filterStatus) params.status = filterStatus
    dispatch(fetchSiteVisits(params))
  }, [dispatch, filterStatus, page])

  useEffect(() => {
    dispatch(fetchLeads({ per_page: 100 }))
    dispatch(fetchProjects({ per_page: 100, status: 'active' }))
    dispatch(fetchUsers())
  }, [dispatch])

  const salesExecs = userList.filter(u =>
    ['sales_executive', 'sales_manager'].includes(u.role) && u.is_active
  )
  const canManage = ['super_admin', 'admin', 'sales_manager'].includes(currentUser?.role)

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleAdd = async (e) => {
    e.preventDefault()
    dispatch(clearSiteVisitError())
    const result = await dispatch(createSiteVisit(addForm))
    if (createSiteVisit.fulfilled.match(result)) {
      setSuccess('Visit scheduled!')
      dispatch(fetchSiteVisits({ page, per_page: 20 }))
      setTimeout(() => { setShowAddModal(false); setSuccess(''); setAddForm(defaultForm) }, 800)
    }
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    dispatch(clearSiteVisitError())
    const result = await dispatch(updateSiteVisit({ id: selectedVisit.id, data: editForm }))
    if (updateSiteVisit.fulfilled.match(result)) {
      setSuccess('Visit updated!')
      dispatch(fetchSiteVisits({ page, per_page: 20 }))
      setTimeout(() => { setShowEditModal(false); setSuccess('') }, 800)
    }
  }

  const handleFeedback = async (e) => {
    e.preventDefault()
    dispatch(clearSiteVisitError())
    const result = await dispatch(updateSiteVisitStatus({
      id: selectedVisit.id,
      status: feedbackForm.status,
      feedback: feedbackForm.feedback,
    }))
    if (updateSiteVisitStatus.fulfilled.match(result)) {
      setSuccess('Feedback saved!')
      dispatch(fetchSiteVisits({ page, per_page: 20 }))
      setTimeout(() => { setShowFeedbackModal(false); setSuccess('') }, 800)
    }
  }

  const handleCancel = async (visit) => {
    if (window.confirm(`Cancel this site visit?`)) {
      const result = await dispatch(cancelSiteVisit(visit.id))
      if (cancelSiteVisit.fulfilled.match(result)) {
        dispatch(fetchSiteVisits({ page, per_page: 20 }))
      }
    }
  }

  const openEdit = (visit) => {
    setSelectedVisit(visit)
    setEditForm({
      lead_id:             visit.lead_id || '',
      project_id:          visit.project_id || '',
      visit_date:          visit.visit_date?.split('T')[0] || '',
      visit_time:          visit.visit_time || '',
      assigned_to:         visit.assigned_to || '',
      notes:               visit.notes || '',
      transport_arranged:  visit.transport_arranged || false,
      status:              visit.status || 'scheduled',
    })
    setShowEditModal(true)
  }

  const openFeedback = (visit) => {
    setSelectedVisit(visit)
    setFeedbackForm({ status: visit.status === 'scheduled' ? 'done' : visit.status, feedback: visit.feedback || '' })
    setShowFeedbackModal(true)
  }

  // ── Calendar week ──────────────────────────────────────────────────────────
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay() + 1 + i)
    return d
  })

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* View toggle */}
          <div className="flex bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 rounded-xl p-1 gap-1">
            <button onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${viewMode === 'list' ? 'bg-brand text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'}`}>
              <List size={14} /> List
            </button>
            <button onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${viewMode === 'calendar' ? 'bg-brand text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'}`}>
              <CalendarDays size={14} /> Calendar
            </button>
          </div>

          {/* Status filter */}
          <div className="relative">
            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
              className="appearance-none pl-3 pr-8 py-2 text-sm bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 rounded-xl outline-none focus:border-brand text-gray-700 dark:text-gray-300">
              <option value="">All Status</option>
              {visitStatuses.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          <button onClick={() => dispatch(fetchSiteVisits({ page, per_page: 20 }))}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 text-gray-400 hover:text-brand hover:border-brand transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>

        {canManage && (
          <Button icon={Plus} onClick={() => { setAddForm(defaultForm); dispatch(clearSiteVisitError()); setShowAddModal(true) }}>
            Schedule Visit
          </Button>
        )}
      </div>

      {/* Summary */}
      {!loading && (
        <div className="text-sm text-gray-500 dark:text-[#888]">
          Showing <span className="font-semibold text-gray-900 dark:text-white">{list.length}</span>
          {pagination?.total > 0 && <> of <span className="font-semibold text-gray-900 dark:text-white">{pagination.total}</span></>} visits
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 rounded-2xl p-4 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50">
          <ListSkeleton rows={6} />
        </div>
      ) : viewMode === 'calendar' ? (
        // ── Calendar ──────────────────────────────────────────────────────────
        <div className="bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 rounded-2xl p-5 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 hover:shadow-lg hover:shadow-gray-300/50 dark:hover:shadow-gray-900/50 transition-all duration-200">
          <h3 className="font-display text-base font-semibold text-gray-900 dark:text-white mb-4">This Week</h3>
          <div className="grid grid-cols-7 gap-2">
            {weekDates.map((date, i) => {
              const dateStr = date.toISOString().split('T')[0]
              const dayVisits = list.filter(v => (v.visit_date || '').startsWith(dateStr))
              const isToday = dateStr === new Date().toISOString().split('T')[0]
              return (
                <div key={i} className={`rounded-xl border p-2 min-h-[100px] ${isToday ? 'border-brand bg-brand/5 dark:bg-brand/10' : 'border-gray-200 dark:border-gray-800'}`}>
                  <div className={`text-xs font-medium mb-1 ${isToday ? 'text-brand' : 'text-gray-500 dark:text-[#888]'}`}>{days[i]}</div>
                  <div className={`text-lg font-display font-bold mb-2 ${isToday ? 'text-brand' : 'text-gray-900 dark:text-white'}`}>{date.getDate()}</div>
                  {dayVisits.map(v => (
                    <div key={v.id} className="text-[10px] bg-brand/10 dark:bg-brand/20 text-brand rounded-lg px-1.5 py-0.5 mb-1 truncate">
                      {v.lead_name || '—'}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        // ── List ──────────────────────────────────────────────────────────────
        <div className="bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 rounded-2xl overflow-hidden shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 hover:shadow-lg hover:shadow-gray-300/50 dark:hover:shadow-gray-900/50 transition-all duration-200">
          {list.length === 0 ? (
            <div className="py-16 text-center text-gray-400 dark:text-[#888]">
              <CalendarDays size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
              <p className="font-medium">No site visits found</p>
              <p className="text-sm mt-1">Schedule a visit to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0f0f0f]">
                    {['Lead', 'Project', 'Date & Time', 'Assigned To', 'Transport', 'Status', 'Feedback', 'Actions'].map(h => (
                      <th key={h} className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-[#888] uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {list.map(visit => (
                    <tr key={visit.id} className="hover:bg-gray-50 dark:hover:bg-[#0f0f0f] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={visit.lead_name || '?'} size="sm" />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">{visit.lead_name || '—'}</div>
                            <div className="text-xs text-gray-400">{visit.lead_phone || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400 text-xs">
                        {visit.project_name || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900 dark:text-gray-100 text-xs">
                          {visit.visit_date?.split('T')[0] || '—'}
                        </div>
                        <div className="text-xs text-gray-400">{visit.visit_time || ''}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <Avatar name={visit.assigned_to_name || '?'} size="xs" />
                          <span className="text-xs text-gray-600 dark:text-gray-400">{visit.assigned_to_name || '—'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${visit.transport_arranged ? 'bg-green-100 dark:bg-green-900/20 text-green-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                          {visit.transport_arranged ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${statusColor[visit.status] || ''}`}>
                          {statusLabel[visit.status] || visit.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs text-gray-500 dark:text-[#888] line-clamp-2 max-w-[160px]">
                          {visit.feedback || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          {canManage && visit.status === 'scheduled' && (
                            <>
                              <button onClick={() => openEdit(visit)} title="Edit"
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                                <Edit2 size={13} />
                              </button>
                              <button onClick={() => openFeedback(visit)} title="Mark outcome"
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                                <CheckCircle size={13} />
                              </button>
                              <button onClick={() => handleCancel(visit)} title="Cancel"
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                <X size={13} />
                              </button>
                            </>
                          )}
                          {visit.status !== 'scheduled' && (
                            <button onClick={() => openFeedback(visit)} title="Edit feedback"
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                              <Edit2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

      {/* Schedule Modal */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setSuccess('') }} title="Schedule Site Visit">
        <form onSubmit={handleAdd} className="space-y-4">
          <VisitForm formData={addForm} setFormData={setAddForm} leads={leadList} projects={projectList} salesExecs={salesExecs} isEdit={false} />
          {success && <p className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 py-2 text-center rounded-xl">{success}</p>}
          {actionError && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 py-2 text-center rounded-xl">{actionError}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={actionLoading}>Schedule Visit</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSuccess('') }} title="Edit Site Visit">
        <form onSubmit={handleEdit} className="space-y-4">
          <VisitForm formData={editForm} setFormData={setEditForm} leads={leadList} projects={projectList} salesExecs={salesExecs} isEdit={true} />
          {success && <p className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 py-2 text-center rounded-xl">{success}</p>}
          {actionError && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 py-2 text-center rounded-xl">{actionError}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={actionLoading}>Update Visit</Button>
          </div>
        </form>
      </Modal>

      {/* Feedback Modal */}
      <Modal isOpen={showFeedbackModal} onClose={() => { setShowFeedbackModal(false); setSuccess('') }} title="Visit Outcome & Feedback">
        <form onSubmit={handleFeedback} className="space-y-4">
          {selectedVisit && (
            <div className="flex items-center gap-3 p-3 bg-[#f8fafc] dark:bg-[#0f0f0f] rounded-xl">
              <Avatar name={selectedVisit.lead_name || '?'} size="sm" />
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedVisit.lead_name}</div>
                <div className="text-xs text-gray-400">
                  {selectedVisit.visit_date?.split('T')[0]} · {selectedVisit.visit_time} · {selectedVisit.project_name}
                </div>
              </div>
            </div>
          )}
          <FeedbackForm formData={feedbackForm} setFormData={setFeedbackForm} />
          {success && <p className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 py-2 text-center rounded-xl">{success}</p>}
          {actionError && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 py-2 text-center rounded-xl">{actionError}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowFeedbackModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={actionLoading}>Save Feedback</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
