import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle, Clock, AlertCircle, Phone, Plus,
  Edit2, Trash2, Download, RefreshCw, ChevronDown, Filter, Eye
} from 'lucide-react'
import {
  fetchFollowUps, createFollowUp, updateFollowUp,
  completeFollowUp, deleteFollowUp, clearFollowUpError, markCompleted,
} from '../store/followUpSlice'
import { fetchLeads } from '../store/leadSlice'
import { fetchUsers } from '../store/userSlice'
import ListSkeleton from '../components/loaders/ListSkeleton'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import api from '../api/axios'
import Modal from '../components/ui/Modal'
import CustomSelect from '../components/ui/CustomSelect'

const priorities = ['low', 'medium', 'high']
const priorityOptions = priorities.map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))
const priorityStyle = {
  high:   'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  medium: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  low:    'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
}

const defaultForm = {
  title: '', lead_id: '', due_date: '', due_time: '10:00',
  assigned_to: '', priority: 'medium', notes: '',
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function classifyTask(task) {
  if (task.is_completed) return 'completed'
  const now = new Date()
  const due = new Date(task.due_date)
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  if (due < todayStart) return 'overdue'
  if (due <= todayEnd) return 'today'
  return 'upcoming'
}

function formatDue(task) {
  if (!task.due_date) return '—'
  const d = new Date(task.due_date)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
    (task.due_time ? ` at ${task.due_time}` : '')
}

// ── Form — defined OUTSIDE to prevent typing/focus bug ────────────────────────
function FollowUpForm({ formData, setFormData, leads, salesExecs, isEdit }) {
  const ic = "w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm transition-all duration-200"
  const lc = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"

  const leadOptions = leads.map(l => ({
    value: l.id,
    label: `${l.name}${l.phone ? ` — ${l.phone}` : ''}`
  }))

  const execOptions = salesExecs.map(u => ({
    value: u.id,
    label: `${u.first_name} ${u.last_name}`
  }))

  return (
    <div className="space-y-4">

      {/* Title */}
      <div>
        <label className={lc}>Task Title *</label>
        <input
          required
          value={formData.title}
          onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
          placeholder="Follow up call with Suresh Patel"
          className={ic}
        />
      </div>

      {/* Lead */}
      <CustomSelect
        label="Lead"
        required
        value={formData.lead_id}
        onChange={val => setFormData(p => ({ ...p, lead_id: val }))}
        options={leadOptions}
        placeholder="Select lead..."
      />

      {/* Due Date + Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lc}>Due Date *</label>
          <input
            required
            type="date"
            value={formData.due_date}
            onChange={e => setFormData(p => ({ ...p, due_date: e.target.value }))}
            className={ic}
          />
        </div>
        <div>
          <label className={lc}>Due Time</label>
          <input
            type="time"
            value={formData.due_time}
            onChange={e => setFormData(p => ({ ...p, due_time: e.target.value }))}
            className={ic}
          />
        </div>
      </div>

      {/* Priority + Assign To */}
      <div className="grid grid-cols-2 gap-3">
        <CustomSelect
          label="Priority"
          value={formData.priority}
          onChange={val => setFormData(p => ({ ...p, priority: val }))}
          options={priorityOptions}
        />
        <CustomSelect
          label="Assign To"
          value={formData.assigned_to}
          onChange={val => setFormData(p => ({ ...p, assigned_to: val }))}
          options={execOptions}
          placeholder="Default (lead's executive)"
        />
      </div>

      {/* Notes */}
      <div>
        <label className={lc}>Notes</label>
        <textarea
          rows={3}
          value={formData.notes}
          onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
          placeholder="Additional context about the follow-up..."
          className={ic}
        />
      </div>
    </div>
  )
}

// ── Task Card — defined OUTSIDE to prevent focus bug ─────────────────────────
function TaskCard({ task, onEdit, onDelete, onComplete, canManage }) {
  const navigate = useNavigate()
  const category = classifyTask(task)

  const cardStyle = {
    overdue:   'border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-900/10',
    today:     'border-blue-200 dark:border-blue-900/40 bg-white dark:bg-[#1a1a1a]',
    upcoming:  'border-[#e2e8f0] dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a]',
    completed: 'border-green-200 dark:border-green-900/40 bg-green-50/30 dark:bg-green-900/10 opacity-60',
  }

  return (
    <div className={`border rounded-xl p-4 transition-all ${cardStyle[category]}`}>
      <div className="flex items-start gap-3">
        <Avatar name={task.lead_name || task.title} size="sm" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
              {task.lead_name || '—'}
            </span>
            {category === 'overdue' && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full flex-shrink-0">
                <AlertCircle size={9} /> Overdue
              </span>
            )}
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${priorityStyle[task.priority] || priorityStyle.medium}`}>
              {task.priority || 'medium'}
            </span>
          </div>

          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 truncate">{task.title}</p>

          {task.notes && (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-1 line-clamp-1">"{task.notes}"</p>
          )}

          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <div className="flex items-center gap-1">
              <Clock size={11} className={category === 'overdue' ? 'text-red-500' : 'text-brand'} />
              <span className={`text-xs font-medium ${category === 'overdue' ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-[#888]'}`}>
                {formatDue(task)}
              </span>
            </div>
            {task.assigned_to_name && (
              <span className="text-xs text-gray-400">→ {task.assigned_to_name}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          {task.lead_phone && (
            <a href={`tel:${task.lead_phone}`}>
              <Button size="sm" variant="ghost" icon={Phone} className="text-xs">Call</Button>
            </a>
          )}
          {!task.is_completed && (
            <Button size="sm" variant="secondary" onClick={() => onComplete(task)} className="text-xs">
              Done
            </Button>
          )}
          {canManage && !task.is_completed && (
            <div className="flex gap-1 justify-end">
              <button onClick={() => navigate(`/follow-ups/${task.id}`)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand hover:bg-brand/10 transition-all hover:scale-110 active:scale-95" title="View Details">
                <Eye size={14} />
              </button>
              <button onClick={() => onEdit(task)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Edit">
                <Edit2 size={13} />
              </button>
              <button onClick={() => onDelete(task)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete">
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FollowUps() {
  const dispatch = useDispatch()
  const { list, loading, pagination, actionLoading, actionError } = useSelector(s => s.followUps)
  const { list: leadList } = useSelector(s => s.leads)
  const { list: userList } = useSelector(s => s.users)
  const { user: currentUser } = useSelector(s => s.auth)

  const [filterStatus,   setFilterStatus]   = useState('all') // pending | overdue | all | completed
  const [filterAssigned, setFilterAssigned] = useState('')
  const [page, setPage] = useState(1)

  const [showAddModal,      setShowAddModal]      = useState(false)
  const [showEditModal,     setShowEditModal]      = useState(false)
  const [showCompleteModal, setShowCompleteModal]  = useState(false)
  const [selectedTask,      setSelectedTask]       = useState(null)
  const [completeNotes,     setCompleteNotes]      = useState('')

  const [addForm,  setAddForm]  = useState(defaultForm)
  const [editForm, setEditForm] = useState(defaultForm)
  const [success,   setSuccess]   = useState('')
  const [exporting, setExporting] = useState(false)

  const salesExecs = userList.filter(u =>
    ['sales_executive', 'sales_manager'].includes(u.role) && u.is_active
  )
  const canManage = ['super_admin', 'admin', 'sales_manager'].includes(currentUser?.role)

  // ── Load data ───────────────────────────────────────────────────────────────
  const loadTasks = () => {
    const params = { page, per_page: 50 }
    if (filterStatus === 'pending')   { params.is_completed = false }
    if (filterStatus === 'completed') { params.is_completed = true }
    if (filterStatus === 'overdue')   { params.overdue = true; params.is_completed = false }
    if (filterAssigned) params.assigned_to = filterAssigned
    dispatch(fetchFollowUps(params))
  }

  useEffect(() => { loadTasks() }, [dispatch, filterStatus, filterAssigned, page])

  useEffect(() => {
    dispatch(fetchLeads({ per_page: 100 }))
    dispatch(fetchUsers())
  }, [dispatch])

  // ── Classify tasks into buckets ─────────────────────────────────────────────
  const overdueTasks   = list.filter(t => classifyTask(t) === 'overdue')
  const todayTasks     = list.filter(t => classifyTask(t) === 'today')
  const upcomingTasks  = list.filter(t => classifyTask(t) === 'upcoming')
  const completedTasks = list.filter(t => classifyTask(t) === 'completed')

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault()
    dispatch(clearFollowUpError())
    // Build ISO datetime from date + time
    const due_date = formData => {
      if (!formData.due_date) return ''
      const time = formData.due_time || '10:00'
      return `${formData.due_date}T${time}:00`
    }
    const payload = {
      title:       addForm.title,
      lead_id:     addForm.lead_id,
      due_date:    due_date(addForm),
      priority:    addForm.priority,
      notes:       addForm.notes,
      ...(addForm.assigned_to && { assigned_to: addForm.assigned_to }),
    }
    const result = await dispatch(createFollowUp(payload))
    if (createFollowUp.fulfilled.match(result)) {
      setSuccess('Follow-up created!')
      loadTasks()
      setTimeout(() => { setShowAddModal(false); setSuccess(''); setAddForm(defaultForm) }, 800)
    }
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    dispatch(clearFollowUpError())
    const due_date = editForm.due_date
      ? `${editForm.due_date}T${editForm.due_time || '10:00'}:00`
      : undefined
    const payload = {
      title:    editForm.title,
      due_date,
      priority: editForm.priority,
      notes:    editForm.notes,
      ...(editForm.assigned_to && { assigned_to: editForm.assigned_to }),
    }
    const result = await dispatch(updateFollowUp({ id: selectedTask.id, data: payload }))
    if (updateFollowUp.fulfilled.match(result)) {
      setSuccess('Follow-up updated!')
      loadTasks()
      setTimeout(() => { setShowEditModal(false); setSuccess('') }, 800)
    }
  }

  const handleComplete = async (e) => {
    e.preventDefault()
    // Optimistic UI update
    dispatch(markCompleted(selectedTask.id))
    const result = await dispatch(completeFollowUp({ id: selectedTask.id, notes: completeNotes }))
    if (completeFollowUp.fulfilled.match(result)) {
      setSuccess('Task marked as done!')
      loadTasks()
      setTimeout(() => { setShowCompleteModal(false); setSuccess(''); setCompleteNotes('') }, 600)
    }
  }

  const handleDelete = async (task) => {
    if (window.confirm(`Delete this follow-up task?`)) {
      const result = await dispatch(deleteFollowUp(task.id))
      if (deleteFollowUp.fulfilled.match(result)) loadTasks()
    }
  }

  const openEdit = (task) => {
    setSelectedTask(task)
    const dueDate = task.due_date ? task.due_date.split('T')[0] : ''
    const dueTime = task.due_date ? task.due_date.split('T')[1]?.slice(0, 5) : '10:00'
    setEditForm({
      title:       task.title || '',
      lead_id:     task.lead_id || '',
      due_date:    dueDate,
      due_time:    dueTime || '10:00',
      assigned_to: task.assigned_to || '',
      priority:    task.priority || 'medium',
      notes:       task.notes || '',
    })
    setShowEditModal(true)
  }

  const openComplete = (task) => {
    setSelectedTask(task)
    setCompleteNotes('')
    setShowCompleteModal(true)
  }

  // ── Section Component ────────────────────────────────────────────────────────
  const Section = ({ title, tasks, icon: Icon, iconColor, accent }) => {
    if (tasks.length === 0) return null
    return (
      <div className={`bg-white dark:bg-[#1a1a1a] border ${accent || 'border-[#e2e8f0] dark:border-[#2a2a2a]'} rounded-2xl p-5`}>
        <div className="flex items-center gap-2 mb-4">
          <Icon size={16} className={iconColor} />
          <h3 className={`font-display text-sm font-semibold ${iconColor}`}>{title}</h3>
          <span className="w-5 h-5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs flex items-center justify-center font-bold text-gray-600 dark:text-gray-400">
            {tasks.length}
          </span>
        </div>
        <div className="space-y-3">
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={openComplete}
              onEdit={openEdit}
              onDelete={handleDelete}
              canManage={canManage}
            />
          ))}
        </div>
      </div>
    )
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      const today = new Date().toISOString().split('T')[0]
      const res = await api.get('/export/follow-ups', { params: {}, responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a'); a.href = url; a.download = `FollowUps_${today}.xlsx`
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    } catch (err) { console.error('Export failed:', err) } finally { setExporting(false) }
  }

  return (
    <div className="space-y-4">

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">

          {/* Status tabs */}
          <div className="flex bg-white dark:bg-[#1a1a1a] border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl p-1 gap-1">
            {[
              { key: 'all',       label: 'All' },
              { key: 'pending',   label: 'Active' },
              { key: 'completed', label: 'Done' },
              { key: 'overdue',   label: 'Overdue' },
            ].map(tab => (
              <button key={tab.key}
                onClick={() => { setFilterStatus(tab.key); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                  ${filterStatus === tab.key
                    ? 'bg-brand text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Assign filter */}
          {canManage && (
            <div className="relative">
              <select value={filterAssigned} onChange={e => { setFilterAssigned(e.target.value); setPage(1) }}
                className="appearance-none pl-3 pr-8 py-2 text-xs bg-white dark:bg-[#1a1a1a] border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-700 dark:text-gray-300">
                <option value="">All Team</option>
                {salesExecs.map(u => (
                  <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          )}

          <button onClick={loadTasks}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#e2e8f0] dark:border-[#2a2a2a] text-gray-400 hover:text-brand hover:border-brand transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={Download} loading={exporting} disabled={exporting} onClick={handleExport}>
            Export
          </Button>
          <Button icon={Plus} onClick={() => { setAddForm(defaultForm); dispatch(clearFollowUpError()); setShowAddModal(true) }}>
            Add Follow-up
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Today's Tasks",  count: todayTasks.length,    color: 'text-blue-600',  bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Overdue',        count: overdueTasks.length,   color: 'text-red-600',   bg: 'bg-red-50 dark:bg-red-900/20' },
          { label: 'Upcoming',       count: upcomingTasks.length,  color: 'text-brand',     bg: 'bg-brand/10 dark:bg-brand/15' },
          { label: 'Completed',      count: completedTasks.length, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl px-4 py-3`}>
            <div className={`text-2xl font-display font-bold ${s.color}`}>{s.count}</div>
            <div className="text-xs text-gray-500 dark:text-[#888] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white dark:bg-[#1a1a1a] border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-2xl p-4">
          <ListSkeleton rows={4} />
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand/10 mb-6">
            <CheckCircle size={32} className="text-brand" />
          </div>
          <h3 className="font-display text-2xl font-bold text-gray-900 dark:text-white">All caught up!</h3>
          <p className="text-gray-500 dark:text-[#888] mt-2 text-base">No follow-ups here.</p>
        </div>
      ) : (
        <>
          <Section title="⚠️ Overdue"           tasks={overdueTasks}   icon={AlertCircle}  iconColor="text-red-600 dark:text-red-400"   accent="border-red-200 dark:border-red-900/50" />
          <Section title="📞 Today's Follow-ups" tasks={todayTasks}     icon={Phone}        iconColor="text-blue-600 dark:text-blue-400" accent="border-blue-200 dark:border-blue-900/40" />
          <Section title="📅 Upcoming"           tasks={upcomingTasks}  icon={Clock}        iconColor="text-brand" />
          <Section title="✅ Completed"           tasks={completedTasks} icon={CheckCircle}  iconColor="text-green-600 dark:text-green-400" />
        </>
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
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setSuccess('') }} title="Add Follow-up Task">
        <form onSubmit={handleAdd} className="space-y-4">
          <FollowUpForm formData={addForm} setFormData={setAddForm} leads={leadList} salesExecs={salesExecs} isEdit={false} />
          {success    && <p className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 py-2 text-center rounded-xl">{success}</p>}
          {actionError && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 py-2 text-center rounded-xl">{actionError}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={actionLoading}>Create Follow-up</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSuccess('') }} title="Edit Follow-up Task">
        <form onSubmit={handleEdit} className="space-y-4">
          <FollowUpForm formData={editForm} setFormData={setEditForm} leads={leadList} salesExecs={salesExecs} isEdit={true} />
          {success    && <p className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 py-2 text-center rounded-xl">{success}</p>}
          {actionError && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 py-2 text-center rounded-xl">{actionError}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={actionLoading}>Update</Button>
          </div>
        </form>
      </Modal>

      {/* Complete Modal */}
      <Modal isOpen={showCompleteModal} onClose={() => setShowCompleteModal(false)} title="Mark as Done">
        <form onSubmit={handleComplete} className="space-y-4">
          {selectedTask && (
            <div className="p-3 bg-[#f8fafc] dark:bg-[#0f0f0f] rounded-xl">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedTask.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{selectedTask.lead_name} · {formatDue(selectedTask)}</p>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Completion Notes <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={completeNotes}
              onChange={e => setCompleteNotes(e.target.value)}
              placeholder="Spoke with client, discussed pricing. Will call back next week."
              className="w-full px-3 py-2 text-sm bg-[#f8fafc] dark:bg-[#0f0f0f] border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand resize-none text-gray-900 dark:text-gray-100"
            />
          </div>
          {success    && <p className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 py-2 text-center rounded-xl">{success}</p>}
          {actionError && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 py-2 text-center rounded-xl">{actionError}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCompleteModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={actionLoading}>
              ✓ Mark as Done
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}