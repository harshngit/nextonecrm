import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { authMe } from './store/authSlice'
import { fetchMyPermissions, selectPermissionsLoaded } from './store/permissionsSlice'
import { usePushNotifications } from './hooks/usePushNotifications'  // ← NEW
import Layout from './components/layout/Layout'
import ReloadPrompt from './components/ReloadPrompt'
import PageLoader from './components/loaders/PageLoader'
import PermissionProtectedRoute from './components/auth/PermissionProtectedRoute'

import Login          from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard      from './pages/Dashboard'
import Leads          from './pages/Leads'
import LeadDetail     from './pages/LeadDetail'
import SiteVisitLeads from './pages/SiteVisitLeads'
import EOILeads       from './pages/EOILeads'
import SiteVisits     from './pages/SiteVisits'
import SiteVisitDetail from './pages/SiteVisitDetail'
import FollowUps      from './pages/FollowUps'
import FollowUpDetail from './pages/FollowUpDetail'
import Projects       from './pages/Projects'
import ProjectDetail  from './pages/ProjectDetail'
import Team           from './pages/Team'
import UserDetail     from './pages/UserDetail'
import Notifications  from './pages/Notifications'
import UserManagement from './pages/UserManagement'
import Attendance     from './pages/Attendance'
import Leaves         from './pages/Leave'
import PhoneRequests  from './pages/PhoneRequests'
import Salary         from './pages/Salary'
import SalaryDetail   from './pages/SalaryDetail'
import Revisits       from './pages/Revisits'
import RevisitDetail  from './pages/RevisitDetail'
import Closures       from './pages/Closures'
import ClosureDetail  from './pages/ClosureDetail'
import AccessControl  from './pages/AccessControl'
import Targets        from './pages/Targets'


function AppRoutes() {
  const { isAuthenticated, loading: authLoading } = useSelector((state) => state.auth)
  const permissionsLoaded = useSelector(selectPermissionsLoaded)
  const dispatch    = useDispatch()
  const location    = useLocation()
  const [pageLoading, setPageLoading] = useState(true)

  // ── Auth refresh on load ────────────────────────────────────────────────────
  useEffect(() => {
    if (isAuthenticated) dispatch(authMe())
  }, [dispatch, isAuthenticated])

  // ── Fetch permissions once after auth is confirmed ──────────────────────────
  useEffect(() => {
    if (isAuthenticated && !permissionsLoaded) dispatch(fetchMyPermissions())
  }, [dispatch, isAuthenticated, permissionsLoaded])

  // ── Page transition loader ──────────────────────────────────────────────────
  useEffect(() => {
    setPageLoading(true)
    const t = setTimeout(() => setPageLoading(false), 1000)
    return () => clearTimeout(t)
  }, [location.pathname])

  // ── FCM Web Push — registers device after login, removes token on logout ────
  usePushNotifications()  // ← NEW — this is the only line added here

  // Block render until auth is settled and (if authenticated) permissions are loaded
  if (authLoading || (isAuthenticated && !permissionsLoaded)) return <PageLoader />

  return (
    <div className="relative min-h-screen">
      {pageLoading && <PageLoader />}
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/forgot-password" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} />
        <Route path="/"      element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />

        {/* Permission-gated for all roles */}
        <Route path="/dashboard"     element={<PermissionProtectedRoute module="dashboard"><Layout><Dashboard /></Layout></PermissionProtectedRoute>} />
        <Route path="/notifications" element={<PermissionProtectedRoute module="notifications"><Layout><Notifications /></Layout></PermissionProtectedRoute>} />

        {/* Permission-gated routes */}
        <Route path="/leads"              element={<PermissionProtectedRoute module="leads"><Layout><Leads /></Layout></PermissionProtectedRoute>} />
        <Route path="/leads/:id"          element={<PermissionProtectedRoute module="leads"><Layout><LeadDetail /></Layout></PermissionProtectedRoute>} />
        <Route path="/site-visit-leads"   element={<PermissionProtectedRoute module="leads"><Layout><SiteVisitLeads /></Layout></PermissionProtectedRoute>} />
        <Route path="/eoi-leads"          element={<PermissionProtectedRoute module="leads"><Layout><EOILeads /></Layout></PermissionProtectedRoute>} />
        <Route path="/projects"           element={<PermissionProtectedRoute module="projects"><Layout><Projects /></Layout></PermissionProtectedRoute>} />
        <Route path="/projects/:id"       element={<PermissionProtectedRoute module="projects"><Layout><ProjectDetail /></Layout></PermissionProtectedRoute>} />
        <Route path="/site-visits"        element={<PermissionProtectedRoute module="site_visits"><Layout><SiteVisits /></Layout></PermissionProtectedRoute>} />
        <Route path="/site-visits/:id"    element={<PermissionProtectedRoute module="site_visits"><Layout><SiteVisitDetail /></Layout></PermissionProtectedRoute>} />
        <Route path="/revisits"           element={<PermissionProtectedRoute module="revisits"><Layout><Revisits /></Layout></PermissionProtectedRoute>} />
        <Route path="/revisits/:id"       element={<PermissionProtectedRoute module="revisits"><Layout><RevisitDetail /></Layout></PermissionProtectedRoute>} />
        <Route path="/closures"           element={<PermissionProtectedRoute module="closures"><Layout><Closures /></Layout></PermissionProtectedRoute>} />
        <Route path="/closures/:id"       element={<PermissionProtectedRoute module="closures"><Layout><ClosureDetail /></Layout></PermissionProtectedRoute>} />
        <Route path="/follow-ups"         element={<PermissionProtectedRoute module="follow_ups"><Layout><FollowUps /></Layout></PermissionProtectedRoute>} />
        <Route path="/follow-ups/:id"     element={<PermissionProtectedRoute module="follow_ups"><Layout><FollowUpDetail /></Layout></PermissionProtectedRoute>} />
        <Route path="/attendance"         element={<PermissionProtectedRoute module="attendance"><Layout><Attendance /></Layout></PermissionProtectedRoute>} />
        <Route path="/leaves"             element={<PermissionProtectedRoute module="attendance"><Layout><Leaves /></Layout></PermissionProtectedRoute>} />
        <Route path="/salary"             element={<PermissionProtectedRoute module="salary"><Layout><Salary /></Layout></PermissionProtectedRoute>} />
        <Route path="/salary/:user_id"    element={<PermissionProtectedRoute module="salary" action="approve"><Layout><SalaryDetail /></Layout></PermissionProtectedRoute>} />
        <Route path="/team"               element={<PermissionProtectedRoute module="team"><Layout><Team /></Layout></PermissionProtectedRoute>} />
        <Route path="/team/:id"           element={<PermissionProtectedRoute module="team"><Layout><UserDetail /></Layout></PermissionProtectedRoute>} />
        <Route path="/users"              element={<PermissionProtectedRoute module="users"><Layout><UserManagement /></Layout></PermissionProtectedRoute>} />
        <Route path="/phone-requests"     element={<PermissionProtectedRoute module="phone_requests"><Layout><PhoneRequests /></Layout></PermissionProtectedRoute>} />
        <Route path="/access-control"     element={<PermissionProtectedRoute module="users"><Layout><AccessControl /></Layout></PermissionProtectedRoute>} />
        <Route path="/targets"            element={<PermissionProtectedRoute module="targets"><Layout><Targets /></Layout></PermissionProtectedRoute>} />

        <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <ReloadPrompt />
    </BrowserRouter>
  )
}