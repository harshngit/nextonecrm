import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import userReducer from './userSlice'
import leadReducer from './leadSlice'
import siteVisitReducer from './siteVisitSlice'
import projectReducer from './projectSlice'
import notificationReducer from './notificationSlice'
import followUpReducer from './followUpSlice'

const store = configureStore({
  reducer: {
    auth: authReducer,
    users: userReducer,
    leads: leadReducer,
    siteVisits: siteVisitReducer,
    projects: projectReducer,
    notifications: notificationReducer,
    followUps: followUpReducer,
  },
})

export default store