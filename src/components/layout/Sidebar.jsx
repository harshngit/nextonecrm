import { NavLink, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  LayoutDashboard, Users, CalendarCheck, PhoneCall,
  Building2, UserCog, Bell, LogOut, ChevronLeft, ChevronRight,
  X, Settings, Clock, Phone,
} from 'lucide-react'
import { logout } from '../../store/authSlice'
import Avatar from '../ui/Avatar'
import logo from '../../asset/image.png'

const navItems = [
  { path: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard, roles: ['super_admin', 'admin', 'sales_manager', 'sales_executive', 'external_caller'] },
  { path: '/projects',     label: 'Projects',     icon: Building2,       roles: ['super_admin', 'admin'] },
  { path: '/leads',        label: 'Leads',        icon: Users,           roles: ['super_admin', 'admin', 'sales_manager', 'sales_executive', 'external_caller'] },
  { path: '/follow-ups',   label: 'Follow-Ups',   icon: PhoneCall,       roles: ['super_admin', 'admin', 'sales_manager', 'sales_executive', 'external_caller'] },
  { path: '/site-visits',  label: 'Site Visits',  icon: CalendarCheck,   roles: ['super_admin', 'admin', 'sales_manager', 'sales_executive', 'external_caller'] },
  { path: '/attendance',   label: 'Attendance',   icon: Clock,           roles: ['super_admin', 'admin', 'sales_manager', 'sales_executive', 'external_caller'] },
  { path: '/team',         label: 'Team',         icon: UserCog,         roles: ['super_admin', 'admin'] },
  { path: '/users',        label: 'Users',        icon: Settings,        roles: ['super_admin', 'admin'] },
  { path: '/notifications',   label: 'Notifications',    icon: Bell,   roles: ['super_admin', 'admin', 'sales_manager', 'sales_executive', 'external_caller'] },
  { path: '/phone-requests',  label: 'Phone Requests',   icon: Phone,  roles: ['super_admin', 'admin', 'sales_manager', 'sales_executive', 'external_caller'] },
]

const SidebarContent = ({ collapsed, logo, filteredNavItems, setMobileOpen, user, handleLogout }) => (
  <div className="flex flex-col h-full bg-white dark:bg-[#1a1a1a] border-r border-gray-200 dark:border-gray-800 shadow-sm">
    {/* Logo */}
    <div className={`flex items-center gap-3 px-4 py-5 border-b border-gray-200 dark:border-gray-800 ${collapsed ? 'justify-center' : ''}`}>
      <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1a1a1a] flex items-center justify-center flex-shrink-0 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-800 overflow-hidden">
        <img src={logo} alt="Next One" className="w-full h-full object-contain" />
      </div>
      {!collapsed && (
        <div>
          <div className="font-display font-semibold text-gray-900 dark:text-white text-sm leading-tight">Next One</div>
          <div className="text-[10px] text-[#0082f3]/70 dark:text-[#0082f3]/50 tracking-wider uppercase font-medium">Realty CRM</div>
        </div>
      )}
    </div>

    {/* Nav */}
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide">
      {filteredNavItems.map(({ path, label, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          onClick={() => setMobileOpen && setMobileOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative
            ${isActive
              ? 'bg-brand/10 dark:bg-brand/15 text-brand border-l-2 border-brand pl-[10px]'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-gray-200'
            }
            ${collapsed ? 'justify-center' : ''}`
          }
        >
          <Icon size={18} className="flex-shrink-0" />
          {!collapsed && <span>{label}</span>}
          {collapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
              {label}
            </div>
          )}
        </NavLink>
      ))}
    </nav>

    {/* User */}
    <div className={`border-t border-gray-200 dark:border-gray-800 p-3 ${collapsed ? 'items-center' : ''}`}>
      {!collapsed ? (
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar name={user?.first_name || user?.name || 'User'} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : (user?.name || 'User')}
            </div>
            <div className="text-[10px] text-gray-400 capitalize">{user?.role?.replace(/_/g,' ')}</div>
          </div>
          <button
            onClick={handleLogout}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Logout"
          >
            <LogOut size={14} />
          </button>
        </div>
      ) : (
        <button
          onClick={handleLogout}
          className="w-full flex justify-center p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
          title="Logout"
        >
          <LogOut size={16} />
        </button>
      )}
    </div>
  </div>
)

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { user } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  const filteredNavItems = navItems.filter(item => item.roles.includes(user?.role))

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed top-0 left-0 h-full z-30 transition-all duration-300 ${collapsed ? 'w-[60px]' : 'w-[240px]'}`}
      >
        <SidebarContent
          collapsed={collapsed}
          logo={logo}
          filteredNavItems={filteredNavItems}
          user={user}
          handleLogout={handleLogout}
        />
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-center text-gray-400 hover:text-[#0082f3] transition-colors z-10"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed top-0 left-0 h-full w-[240px] z-50 lg:hidden">
            <SidebarContent
              collapsed={false}
              logo={logo}
              filteredNavItems={filteredNavItems}
              setMobileOpen={setMobileOpen}
              user={user}
              handleLogout={handleLogout}
            />
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-3 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X size={16} />
            </button>
          </aside>
        </>
      )}
    </>
  )
}