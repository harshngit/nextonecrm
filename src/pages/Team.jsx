import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Shield, RefreshCw, ChevronDown, Search, TrendingUp, Users, Calendar, BookOpen } from 'lucide-react'
import { fetchUsers } from '../store/userSlice'
import ListSkeleton from '../components/loaders/ListSkeleton'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import CustomSelect from '../components/ui/CustomSelect'

const roles = [
  { value: 'sales_manager', label: 'Sales Manager' },
  { value: 'sales_executive', label: 'Sales Executive' },
  { value: 'external_caller', label: 'External Caller' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
]

const statusOptions = [
  { value: 'true', label: 'Active Only' },
  { value: 'false', label: 'Inactive Only' },
  { value: '', label: 'All Statuses' },
]

const roleColors = {
  super_admin:    'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30',
  admin:          'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
  sales_manager:  'text-brand bg-brand/10 dark:bg-brand/15',
  sales_executive:'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
  external_caller:'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
}

export default function Team() {
  const dispatch = useDispatch()
  const { list, loading } = useSelector(s => s.users)
  const { user: currentUser } = useSelector(s => s.auth)

  const [search,      setSearch]      = useState('')
  const [filterRole,  setFilterRole]  = useState('')
  const [filterActive,setFilterActive]= useState('true')

  useEffect(() => {
    dispatch(fetchUsers({ role: filterRole, is_active: filterActive }))
  }, [dispatch, filterRole, filterActive])

  // Client-side search filter (API only supports role + is_active)
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

  // Stats
  const activeCount   = list.filter(m => m.is_active).length
  const managerCount  = list.filter(m => m.role === 'sales_manager').length
  const execCount     = list.filter(m => m.role === 'sales_executive').length
  const callerCount   = list.filter(m => m.role === 'external_caller').length

  return (
    <div className="space-y-5">

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Active', value: activeCount, icon: Users, color: 'text-brand bg-brand/10' },
          { label: 'Sales Managers', value: managerCount, icon: TrendingUp, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
          { label: 'Sales Executives', value: execCount, icon: Calendar, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
          { label: 'External Callers', value: callerCount, icon: BookOpen, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border border-gray-200 dark:border-gray-700 py-6 px-4 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 hover:shadow-lg hover:shadow-gray-300/50 dark:hover:shadow-gray-900/50 transition-all duration-200">
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
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search members..."
              className="pl-9 pr-4 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand w-52 text-gray-900 dark:text-gray-100 placeholder-gray-400 shadow-sm transition-all duration-200"
            />
          </div>

          {/* Role filter */}
          <div className="w-48">
            <CustomSelect
              value={filterRole}
              onChange={val => setFilterRole(val)}
              options={[{ value: '', label: 'All Roles' }, ...roles]}
              placeholder="Filter by Role"
            />
          </div>

          {/* Active filter */}
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
          variant="outline"
          size="sm"
          className="rounded-xl border-gray-200 dark:border-gray-700 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50"
          onClick={() => dispatch(fetchUsers({ role: filterRole, is_active: filterActive }))}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* Team Table */}
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
                  {['Member', 'Email', 'Phone', 'Role', 'Status', 'Last Login'].map(h => (
                    <th key={h} className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-[#888] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0] dark:divide-[#2a2a2a]">
                {filtered.map(member => (
                  <tr key={member.id}
                    className={`hover:bg-[#f8fafc] dark:hover:bg-[#0f0f0f] transition-colors ${member.id === currentUser?.id ? 'bg-brand/3 dark:bg-brand/5' : ''}`}>
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
                            {member.is_active ? (
                              <span className="text-green-500">● Active</span>
                            ) : (
                              <span className="text-red-400">● Inactive</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-xs">{member.email}</td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-xs">{member.phone_number || '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${roleColors[member.role] || 'bg-gray-100 text-gray-600'}`}>
                        {member.role?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        label={member.is_active ? 'Active' : 'Inactive'}
                        variant={member.is_active ? 'success' : 'danger'}
                      />
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-400 dark:text-[#888]">
                      {member.last_login
                        ? new Date(member.last_login).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info note */}
      <p className="text-xs text-gray-400 dark:text-[#888] text-center">
        To add or manage team members, go to <span className="font-medium text-brand">User Management</span>
      </p>
    </div>
  )
}
