import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useModulePermissions } from '../hooks/usePermission'
import { Edit2, Trash2, Shield, UserPlus, Mail, Phone, Lock, RefreshCw, Eye, EyeOff, Download, UserCheck, MoreVertical } from 'lucide-react'
import { fetchUsers, createUser, updateUser, deleteUser, updateUserRole, assignManager, clearUserError, fetchRoles } from '../store/userSlice'
import ListSkeleton from '../components/loaders/ListSkeleton'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import ConfirmModal from '../components/ui/ConfirmModal'
import api from '../api/axios'
import Avatar from '../components/ui/Avatar'
import Modal from '../components/ui/Modal'
import ExportModal from '../components/ui/ExportModal'
import CustomSelect from '../components/ui/CustomSelect'

const roleColors = {
  super_admin:    'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30',
  admin:          'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
  sales_manager:  'text-brand bg-brand/10 dark:bg-brand/15',
  sales_executive:'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
  external_caller:'text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-900/30',
  associate:      'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30',
  associate_partner:'text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-900/30',
  partner:        'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30',
  team_leader:    'text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/30',
  cluster:        'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30',
  cluster_head:   'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30',
  digital_marketing:'text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-900/30',
  hr_admin:       'text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30',
}

const defaultForm = {
  first_name: '', last_name: '', email: '',
  phone_number: '', password: '', role: 'sales_executive',
  address: '', emergency_contact_number: ''
}

// ── User Form (admin/super_admin only) ────────────────────────────────────────
function UserForm({ form, setForm, editMode, showPassword, setShowPassword, roles }) {
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Phone Number *</label>
          <div className="relative">
            <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input required={!editMode} value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value })} placeholder="9123456789" className={inputClass + " pl-9"} />
          </div>
          <p className="text-[10px] text-gray-400 mt-1">Enter 10-digit number only, without +91</p>
        </div>
        <div>
          <label className={labelClass}>Emergency Contact</label>
          <div className="relative">
            <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={form.emergency_contact_number} onChange={e => setForm({ ...form, emergency_contact_number: e.target.value })} placeholder="9876543211" className={inputClass + " pl-9"} />
          </div>
          <p className="text-[10px] text-gray-400 mt-1">Enter 10-digit number only, without +91</p>
        </div>
      </div>
      <div>
        <label className={labelClass}>Residential Address</label>
        <textarea 
          value={form.address} 
          onChange={e => setForm({ ...form, address: e.target.value })} 
          placeholder="102, Andheri West, Mumbai - 400053" 
          rows={2}
          className={inputClass + " resize-none py-2"} 
        />
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
      <CustomSelect label="Role" required value={form.role} onChange={val => setForm({ ...form, role: val })} options={roles} />
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
  const { list, roles, pagination, loading, actionLoading, actionError } = useSelector(s => s.users)
  const { user: currentUser } = useSelector(s => s.auth)

  const isSalesManager = currentUser?.role === 'sales_manager'
  const canManage      = ['super_admin', 'admin'].includes(currentUser?.role)
  const isAdminUser    = ['admin', 'super_admin'].includes(currentUser?.role)
  const perms = useModulePermissions('users')
  // sales_manager can assign but cannot create/edit/delete
  const canAssign      = canManage || isSalesManager

  const [showModal,       setShowModal]       = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [userToDelete,    setUserToDelete]    = useState(null)
  const [editMode,        setEditMode]        = useState(false)
  const [selectedUser,    setSelectedUser]    = useState(null)
  const [assignTarget,    setAssignTarget]    = useState(null)
  const [filterRole,      setFilterRole]      = useState('')
  const [success,         setSuccess]         = useState('')
  const [assignSuccess,   setAssignSuccess]   = useState('')
  const [showPassword,    setShowPassword]    = useState(false)
  const [exporting,       setExporting]       = useState(false)
  const [form,            setForm]            = useState(defaultForm)
  const [page,            setPage]            = useState(1)
  const [openMenuUserId,  setOpenMenuUserId]  = useState(null)
  const menuRef = useRef(null)

  useEffect(() => {
    dispatch(fetchRoles())
  }, [dispatch])

  // sales_manager: API already scopes to their team; fetch without is_active to get all
  useEffect(() => {
    dispatch(fetchUsers({ role: filterRole, page, per_page: 10 }))
  }, [dispatch, filterRole, page])

  useEffect(() => {
    if (!showModal)       { dispatch(clearUserError()); setSuccess('');       setShowPassword(false) }
  }, [showModal, dispatch])

  useEffect(() => {
    if (!showAssignModal) { dispatch(clearUserError()); setAssignSuccess('') }
  }, [showAssignModal, dispatch])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuUserId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Active sales managers — for assign dropdown
  const salesManagers = list.filter(u => u.role === 'sales_manager' && u.is_active)

  // For sales_manager: only show sales_executive and external_caller
  const visibleList = isSalesManager
    ? list.filter(u => ['sales_executive', 'external_caller'].includes(u.role))
    : list

  const activeUsers = visibleList.filter(u => u.is_active)

  // Role filter options — sales_manager doesn't need the filter (always scoped)
  const roleFilterOptions = [
    { value: '', label: 'All Roles' },
    ...roles,
  ]

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditMode(true); setSelectedUser(user)
      setForm({ 
        first_name: user.first_name, 
        last_name: user.last_name, 
        email: user.email, 
        phone_number: user.phone_number || '', 
        role: user.role, 
        password: '',
        address: user.address || '',
        emergency_contact_number: user.emergency_contact_number || ''
      })
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

  const handleDelete = async () => {
    if (!userToDelete) return
    const result = await dispatch(deleteUser(userToDelete.id))
    if (deleteUser.fulfilled.match(result)) {
      dispatch(fetchUsers({ role: filterRole }))
    }
    setShowDeleteModal(false)
    setUserToDelete(null)
  }

  const confirmDelete = (user) => {
    setUserToDelete(user)
    setShowDeleteModal(true)
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

  const renderRows = (users) => users.map((user, userIdx) => {
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
        <td className="py-3 px-4" ref={openMenuUserId === user.id ? menuRef : null}>
          <div className="flex items-center justify-end">
            <div className="relative">
              <button onClick={() => setOpenMenuUserId(openMenuUserId === user.id ? null : user.id)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand hover:bg-brand/10 transition-colors">
                <MoreVertical size={13} />
              </button>
              {openMenuUserId === user.id && (
                <div className={`absolute right-0 w-48 max-h-64 overflow-y-auto bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg z-50 py-1 ${userIdx >= users.length - 2 ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
                  {/* Assign — admin/super_admin: always show for exec/caller, sales_manager: only if not already assigned */}
                  {canAssign && isAssignable(user) && (!isSalesManager || !user.manager_id) && (
                    <button onClick={() => { handleOpenAssignModal(user); setOpenMenuUserId(null)}}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <UserCheck size={14} />
                      Assign Manager
                    </button>
                  )}
                  {/* Edit — admin/super_admin only */}
                  {perms.edit && (
                    <button onClick={() => { handleOpenModal(user); setOpenMenuUserId(null)}}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <Edit2 size={14} />
                      Edit
                    </button>
                  )}
                  {/* Deactivate — admin/super_admin only */}
                  {perms.delete && user.id !== currentUser?.id && user.role !== 'super_admin' && user.is_active && (
                    <button onClick={() => { confirmDelete(user); setOpenMenuUserId(null)}}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <Trash2 size={14} />
                      Deactivate
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </td>
      </tr>
    )
  })

  const TableSection = ({ users, label, dot }) => (
    <div className="bg-card text-card-foreground border border-gray-200 dark:border-gray-700 rounded-2xl shadow-md shadow-gray-300/50 dark:shadow-gray-900/50">
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
            onClick={() => dispatch(fetchUsers({ role: filterRole, page, per_page: 10 }))}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 text-gray-400 hover:text-brand hover:border-brand transition-colors shadow-sm bg-white dark:bg-[#1a1a1a]">
            <RefreshCw size={14} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {/* {isAdminUser && (
            <Button variant="outline" size="sm" icon={Download} loading={exporting} disabled={exporting} onClick={() => setShowExportModal(true)}>
              Export
            </Button>
          )} */}
          {/* New User button — admin/super_admin only, NOT sales_manager */}
          {perms.create && (
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
        <TableSection users={activeUsers} label="Active" dot="bg-green-500" />
      )}

      {/* Pagination */}
      {pagination?.total_pages > 1 && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Page {page} of {pagination.total_pages} · {pagination.total} total</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
            <Button size="sm" variant="outline" disabled={page >= pagination.total_pages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Register / Edit Modal — admin/super_admin only */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editMode ? 'Edit User' : 'Register New User'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <UserForm form={form} setForm={setForm} editMode={editMode} showPassword={showPassword} setShowPassword={setShowPassword} roles={roles} />
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

      <ConfirmModal 
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Deactivate User"
        message={`Are you sure you want to deactivate ${userToDelete?.first_name} ${userToDelete?.last_name}? This user will no longer be able to login.`}
        confirmText="Deactivate"
        loading={actionLoading}
      />
    </div>
  )
}