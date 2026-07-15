import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Calendar, CalendarCheck, CheckCircle2, ChevronLeft, ChevronRight, Clock, FileText, Loader2, Plus, X } from 'lucide-react'
import { fetchLeaves, fetchTodayLeaves, applyLeave, markLeave, clearLeaveError } from '../store/leaveSlice'
import { fetchUsers } from '../store/userSlice'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import CustomSelect from '../components/ui/CustomSelect'

const ADMIN_ROLES = ['super_admin', 'admin']
const LEAVE_TYPE_OPTIONS = [
  { value: 'full_day', label: 'Full Day' },
  { value: 'half_day', label: 'Half Day' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'casual', label: 'Casual Leave' },
  { value: 'unpaid', label: 'Unpaid Leave' },
]

const fmtDate = (d) => {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function ApplyLeaveModal({ isOpen, onClose, onSuccess, isLoading }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [leaveType, setLeaveType] = useState('full_day')
  const [reason, setReason] = useState('')

  const dispatch = useDispatch()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const res = await dispatch(applyLeave({ date, leave_type: leaveType, reason }))
    if (applyLeave.fulfilled.match(res)) {
      onSuccess()
      setDate(new Date().toISOString().split('T')[0])
      setLeaveType('full_day')
      setReason('')
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Apply for Leave">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-brand text-gray-700 dark:text-gray-200"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Leave Type</label>
          <CustomSelect
            options={LEAVE_TYPE_OPTIONS}
            value={leaveType}
            onChange={setLeaveType}
            placeholder="Select leave type"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for leave"
            rows={3}
            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-brand text-gray-700 dark:text-gray-200 resize-none"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" loading={isLoading} disabled={isLoading}>Apply</Button>
        </div>
      </form>
    </Modal>
  )
}

function MarkLeaveModal({ isOpen, onClose, onSuccess, isLoading, users }) {
  const [userId, setUserId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [leaveType, setLeaveType] = useState('full_day')
  const [reason, setReason] = useState('')

  const dispatch = useDispatch()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const res = await dispatch(markLeave({ user_id: userId, date, leave_type: leaveType, reason }))
    if (markLeave.fulfilled.match(res)) {
      onSuccess()
      setUserId('')
      setDate(new Date().toISOString().split('T')[0])
      setLeaveType('full_day')
      setReason('')
      onClose()
    }
  }

  const userOptions = (users || []).map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name || ''}` }))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mark Leave for User">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">User</label>
          <CustomSelect
            options={userOptions}
            value={userId}
            onChange={setUserId}
            placeholder="Select user"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-brand text-gray-700 dark:text-gray-200"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Leave Type</label>
          <CustomSelect
            options={LEAVE_TYPE_OPTIONS}
            value={leaveType}
            onChange={setLeaveType}
            placeholder="Select leave type"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for leave"
            rows={3}
            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-brand text-gray-700 dark:text-gray-200 resize-none"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" loading={isLoading} disabled={isLoading}>Mark Leave</Button>
        </div>
      </form>
    </Modal>
  )
}

function LeaveList({ title, leaves, loading, emptyText }) {
  const safeLeaves = Array.isArray(leaves) ? leaves : []

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-md overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
        <h3 className="font-display text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>

      {loading ? (
        <div className="p-8 flex justify-center"><Loader2 size={20} className="animate-spin text-brand" /></div>
      ) : safeLeaves.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">{emptyText}</div>
      ) : (
        <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
          {safeLeaves.map(leave => (
            <div key={leave.id} className="px-6 py-4 hover:bg-gray-50/60 dark:hover:bg-gray-800/20 transition-colors">
              <div className="flex flex-wrap gap-4 items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {leave.full_name || (leave.user ? `${leave.user.first_name} ${leave.user.last_name || ''}` : 'User')}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                      {String(leave.leave_type || 'full_day').replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    {leave.email && <span>✉️ {leave.email}</span>}
                    {leave.phone_number && <span>📞 {leave.phone_number}</span>}
                    {leave.role && <span>👤 {leave.role.replace('_', ' ')}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-200">{fmtDate(leave.date)}</div>
                </div>
              </div>
              {leave.reason && (
                <div className="mt-3 pl-2 border-l-2 border-indigo-200 dark:border-indigo-800">
                  <p className="text-sm text-gray-600 dark:text-gray-300 italic">{leave.reason}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Leaves() {
  const dispatch = useDispatch()
  const { user: currentUser } = useSelector(s => s.auth)
  const { list, todayLeaves, loading, todayLoading, pagination, actionLoading, actionError } = useSelector(s => s.leaves)
  const { teamTree: users = [] } = useSelector(s => s.users)
  const isAdmin = ADMIN_ROLES.includes(currentUser?.role)

  const [activeTab, setActiveTab] = useState(isAdmin ? 'today' : 'my')
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [showMarkModal, setShowMarkModal] = useState(false)

  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    user_id: isAdmin ? '' : currentUser?.id,
    leave_type: '',
  })

  useEffect(() => {
    dispatch(fetchUsers())
  }, [dispatch])

  useEffect(() => {
    if (isAdmin) {
      dispatch(fetchTodayLeaves())
    }
  }, [dispatch, isAdmin])

  useEffect(() => {
    const params = {
      page,
      per_page: 30,
      ...filters,
    }
    if (isAdmin && activeTab === 'today') return
    dispatch(fetchLeaves(params))
  }, [dispatch, page, filters, isAdmin, activeTab])

  const handleRefresh = () => {
    if (isAdmin) {
      dispatch(fetchTodayLeaves())
    }
    dispatch(fetchLeaves({
      page,
      per_page: 30,
      ...filters,
    }))
  }

  const userOptions = (users || []).map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name || ''}` }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Leave Management</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Apply and track leaves</p>
        </div>
        <div className="flex gap-2">
          {!isAdmin && (
            <Button icon={Plus} onClick={() => setShowApplyModal(true)}>Apply Leave</Button>
          )}
          {isAdmin && (
            <Button icon={Plus} onClick={() => setShowMarkModal(true)}>Mark Leave</Button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5">
          <X size={13} className="text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-600 dark:text-red-400">{actionError}</p>
        </div>
      )}

      {isAdmin ? (
        <div className="space-y-6">
          <div className="flex gap-1.5 p-1 bg-gray-100 dark:bg-gray-800/60 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('today')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'today' ? 'bg-white dark:bg-[#1a1a1a] text-brand shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              Today's Leaves
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'all' ? 'bg-white dark:bg-[#1a1a1a] text-brand shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              All Leaves
            </button>
          </div>

          {activeTab === 'today' && (
            <LeaveList
              title="Today's Leaves"
              leaves={todayLeaves}
              loading={todayLoading}
              emptyText="No leaves today"
            />
          )}

          {activeTab === 'all' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">From</label>
                  <input
                    type="date"
                    value={filters.from}
                    onChange={(e) => setFilters(f => ({ ...f, from: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-brand text-gray-700 dark:text-gray-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">To</label>
                  <input
                    type="date"
                    value={filters.to}
                    onChange={(e) => setFilters(f => ({ ...f, to: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-brand text-gray-700 dark:text-gray-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">User</label>
                  <CustomSelect
                    options={[{ value: '', label: 'All Users' }, ...userOptions]}
                    value={filters.user_id}
                    onChange={(v) => setFilters(f => ({ ...f, user_id: v }))}
                    placeholder="All Users"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Leave Type</label>
                  <CustomSelect
                    options={[{ value: '', label: 'All Types' }, ...LEAVE_TYPE_OPTIONS]}
                    value={filters.leave_type}
                    onChange={(v) => setFilters(f => ({ ...f, leave_type: v }))}
                    placeholder="All Types"
                  />
                </div>
              </div>

              <LeaveList
                title="All Leaves"
                leaves={list}
                loading={loading}
                emptyText="No leaves found"
              />

              {pagination && pagination.total_pages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-xs text-gray-400">
                    Showing {list.length} of {pagination.total} records · Page {page} of {pagination.total_pages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      icon={ChevronLeft}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(p => Math.min(pagination.total_pages, p + 1))}
                      disabled={page >= pagination.total_pages}
                      icon={ChevronRight}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <LeaveList
          title="My Leaves"
          leaves={list}
          loading={loading}
          emptyText="No leaves found"
        />
      )}

      <ApplyLeaveModal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        onSuccess={handleRefresh}
        isLoading={actionLoading}
      />

      <MarkLeaveModal
        isOpen={showMarkModal}
        onClose={() => setShowMarkModal(false)}
        onSuccess={handleRefresh}
        isLoading={actionLoading}
        users={users}
      />
    </div>
  )
}
