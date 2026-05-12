import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Edit2, Trash2, Shield, UserPlus, Mail, Phone, Lock, RefreshCw, Eye, EyeOff, Download, UserCheck } from 'lucide-react'
import { fetchUsers, createUser, updateUser, deleteUser, updateUserRole, assignManager, clearUserError } from '../store/userSlice'
import ListSkeleton from '../components/loaders/ListSkeleton'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import api from '../api/axios'
import Avatar from '../components/ui/Avatar'
import Modal from '../components/ui/Modal'
import ExportModal from '../components/ui/ExportModal'
import CustomSelect from '../components/ui/CustomSelect'

const allRoles = [
  { value: 'super_admin',     label: 'Super Admin' },
  { value: 'admin',           label: 'Admin' },
  { value: 'sales_manager',   label: 'Sales Manager' },
  { value: 'sales_executive', label: 'Sales Executive' },
  { value: 'external_caller', label: 'External Caller' },
]

const roleColors = {
  super_admin:    'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30',
  admin:          'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
  sales_manager:  'text-brand bg-brand/10 dark:bg-brand/15',
  sales_executive:'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
  external_caller:'text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-900/30',
}

const defaultForm = {
  first_name: '', last_name: '', email: '',
  phone_number: '', password: '', role: 'sales_executive',
}

// ── User Form (admin/super_admin only) ────────────────────────────────────────
function UserForm({ form, setForm, editMode, showPassword, setShowPassword }) {
  const inputClass = "w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm transition-all duration-200 disabled:opacity-50"
  const labelClass = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>First Name *</label>
          <input required value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} placeholder="Priya" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Last Name *</label>
          <input required value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} placeholder="Mehta" className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Email *</label>
        <div className="relative">
          <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input required type="email" disabled={editMode} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="priya@nextonerealty.com" className={inputClass + " pl-9"} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Phone Number *</label>
        <div className="relative">
          <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input required={!editMode} value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value })} placeholder="+919123456789" className={inputClass + " pl-9"} />
        </div>
      </div>
      {!editMode && (
        <div>
          <label className={labelClass}>Password *</label>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input required type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 8 characters" minLength={8} className={inputClass + " pl-9 pr-10"} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
      )}
      <CustomSelect label="Role" required value={form.role} onChange={val => setForm({ ...form, role: val })} options={allRoles} />
    </div>
  )
}

// ── Assign Manager Modal ───────────────────────────────────────────────────────
function AssignManagerModal({ isOpen, onClose, targetUser, managers, onAssign, loading, error, success, defaultManagerId }) {
  const [selectedManager, setSelectedManager] = useState('')

  useEffect(() => {
    if (isOpen) {
      // Pre-select: defaultManagerId (self for sales_manager) or current manager_id
      setSelectedManager(defaultManagerId || targetUser?.manager_id || '')
    }
  }, [isOpen, targetUser, defaultManagerId])

  if (!isOpen || !targetUser) return null

  const managerOptions = managers.map(m => ({ value: m.id, label: `${m.first_name} ${m.last_name}` }))
  const currentMgr = managers.find(m => m.id === targetUser.manager_id)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (selectedManager) onAssign(selectedManager)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign Manager">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-800">
          <Avatar name={`${targetUser.first_name} ${targetUser.last_name}`} size="sm" />
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{targetUser.first_name} {targetUser.last_name}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${roleColors[targetUser.role]}`}>{targetUser.role?.replace(/_/g, ' ')}</span>
              <span className="text-[10px] text-gray-400">{targetUser.email}</span>
            </div>
          </div>
        </div>

        {currentMgr && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 px-1">
            <UserCheck size={13} className="text-brand" />
            Currently under: <span className="font-medium text-gray-700 dark:text-gray-300 ml-1">{currentMgr.first_name} {currentMgr.last_name}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <CustomSelect
            label="Assign to Sales Manager *"
            value={selectedManager}
            onChange={setSelectedManager}
            options={managerOptions}
            placeholder="Select a sales manager"
          />
          {success && <p className="text-center text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 py-2 rounded-xl">{success}</p>}
          {error   && <p className="text-center text-xs text-red-500 bg-red-50 dark:bg-red-900/20 py-2 rounded-xl">{error}</p>}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={loading} disabled={!selectedManager}>Assign Manager</Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function UserManagement() {
  const dispatch = useDispatch()
  const { list, loading, actionLoading, actionError } = useSelector(s => s.users)
  const { user: currentUser } = useSelector(s => s.auth)

  const isSalesManager = currentUser?.role === 'sales_manager'
  const canManage      = ['super_admin', 'admin'].includes(currentUser?.role)
  const isAdminUser    = ['admin', 'super_admin'].includes(currentUser?.role)
  // sales_manager can assign but cannot create/edit/delete
  const canAssign      = canManage || isSalesManager

  const [showModal,       setShowModal]       = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [editMode,        setEditMode]        = useState(false)
  const [selectedUser,    setSelectedUser]    = useState(null)
  const [assignTarget,    setAssignTarget]    = useState(null)
  const [filterRole,      setFilterRole]      = useState('')
  const [success,         setSuccess]         = useState('')
  const [assignSuccess,   setAssignSuccess]   = useState('')
  const [showPassword,    setShowPassword]    = useState(false)
  const [exporting,       setExporting]       = useState(false)
  const [form,            setForm]            = useState(defaultForm)

  // sales_manager: API already scopes to their team; fetch without is_active to get all
  useEffect(() => {
    dispatch(fetchUsers({ role: filterRole }))
  }, [dispatch, filterRole])

  useEffect(() => {
    if (!showModal)       { dispatch(clearUserError()); setSuccess('');       setShowPassword(false) }
  }, [showModal, dispatch])

  useEffect(() => {
    if (!showAssignModal) { dispatch(clearUserError()); setAssignSuccess('') }
  }, [showAssignModal, dispatch])

  // Active sales managers — for assign dropdown
  const salesManagers = list.filter(u => u.role === 'sales_manager' && u.is_active)

  // For sales_manager: only show sales_executive and external_caller
  // For admin/super_admin: show all, split active/inactive
  const visibleList = isSalesManager
    ? list.filter(u => ['sales_executive', 'external_caller'].includes(u.role))
    : list

  const activeUsers   = visibleList.filter(u => u.is_active)
  const inactiveUsers = visibleList.filter(u => !u.is_active)

  // Role filter options — sales_manager doesn't need the filter (always scoped)
  const roleFilterOptions = [
    { value: '', label: 'All Roles' },
    ...allRoles,
  ]

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditMode(true); setSelectedUser(user)
      setForm({ first_name: user.first_name, last_name: user.last_name, email: user.email, phone_number: user.phone_number || '', role: user.role, password: '' })
    } else {
      setEditMode(false); setSelectedUser(null); setForm(defaultForm)
    }
    setShowModal(true)
  }

  const handleOpenAssignModal = (user) => {
    setAssignTarget(user)
    setAssignSuccess('')
    dispatch(clearUserError())
    setShowAssignModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); dispatch(clearUserError())
    if (editMode) {
      const { email, password, ...updateData } = form
      const result = await dispatch(updateUser({ id: selectedUser.id, userData: updateData }))
      if (updateUser.fulfilled.match(result)) {
        if (form.role !== selectedUser.role) await dispatch(updateUserRole({ id: selectedUser.id, role: form.role }))
        setSuccess('User updated successfully!')
        dispatch(fetchUsers({ role: filterRole }))
        setTimeout(() => setShowModal(false), 800)
      }
    } else {
      const result = await dispatch(createUser(form))
      if (createUser.fulfilled.match(result)) {
        setSuccess('User registered successfully!')
        dispatch(fetchUsers({ role: filterRole }))
        setTimeout(() => setShowModal(false), 800)
      }
    }
  }

  const handleAssign = async (managerId) => {
    dispatch(clearUserError())
    const result = await dispatch(assignManager({ userId: assignTarget.id, managerId }))
    if (assignManager.fulfilled.match(result)) {
      setAssignSuccess('Manager assigned successfully!')
      dispatch(fetchUsers({ role: filterRole }))
      setTimeout(() => setShowAssignModal(false), 800)
    }
  }

  const handleDelete = async (user) => {
    if (window.confirm(`Deactivate ${user.first_name} ${user.last_name}?`)) {
      const result = await dispatch(deleteUser(user.id))
      if (deleteUser.fulfilled.match(result)) dispatch(fetchUsers({ role: filterRole }))
    }
  }

  const handleExport = async (dateRange) => {
    if (!isAdminUser) return
    try {
      setExporting(true)
      const params = { ...dateRange }; if (filterRole) params.role = filterRole
      const res = await api.get('/export/users', { params, responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a'); a.href = url; a.download = `Team_${dateRange.from}_to_${dateRange.to}.xlsx`
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
      setShowExportModal(false)
    } catch (err) { console.error('Export failed:', err) } finally { setExporting(false) }
  }

  // Table helpers
  const isAssignable = (user) =>
    ['sales_executive', 'external_caller'].includes(user.role) && user.is_active

  // Columns: sales_manager does NOT see the Manager column
  const showManagerCol = !isSalesManager
  const tableHeaders = [
    'User', 'Email', 'Phone', 'Role',
    ...(showManagerCol ? ['Manager'] : []),
    'Status',
    'Actions',
  ]

  const renderRows = (users) => users.map(user => {
    const manager = list.find(m => m.id === user.manager_id)
    return (
      <tr key={user.id} className={`transition-colors hover:bg-gray-50 dark:hover:bg-[#0f0f0f] ${!user.is_active ? 'opacity-60' : ''}`}>
        {/* User */}
        <td className="py-3 px-4">
          <div className="flex items-center gap-3">
            <Avatar name={`${user.first_name} ${user.last_name}`} size="sm" />
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1">
                {user.first_name} {user.last_name}
                {user.role === 'super_admin' && <Shield size={12} className="text-purple-500" />}
              </div>
              <div className="text-[10px] text-gray-400">
                {user.last_login
                  ? `Last: ${new Date(user.last_login).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
                  : 'Never logged in'}
              </div>
            </div>
          </div>
        </td>
        <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-xs">{user.email}</td>
        <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-xs">{user.phone_number || '—'}</td>

        {/* Role */}
        <td className="py-3 px-4">
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${roleColors[user.role] || 'bg-gray-100 text-gray-600'}`}>
            {user.role?.replace(/_/g, ' ')}
          </span>
        </td>

        {/* Manager col — only for admin/super_admin */}
        {showManagerCol && (
          <td className="py-3 px-4">
            {isAssignable(user) ? (
              manager ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-brand/10 flex items-center justify-center flex-shrink-0">
                    <UserCheck size={11} className="text-brand" />
                  </div>
                  <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                    {manager.first_name} {manager.last_name}
                  </span>
                </div>
              ) : (
                <span className="text-[11px] text-amber-500 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-lg">
                  Unassigned
                </span>
              )
            ) : (
              <span className="text-xs text-gray-300 dark:text-gray-700">—</span>
            )}
          </td>
        )}

        {/* Status */}
        <td className="py-3 px-4">
          <Badge label={user.is_active ? 'Active' : 'Inactive'} />
        </td>

        {/* Actions */}
        <td className="py-3 px-4">
          <div className="flex items-center gap-1">
            {/* Assign — admin/super_admin: always show for exec/caller
                 sales_manager: only show if NOT already assigned (no manager_id) */}
            {canAssign && isAssignable(user) && (!isSalesManager || !user.manager_id) && (
              <button onClick={() => handleOpenAssignModal(user)} title="Assign Manager"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand hover:bg-brand/10 transition-colors">
                <UserCheck size={13} />
              </button>
            )}
            {/* Edit — admin/super_admin only */}
            {canManage && (
              <button onClick={() => handleOpenModal(user)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                <Edit2 size={13} />
              </button>
            )}
            {/* Deactivate — admin/super_admin only */}
            {canManage && user.id !== currentUser?.id && user.role !== 'super_admin' && user.is_active && (
              <button onClick={() => handleDelete(user)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </td>
      </tr>
    )
  })

  const TableSection = ({ users, label, dot }) => (
    <div className="bg-card text-card-foreground border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-md shadow-gray-300/50 dark:shadow-gray-900/50">
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0f0f0f]">
        <div className={`w-2 h-2 rounded-full ${dot}`} />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{label}</span>
        <span className="ml-auto text-xs font-bold tabular-nums text-gray-400 bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded-full">{users.length}</span>
      </div>
      {users.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">No {label.toLowerCase()} users</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                {tableHeaders.map(h => (
                  <th key={h} className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-[#888] uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {renderRows(users)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-5">

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1">
          {/* Role filter — only for admin/super_admin */}
          {!isSalesManager && (
            <div className="w-48">
              <CustomSelect
                value={filterRole}
                onChange={val => setFilterRole(val)}
                options={roleFilterOptions}
                placeholder="All Roles"
              />
            </div>
          )}
          <button
            onClick={() => dispatch(fetchUsers({ role: filterRole }))}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 text-gray-400 hover:text-brand hover:border-brand transition-colors shadow-sm bg-white dark:bg-[#1a1a1a]">
            <RefreshCw size={14} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {isAdminUser && (
            <Button variant="outline" size="sm" icon={Download} loading={exporting} disabled={exporting} onClick={() => setShowExportModal(true)}>
              Export
            </Button>
          )}
          {/* New User button — admin/super_admin only, NOT sales_manager */}
          {canManage && (
            <Button icon={UserPlus} onClick={() => handleOpenModal()}>New User</Button>
          )}
        </div>
      </div>

      {/* sales_manager context banner */}
      {isSalesManager && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand/5 border border-brand/20 text-xs text-brand">
          <UserCheck size={14} />
          <span>Showing your team members (Sales Executives & External Callers). Click the assign icon to assign them to yourself.</span>
        </div>
      )}

      {/* Tables */}
      {loading ? (
        <div className="bg-card border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50">
          <ListSkeleton rows={6} />
        </div>
      ) : visibleList.length === 0 ? (
        <div className="bg-card border border-gray-200 dark:border-gray-700 rounded-2xl py-16 text-center text-gray-400 dark:text-[#888]">
          <div className="text-4xl mb-3">👥</div>
          <p className="font-medium">No users found</p>
        </div>
      ) : (
        <>
          <TableSection users={activeUsers}   label="Active"   dot="bg-green-500" />
          {inactiveUsers.length > 0 && (
            <TableSection users={inactiveUsers} label="Inactive" dot="bg-gray-400" />
          )}
        </>
      )}

      {/* Register / Edit Modal — admin/super_admin only */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editMode ? 'Edit User' : 'Register New User'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <UserForm form={form} setForm={setForm} editMode={editMode} showPassword={showPassword} setShowPassword={setShowPassword} />
          {success     && <p className="text-center text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 py-2 rounded-xl">{success}</p>}
          {actionError && <p className="text-center text-xs text-red-500 bg-red-50 dark:bg-red-900/20 py-2 rounded-xl">{actionError}</p>}
          <div className="pt-2 flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={actionLoading}>{editMode ? 'Update User' : 'Register User'}</Button>
          </div>
        </form>
      </Modal>

      {/* Assign Manager Modal */}
      <AssignManagerModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        targetUser={assignTarget}
        managers={salesManagers}
        onAssign={handleAssign}
        loading={actionLoading}
        error={actionError}
        success={assignSuccess}
        defaultManagerId={isSalesManager ? currentUser?.id : assignTarget?.manager_id}
      />

      {/* Export Modal */}
      <ExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)}
        onExport={handleExport} loading={exporting} title="Export Team Data" />
    </div>
  )
}