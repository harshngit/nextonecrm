import { configureStore } from '@reduxjs/toolkit'
import authReducer         from './authSlice'
import leadReducer         from './leadSlice'
import projectReducer      from './projectSlice'
import siteVisitReducer    from './siteVisitSlice'
import followUpReducer     from './followUpSlice'
import notificationReducer from './notificationSlice'
import userReducer         from './userSlice'
import dashboardReducer    from './dashboardSlice'
import attendanceReducer   from './attendanceSlice'

export const store = configureStore({
  reducer: {
    auth:          authReducer,
    leads:         leadReducer,
    projects:      projectReducer,
    siteVisits:    siteVisitReducer,
    followUps:     followUpReducer,
    notifications: notificationReducer,
    users:         userReducer,
    dashboard:     dashboardReducer,
    attendance:    attendanceReducer,
  },
})