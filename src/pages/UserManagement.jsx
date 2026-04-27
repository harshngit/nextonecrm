import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Edit2, Trash2, Shield, ChevronDown, UserPlus, Mail, Phone, Lock, RefreshCw, Eye, EyeOff } from 'lucide-react'
import { fetchUsers, createUser, updateUser, deleteUser, updateUserRole, clearUserError } from '../store/userSlice'
import ListSkeleton from '../components/loaders/ListSkeleton'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'
import Modal from '../components/ui/Modal'

const roles = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'sales_manager', label: 'Sales Manager' },
  { value: 'sales_executive', label: 'Sales Executive' },
  { value: 'external_caller', label: 'External Caller' },
]

const roleColors = {
  super_admin: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30',
  admin: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
  sales_manager: 'text-brand bg-brand/10 dark:bg-brand/15',
  sales_executive: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
  external_caller: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30',
}

const defaultForm = {
  first_name: '', last_name: '', email: '',
  phone_number: '', password: '', role: 'sales_executive',
}

function UserForm({ form, setForm, editMode, showPassword, setShowPassword }) {
  const inputClass = "w-full px-3 py-2 text-sm bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm transition-colors disabled:opacity-50"
  const labelClass = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>First Name *</label>
          <input required value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })}
            placeholder="Priya"
            className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Last Name *</label>
          <input required value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })}
            placeholder="Mehta"
            className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Email *</label>
        <div className="relative">
          <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input required type="email" disabled={editMode} value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            placeholder="priya@nextonerealty.com"
            className={inputClass + " pl-9"} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Phone Number *</label>
        <div className="relative">
          <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input required={!editMode} value={form.phone_number}
            onChange={e => setForm({ ...form, phone_number: e.target.value })}
            placeholder="+919123456789"
            className={inputClass + " pl-9"} />
        </div>
      </div>

      {!editMode && (
        <div>
          <label className={labelClass}>Password *</label>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input required type={showPassword ? 'text' : 'password'} value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="Min 8 characters" minLength={8}
              className={inputClass + " pl-9 pr-10"} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
      )}

      <div>
        <label className={labelClass}>Role *</label>
        <div className="relative">
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
            className={inputClass + " appearance-none"}>
            {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>
    </div>
  )
}

export default function UserManagement() {
  const dispatch = useDispatch()
  const { list, loading, actionLoading, actionError } = useSelector(s => s.users)
  const { user: currentUser } = useSelector(s => s.auth)

  const [showModal, setShowModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [filterRole, setFilterRole] = useState('')
  const [filterActive, setFilterActive] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState(defaultForm)

  useEffect(() => {
    dispatch(fetchUsers({ role: filterRole, is_active: filterActive }))
  }, [dispatch, filterRole, filterActive])

  useEffect(() => {
    if (!showModal) { dispatch(clearUserError()); setSuccess(''); setShowPassword(false) }
  }, [showModal, dispatch])

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditMode(true); setSelectedUser(user)
      setForm({ first_name: user.first_name, last_name: user.last_name, email: user.email, phone_number: user.phone_number || '', role: user.role, password: '' })
    } else {
      setEditMode(false); setSelectedUser(null); setForm(defaultForm)
    }
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); dispatch(clearUserError())
    if (editMode) {
      const { email, password, ...updateData } = form
      const result = await dispatch(updateUser({ id: selectedUser.id, userData: updateData }))
      if (updateUser.fulfilled.match(result)) {
        if (form.role !== selectedUser.role) await dispatch(updateUserRole({ id: selectedUser.id, role: form.role }))
        setSuccess('User updated successfully!')
        dispatch(fetchUsers({ role: filterRole, is_active: filterActive }))
        setTimeout(() => setShowModal(false), 800)
      }
    } else {
      const result = await dispatch(createUser(form))
      if (createUser.fulfilled.match(result)) {
        setSuccess('User registered successfully!')
        dispatch(fetchUsers({ role: filterRole, is_active: filterActive }))
        setTimeout(() => setShowModal(false), 800)
      }
    }
  }

  const handleDelete = async (user) => {
    if (window.confirm(`Deactivate ${user.first_name} ${user.last_name}?`)) {
      const result = await dispatch(deleteUser(user.id))
      if (deleteUser.fulfilled.match(result)) dispatch(fetchUsers({ role: filterRole, is_active: filterActive }))
    }
  }

  const canManage = ['super_admin', 'admin'].includes(currentUser?.role)

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1">
          <div className="relative">
            <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 rounded-xl outline-none focus:border-brand text-gray-700 dark:text-gray-300 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50">
              <option value="">All Roles</option>
              {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={filterActive} onChange={e => setFilterActive(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 rounded-xl outline-none focus:border-brand text-gray-700 dark:text-gray-300 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50">
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <button onClick={() => dispatch(fetchUsers({ role: filterRole, is_active: filterActive }))}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 text-gray-400 hover:text-brand hover:border-brand transition-colors shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 bg-white dark:bg-[#1a1a1a]">
            <RefreshCw size={14} />
          </button>
        </div>
        {canManage && <Button icon={UserPlus} onClick={() => handleOpenModal()}>New User</Button>}
      </div>

      <div className="text-sm text-gray-500 dark:text-[#888]">
        Showing <span className="font-semibold text-gray-900 dark:text-white">{list.length}</span> users
      </div>

      {/* Table */}
      <div className="bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 rounded-2xl overflow-hidden shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 hover:shadow-lg hover:shadow-gray-300/50 dark:hover:shadow-gray-900/50 transition-all duration-200">
        {loading ? <div className="p-4"><ListSkeleton rows={5} /></div>
          : list.length === 0 ? (
            <div className="py-16 text-center text-gray-400 dark:text-[#888]">
              <div className="text-4xl mb-3">👥</div>
              <p className="font-medium">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0f0f0f]">
                    {['User', 'Email', 'Phone', 'Role', 'Status', ...(canManage ? ['Actions'] : [])].map(h => (
                      <th key={h} className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-[#888] uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {list.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-[#0f0f0f] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={`${user.first_name} ${user.last_name}`} size="sm" />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1">
                              {user.first_name} {user.last_name}
                              {user.role === 'super_admin' && <Shield size={12} className="text-purple-500" />}
                            </div>
                            <div className="text-xs text-gray-400">
                              {user.last_login ? `Last: ${new Date(user.last_login).toLocaleDateString()}` : 'Never logged in'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-xs">{user.email}</td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-xs">{user.phone_number || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${roleColors[user.role] || 'bg-gray-100 text-gray-600'}`}>
                          {user.role?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge label={user.is_active ? 'Active' : 'Inactive'} variant={user.is_active ? 'success' : 'danger'} />
                      </td>
                      {canManage && (
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleOpenModal(user)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                              <Edit2 size={13} />
                            </button>
                            {user.id !== currentUser?.id && user.role !== 'super_admin' && user.is_active && (
                              <button onClick={() => handleDelete(user)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editMode ? 'Edit User' : 'Register New User'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <UserForm
            form={form}
            setForm={setForm}
            editMode={editMode}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
          />

          {success && <p className="text-center text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 py-2 rounded-xl">{success}</p>}
          {actionError && <p className="text-center text-xs text-red-500 bg-red-50 dark:bg-red-900/20 py-2 rounded-xl">{actionError}</p>}

          <div className="pt-2 flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={actionLoading}>{editMode ? 'Update User' : 'Register User'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
