import { useState, useEffect, useRef } from 'react'
import { Clock } from 'lucide-react'

const ITEM_H = 36   // px height of each wheel row
const PAD_ROWS = 3  // rows of empty space above/below so the center row can align mid-viewport
const WHEEL_H = ITEM_H * (PAD_ROWS * 2 + 1)

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')) // '01'..'12'
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
const MERIDIEMS = ['AM', 'PM']

// One scrollable, snap-to-center column (hour / minute / AM-PM) — the
// mobile-style "wheel" picker. Value sync only runs on mount (i.e. each time
// the popover opens, since this unmounts on close) so it never fights the
// user's own in-progress scrolling.
function WheelColumn({ items, value, onChange }) {
  const scrollRef = useRef(null)
  const settleTimer = useRef(null)

  useEffect(() => {
    const idx = items.indexOf(value)
    if (scrollRef.current && idx >= 0) scrollRef.current.scrollTop = idx * ITEM_H
  }, [])

  useEffect(() => () => clearTimeout(settleTimer.current), [])

  const snapTo = (idx) => {
    const clamped = Math.max(0, Math.min(items.length - 1, idx))
    scrollRef.current?.scrollTo({ top: clamped * ITEM_H, behavior: 'smooth' })
    if (items[clamped] !== value) onChange(items[clamped])
  }

  const handleScroll = () => {
    clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(() => {
      if (!scrollRef.current) return
      snapTo(Math.round(scrollRef.current.scrollTop / ITEM_H))
    }, 120)
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="overflow-y-scroll snap-y snap-mandatory [&::-webkit-scrollbar]:hidden"
      style={{ height: WHEEL_H, scrollSnapType: 'y mandatory', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
    >
      <div style={{ height: ITEM_H * PAD_ROWS }} />
      {items.map((it) => (
        <div
          key={it}
          onClick={() => snapTo(items.indexOf(it))}
          className="flex items-center justify-center cursor-pointer snap-center"
          style={{ height: ITEM_H, scrollSnapAlign: 'center' }}
        >
          <span className={`font-mono transition-all ${it === value ? 'text-lg font-bold text-gray-900 dark:text-white' : 'text-sm text-gray-300 dark:text-gray-600'}`}>
            {it}
          </span>
        </div>
      ))}
      <div style={{ height: ITEM_H * PAD_ROWS }} />
    </div>
  )
}

export default function ClockPicker({ value, onChange, label, icon: Icon, iconColor = 'text-gray-400', required = false }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState('bottom')
  const containerRef = useRef(null)

  const [hh, mm] = value ? value.split(':') : ['10', '00']
  const hour24 = parseInt(hh || 10)
  const hour12 = String(hour24 % 12 === 0 ? 12 : hour24 % 12).padStart(2, '0')
  const minute = mm || '00'
  const meridiem = hour24 < 12 ? 'AM' : 'PM'

  useEffect(() => {
    const fn = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      const spaceRight = window.innerWidth - rect.right

      let next = 'bottom'
      if (spaceBelow < 300 && spaceAbove > spaceBelow) next = 'top'
      if (spaceRight < 200) next = next.replace('bottom', 'bottom-right').replace('top', 'top-right')
      setPosition(next)
    }
  }, [open])

  const emit = (h12, m, mer) => {
    let h = parseInt(h12, 10) % 12
    if (mer === 'PM') h += 12
    onChange(`${String(h).padStart(2, '0')}:${m}`)
  }

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
          {label}{required && ' *'}
        </label>
      )}
      <div
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm border rounded-xl cursor-pointer transition-all select-none
          ${open
            ? 'border-brand bg-white dark:bg-gray-800 ring-1 ring-brand/20'
            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
      >
        {Icon && <Icon size={14} className={`flex-shrink-0 ${iconColor}`} />}
        <span className={`flex-1 font-mono text-base tracking-widest ${value ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
          {value || '--:--'}
        </span>
        <Clock size={14} className="text-gray-400 flex-shrink-0" />
      </div>

      {open && (
        <div className={`absolute z-[100] mt-1 w-[240px] bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200 ${
          position === 'top' ? 'bottom-full mb-1' :
          position === 'bottom-right' ? 'right-0' :
          position === 'top-right' ? 'right-0 bottom-full mb-1' :
          'top-full'
        }`}>
          <div className="relative py-1">
            {/* Center highlight row, shared across all three columns */}
            <div
              className="absolute left-2 right-2 bg-gray-100 dark:bg-gray-800 rounded-lg pointer-events-none"
              style={{ top: ITEM_H * PAD_ROWS, height: ITEM_H }}
            />
            <div className="relative grid grid-cols-3">
              <WheelColumn items={HOURS} value={hour12} onChange={(h) => emit(h, minute, meridiem)} />
              <WheelColumn items={MINUTES} value={minute} onChange={(m) => emit(hour12, m, meridiem)} />
              <WheelColumn items={MERIDIEMS} value={meridiem} onChange={(mer) => emit(hour12, minute, mer)} />
            </div>
          </div>
          <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
            <button type="button" onClick={() => { onChange(''); setOpen(false) }} className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors">Clear</button>
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-1.5 bg-brand hover:bg-brand-dark text-white text-xs font-bold rounded-lg transition-all active:scale-95">Done</button>
          </div>
        </div>
      )}
    </div>
  )
}
