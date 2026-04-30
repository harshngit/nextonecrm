import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  MessageSquare, DollarSign, CreditCard, UserPlus,
  Calendar, RefreshCw, Phone, Bell, Building2,
} from 'lucide-react'

// Map activity sub_type / activity_type → icon + colours
const ACTIVITY_CONFIG = {
  // Lead activity types
  status_change:  { icon: RefreshCw,    bg: 'bg-blue-50 dark:bg-blue-900/20',    text: 'text-[#0082f3]' },
  assignment:     { icon: UserPlus,     bg: 'bg-blue-50 dark:bg-blue-900/20',    text: 'text-[#0082f3]' },
  note:           { icon: MessageSquare,bg: 'bg-gray-100 dark:bg-gray-800',      text: 'text-gray-500' },
  call:           { icon: Phone,        bg: 'bg-green-50 dark:bg-green-900/20',  text: 'text-green-600' },
  whatsapp:       { icon: MessageSquare,bg: 'bg-teal-50 dark:bg-teal-900/20',    text: 'text-teal-600' },
  meeting:        { icon: Calendar,     bg: 'bg-purple-50 dark:bg-purple-900/20',text: 'text-purple-600' },
  // Site visit types
  site_visit:     { icon: Calendar,     bg: 'bg-teal-50 dark:bg-teal-900/20',    text: 'text-teal-600' },
  scheduled:      { icon: Calendar,     bg: 'bg-teal-50 dark:bg-teal-900/20',    text: 'text-teal-600' },
  done:           { icon: Calendar,     bg: 'bg-green-50 dark:bg-green-900/20',  text: 'text-green-600' },
  cancelled:      { icon: Calendar,     bg: 'bg-red-50 dark:bg-red-900/20',      text: 'text-red-500' },
  // Booking / payment (from lead activity notes)
  booked:         { icon: MessageSquare,bg: 'bg-blue-50 dark:bg-blue-900/20',    text: 'text-[#0082f3]' },
  // Fallback
  default:        { icon: Bell,         bg: 'bg-gray-100 dark:bg-gray-800',      text: 'text-gray-500' },
}

function getConfig(subType) {
  return ACTIVITY_CONFIG[subType] || ACTIVITY_CONFIG.default
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff  = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)   return 'Just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

export default function RecentActivity() {
  const navigate  = useNavigate()
  const { recentActivity, loading } = useSelector((s) => s.dashboard)

  return (
    <div className="bg-card text-card-foreground border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-md shadow-blue-100/50 dark:shadow-blue-900/20 hover:shadow-lg hover:shadow-blue-200/50 dark:hover:shadow-blue-900/30 transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-base font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
        <button
          onClick={() => navigate('/notifications')}
          className="text-sm text-[#0082f3] hover:underline"
        >
          View All
        </button>
      </div>

      {loading.activity ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 w-3/4 bg-gray-100 dark:bg-gray-800 rounded" />
                <div className="h-2.5 w-1/2 bg-gray-100 dark:bg-gray-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : recentActivity.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-gray-400 text-sm">No recent activity</div>
      ) : (
        <div className="space-y-4">
          {recentActivity.map((activity) => {
            const { icon: Icon, bg, text } = getConfig(activity.sub_type)
            return (
              <div key={activity.id} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={16} className={text} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium line-clamp-1">
                    {activity.message}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-[#888]">
                    {[activity.lead_name, activity.project_name].filter(Boolean).join(' · ')}
                    {activity.performed_by && ` · ${activity.performed_by}`}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-[#888] mt-0.5">{timeAgo(activity.created_at)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}