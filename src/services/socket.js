/**
 * src/services/socket.js
 * Socket.io-client singleton for Next One Realty CRM
 *
 * SETUP: npm install socket.io-client
 */
import { io } from 'socket.io-client'

// Always use the root server URL (no /api/v1)
const SOCKET_URL = 'https://nextoneapi.onrender.com'

let socket = null

export const connectSocket = (token) => {
  if (socket && socket.connected) return socket
  if (socket) { socket.disconnect(); socket = null }

  socket = io(SOCKET_URL, {
    auth:                 { token },
    transports:           ['websocket'],
    reconnection:         true,
    reconnectionDelay:    2000,
    reconnectionDelayMax: 10000,
    reconnectionAttempts: 20,
    timeout:              15000,
  })

  socket.on('connect',       () => console.log('[WS] Connected:', socket.id))
  socket.on('connect_error', (e) => console.warn('[WS] Error:', e.message))
  socket.on('disconnect',    (r) => { console.log('[WS] Disconnected:', r); if (r === 'io server disconnect') socket.connect() })
  socket.on('reconnect',     (n) => console.log('[WS] Reconnected after', n, 'attempts'))
  socket.on('reconnect_failed', () => console.error('[WS] All reconnect attempts failed'))

  return socket
}

export const disconnectSocket = () => {
  if (socket) { socket.disconnect(); socket = null; console.log('[WS] Cleared') }
}

export const getSocket         = () => socket
export const isSocketConnected = () => socket?.connected ?? false