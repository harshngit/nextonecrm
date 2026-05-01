import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  Bell, Search, Menu, LogOut, ChevronDown,
  UserPlus, Phone, Calendar, RefreshCw, CheckCheck,
  Plus, Users, Building2, ClipboardList, Tag,
  DollarSign, CreditCard,
} from 'lucide-react'
import { logout } from '../../store/authSlice'
import { fetchNotifications, fetchUnreadCount, markOneRead } from '../../store/notificationSlice'
import Avatar from '../ui/Avatar'

const pageTitles = {
  '/dashboard':      'Dashboard',
  '/leads':          'Leads',
  '/site-visits':    'Site Visits',
  '/follow-ups':     'Follow-Ups',
  '/projects':       'Projects',
  '/team':           'Team',
  '/users':          'User Management',
  '/notifications':  'Notifications',
  '/attendance':     'Attendance',
}

// All 21 notification types
const typeConfig = {
  lead_assigned:       { icon: UserPlus,    color: 'bg-blue-100 dark:bg-blue-900/30 text-[#0082f3] dark:text-blue-400' },
  lead_status_changed: { icon: RefreshCw,   color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-300' },
  lead_new:            { icon: UserPlus,    color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' },
  follow_up_created:   { icon: Phone,       color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' },
  follow_up_due:       { icon: Phone,       color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' },
  follow_up_overdue:   { icon: Phone,       color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' },
  follow_up_completed: { icon: CheckCheck,  color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' },
  visit_scheduled:     { icon: Calendar,    color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400' },
  visit_reminder:      { icon: Calendar,    color: 'bg-teal-50 dark:bg-teal-900/20 text-teal-500 dark:text-teal-300' },
  visit_done:          { icon: Calendar,    color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' },
  visit_cancelled:     { icon: Calendar,    color: 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400' },
  visit_rescheduled:   { icon: Calendar,    color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' },
  project_new:         { icon: Building2,   color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' },
  project_updated:     { icon: Building2,   color: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-300' },
  booking_new:         { icon: Tag,         color: 'bg-blue-100 dark:bg-blue-900/30 text-[#0082f3] dark:text-blue-400' },
  payment_received:    { icon: DollarSign,  color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' },
  commission_credited: { icon: CreditCard,  color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' },
  task_created:        { icon: CheckCheck,  color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' },
  task_reminder:       { icon: Bell,        color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
  task_completed:      { icon: CheckCheck,  color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' },
  general:             { icon: Bell,        color: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400' },
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff  = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  if (mins < 1)   return 'Just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

export default function Navbar({ collapsed, setMobileOpen }) {
  const { user }    = useSelector((state) => state.auth)
  const dispatch    = useDispatch()
  const navigate    = useNavigate()
  const location    = useLocation()

  const [showUserMenu,      setShowUserMenu]      = useState(false)
  const [showSearch,        setShowSearch]        = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showQuickActions,  setShowQuickActions]  = useState(false)

  const { list: notifications, unreadCount } = useSelector((state) => state.notifications)

  // Load first page of notifications + unread count on mount
  useEffect(() => {
    dispatch(fetchNotifications({ page: 1, per_page: 10 }))
    dispatch(fetchUnreadCount())
  }, [dispatch])

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  const handleNotifClick = (notif) => {
    if (!notif.is_read) dispatch(markOneRead(notif.id))
    setShowNotifications(false)
    if (notif.reference_type === 'lead' && notif.reference_id) navigate(`/leads/${notif.reference_id}`)
    else if (notif.reference_type === 'site_visit') navigate('/site-visits')
    else if (notif.reference_type === 'task')       navigate('/follow-ups')
    else if (notif.reference_type === 'project')    navigate('/projects')
  }

  const title = pageTitles[location.pathname]
    || (location.pathname.startsWith('/leads/') ? 'Lead Detail' : 'CRM')

  return (
    <header
      className={`fixed top-0 right-0 z-20 h-14 bg-white dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-800 shadow-sm flex items-center px-4 gap-3 transition-all duration-300
        ${collapsed ? 'lg:left-[60px]' : 'lg:left-[240px]'} left-0`}
    >
      {/* Hamburger (mobile) */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <Menu size={18} />
      </button>

      {/* Page title */}
      <h1 className="font-display font-semibold text-gray-900 dark:text-white text-lg flex-1">{title}</h1>

      {/* Quick Actions */}
      <div className="relative hidden md:block">
        <button
          onClick={() => { setShowQuickActions(!showQuickActions); setShowNotifications(false); setShowUserMenu(false) }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white rounded-xl text-sm font-medium hover:bg-brand-dark transition-all shadow-md shadow-brand/20 active:scale-95"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Quick Action</span>
          <ChevronDown size={14} className={`transition-transform duration-200 ${showQuickActions ? 'rotate-180' : ''}`} />
        </button>

        {showQuickActions && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowQuickActions(false)} />
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 shadow-xl rounded-2xl py-2 z-50 animate-scale-in">
              <div className="px-4 py-2 mb-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Creation Shortcuts</p>
              </div>
              {[
                { label: 'Add New Lead',   sub: 'Create a new prospect',    icon: Users,         color: 'bg-blue-50 dark:bg-blue-900/20 text-[#0082f3] dark:text-blue-400',            path: '/leads' },
                { label: 'New Project',    sub: 'List a new property',      icon: Building2,     color: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',     path: '/projects' },
                { label: 'Schedule Visit', sub: 'Book a site tour',         icon: Calendar,      color: 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400',             path: '/site-visits' },
                { label: 'Log Follow-up',  sub: 'Record client interaction',icon: ClipboardList, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',           path: '/follow-ups' },
              ].map((item) => (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setShowQuickActions(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>
                    <item.icon size={16} />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">{item.label}</p>
                    <p className="text-[10px] text-gray-500">{item.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Search */}
      <div className={`items-center gap-2 ${showSearch ? 'flex' : 'hidden sm:flex'}`}>
        {showSearch ? (
          <input
            autoFocus
            onBlur={() => setShowSearch(false)}
            placeholder="Search leads, projects..."
            className="w-48 h-8 px-3 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg outline-none focus:border-brand transition-colors"
          />
        ) : (
          <button
            onClick={() => setShowSearch(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Search size={16} />
          </button>
        )}
      </div>

      {/* Notifications bell */}
      <div className="relative">
        <button
          onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); setShowQuickActions(false) }}
          className="relative w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {showNotifications && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
            <div className="absolute right-0 top-full mt-2 w-[340px] bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 shadow-xl rounded-2xl py-2 z-50 animate-scale-in">
              <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center mb-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-xs bg-brand/10 text-brand px-2 py-0.5 rounded-full font-medium">{unreadCount} new</span>
                )}
              </div>

              <div className="max-h-[320px] overflow-y-auto px-2 space-y-1">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-400">No notifications yet</div>
                ) : (
                  notifications.slice(0, 6).map((notif) => {
                    const conf = typeConfig[notif.type] || typeConfig.general
                    const Icon = conf.icon
                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotifClick(notif)}
                        className={`flex items-start gap-3 p-2.5 rounded-xl transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50
                          ${!notif.is_read ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${conf.color}`}>
                          <Icon size={14} />
                        </div>
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-sm line-clamp-2 leading-snug mb-0.5 text-gray-900 dark:text-gray-100 font-medium">
                            {notif.message}
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium">
                            {timeAgo(notif.created_at)}
                          </p>
                        </div>
                        {!notif.is_read && <div className="w-2 h-2 rounded-full bg-brand mt-1.5 flex-shrink-0" />}
                      </div>
                    )
                  })
                )}
              </div>

              <div className="px-3 pt-2 mt-1 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => { setShowNotifications(false); navigate('/notifications') }}
                  className="w-full py-2 text-sm text-brand font-medium hover:bg-brand/5 rounded-xl transition-colors"
                >
                  View all notifications
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* User dropdown */}
      <div className="relative">
        <button
          onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); setShowQuickActions(false) }}
          className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Avatar name={user?.first_name || user?.name || 'User'} size="sm" />
          <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[100px] truncate">
            {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : (user?.name || 'User')}
          </span>
          <ChevronDown size={14} className="text-gray-400" />
        </button>

        {showUserMenu && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-card text-card-foreground border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 z-50 animate-scale-in">
            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : (user?.name || 'User')}
              </div>
              {user?.role && (
                <div className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-0.5">
                  {user.role.replace('_', ' ')}
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}