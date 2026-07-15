import { useState, useRef, useEffect } from 'react'
import { Phone, MessageCircle } from 'lucide-react'

// Wraps a phone number/icon trigger — clicking it opens a small popover with
// "Call" (tel:) and "WhatsApp" (wa.me) options instead of navigating straight
// to a tel: link. Uses fixed positioning so it isn't clipped by table/card
// overflow containers.
export default function PhoneActions({ phone, children, className = '' }) {
  const [open, setOpen] = useState(false)
  const [pos,  setPos]  = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  if (!phone) return children ? <span className={className}>{children}</span> : null

  const waNumber = phone.replace(/[^\d]/g, '')

  const toggle = e => {
    e.preventDefault()
    e.stopPropagation()
    const r = e.currentTarget.getBoundingClientRect()
    const below = window.innerHeight - r.bottom
    setPos({ left: r.left, ...(below > 100 ? { top: r.bottom + 4 } : { bottom: window.innerHeight - r.top + 4 }) })
    setOpen(o => !o)
  }

  return (
    <span className={`relative ${className || 'inline-block'}`} ref={ref}>
      <span onClick={toggle} className="cursor-pointer">{children}</span>
      {open && (
        <div style={{ top: pos?.top, bottom: pos?.bottom, left: pos?.left }}
          className="fixed w-40 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg z-[9999] py-1">
          <a href={`tel:${phone}`} onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Phone size={13} className="text-blue-500" /> Call
          </a>
          <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <MessageCircle size={13} className="text-green-500" /> WhatsApp
          </a>
        </div>
      )}
    </span>
  )
}
