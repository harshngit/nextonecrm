import { useRegisterSW } from 'virtual:pwa-register/react'

// Registers the service worker for offline caching only — deliberately does
// not auto-check for or apply updates, since that was silently reloading the
// page mid-session. Updates are picked up the next time the app is opened
// naturally (normal browser tab/page load).
export default function ReloadPrompt() {
  useRegisterSW()

  return null
}
