import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'
import { selectPermissions, selectPermissionsLoaded } from '../../store/permissionsSlice'
import PageLoader from '../loaders/PageLoader'
import NoPermission from '../../pages/NoPermission'

export default function PermissionProtectedRoute({ children, module, action = 'view' }) {
  const { isAuthenticated, loading: authLoading } = useSelector((state) => state.auth)
  const permissionsLoaded = useSelector(selectPermissionsLoaded)
  const permissions = useSelector(selectPermissions)

  if (authLoading || !permissionsLoaded) return <PageLoader />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  // No module passed → this route is open to every authenticated role
  // regardless of their permissions grants (e.g. Leaves, which every
  // employee needs access to, not just those with the "attendance" module).
  if (module && permissions[module]?.[action] !== true) return <NoPermission module={module} />

  return children
}
