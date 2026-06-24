import { useRegisterSW } from 'virtual:pwa-register/react'

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true

export default function ReloadPrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      if (!r) return
      setInterval(() => { r.update() }, 60 * 60 * 1000)
    },
  })

  if (!needRefresh || !isStandalone()) return null

  const handleUpdate = async () => {
    try {
      await updateServiceWorker(true)
    } catch {
      window.location.reload()
    }
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 bg-gray-900 text-white pl-4 pr-2 py-2 rounded-2xl shadow-2xl shadow-black/30">
      <span className="text-sm font-medium">New version available</span>
      <button
        onClick={handleUpdate}
        className="px-4 py-1.5 bg-[#0082f3] text-white text-sm font-bold rounded-xl active:scale-95 transition-transform"
      >
        Update
      </button>
    </div>
  )
}
