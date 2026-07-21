import { useSelector } from 'react-redux'
import { Navigate, useLocation } from 'react-router-dom'
import { selectPermissions, selectPermissionsLoaded } from '../../store/permissionsSlice'
import PageLoader from '../loaders/PageLoader'
import NoPermission from '../../pages/NoPermission'

export default function PermissionProtectedRoute({ children, module, action = 'view' }) {
  const { isAuthenticated, loading: authLoading } = useSelector((state) => state.auth)
  const permissionsLoaded = useSelector(selectPermissionsLoaded)
  const permissions = useSelector(selectPermissions)
  const location = useLocation()

  if (authLoading) return <PageLoader />
  // Check auth before permissions — permissions only ever load once
  // authenticated (see App.jsx), so checking `!permissionsLoaded` first
  // would spin this loader forever for a logged-out visitor deep-linking
  // into a gated route, instead of ever reaching the redirect below.
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  if (!permissionsLoaded) return <PageLoader />
  // No module passed → this route is open to every authenticated role
  // regardless of their permissions grants (e.g. Leaves, which every
  // employee needs access to, not just those with the "attendance" module).
  if (module && permissions[module]?.[action] !== true) return <NoPermission module={module} />

  return children
}
