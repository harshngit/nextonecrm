/* eslint-disable no-undef */
/**
 * public/firebase-messaging-sw.js
 *
 * This service worker handles FCM push notifications when:
 *   - The browser tab is closed
 *   - The app is in the background
 *   - The screen is locked
 *
 * ⚠️  This file MUST be in the /public folder (not src/)
 *     so it is served from the root: https://yourdomain.com/firebase-messaging-sw.js
 */

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js')

// ── Same Firebase config as your React app ───────────────────────────────────
firebase.initializeApp({
  apiKey           : 'AIzaSyDseyF1R_dDpDYKCaPI2hJ-rVeUG0t-cV0',
  authDomain       : 'nextone-70b85.firebaseapp.com',
  projectId        : 'nextone-70b85',
  storageBucket    : 'nextone-70b85.firebasestorage.app',
  messagingSenderId: '599915753556',
  appId            : '1:599915753556:web:ca9e3b7bc97ac564c47dc1',
  measurementId    : 'G-24C4XPK8MZ',
})

const messaging = firebase.messaging()

// ── Background / closed tab push handler ─────────────────────────────────────
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background push received:', payload)

  const { title, body } = payload.notification || {}
  const data            = payload.data        || {}

  self.registration.showNotification(title || 'Next One Realty', {
    body   : body || 'You have a new notification',
    icon   : '/logo.png',    // ← put your logo at public/logo.png
    badge  : '/logo.png',    // ← small monochrome icon for Android status bar
    data   : data,
    actions: [
      { action: 'open',    title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss'  },
    ],
  })
})

// ── Notification click → navigate to the right page ──────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const data          = event.notification.data || {}
  const referenceType = data.reference_type
  const referenceId   = data.reference_id

  // Map reference_type to your React Router paths
  let url = '/dashboard'
  if (referenceType === 'lead')       url = `/leads/${referenceId}`
  if (referenceType === 'task')       url = `/follow-ups/${referenceId}`
  if (referenceType === 'site_visit') url = `/site-visits/${referenceId}`
  if (referenceType === 'project')    url = `/projects/${referenceId}`
  if (referenceType === 'revisit')    url = `/revisits/${referenceId}`
  if (referenceType === 'closure')    url = `/closures/${referenceId}`

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If a tab is already open — navigate it
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url)
            return client.focus()
          }
        }
        // Otherwise open a new tab
        if (clients.openWindow) return clients.openWindow(url)
      })
  )
})
