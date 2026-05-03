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
import Team from './pages/Team'
import UserDetail from './pages/UserDetail'
import Notifications from './pages/Notifications'
import UserManagement from './pages/UserManagement'
import Attendance from './pages/Attendance'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useSelector((state) => state.auth)
  if (!isAuthenticated) return <Navigate to="/login" replace />
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

  return (
    <div className="relative min-h-screen">
      {pageLoading && <PageLoader />}
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
        <Route path="/dashboard"    element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/leads"        element={<ProtectedRoute><Layout><Leads /></Layout></ProtectedRoute>} />
        <Route path="/leads/:id"    element={<ProtectedRoute><Layout><LeadDetail /></Layout></ProtectedRoute>} />
        <Route path="/site-visits"  element={<ProtectedRoute><Layout><SiteVisits /></Layout></ProtectedRoute>} />
        <Route path="/site-visits/:id" element={<ProtectedRoute><Layout><SiteVisitDetail /></Layout></ProtectedRoute>} />
        <Route path="/follow-ups"   element={<ProtectedRoute><Layout><FollowUps /></Layout></ProtectedRoute>} />
        <Route path="/follow-ups/:id" element={<ProtectedRoute><Layout><FollowUpDetail /></Layout></ProtectedRoute>} />
        <Route path="/projects"     element={<ProtectedRoute><Layout><Projects /></Layout></ProtectedRoute>} />
        <Route path="/team"         element={<ProtectedRoute><Layout><Team /></Layout></ProtectedRoute>} />
        <Route path="/team/:id"    element={<ProtectedRoute><Layout><UserDetail /></Layout></ProtectedRoute>} />
        <Route path="/attendance"   element={<ProtectedRoute><Layout><Attendance /></Layout></ProtectedRoute>} />
        <Route path="/notifications"element={<ProtectedRoute><Layout><Notifications /></Layout></ProtectedRoute>} />
        <Route path="/users"        element={<ProtectedRoute><Layout><UserManagement /></Layout></ProtectedRoute>} />
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