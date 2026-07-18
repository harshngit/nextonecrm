import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'
import {
  Globe, Search, RefreshCw, Mail, Building2,
  Calendar, MoreVertical, Edit2, Trash2, ArrowRightCircle,
  CheckCircle2, AlertCircle, ChevronLeft, ChevronRight,
} from 'lucide-react'
import {
  fetchWebsiteInquiries, updateWebsiteInquiry, deleteWebsiteInquiry, clearWebsiteInquiryError,
} from '../store/websiteInquirySlice'
import { fetchProjects } from '../store/projectSlice'
import ListSkeleton from '../components/loaders/ListSkeleton'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ConfirmModal from '../components/ui/ConfirmModal'
import CustomSelect from '../components/ui/CustomSelect'
import AsyncSearchSelect from '../components/ui/AsyncSearchSelect'
import DatePicker from '../components/ui/DatePicker'
import PhoneActions from '../components/ui/PhoneActions'
import PageSizeSelect, { resolvePerPage } from '../components/ui/PageSizeSelect'
import ConvertInquiryModal from '../components/modals/ConvertInquiryModal'
import api from '../api/axios'

const ADMIN_ROLES = ['super_admin', 'admin']

const STATUS_OPTIONS = [
  { value: 'new',       label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'converted', label: 'Converted' },
  { value: 'spam',      label: 'Spam' },
  { value: 'closed',    label: 'Closed' },
]

const fmtDate = (d) => {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const ic = 'w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm transition-all'
const lc = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'

// Defined outside the main component to avoid remount/focus-loss on every keystroke.
function InquiryForm({ form, setForm, projectOptions, searchProjects }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={lc}>Name</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={ic} />
        </div>
        <div>
          <label className={lc}>Phone</label>
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={ic} />
        </div>
      </div>
      <div>
        <label className={lc}>Email</label>
        <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={ic} />
      </div>
      <AsyncSearchSelect
        label="Project"
        value={form.project_id}
        onChange={val => setForm(f => ({ ...f, project_id: val, project_name: '' }))}
        onTextChange={text => setForm(f => ({ ...f, project_name: text, project_id: text ? '' : f.project_id }))}
        onSearch={searchProjects}
        initialOptions={projectOptions.slice(0, 20)}
        placeholder="Type to search projects..."
        fallbackToInput
        defaultText={form.project_id ? '' : (form.project_name || '')}
      />
      <CustomSelect label="Status" value={form.status} onChange={val => setForm(f => ({ ...f, status: val }))} options={STATUS_OPTIONS} />
      <div>
        <label className={lc}>Message</label>
        <textarea rows={4} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
          placeholder="Inquiry message..." className={ic + ' resize-none'} />
      </div>
    </div>
  )
}

export default function WebsiteInquiries() {
  const { user: currentUser } = useSelector(s => s.auth)
  const isAdmin = ADMIN_ROLES.includes(currentUser?.role)
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return <WebsiteInquiriesContent />
}

// Only mounted once the admin/super_admin gate above passes — keeps all its
// data-fetching effects from ever firing for a non-admin user.
function WebsiteInquiriesContent() {
  const dispatch = useDispatch()
  const { list, loading, pagination, actionLoading, actionError } = useSelector(s => s.websiteInquiries)
  const { list: projectList } = useSelector(s => s.projects)

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterProjectId, setFilterProjectId] = useState('')
  const [filterProjectName, setFilterProjectName] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState('20')

  const [openMenuId, setOpenMenuId] = useState(null)
  const [menuPos, setMenuPos] = useState(null)

  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [editSubmitting, setEditSubmitting] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [convertTarget, setConvertTarget] = useState(null)
  const [toast, setToast] = useState('')

  const loadInquiries = () => {
    const params = { page, per_page: resolvePerPage(perPage) }
    if (search) params.search = search
    if (filterStatus) params.status = filterStatus
    if (filterProjectId) params.project = filterProjectId
    else if (filterProjectName) params.project = filterProjectName
    if (filterFrom) params.from = filterFrom
    if (filterTo) params.to = filterTo
    dispatch(fetchWebsiteInquiries(params))
  }

  useEffect(() => { loadInquiries() }, [dispatch, search, page, perPage, filterStatus, filterProjectId, filterProjectName, filterFrom, filterTo])
  useEffect(() => { dispatch(fetchProjects()) }, [dispatch])

  useEffect(() => {
    if (actionError) {
      const t = setTimeout(() => dispatch(clearWebsiteInquiryError()), 4000)
      return () => clearTimeout(t)
    }
  }, [actionError, dispatch])

  useEffect(() => {
    const fn = (e) => { if (!e.target.closest('[data-inquiry-menu]')) setOpenMenuId(null) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const searchProjects = async (q) => {
    const res = await api.get('/projects', { params: { search: q, per_page: 20 } })
    return (res.data.data || []).map(p => ({ value: p.id, label: `${p.name}${p.city ? ` · ${p.city}` : ''}` }))
  }
  const projectOptions = projectList.map(p => ({ value: p.id, label: `${p.name}${p.city ? ` · ${p.city}` : ''}` }))

  const openEdit = (inquiry) => {
    setEditTarget(inquiry)
    setEditForm({
      name: inquiry.name || '',
      phone: inquiry.phone || '',
      email: inquiry.email || '',
      message: inquiry.message || '',
      status: inquiry.status || 'new',
      project_id: inquiry.project_id || '',
      project_name: inquiry.project_id ? '' : (inquiry.project_name || ''),
    })
    setOpenMenuId(null)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setEditSubmitting(true)
    const res = await dispatch(updateWebsiteInquiry({
      id: editTarget.id,
      data: {
        name: editForm.name,
        phone: editForm.phone,
        email: editForm.email,
        message: editForm.message,
        status: editForm.status,
        project_id: editForm.project_id || editForm.project_name,
        project_name: editForm.project_name,
      },
    }))
    setEditSubmitting(false)
    if (updateWebsiteInquiry.fulfilled.match(res)) {
      setEditTarget(null)
      setEditForm(null)
      loadInquiries()
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await dispatch(deleteWebsiteInquiry(deleteTarget.id))
    setDeleting(false)
    if (deleteWebsiteInquiry.fulfilled.match(res)) {
      setDeleteTarget(null)
      loadInquiries()
    }
  }

  const handleConvertSuccess = (convertTo) => {
    setConvertTarget(null)
    setToast(
      convertTo === 'lead' ? 'Lead created!' :
      convertTo === 'follow_up' ? 'Lead created and follow-up scheduled!' :
      'Lead created and site visit scheduled!'
    )
    loadInquiries()
    setTimeout(() => setToast(''), 3500)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center">
              <Globe size={18} className="text-brand" />
            </div>
            Website Inquiries
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Contact-form submissions from the website</p>
        </div>
        <button onClick={loadInquiries}
          className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-brand hover:border-brand transition-colors">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {actionError && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5">
          <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-600 dark:text-red-400">{actionError}</p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search name, phone, email..."
            className="pl-9 pr-4 py-2 text-sm bg-card text-card-foreground border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-brand w-56 text-gray-900 dark:text-gray-100 placeholder-gray-400"
          />
        </div>
        <div className="w-40">
          <CustomSelect
            value={filterStatus}
            onChange={(v) => { setFilterStatus(v); setPage(1) }}
            options={[{ value: '', label: 'All Status' }, ...STATUS_OPTIONS]}
            placeholder="All Status"
          />
        </div>
        <div className="w-52">
          <AsyncSearchSelect
            value={filterProjectId}
            onChange={(v) => { setFilterProjectId(v); setFilterProjectName(''); setPage(1) }}
            onTextChange={(t) => { setFilterProjectName(t); if (t) setFilterProjectId(''); setPage(1) }}
            onSearch={searchProjects}
            initialOptions={projectOptions.slice(0, 20)}
            placeholder="Filter by project..."
            fallbackToInput
          />
        </div>
        <div className="w-40">
          <DatePicker size="sm" value={filterFrom} onChange={(v) => { setFilterFrom(v); setPage(1) }} placeholder="From" />
        </div>
        <div className="w-40">
          <DatePicker size="sm" value={filterTo} onChange={(v) => { setFilterTo(v); setPage(1) }} placeholder="To" />
        </div>
      </div>

      {/* Summary */}
      {!loading && (
        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-[#888]">
          <span>
            Showing <span className="font-semibold text-gray-900 dark:text-white">{list.length}</span>
            {pagination?.total > 0 && <> of <span className="font-semibold text-gray-900 dark:text-white">{pagination.total}</span></>} inquiries
          </span>
          <PageSizeSelect value={perPage} onChange={(v) => { setPerPage(v); setPage(1) }} />
        </div>
      )}

      {/* Table */}
      <div className="bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-blue-100/50 dark:shadow-blue-900/20 rounded-2xl hover:shadow-lg transition-all duration-200">
        {loading ? (
          <div className="p-4"><ListSkeleton rows={8} /></div>
        ) : list.length === 0 ? (
          <div className="py-16 text-center text-gray-400 dark:text-[#888]">
            <Globe size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
            <p className="font-medium">No website inquiries found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0f0f0f]">
                  {['Inquiry', 'Message', 'Project', 'Source', 'Status', 'Received', 'Actions'].map(h => (
                    <th key={h} className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-[#888] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {list.map((inq) => (
                  <tr key={inq.id} className="hover:bg-gray-50 dark:hover:bg-[#0f0f0f] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{inq.name || '—'}</div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                        {inq.phone && (
                          <PhoneActions phone={inq.phone} email={inq.email}>
                            <span className="hover:text-brand transition-colors">{inq.phone}</span>
                          </PhoneActions>
                        )}
                        {inq.email && (
                          <span className="flex items-center gap-1 truncate max-w-[160px]">
                            <Mail size={10} /> {inq.email}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-[240px]">
                      <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2" title={inq.message}>
                        {inq.message || <span className="text-gray-300 dark:text-gray-700">—</span>}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                        {(inq.project_name || inq.project?.name) && <Building2 size={11} className="text-gray-400 flex-shrink-0" />}
                        {inq.project_name || inq.project?.name || <span className="text-gray-300 dark:text-gray-700">—</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400 capitalize">{inq.source || '—'}</td>
                    <td className="py-3 px-4"><Badge label={inq.status || 'new'} /></td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <Calendar size={11} /> {fmtDate(inq.created_at)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setConvertTarget(inq)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand to-blue-600 hover:from-brand-dark hover:to-blue-700 text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.97] flex-shrink-0"
                        >
                          <ArrowRightCircle size={12} /> Convert
                        </button>
                        <div className="relative" data-inquiry-menu>
                          <button
                            onClick={(e) => {
                              const r = e.currentTarget.getBoundingClientRect()
                              const below = window.innerHeight - r.bottom
                              setMenuPos({ right: window.innerWidth - r.right, ...(below > 160 ? { top: r.bottom + 4 } : { bottom: window.innerHeight - r.top + 4 }) })
                              setOpenMenuId(openMenuId === inq.id ? null : inq.id)
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand hover:bg-brand/10 transition-all"
                          >
                            <MoreVertical size={16} />
                          </button>
                          {openMenuId === inq.id && (
                            <div style={{ top: menuPos?.top, bottom: menuPos?.bottom, right: menuPos?.right }}
                              className="fixed w-40 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg z-[9999] py-1">
                              <button onClick={() => openEdit(inq)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <Edit2 size={14} /> Edit
                              </button>
                              <button onClick={() => { setDeleteTarget(inq); setOpenMenuId(null) }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                <Trash2 size={14} /> Delete
                              </button>
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
      {pagination?.total > 0 && (
        <div className="flex items-center justify-between px-2 text-xs text-gray-500 flex-wrap gap-2">
          <span>Page {pagination.page} of {pagination.total_pages || 1} · {pagination.total} total</span>
          {pagination.total_pages > 1 && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" icon={ChevronLeft} disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button size="sm" variant="outline" icon={ChevronRight} disabled={page >= pagination.total_pages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      <Modal isOpen={!!editTarget} onClose={() => { setEditTarget(null); setEditForm(null) }} title="Edit Website Inquiry">
        {editForm && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <InquiryForm form={editForm} setForm={setEditForm} projectOptions={projectOptions} searchProjects={searchProjects} />
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setEditTarget(null); setEditForm(null) }}>Cancel</Button>
              <Button type="submit" className="flex-1" loading={editSubmitting}>Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Inquiry"
        message={`Are you sure you want to delete the inquiry from "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        loading={deleting}
      />

      {/* Convert Modal */}
      {convertTarget && (
        <ConvertInquiryModal
          inquiry={convertTarget}
          onClose={() => setConvertTarget(null)}
          onSuccess={handleConvertSuccess}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-500 text-white px-5 py-3 rounded-2xl shadow-xl shadow-emerald-500/30 animate-in slide-in-from-bottom-2">
          <CheckCircle2 size={16} /> {toast}
        </div>
      )}
    </div>
  )
}
