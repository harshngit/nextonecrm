/**
 * socket.js — Next One Realty CRM (Frontend)
 * src/services/socket.js
 *
 * Works in both environments automatically:
 *   Local dev  → connects to http://localhost (same machine, no env needed)
 *   Production → connects to https://nextoneapi.onrender.com
 *
 * No .env changes needed — VITE_API_URL already points to the right place.
 */

import { io } from "socket.io-client";

// ── Socket URL ────────────────────────────────────────────────
// Strip /api/v1 from the axios base URL to get the root server URL.
// Works for both local (http://localhost:PORT) and production (https://...).
//
// If VITE_SOCKET_URL is set explicitly, use it.
// Otherwise derive it from VITE_API_URL by removing /api/v1.
// If neither is set, fall back to the known production URL.
const SOCKET_URL = (() => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace("/api/v1", "");
  }
  return "https://nextoneapi.onrender.com"; // known production API server
})();

let socket = null;

/**
 * Connect to the socket server using the user's JWT token.
 * Safe to call multiple times — reuses existing connection.
 *
 * @param {string} token  JWT access token from localStorage
 * @returns {Socket}
 */
export const connectSocket = (token) => {
  // Already live — reuse
  if (socket && socket.connected) return socket;

  // Stale disconnected socket — clean up before reconnecting
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(SOCKET_URL, {
    // ── Auth ────────────────────────────────────────────────
    // Server reads this as socket.handshake.auth.token
    auth: { token },

    // ── Transport ───────────────────────────────────────────
    // WebSocket-only — no polling.
    // Render's proxy can block the polling→WebSocket upgrade
    // causing socket.io to stay on slow HTTP long-polling.
    // WebSocket-only connects instantly on both local and Render.
    transports: ["websocket"],

    // ── Reconnection ────────────────────────────────────────
    // Render free tier cold-starts take ~30 s. More attempts
    // with increasing delay means the client waits for the
    // backend to wake up instead of giving up.
    reconnection:         true,
    reconnectionDelay:    2000,   // 2 s before first retry
    reconnectionDelayMax: 10000,  // cap at 10 s between retries
    reconnectionAttempts: 20,     // try 20 times (~3 min total)

    // ── Connection timeout ──────────────────────────────────
    timeout: 15000,  // 15 s to establish initial connection
  });

  // ── Lifecycle logs ──────────────────────────────────────────
  socket.on("connect", () => {
    console.log(`[WS] Connected — id: ${socket.id} | server: ${SOCKET_URL}`);
  });

  socket.on("connect_error", (err) => {
    console.warn(`[WS] Connection error: ${err.message}`);
  });

  socket.on("disconnect", (reason) => {
    console.log(`[WS] Disconnected: ${reason}`);
    // "io server disconnect" = server kicked us (bad token etc.)
    // Re-attempt manually; other reasons auto-reconnect.
    if (reason === "io server disconnect") {
      socket.connect();
    }
  });

  socket.on("reconnect", (attempt) => {
    console.log(`[WS] Reconnected after ${attempt} attempt(s)`);
  });

  socket.on("reconnect_failed", () => {
    console.error("[WS] All reconnection attempts failed — reload the page");
  });

  return socket;
};

/**
 * Disconnect and destroy the socket.
 * Call on logout so the JWT is invalidated cleanly.
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log("[WS] Socket disconnected and cleared");
  }
};

/** Get the current socket instance (null if not connected) */
export const getSocket = () => socket;

/** Check if the socket is currently live */
export const isSocketConnected = () => socket?.connected ?? false;