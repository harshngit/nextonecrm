/**
 * useSocket.js — Next One Realty CRM
 *
 * Connects the socket when the user is authenticated.
 * Listens for all real-time events and dispatches them to Redux.
 * Disconnects when the user logs out or component unmounts.
 *
 * Usage: call once in Layout.jsx — <Layout> wraps all authenticated routes.
 */

import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector }     from 'react-redux'
import { connectSocket, disconnectSocket, getSocket } from '../services/socket'
import { addNotification, fetchUnreadCount }          from '../store/notificationSlice'

// ── Event → Redux action map ─────────────────────────────────────────────────
// All events that carry a notification payload and should be pushed to the
// Redux notifications list + increment the unread badge.
const NOTIFICATION_EVENTS = [
  'notification:new',       // universal — fired by createNotification() in every controller
]

// Non-notification events that need special handling
const LEAD_EVENTS   = ['lead:created', 'lead:updated', 'lead:assigned']
const TASK_EVENTS   = ['task:created', 'task:updated', 'task:completed']
const VISIT_EVENTS  = ['visit:created', 'visit:updated']
const ATT_EVENTS    = ['attendance:checkin', 'attendance:checkout']

export const useSocket = () => {
  const dispatch         = useDispatch()
  const { isAuthenticated, user } = useSelector((s) => s.auth)
  const [connected,   setConnected]   = useState(false)
  const [socketId,    setSocketId]    = useState(null)
  const listenersAdded = useRef(false)

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket()
      setConnected(false)
      setSocketId(null)
      listenersAdded.current = false
      return
    }

    const token = localStorage.getItem('n1r_access_token')
    if (!token) return

    const socket = connectSocket(token)

    // ── Register event listeners only once ───────────────────────────────────
    if (!listenersAdded.current) {
      listenersAdded.current = true

      // Connection state
      socket.on('connect', () => {
        setConnected(true)
        setSocketId(socket.id)
        // Re-fetch unread count in case we missed notifications while offline
        dispatch(fetchUnreadCount())
      })

      socket.on('disconnect', () => {
        setConnected(false)
        setSocketId(null)
      })

      socket.on('reconnect', () => {
        setConnected(true)
        setSocketId(socket.id)
        dispatch(fetchUnreadCount())
      })

      // ── Notification events ─────────────────────────────────────────────────
      // 'notification:new' is fired by createNotification() in every controller.
      // The payload IS the notification DB row so it goes straight into Redux.
      NOTIFICATION_EVENTS.forEach((event) => {
        socket.on(event, (payload) => {
          console.log(`[WS] ${event}:`, payload?.type, payload?.title)
          dispatch(addNotification(payload))
        })
      })

      // ── Lead events (optional: could refresh lead list or show toast) ───────
      LEAD_EVENTS.forEach((event) => {
        socket.on(event, (payload) => {
          console.log(`[WS] ${event}:`, payload)
          // Leads page will re-fetch on its own polling — no Redux action needed here
          // Uncomment to force refresh: dispatch(fetchLeads())
        })
      })

      // ── Task events ─────────────────────────────────────────────────────────
      TASK_EVENTS.forEach((event) => {
        socket.on(event, (payload) => {
          console.log(`[WS] ${event}:`, payload)
        })
      })

      // ── Site visit events ───────────────────────────────────────────────────
      VISIT_EVENTS.forEach((event) => {
        socket.on(event, (payload) => {
          console.log(`[WS] ${event}:`, payload)
        })
      })

      // ── Attendance events ───────────────────────────────────────────────────
      ATT_EVENTS.forEach((event) => {
        socket.on(event, (payload) => {
          console.log(`[WS] ${event}:`, payload)
        })
      })
    }

    // Cleanup on unmount / logout
    return () => {
      if (!isAuthenticated) {
        const s = getSocket()
        if (s) {
          NOTIFICATION_EVENTS.forEach((e) => s.off(e))
          LEAD_EVENTS.forEach((e)         => s.off(e))
          TASK_EVENTS.forEach((e)         => s.off(e))
          VISIT_EVENTS.forEach((e)        => s.off(e))
          ATT_EVENTS.forEach((e)          => s.off(e))
          s.off('connect')
          s.off('disconnect')
          s.off('reconnect')
        }
        listenersAdded.current = false
      }
    }
  }, [isAuthenticated, dispatch])

  return { connected, socketId }
}
