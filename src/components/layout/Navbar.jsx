import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Bell, Search, Menu, LogOut, ChevronDown, UserPlus, Phone, Calendar, RefreshCw, CheckCheck } from 'lucide-react'
import { logout } from '../../store/authSlice'
import { fetchNotifications, markAllRead } from '../../store/notificationSlice'
import Avatar from '../ui/Avatar'


const pageTitles = {
  '/dashboard': 'Dashboard',
  '/leads': 'Leads',
  '/site-visits': 'Site Visits',
  '/follow-ups': 'Follow-Ups',
  '/projects': 'Projects',
  '/team': 'Team',
  '/users': 'User Management',
  '/notifications': 'Notifications',
}

const typeConfig = {
  lead_assigned:   { icon: UserPlus,  color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
  task_created:    { icon: CheckCheck,color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' },
  task_reminder:   { icon: Bell,      color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' },
  site_visit:      { icon: Calendar,  color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400' },
  visit_scheduled: { icon: Calendar,  color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400' },
  status_change:   { icon: RefreshCw, color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' },
  followup_reminder:{ icon: Phone,    color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' },
  general:         { icon: Bell,      color: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400' },
}

export default function Navbar({ collapsed, setMobileOpen }) {
  const { user } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  const { list: notifications, unreadCount } = useSelector((state) => state.notifications)

  useEffect(() => {
    dispatch(fetchNotifications({ page: 1, per_page: 10 }))
  }, [dispatch])

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  const title = pageTitles[location.pathname] || (location.pathname.startsWith('/leads/') ? 'Lead Detail' : 'CRM')

  return (
    <header className={`fixed top-0 right-0 z-20 h-14 bg-white dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-800 shadow-sm flex items-center px-4 gap-3 transition-all duration-300
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

      {/* Search */}
      <div className={`items-center gap-2 ${showSearch ? 'flex' : 'hidden sm:flex'}`}>
        {showSearch ? (
          <input
            autoFocus
            onBlur={() => setShowSearch(false)}
            placeholder="Search leads, projects..."
            className="w-48 h-8 px-3 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg outline-none focus:border-brand dark:focus:border-brand transition-colors"
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

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => { 
            const willShow = !showNotifications;
            setShowNotifications(willShow); 
            setShowUserMenu(false);
            if (willShow && unreadCount > 0) {
              dispatch(markAllRead());
            }
          }}
          className="relative w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {showNotifications && (
          <div className="absolute right-0 top-full mt-2 w-[340px] bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 rounded-2xl py-2 z-50 animate-scale-in">
            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center mb-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-xs bg-brand/10 text-brand px-2 py-0.5 rounded-full font-medium">{unreadCount} new</span>
              )}
            </div>
            <div className="max-h-[320px] overflow-y-auto px-2 space-y-1">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">No new notifications</div>
              ) : (
                notifications.slice(0, 5).map(notif => {
                  const conf = typeConfig[notif.type] || typeConfig.general
                  const Icon = conf.icon
                  return (
                    <div key={notif.id} className="flex items-start gap-3 p-2.5 rounded-xl transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${conf.color}`}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-sm line-clamp-2 leading-snug mb-1 text-gray-900 dark:text-gray-100 font-medium">{notif.message}</p>
                        <p className="text-[10px] text-gray-400 font-medium">
                          {notif.time || new Date(notif.created_at).toLocaleDateString()}
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
        )}
      </div>

      {/* User dropdown */}
      <div className="relative">
        <button
          onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false) }}
          className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Avatar name={user?.first_name || user?.name || 'User'} size="sm" />
          <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[100px] truncate">
            {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : (user?.name || 'User')}
          </span>
          <ChevronDown size={14} className="text-gray-400" />
        </button>

        {showUserMenu && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 rounded-xl shadow-lg py-1 z-50 animate-scale-in">
            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : (user?.name || 'User')}
              </div>
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

