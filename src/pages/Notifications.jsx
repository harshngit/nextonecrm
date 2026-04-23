import { useState, useEffect } from 'react'
import { UserPlus, Phone, Calendar, RefreshCw, CheckCheck } from 'lucide-react'
import Button from '../components/ui/Button'
import { mockNotifications } from '../mockData'

const notifIcons = {
  lead_assigned: { icon: UserPlus, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
  followup_reminder: { icon: Phone, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' },
  site_visit: { icon: Calendar, color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400' },
  status_change: { icon: RefreshCw, color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' },
}

export default function Notifications() {
  const [notifs, setNotifs] = useState(mockNotifications)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // No artificial delays
  }, [])

  const markAllRead = () => setNotifs(notifs.map(n => ({ ...n, read: true })))
  const markRead = (id) => setNotifs(notifs.map(n => n.id === id ? { ...n, read: true } : n))

  const groups = [
    { label: 'Today', key: 'today', items: notifs.filter(n => n.date === 'today') },
    { label: 'Yesterday', key: 'yesterday', items: notifs.filter(n => n.date === 'yesterday') },
    { label: 'This Week', key: 'week', items: notifs.filter(n => n.date === 'week') },
  ]

  const unreadCount = notifs.filter(n => !n.read).length

  return (
    <div className="max-w-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-brand text-white text-xs font-bold rounded-full">{unreadCount} unread</span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button size="sm" variant="ghost" icon={CheckCheck} onClick={markAllRead}>Mark all read</Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-4 bg-white dark:bg-[#1a1a1a] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-xl animate-pulse">
              <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-1/3 rounded bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        groups.map(group => group.items.length > 0 && (
          <div key={group.key}>
            <h3 className="text-xs font-semibold text-gray-400 dark:text-[#888] uppercase tracking-wider mb-2 px-1">{group.label}</h3>
            <div className="space-y-1.5">
              {group.items.map(notif => {
                const { icon: Icon, color } = notifIcons[notif.type] || { icon: RefreshCw, color: 'bg-gray-100 dark:bg-gray-800 text-gray-500' }
                return (
                  <div
                    key={notif.id}
                    onClick={() => markRead(notif.id)}
                    className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all group
                      ${notif.read
                        ? 'bg-white dark:bg-[#1a1a1a] border-[#e0d8ce] dark:border-[#2a2a2a]'
                        : 'bg-brand/5 dark:bg-brand/10 border-brand/20 dark:border-brand/20'
                      } hover:border-brand/30 dark:hover:border-brand/30`}
                  >
                    <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${notif.read ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100 font-medium'}`}>
                        {notif.message}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-[#888] mt-0.5">{notif.time}</p>
                    </div>
                    {!notif.read && (
                      <div className="w-2 h-2 rounded-full bg-brand flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}

      {!loading && notifs.length === 0 && (
        <div className="text-center py-20 text-gray-400 dark:text-[#888]">
          <div className="text-4xl mb-3">🔔</div>
          <p className="font-medium">No notifications</p>
          <p className="text-sm">You're all caught up!</p>
        </div>
      )}
    </div>
  )
}
