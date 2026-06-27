import { useRegisterSW } from 'virtual:pwa-register/react'

export default function ReloadPrompt() {
  useRegisterSW({
    onRegisteredSW(_, r) {
      if (!r) return
      setInterval(() => { r.update() }, 30 * 60 * 1000)
    },
  })

  return null
}
