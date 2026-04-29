import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  UserPlus, Phone, Calendar, RefreshCw, CheckCheck,
  Trash2, Bell, BellOff, ChevronDown, X
} from 'lucide-react'
import {
  fetchNotifications, markOneRead, markAllRead,
  deleteNotification, fetchUnreadCount,
} from '../store/notificationSlice'
import Button from '../components/ui/Button'
import ListSkeleton from '../components/loaders/ListSkeleton'

const typeConfig = {
  lead_assigned:   { icon: UserPlus,  color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',   label: 'Lead Assigned' },
  task_created:    { icon: CheckCheck,color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400', label: 'Task' },
  task_reminder:   { icon: Bell,      color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400', label: 'Reminder' },
  visit_scheduled: { icon: Calendar,  color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',   label: 'Site Visit' },
  visit_reminder:  { icon: Calendar,  color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',   label: 'Visit Reminder' },
  status_change:   { icon: RefreshCw, color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400', label: 'Status Change' },
  followup_reminder:{ icon: Phone,    color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',   label: 'Follow-up' },
  general:         { icon: Bell,      color: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',      label: 'General' },
}

function getConfig(type) {
  return typeConfig[type] || typeConfig.general
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)   return 'Just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

function groupByDate(list) {
  const today     = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()
  const groups    = { Today: [], Yesterday: [], 'This Week': [], 'Older': [] }

  list.forEach(n => {
    const d = new Date(n.created_at).toDateString()
    if (d === today)       groups['Today'].push(n)
    else if (d === yesterday) groups['Yesterday'].push(n)
    else {
      const daysAgo = (Date.now() - new Date(n.created_at).getTime()) / 86400000
      if (daysAgo <= 7) groups['This Week'].push(n)
      else groups['Older'].push(n)
    }
  })
  return groups
}

export default function Notifications() {
  const dispatch  = useDispatch()
  const navigate  = useNavigate()
  const { list, loading, unreadCount, pagination } = useSelector(s => s.notifications)

  const [filterRead, setFilterRead] = useState('')   // '' | 'false' | 'true'
  const [filterType, setFilterType] = useState('')
  const [page,       setPage]       = useState(1)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    const params = { page, per_page: 30 }
    if (filterRead !== '') params.is_read = filterRead
    if (filterType)        params.type    = filterType
    dispatch(fetchNotifications(params))
  }, [dispatch, page, filterRead, filterType])

  const handleMarkOne = (e, id) => {
    e.stopPropagation()
    dispatch(markOneRead(id))
  }

  const handleMarkAll = () => dispatch(markAllRead())

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    setDeletingId(id)
    await dispatch(deleteNotification(id))
    setDeletingId(null)
  }

  const handleClick = (notif) => {
    if (!notif.is_read) dispatch(markOneRead(notif.id))
    // Navigate to related content
    if (notif.reference_type === 'lead' && notif.reference_id) {
      navigate(`/leads/${notif.reference_id}`)
    } else if (notif.reference_type === 'visit') {
      navigate('/site-visits')
    }
  }

  const groups = groupByDate(list)

  return (
    <div className="w-full min-h-[calc(100vh-160px)] flex flex-col space-y-4">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="px-2.5 py-1 bg-brand text-white text-xs font-bold rounded-full">
              {unreadCount} unread
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Read filter */}
          <div className="relative">
            <select value={filterRead} onChange={e => { setFilterRead(e.target.value); setPage(1) }}
              className="appearance-none pl-3 pr-8 py-1.5 text-xs bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 rounded-xl outline-none focus:border-brand text-gray-700 dark:text-gray-300">
              <option value="">All</option>
              <option value="false">Unread</option>
              <option value="true">Read</option>
            </select>
            <ChevronDown size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Type filter */}
          <div className="relative">
            <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1) }}
              className="appearance-none pl-3 pr-8 py-1.5 text-xs bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 rounded-xl outline-none focus:border-brand text-gray-700 dark:text-gray-300">
              <option value="">All Types</option>
              <option value="lead_assigned">Lead Assigned</option>
              <option value="status_change">Status Change</option>
              <option value="visit_scheduled">Site Visit</option>
              <option value="visit_reminder">Visit Reminder</option>
              <option value="task_created">Task</option>
              <option value="task_reminder">Task Reminder</option>
              <option value="followup_reminder">Follow-up</option>
              <option value="general">General</option>
            </select>
            <ChevronDown size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Refresh */}
          <button
            onClick={() => dispatch(fetchNotifications({ page, per_page: 30 }))}
            className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 text-gray-400 hover:text-brand hover:border-brand transition-colors"
          >
            <RefreshCw size={13} />
          </button>

          {/* Mark all read */}
          {unreadCount > 0 && (
            <Button size="sm" variant="outline" icon={CheckCheck} onClick={handleMarkAll}>
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col space-y-4">
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-4 bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 rounded-xl animate-pulse">
              <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3.5 w-4/5 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-1/3 rounded bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 dark:text-[#888]">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <BellOff size={28} className="opacity-50" />
          </div>
          <p className="font-medium text-gray-600 dark:text-gray-400">No notifications</p>
          <p className="text-sm mt-1">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(groups).map(([groupLabel, items]) => {
            if (items.length === 0) return null
            return (
              <div key={groupLabel}>
                <h3 className="text-xs font-semibold text-gray-400 dark:text-[#888] uppercase tracking-wider mb-2 px-1">
                  {groupLabel}
                  <span className="ml-2 text-gray-300 dark:text-[#555] normal-case font-normal">({items.length})</span>
                </h3>
                <div className="space-y-1.5">
                  {items.map(notif => {
                    const { icon: Icon, color } = getConfig(notif.type)
                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleClick(notif)}
                        className="flex items-start gap-3 p-4 rounded-xl border bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-gray-800 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 cursor-pointer transition-all group relative hover:shadow-lg hover:shadow-gray-300/50 dark:hover:shadow-gray-900/50 duration-200"
                      >
                        {/* Icon */}
                        <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <Icon size={15} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pr-8">
                          {notif.title && (
                            <p className="text-xs font-semibold text-gray-400 dark:text-[#888] uppercase tracking-wide mb-0.5">
                              {notif.title}
                            </p>
                          )}
                          <p className="text-sm leading-snug text-gray-900 dark:text-gray-100 font-medium">
                            {notif.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-xs text-gray-400 dark:text-[#888]">
                              {timeAgo(notif.created_at)}
                            </span>
                            {notif.reference_type && (
                              <>
                                <span className="text-gray-300 dark:text-[#555]">·</span>
                                <span className="text-xs text-gray-400 capitalize">{notif.reference_type}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Unread dot */}
                        {!notif.is_read && (
                          <div className="w-2 h-2 rounded-full bg-brand flex-shrink-0 mt-2" />
                        )}

                        {/* Action buttons — visible on hover */}
                        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notif.is_read && (
                            <button
                              onClick={(e) => handleMarkOne(e, notif.id)}
                              className="w-6 h-6 flex items-center justify-center rounded-lg bg-white dark:bg-[#2a2a2a] border border-[#e2e8f0] dark:border-[#3a3a3a] text-gray-400 hover:text-brand hover:border-brand transition-colors"
                              title="Mark as read"
                            >
                              <CheckCheck size={11} />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDelete(e, notif.id)}
                            className="w-6 h-6 flex items-center justify-center rounded-lg bg-white dark:bg-[#2a2a2a] border border-[#e2e8f0] dark:border-[#3a3a3a] text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors"
                            title="Delete"
                            disabled={deletingId === notif.id}
                          >
                            <X size={11} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Load more */}
          {pagination?.total_pages > 1 && page < pagination.total_pages && (
            <div className="text-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                loading={loading}
              >
                Load more
              </Button>
            </div>
          )}

          {pagination?.total > 0 && (
            <p className="text-xs text-center text-gray-400 dark:text-[#888]">
              Showing {list.length} of {pagination.total} notifications
            </p>
          )}
        </div>
      )}
      </div>
    </div>
  )
}
