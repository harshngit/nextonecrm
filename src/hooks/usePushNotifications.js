/**
 * src/hooks/usePushNotifications.js
 *
 * Registers the browser for FCM web push notifications.
 * - Asks permission once
 * - Registers service worker
 * - Gets FCM token from Firebase
 * - Saves it to your backend  POST /api/v1/fcm/token
 * - Handles foreground messages (tab is open)
 * - Cleans up (removes token) on logout
 *
 * Usage — call this ONCE inside AppRoutes() in App.jsx:
 *   import { usePushNotifications } from './hooks/usePushNotifications'
 *   usePushNotifications()
 */

import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { addNotification, fetchUnreadCount } from '../store/notificationSlice'
import api from '../api/axios'

// ── Firebase config (NextoneWeb app) ─────────────────────────────────────────
const firebaseConfig = {
  apiKey           : 'AIzaSyDseyF1R_dDpDYKCaPI2hJ-rVeUG0t-cV0',
  authDomain       : 'nextone-70b85.firebaseapp.com',
  projectId        : 'nextone-70b85',
  storageBucket    : 'nextone-70b85.firebasestorage.app',
  messagingSenderId: '599915753556',
  appId            : '1:599915753556:web:ca9e3b7bc97ac564c47dc1',
  measurementId    : 'G-24C4XPK8MZ',
}

// Initialise Firebase once (safe across hot reloads)
const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)

// ─────────────────────────────────────────────────────────────────────────────

export const usePushNotifications = () => {
  const dispatch   = useDispatch()
  const { isAuthenticated, accessToken } = useSelector(s => s.auth)
  const fcmTokenRef    = useRef(null)   // remember token so we can remove it on logout
  const registeredRef  = useRef(false)  // run setup only once per login session

  // ── Setup on login ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return
    if (registeredRef.current) return  // already registered this session

    const setup = async () => {
      try {
        // 1. Browser support check
        if (!('Notification' in window) || !('serviceWorker' in navigator)) {
          console.warn('[FCM] Push not supported in this browser')
          return
        }

        // 2. Ask notification permission
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          console.warn('[FCM] Notification permission denied')
          return
        }

        // 3. Register service worker
        const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
        console.log('[FCM] Service worker registered')

        // 4. Get messaging instance
        const messaging = getMessaging(firebaseApp)

        // 5. Fetch VAPID public key from backend
        const vapidRes  = await api.get('/fcm/vapid-key')
        const vapidKey  = vapidRes.data?.data?.vapid_public_key

        if (!vapidKey) {
          console.error('[FCM] No VAPID key from backend — add FCM_VAPID_PUBLIC_KEY to .env')
          return
        }

        // 6. Get FCM token from Firebase
        const fcmToken = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: swReg,
        })

        if (!fcmToken) {
          console.warn('[FCM] No token returned — user may have blocked notifications')
          return
        }

        console.log('[FCM] Token obtained:', '...' + fcmToken.slice(-12))

        // 7. Save token to backend
        await api.post('/fcm/token', { fcm_token: fcmToken, platform: 'web' })
        console.log('[FCM] Token saved to backend')

        fcmTokenRef.current   = fcmToken
        registeredRef.current = true

        // 8. Foreground message handler (app tab is open and focused)
        //    Background messages are handled by firebase-messaging-sw.js
        const unsubscribe = onMessage(messaging, (payload) => {
          console.log('[FCM] Foreground message:', payload)

          const { body } = payload.notification || {}
          const data            = payload.data        || {}

          // Push into Redux so the notification bell updates instantly
          dispatch(addNotification({
            id             : data.notification_id || Date.now().toString(),
            type           : data.type            || 'general',
            title          : 'Next One Realty',
            message        : body                 || '',
            is_read        : false,
            reference_id   : data.reference_id   || null,
            reference_type : data.reference_type || null,
            created_at     : new Date().toISOString(),
          }))

          // Also refresh the unread count badge
          dispatch(fetchUnreadCount())

          // Show native browser notification even when tab is open
          if (document.visibilityState !== 'visible') return
          new Notification('Next One Realty', {
            body : body || 'You have a new notification',
            icon : '/pwa-192x192.png',
          })
        })

        // Store unsubscribe fn so we can clean up
        return unsubscribe

      } catch (err) {
        console.error('[FCM] Setup error:', err.message)
      }
    }

    let cleanupFn = null
    setup().then(fn => { if (fn) cleanupFn = fn })

    return () => {
      if (typeof cleanupFn === 'function') cleanupFn()
    }
  }, [isAuthenticated, dispatch])

  // ── Cleanup on logout — remove token from backend ───────────────────────────
  useEffect(() => {
    if (!isAuthenticated && fcmTokenRef.current) {
      api
        .delete('/fcm/token', { data: { fcm_token: fcmTokenRef.current } })
        .then(() => console.log('[FCM] Token removed on logout'))
        .catch(() => {})
      fcmTokenRef.current   = null
      registeredRef.current = false
    }
  }, [isAuthenticated])
}
