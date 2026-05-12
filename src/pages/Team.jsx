import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Shield, RefreshCw, Search, TrendingUp, Users, Calendar, BookOpen, Eye, UserCheck } from 'lucide-react'
import { fetchUsers, assignManager, clearUserError } from '../store/userSlice'
import ListSkeleton from '../components/loaders/ListSkeleton'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import CustomSelect from '../components/ui/CustomSelect'
import Modal from '../components/ui/Modal'

const allRoles = [
  { value: 'sales_manager',   label: 'Sales Manager' },
  { value: 'sales_executive', label: 'Sales Executive' },
  { value: 'external_caller', label: 'External Caller' },
  { value: 'admin',           label: 'Admin' },
  { value: 'super_admin',     label: 'Super Admin' },
]

const statusOptions = [
  { value: 'true',  label: 'Active Only' },
  { value: 'false', label: 'Inactive Only' },
  { value: '',      label: 'All Statuses' },
]

const roleColors = {
  super_admin:    'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30',
  admin:          'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
  sales_manager:  'text-brand bg-brand/10 dark:bg-brand/15',
  sales_executive:'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
  external_caller:'text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-900/30',
}

// ── Assign Manager Modal ───────────────────────────────────────────────────────
function AssignManagerModal({ isOpen, onClose, targetUser, managers, onAssign, loading, error, success, defaultManagerId }) {
  const [selectedManager, setSelectedManager] = useState('')

  useEffect(() => {
    if (isOpen) {
      // Pre-select: if sales_manager opened it → default to themselves
      // otherwise default to current manager_id of the target user
      setSelectedManager(defaultManagerId || targetUser?.manager_id || '')
    }
  }, [isOpen, targetUser, defaultManagerId])

  if (!isOpen || !targetUser) return null

  const managerOptions = managers.map(m => ({
    value: m.id,
    label: `${m.first_name} ${m.last_name}`,
  }))

  const currentMgr = managers.find(m => m.id === targetUser.manager_id)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (selectedManager) onAssign(selectedManager)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign Manager">
      <div className="space-y-4">
        {/* User card */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-800">
          <Avatar name={`${targetUser.first_name} ${targetUser.last_name}`} size="sm" />
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {targetUser.first_name} {targetUser.last_name}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${roleColors[targetUser.role]}`}>
                {targetUser.role?.replace(/_/g, ' ')}
              </span>
              <span className="text-[10px] text-gray-400">{targetUser.email}</span>
            </div>
          </div>
        </div>

        {currentMgr && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 px-1">
            <UserCheck size={13} className="text-brand" />
            Currently under:
            <span className="font-medium text-gray-700 dark:text-gray-300 ml-1">
              {currentMgr.first_name} {currentMgr.last_name}
            </span>
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
            <Button type="submit" className="flex-1" loading={loading} disabled={!selectedManager}>
              Assign Manager
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Team() {
  const navigate   = useNavigate()
  const dispatch   = useDispatch()
  const { list, loading, actionLoading, actionError } = useSelector(s => s.users)
  const { user: currentUser } = useSelector(s => s.auth)

  const isSalesManager = currentUser?.role === 'sales_manager'
  const canAssign      = ['super_admin', 'admin', 'sales_manager'].includes(currentUser?.role)

  const [search,          setSearch]          = useState('')
  const [filterRole,      setFilterRole]      = useState('')
  const [filterActive,    setFilterActive]    = useState('true')
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignTarget,    setAssignTarget]    = useState(null)
  const [assignSuccess,   setAssignSuccess]   = useState('')

  // For sales_manager: API already scopes to their team via manager_id on server
  useEffect(() => {
    dispatch(fetchUsers({ role: filterRole, is_active: filterActive }))
  }, [dispatch, filterRole, filterActive])

  useEffect(() => {
    if (!showAssignModal) { dispatch(clearUserError()); setAssignSuccess('') }
  }, [showAssignModal, dispatch])

  // Client-side search
  const filtered = list.filter(m => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      m.first_name?.toLowerCase().includes(q) ||
      m.last_name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.phone_number?.includes(q)
    )
  })

  // Sales managers from the full list — for the assign dropdown
  const salesManagers = list.filter(u => u.role === 'sales_manager' && u.is_active)

  const handleOpenAssign = (member) => {
    setAssignTarget(member)
    setAssignSuccess('')
    dispatch(clearUserError())
    setShowAssignModal(true)
  }

  const handleAssign = async (managerId) => {
    dispatch(clearUserError())
    const result = await dispatch(assignManager({ userId: assignTarget.id, managerId }))
    if (assignManager.fulfilled.match(result)) {
      setAssignSuccess('Manager assigned successfully!')
      dispatch(fetchUsers({ role: filterRole, is_active: filterActive }))
      setTimeout(() => setShowAssignModal(false), 800)
    }
  }

  // Stats — always based on full list
  const activeCount  = list.filter(m => m.is_active).length
  const managerCount = list.filter(m => m.role === 'sales_manager').length
  const execCount    = list.filter(m => m.role === 'sales_executive').length
  const callerCount  = list.filter(m => m.role === 'external_caller').length

  // Columns: sales_manager sees no Manager column, no Assign
  // admin/super_admin see Manager column + Assign button
  const showManagerCol = !isSalesManager
  const showAssignBtn  = !isSalesManager && canAssign

  const isAssignable = (member) =>
    ['sales_executive', 'external_caller'].includes(member.role) && member.is_active

  return (
    <div className="space-y-5">

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Active',     value: activeCount,  icon: Users,      color: 'text-brand bg-brand/10' },
          { label: 'Sales Managers',   value: managerCount, icon: TrendingUp,  color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
          { label: 'Sales Executives', value: execCount,    icon: Calendar,    color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
          { label: 'External Callers', value: callerCount,  icon: BookOpen,    color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/20' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border border-gray-200 dark:border-gray-700 py-6 px-4 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 hover:shadow-lg transition-all duration-200">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon size={18} />
              </div>
              <div>
                <div className="text-2xl font-display font-bold text-gray-900 dark:text-white">{value}</div>
                <div className="text-xs text-gray-400 dark:text-[#888]">{label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search members..."
              className="pl-9 pr-4 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand w-52 text-gray-900 dark:text-gray-100 placeholder-gray-400 shadow-sm transition-all duration-200"
            />
          </div>

          {/* Role filter — hidden for sales_manager (they only see their own team) */}
          {!isSalesManager && (
            <div className="w-48">
              <CustomSelect
                value={filterRole}
                onChange={val => setFilterRole(val)}
                options={[{ value: '', label: 'All Roles' }, ...allRoles]}
                placeholder="Filter by Role"
              />
            </div>
          )}

          <div className="w-44">
            <CustomSelect
              value={filterActive}
              onChange={val => setFilterActive(val)}
              options={statusOptions}
              placeholder="Filter Status"
            />
          </div>
        </div>

        <Button
          variant="outline" size="sm"
          className="rounded-xl border-gray-200 dark:border-gray-700 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50"
          onClick={() => dispatch(fetchUsers({ role: filterRole, is_active: filterActive }))}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card text-card-foreground border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-md shadow-gray-300/50 dark:shadow-gray-900/50">
        {loading ? (
          <div className="p-4"><ListSkeleton rows={6} /></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400 dark:text-[#888]">
            <div className="text-4xl mb-3">👥</div>
            <p className="font-medium">No team members found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e2e8f0] dark:border-[#2a2a2a] bg-[#f8fafc] dark:bg-[#0f0f0f]">
                  {[
                    'Member', 'Email', 'Phone', 'Role',
                    ...(showManagerCol ? ['Manager'] : []),
                    'Status', 'Last Login', 'Actions',
                  ].map(h => (
                    <th key={h} className={`py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-[#888] uppercase tracking-wide whitespace-nowrap ${h === 'Actions' ? 'text-right' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0] dark:divide-[#2a2a2a]">
                {filtered.map(member => {
                  const manager = list.find(m => m.id === member.manager_id)
                  return (
                    <tr key={member.id}
                      className={`hover:bg-[#f8fafc] dark:hover:bg-[#0f0f0f] transition-colors ${member.id === currentUser?.id ? 'bg-brand/3 dark:bg-brand/5' : ''}`}>

                      {/* Member */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar name={`${member.first_name} ${member.last_name}`} size="sm" />
                            {member.id === currentUser?.id && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-brand rounded-full border-2 border-white dark:border-[#1a1a1a]" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                              {member.first_name} {member.last_name}
                              {member.role === 'super_admin' && <Shield size={11} className="text-purple-500" />}
                              {member.id === currentUser?.id && (
                                <span className="text-[9px] px-1.5 py-0.5 bg-brand/10 text-brand rounded-full font-bold uppercase tracking-wide">You</span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              {member.is_active
                                ? <span className="text-green-500">● Active</span>
                                : <span className="text-red-400">● Inactive</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-xs">{member.email}</td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-xs">{member.phone_number || '—'}</td>

                      {/* Role */}
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${roleColors[member.role] || 'bg-gray-100 text-gray-600'}`}>
                          {member.role?.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Manager col — only for admin/super_admin */}
                      {showManagerCol && (
                        <td className="py-3 px-4">
                          {isAssignable(member) ? (
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
                        <Badge label={member.is_active ? 'Active' : 'Inactive'} variant={member.is_active ? 'success' : 'danger'} />
                      </td>

                      {/* Last Login */}
                      <td className="py-3 px-4 text-xs text-gray-400 dark:text-[#888]">
                        {member.last_login
                          ? new Date(member.last_login).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                          : 'Never'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Assign — only for admin/super_admin, only for assignable roles */}
                          {showAssignBtn && isAssignable(member) && (
                            <button
                              onClick={() => handleOpenAssign(member)}
                              title="Assign Manager"
                              className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-brand hover:bg-brand/10 transition-all hover:scale-110 active:scale-95">
                              <UserCheck size={15} />
                            </button>
                          )}
                          {/* View — always visible */}
                          <button
                            onClick={() => navigate(`/team/${member.id}`)}
                            title="View Details"
                            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-brand hover:bg-brand/10 transition-all hover:scale-110 active:scale-95">
                            <Eye size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!isSalesManager && (
        <p className="text-xs text-gray-400 dark:text-[#888] text-center">
          To add or manage team members, go to <span className="font-medium text-brand">User Management</span>
        </p>
      )}

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
    </div>
  )
}