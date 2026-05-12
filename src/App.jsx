import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { authMe } from './store/authSlice'
import Layout from './components/layout/Layout'
import PageLoader from './components/loaders/PageLoader'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Leads from './pages/Leads'
import LeadDetail from './pages/LeadDetail'
import SiteVisits from './pages/SiteVisits'
import SiteVisitDetail from './pages/SiteVisitDetail'
import FollowUps from './pages/FollowUps'
import FollowUpDetail from './pages/FollowUpDetail'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import Team from './pages/Team'
import UserDetail from './pages/UserDetail'
import Notifications from './pages/Notifications'
import UserManagement from './pages/UserManagement'
import Attendance from './pages/Attendance'

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useSelector((state) => state.auth)
  if (loading) return <PageLoader />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function RoleProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, loading } = useSelector((state) => state.auth)
  
  if (loading) return <PageLoader />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  
  if (!allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />
  }
  
  return children
}

function AppRoutes() {
  const { user, isAuthenticated, loading: authLoading } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const location = useLocation()
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(authMe())
    }
  }, [dispatch, isAuthenticated])

  useEffect(() => {
    setPageLoading(true)
    const t = setTimeout(() => setPageLoading(false), 1000)
    return () => clearTimeout(t)
  }, [location.pathname])

  // super_admin + admin only — Projects, Users, Team (full control)
  const ADMIN_ROLES = ['super_admin', 'admin', 'sales_manager']

  // super_admin + admin + sales_manager — Team view (manager sees their team)
  const MANAGER_ROLES = ['super_admin', 'admin', 'sales_manager']

  // All five roles — Leads, Follow-Ups, Site Visits, Attendance
  const SALES_ROLES = ['super_admin', 'admin', 'sales_manager', 'sales_executive', 'external_caller']

  return (
    <div className="relative min-h-screen">
      {pageLoading && <PageLoader />}
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
        
        {/* All authenticated users */}
        <Route path="/dashboard"    element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/notifications"element={<ProtectedRoute><Layout><Notifications /></Layout></ProtectedRoute>} />
        
        {/* All 5 roles — sales pages */}
        <Route path="/leads"        element={<RoleProtectedRoute allowedRoles={SALES_ROLES}><Layout><Leads /></Layout></RoleProtectedRoute>} />
        <Route path="/leads/:id"    element={<RoleProtectedRoute allowedRoles={SALES_ROLES}><Layout><LeadDetail /></Layout></RoleProtectedRoute>} />
        <Route path="/site-visits"  element={<RoleProtectedRoute allowedRoles={SALES_ROLES}><Layout><SiteVisits /></Layout></RoleProtectedRoute>} />
        <Route path="/site-visits/:id" element={<RoleProtectedRoute allowedRoles={SALES_ROLES}><Layout><SiteVisitDetail /></Layout></RoleProtectedRoute>} />
        <Route path="/follow-ups"   element={<RoleProtectedRoute allowedRoles={SALES_ROLES}><Layout><FollowUps /></Layout></RoleProtectedRoute>} />
        <Route path="/follow-ups/:id" element={<RoleProtectedRoute allowedRoles={SALES_ROLES}><Layout><FollowUpDetail /></Layout></RoleProtectedRoute>} />
        <Route path="/attendance"   element={<RoleProtectedRoute allowedRoles={SALES_ROLES}><Layout><Attendance /></Layout></RoleProtectedRoute>} />

        {/* super_admin + admin + sales_manager — team view */}
        <Route path="/team"         element={<RoleProtectedRoute allowedRoles={MANAGER_ROLES}><Layout><Team /></Layout></RoleProtectedRoute>} />
        <Route path="/team/:id"     element={<RoleProtectedRoute allowedRoles={MANAGER_ROLES}><Layout><UserDetail /></Layout></RoleProtectedRoute>} />

        {/* super_admin + admin only */}
        <Route path="/projects"     element={<RoleProtectedRoute allowedRoles={ADMIN_ROLES}><Layout><Projects /></Layout></RoleProtectedRoute>} />
        <Route path="/projects/:id" element={<RoleProtectedRoute allowedRoles={ADMIN_ROLES}><Layout><ProjectDetail /></Layout></RoleProtectedRoute>} />
        <Route path="/users"        element={<RoleProtectedRoute allowedRoles={ADMIN_ROLES}><Layout><UserManagement /></Layout></RoleProtectedRoute>} />
        
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}