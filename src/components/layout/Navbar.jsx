import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Sun, Moon, Bell, Search, Menu, LogOut, ChevronDown } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { logout } from '../../store/authSlice'
import Avatar from '../ui/Avatar'
import { mockNotifications } from '../../mockData'

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

export default function Navbar({ collapsed, setMobileOpen }) {
  const { isDark, toggleTheme } = useTheme()
  const { user } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  const unreadCount = mockNotifications.filter(n => !n.read).length
  const title = pageTitles[location.pathname] || (location.pathname.startsWith('/leads/') ? 'Lead Detail' : 'CRM')

  return (
    <header className={`fixed top-0 right-0 z-20 h-14 bg-white dark:bg-[#1a1a1a] border-b border-[#e0d8ce] dark:border-[#2a2a2a] flex items-center px-4 gap-3 transition-all duration-300
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
            className="w-48 h-8 px-3 text-sm bg-gray-100 dark:bg-gray-800 border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-lg outline-none focus:border-brand dark:focus:border-brand transition-colors"
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
      <button
        onClick={() => navigate('/notifications')}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* User dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Avatar name={user?.first_name} size="sm" />
          <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[100px] truncate">{user?.first_name} {user?.last_name}</span>
          <ChevronDown size={14} className="text-gray-400" />
        </button>

        {showUserMenu && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1a1a1a] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-xl shadow-lg py-1 z-50 animate-scale-in">
            <div className="px-4 py-2 border-b border-[#e0d8ce] dark:border-[#2a2a2a]">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.first_name} {user?.last_name}</div>
              
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
