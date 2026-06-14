import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { ShieldX, LogOut } from 'lucide-react'
import { logout } from '../store/authSlice'

const MODULE_NAMES = {
  dashboard:      'Dashboard',
  leads:          'Lead Management',
  projects:       'Project Management',
  site_visits:    'Site Visits',
  revisits:       'Re-visits',
  closures:       'Closures & Bookings',
  follow_ups:     'Follow-Up & Tasks',
  attendance:     'Attendance',
  salary:         'Salary & Incentives',
  team:           'Team',
  users:          'User Management',
  phone_requests: 'Phone Requests',
  notifications:  'Notifications',
}

export default function NoPermission({ module }) {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const moduleName = module
    ? (MODULE_NAMES[module] || module.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
    : null

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f0f0f] px-4">
      <div className="max-w-sm w-full text-center">

        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
          <ShieldX size={38} className="text-red-500" />
        </div>

        {/* Heading */}
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Access Restricted
        </h1>

        {/* Module-specific message */}
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-1">
          {moduleName ? (
            <>
              You don&apos;t have permission to access{' '}
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {moduleName}
              </span>
              .
            </>
          ) : (
            "You don't have permission to access this page."
          )}
        </p>

        {/* Contact admin note */}
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-8">
          Please contact your administrator to request access.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
          >
            ← Go Back
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>

      </div>
    </div>
  )
}
