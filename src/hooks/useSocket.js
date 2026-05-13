/**
 * src/hooks/useSocket.js
 *
 * Connect socket when authenticated, disconnect on logout.
 * Every 'notification:new' event from the server → addNotification in Redux.
 */
import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector }     from 'react-redux'
import { connectSocket, disconnectSocket, getSocket } from '../services/socket'
import { addNotification, fetchUnreadCount }          from '../store/notificationSlice'

export const useSocket = () => {
  const dispatch = useDispatch()
  const { isAuthenticated, accessToken } = useSelector(s => s.auth)
  const [connected, setConnected] = useState(false)
  const registered = useRef(false)

  useEffect(() => {
    // ── Disconnect on logout ─────────────────────────────────
    if (!isAuthenticated) {
      disconnectSocket()
      setConnected(false)
      registered.current = false
      return
    }

    // ── Get token from Redux state or localStorage ───────────
    const token = accessToken || localStorage.getItem('n1r_access_token')
    if (!token) { console.warn('[WS] No token found, skipping connect'); return }

    // ── Connect ──────────────────────────────────────────────
    const socket = connectSocket(token)

    // ── Register listeners only once ─────────────────────────
    if (registered.current) return
    registered.current = true

    // Connection state
    socket.on('connect', () => {
      setConnected(true)
      console.log('[WS] Socket connected, id:', socket.id)
      // Re-sync unread count after reconnect
      dispatch(fetchUnreadCount())
    })

    socket.on('disconnect', () => {
      setConnected(false)
    })

    socket.on('reconnect', () => {
      setConnected(true)
      dispatch(fetchUnreadCount())
    })

    // ── Notification push ─────────────────────────────────────
    // Backend calls createNotification() → emitToUser(userId, 'notification:new', row)
    // The payload IS the full notifications DB row
    socket.on('notification:new', (payload) => {
      console.log('[WS] notification:new received:', payload?.type, payload?.title)
      dispatch(addNotification(payload))
    })

    // ── Other real-time events (log only for now) ─────────────
    ;['lead:created','lead:updated','lead:assigned',
      'task:created','task:updated',
      'visit:created','visit:updated',
      'attendance:checkin','attendance:checkout',
    ].forEach(evt => {
      socket.on(evt, (d) => console.log('[WS]', evt, d))
    })

    // ── Cleanup on auth state change ──────────────────────────
    return () => {
      // Only remove listeners if logging out
      if (!isAuthenticated) {
        const s = getSocket()
        if (s) {
          s.off('connect'); s.off('disconnect'); s.off('reconnect')
          s.off('notification:new')
          ;['lead:created','lead:updated','lead:assigned',
            'task:created','task:updated',
            'visit:created','visit:updated',
            'attendance:checkin','attendance:checkout',
          ].forEach(evt => s.off(evt))
        }
        registered.current = false
      }
    }
  }, [isAuthenticated, accessToken, dispatch])

  return { connected }
}