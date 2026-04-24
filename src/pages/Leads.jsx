import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Eye, Edit2, UserCheck, ChevronDown, RefreshCw, Trash2, MapPin } from 'lucide-react'
import { fetchLeads, createLead, updateLead, deleteLead, fetchLeadSources, clearLeadError } from '../store/leadSlice'
import { fetchUsers } from '../store/userSlice'
import ListSkeleton from '../components/loaders/ListSkeleton'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'
import Modal from '../components/ui/Modal'

const leadStages = [
  'New', 'Contacted', 'Interested', 'Follow-up',
  'Site Visit Scheduled', 'Site Visit Done', 'Negotiation', 'Booked', 'Lost',
]

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

const defaultForm = {
  name: '', phone: '', email: '',
  source: '', source_id: '', project_id: '',
  assigned_to: '', budget: '', location_preference: '',
  notes: '', status: 'New',
}

// ─── LeadForm defined OUTSIDE component to prevent remount on every render ───
// This is the fix for the typing bug — defining a component inside another
// component causes React to treat it as a new component on every render,
// unmounting and remounting it, which kills input focus.
function LeadForm({ formData, setFormData, isEdit, sourceList, salesExecs }) {
  const inputClass = "w-full px-3 py-2 text-sm bg-[#f5f2ee] dark:bg-[#0f0f0f] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100"
  const labelClass = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"

  return (
    <div className="space-y-4">
      {/* Name + Phone */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Full Name *</label>
          <input
            required
            value={formData.name}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Suresh Patel"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Phone *</label>
          <input
            required
            value={formData.phone}
            onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="+919876543210"
            className={inputClass}
          />
        </div>
      </div>

      {/* Email + Budget */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="suresh.patel@gmail.com"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Budget</label>
          <input
            value={formData.budget}
            onChange={e => setFormData(prev => ({ ...prev, budget: e.target.value }))}
            placeholder="80-100L"
            className={inputClass}
          />
        </div>
      </div>

      {/* Source + Location */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Lead Source</label>
          <div className="relative">
            <select
              value={formData.source_id || formData.source}
              onChange={e => {
                const selected = sourceList.find(s => s.id === e.target.value)
                setFormData(prev => ({
                  ...prev,
                  source_id: selected?.id || e.target.value,
                  source: selected?.name || e.target.value,
                }))
              }}
              className={inputClass + ' appearance-none pr-8'}
            >
              <option value="">Select Platform</option>
              {sourceList.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className={labelClass}>Location Preference</label>
          <div className="relative">
            <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={formData.location_preference}
              onChange={e => setFormData(prev => ({ ...prev, location_preference: e.target.value }))}
              placeholder="Andheri West"
              className={inputClass + ' pl-8'}
            />
          </div>
        </div>
      </div>

      {/* Assign To + Status (status only in edit) */}
      <div className={`grid gap-3 ${isEdit ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <div>
          <label className={labelClass}>Assign To</label>
          <div className="relative">
            <select
              value={formData.assigned_to}
              onChange={e => setFormData(prev => ({ ...prev, assigned_to: e.target.value }))}
              className={inputClass + ' appearance-none pr-8'}
            >
              <option value="">Select team member</option>
              {salesExecs.map(u => (
                <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        {isEdit && (
          <div>
            <label className={labelClass}>Status</label>
            <div className="relative">
              <select
                value={formData.status}
                onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className={inputClass + ' appearance-none pr-8'}
              >
                {leadStages.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className={labelClass}>Notes</label>
        <textarea
          rows={3}
          value={formData.notes}
          onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Interested in 2BHK, wants sea view..."
          className={inputClass + ' resize-none'}
        />
      </div>
    </div>
  )
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function Leads() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { list, loading, pagination, sources, actionLoading, actionError } = useSelector(s => s.leads)
  const { list: userList } = useSelector(s => s.users)
  const { user: currentUser } = useSelector(s => s.auth)

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [filterAssigned, setFilterAssigned] = useState('')
  const [page, setPage] = useState(1)

  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showReassignModal, setShowReassignModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)
  const [addForm, setAddForm] = useState(defaultForm)
  const [editForm, setEditForm] = useState(defaultForm)
  const [reassignTo, setReassignTo] = useState('')
  const [selectedLeads, setSelectedLeads] = useState([])
  const [addSuccess, setAddSuccess] = useState('')
  const [editSuccess, setEditSuccess] = useState('')

  useEffect(() => {
    const params = { page, per_page: 20 }
    if (search) params.search = search
    if (filterStatus) params.status = filterStatus
    if (filterSource) params.source_id = filterSource
    if (filterAssigned) params.assigned_to = filterAssigned
    dispatch(fetchLeads(params))
  }, [dispatch, search, filterStatus, filterSource, filterAssigned, page])

  useEffect(() => {
    dispatch(fetchLeadSources())
    dispatch(fetchUsers())
  }, [dispatch])

  const sourceList = sources?.length > 0 ? sources : defaultSources
  const salesExecs = userList.filter(u =>
    ['sales_executive', 'sales_manager'].includes(u.role) && u.is_active
  )

  const handleAddLead = async (e) => {
    e.preventDefault()
    dispatch(clearLeadError())
    const result = await dispatch(createLead(addForm))
    if (createLead.fulfilled.match(result)) {
      setAddSuccess('Lead created successfully!')
      dispatch(fetchLeads({ page, per_page: 20 }))
      setTimeout(() => { setShowAddModal(false); setAddSuccess(''); setAddForm(defaultForm) }, 800)
    }
  }

  const handleEditLead = async (e) => {
    e.preventDefault()
    dispatch(clearLeadError())
    const result = await dispatch(updateLead({ id: selectedLead.id, leadData: editForm }))
    if (updateLead.fulfilled.match(result)) {
      setEditSuccess('Lead updated!')
      dispatch(fetchLeads({ page, per_page: 20 }))
      setTimeout(() => { setShowEditModal(false); setEditSuccess('') }, 800)
    }
  }

  const handleDeleteLead = async (lead) => {
    if (window.confirm(`Delete lead "${lead.name}"?`)) {
      const result = await dispatch(deleteLead(lead.id))
      if (deleteLead.fulfilled.match(result)) dispatch(fetchLeads({ page, per_page: 20 }))
    }
  }

  const openEdit = (lead) => {
    setSelectedLead(lead)
    setEditForm({
      name: lead.name || '', phone: lead.phone || '', email: lead.email || '',
      source: lead.source || '', source_id: lead.source_id || '',
      project_id: lead.project_id || '', assigned_to: lead.assigned_to || '',
      budget: lead.budget || '', location_preference: lead.location_preference || '',
      notes: lead.notes || '', status: lead.status || 'New',
    })
    setShowEditModal(true)
  }

  const handleReassign = async (e) => {
    e.preventDefault()
    const result = await dispatch(updateLead({ id: selectedLead.id, leadData: { assigned_to: reassignTo } }))
    if (updateLead.fulfilled.match(result)) {
      dispatch(fetchLeads({ page, per_page: 20 }))
      setShowReassignModal(false)
    }
  }

  const toggleSelect = (id) =>
    setSelectedLeads(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  const toggleAll = () =>
    setSelectedLeads(selectedLeads.length === list.length && list.length > 0 ? [] : list.map(l => l.id))

  const canEdit = ['super_admin', 'admin', 'sales_manager', 'sales_executive'].includes(currentUser?.role)
  const canDelete = ['super_admin', 'admin'].includes(currentUser?.role)

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
              className="pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#1a1a1a] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand w-52 text-gray-900 dark:text-gray-100 placeholder-gray-400"
            />
          </div>
          <div className="relative">
            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
              className="appearance-none pl-3 pr-8 py-2 text-sm bg-white dark:bg-[#1a1a1a] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-700 dark:text-gray-300">
              <option value="">All Status</option>
              {leadStages.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={filterSource} onChange={e => { setFilterSource(e.target.value); setPage(1) }}
              className="appearance-none pl-3 pr-8 py-2 text-sm bg-white dark:bg-[#1a1a1a] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-700 dark:text-gray-300">
              <option value="">All Sources</option>
              {sourceList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={filterAssigned} onChange={e => { setFilterAssigned(e.target.value); setPage(1) }}
              className="appearance-none pl-3 pr-8 py-2 text-sm bg-white dark:bg-[#1a1a1a] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-700 dark:text-gray-300">
              <option value="">All Team</option>
              {salesExecs.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <button
            onClick={() => dispatch(fetchLeads({ page, per_page: 20 }))}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#e0d8ce] dark:border-[#2a2a2a] text-gray-400 hover:text-brand hover:border-brand transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        </div>
        {canEdit && (
          <Button icon={Plus} onClick={() => { setAddForm(defaultForm); dispatch(clearLeadError()); setShowAddModal(true) }}>
            Add Lead
          </Button>
        )}
      </div>

      {/* Summary */}
      {!loading && (
        <div className="text-sm text-gray-500 dark:text-[#888]">
          Showing <span className="font-semibold text-gray-900 dark:text-white">{list.length}</span>
          {pagination?.total > 0 && <> of <span className="font-semibold text-gray-900 dark:text-white">{pagination.total}</span></>} leads
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-[#1a1a1a] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-4"><ListSkeleton rows={8} /></div>
        ) : list.length === 0 ? (
          <div className="py-16 text-center text-gray-400 dark:text-[#888]">
            <div className="text-4xl mb-3">🔍</div>
            <p className="font-medium">No leads found</p>
            <p className="text-sm mt-1">Try adjusting your filters or add a new lead</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e0d8ce] dark:border-[#2a2a2a] bg-[#f5f2ee] dark:bg-[#0f0f0f]">
                  <th className="py-3 pl-4 pr-2 w-8">
                    <input type="checkbox"
                      checked={selectedLeads.length === list.length && list.length > 0}
                      onChange={toggleAll} className="rounded" />
                  </th>
                  {['Lead', 'Phone', 'Source', 'Assigned', 'Status', 'Location', 'Actions'].map(h => (
                    <th key={h} className={`py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-[#888] uppercase tracking-wide whitespace-nowrap
                      ${['Phone', 'Source', 'Assigned'].includes(h) ? 'hidden md:table-cell' : ''}
                      ${['Location'].includes(h) ? 'hidden xl:table-cell' : ''}
                      ${h === 'Actions' ? 'text-right' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0d8ce] dark:divide-[#2a2a2a]">
                {list.map(lead => (
                  <tr key={lead.id} className="hover:bg-[#f5f2ee] dark:hover:bg-[#0f0f0f] transition-colors">
                    <td className="py-3 pl-4 pr-2">
                      <input type="checkbox" checked={selectedLeads.includes(lead.id)}
                        onChange={() => toggleSelect(lead.id)} className="rounded" />
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={lead.name} size="sm" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{lead.name}</div>
                          <div className="text-xs text-gray-400">{lead.budget ? `₹ ${lead.budget}` : lead.email || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">{lead.phone}</td>
                    <td className="py-3 px-3 hidden md:table-cell">
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400">
                        {lead.source_name || lead.source || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-3 hidden md:table-cell">
                      {lead.assigned_to_name ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar name={lead.assigned_to_name} size="xs" />
                          <span className="text-xs text-gray-600 dark:text-gray-400">{lead.assigned_to_name}</span>
                        </div>
                      ) : <span className="text-xs text-gray-400">Unassigned</span>}
                    </td>
                    <td className="py-3 px-3"><Badge label={lead.status || 'New'} /></td>
                    <td className="py-3 px-3 text-xs text-gray-400 hidden xl:table-cell">
                      {lead.location_preference || '—'}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`/leads/${lead.id}`)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand hover:bg-brand/10 transition-colors" title="View">
                          <Eye size={14} />
                        </button>
                        {canEdit && (
                          <button onClick={() => openEdit(lead)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Edit">
                            <Edit2 size={14} />
                          </button>
                        )}
                        {canEdit && (
                          <button onClick={() => { setSelectedLead(lead); setReassignTo(lead.assigned_to || ''); setShowReassignModal(true) }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors" title="Reassign">
                            <UserCheck size={14} />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => handleDeleteLead(lead)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete">
                            <Trash2 size={14} />
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

      {/* Add Lead Modal */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setAddSuccess('') }} title="Add New Lead" size="lg">
        <form onSubmit={handleAddLead} className="space-y-4">
          <LeadForm formData={addForm} setFormData={setAddForm} isEdit={false} sourceList={sourceList} salesExecs={salesExecs} />
          {addSuccess && <p className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 py-2 text-center rounded-xl">{addSuccess}</p>}
          {actionError && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 py-2 text-center rounded-xl">{actionError}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={actionLoading}>Add Lead</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Lead Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setEditSuccess('') }} title="Edit Lead" size="lg">
        <form onSubmit={handleEditLead} className="space-y-4">
          <LeadForm formData={editForm} setFormData={setEditForm} isEdit={true} sourceList={sourceList} salesExecs={salesExecs} />
          {editSuccess && <p className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 py-2 text-center rounded-xl">{editSuccess}</p>}
          {actionError && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 py-2 text-center rounded-xl">{actionError}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={actionLoading}>Update Lead</Button>
          </div>
        </form>
      </Modal>

      {/* Reassign Modal */}
      <Modal isOpen={showReassignModal} onClose={() => setShowReassignModal(false)} title="Reassign Lead">
        <form onSubmit={handleReassign} className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Reassigning: <span className="font-semibold text-gray-900 dark:text-gray-100">{selectedLead?.name}</span>
          </p>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Assign To</label>
            <div className="relative">
              <select value={reassignTo} onChange={e => setReassignTo(e.target.value)}
                className="w-full appearance-none px-3 py-2 text-sm bg-[#f5f2ee] dark:bg-[#0f0f0f] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100">
                <option value="">Select team member...</option>
                {salesExecs.map(u => (
                  <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.role.replace('_', ' ')})</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowReassignModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={actionLoading}>Reassign</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}