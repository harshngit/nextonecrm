import { useState, useEffect, useRef } from 'react'
import { DayPicker } from 'react-day-picker'
import { Calendar as CalendarIcon, X as ClearIcon, ChevronLeft, ChevronRight } from 'lucide-react'

// Parse/format 'YYYY-MM-DD' using local-time Date construction — never
// `new Date(str)` — to avoid the classic UTC-offset off-by-one-day bug.
const parseYMD = (s) => {
  if (!s) return undefined
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const formatYMD = (date) => {
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
const formatDisplay = (s) => {
  if (!s) return ''
  return parseYMD(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Own caption/nav are rendered by us (see header above DayPicker), so DayPicker's
// built-in ones are hidden here rather than removed — keeps the day-grid itself
// untouched while we drive month navigation and the year-grid view ourselves.
const classNames = {
  root: 'p-3 font-sans',
  months: 'flex flex-col',
  month_caption: 'hidden',
  nav: 'hidden',
  month_grid: 'w-full border-collapse',
  weekdays: 'flex',
  weekday: 'w-9 text-[11px] font-medium text-gray-400 uppercase',
  week: 'flex w-full mt-1',
  day: 'w-9 h-9 text-center text-sm p-0 relative',
  day_button: 'w-9 h-9 rounded-lg flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-brand/10 hover:text-brand transition-colors',
  today: 'font-bold text-brand',
  selected: '[&>button]:bg-brand [&>button]:text-white [&>button]:hover:bg-brand-dark [&>button]:hover:text-white',
  outside: 'text-gray-300 dark:text-gray-600 opacity-50',
  disabled: 'text-gray-300 dark:text-gray-700 opacity-40 cursor-not-allowed [&>button]:hover:bg-transparent [&>button]:hover:text-gray-300',
}

const SIZE_CLASSES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-3 py-2.5 text-sm',
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const YEAR_GRID_SIZE = 12

export default function DatePicker({
  value,
  onChange,
  label,
  required = false,
  placeholder = 'Select date',
  min,
  max,
  fromYear,
  toYear,
  icon: Icon = CalendarIcon,
  iconColor = 'text-gray-400',
  size = 'md',
}) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState('bottom')
  const [view, setView] = useState('day') // 'day' | 'year'
  const [month, setMonth] = useState(() => parseYMD(value) || new Date())
  const [yearBlockStart, setYearBlockStart] = useState(() => {
    const y = (parseYMD(value) || new Date()).getFullYear()
    return y - (y % YEAR_GRID_SIZE)
  })
  const containerRef = useRef(null)

  const currentYear = new Date().getFullYear()
  const minYear = fromYear ?? currentYear - 100
  const maxYear = toYear ?? currentYear + 10

  useEffect(() => {
    const fn = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  useEffect(() => {
    if (open) {
      // Reset to the selected date's month/view each time the picker opens.
      const base = parseYMD(value) || new Date()
      setMonth(base)
      setYearBlockStart(base.getFullYear() - (base.getFullYear() % YEAR_GRID_SIZE))
      setView('day')
    }
  }, [open])

  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      const spaceRight = window.innerWidth - rect.right

      let next = 'bottom'
      if (spaceBelow < 360 && spaceAbove > spaceBelow) next = 'top'
      if (spaceRight < 220) next = next.replace('bottom', 'bottom-right').replace('top', 'top-right')
      setPosition(next)
    }
  }, [open, view])

  const disabledMatchers = []
  if (min) disabledMatchers.push({ before: parseYMD(min) })
  if (max) disabledMatchers.push({ after: parseYMD(max) })

  const prevMonth = () => setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  const nextMonth = () => setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))

  const pickYear = (y) => {
    setMonth(m => new Date(y, m.getMonth(), 1))
    setView('day')
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
        className={`w-full flex items-center gap-2.5 border rounded-xl cursor-pointer transition-all select-none ${SIZE_CLASSES[size]}
          ${open
            ? 'border-brand bg-white dark:bg-gray-800 ring-1 ring-brand/20'
            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
      >
        {Icon && <Icon size={14} className={`flex-shrink-0 ${iconColor}`} />}
        <span className={`flex-1 ${value ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
          {value ? formatDisplay(value) : placeholder}
        </span>
      </div>

      {/* Hidden native input keeps HTML5 required/constraint-validation working
          for forms that rely on it to block submission (this component has no
          native form-control semantics of its own). */}
      {required && (
        <input
          type="date"
          required
          tabIndex={-1}
          value={value || ''}
          onChange={() => {}}
          className="absolute w-0 h-0 opacity-0 pointer-events-none"
          aria-hidden="true"
        />
      )}

      {open && (
        <div className={`absolute z-[100] mt-1 w-[300px] bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200 ${
          position === 'top' ? 'bottom-full mb-1' :
          position === 'bottom-right' ? 'right-0' :
          position === 'top-right' ? 'right-0 bottom-full mb-1' :
          'top-full'
        }`}>
          {view === 'day' ? (
            <>
              <div className="flex items-center justify-between px-3 pt-3 pb-1">
                <button type="button" onClick={prevMonth}
                  className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-brand transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <button type="button" onClick={() => setView('year')}
                  className="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:text-brand transition-colors px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  {MONTH_NAMES[month.getMonth()]} {month.getFullYear()}
                </button>
                <button type="button" onClick={nextMonth}
                  className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-brand transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
              <DayPicker
                mode="single"
                month={month}
                onMonthChange={setMonth}
                selected={parseYMD(value)}
                onSelect={(d) => { onChange(d ? formatYMD(d) : ''); setOpen(false) }}
                disabled={disabledMatchers.length ? disabledMatchers : undefined}
                classNames={classNames}
              />
            </>
          ) : (
            <div>
              <div className="flex items-center justify-between px-3 pt-3 pb-1">
                <button type="button" onClick={() => setYearBlockStart(y => y - YEAR_GRID_SIZE)}
                  disabled={yearBlockStart - 1 < minYear}
                  className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-brand transition-colors disabled:opacity-30 disabled:pointer-events-none">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {yearBlockStart} - {yearBlockStart + YEAR_GRID_SIZE - 1}
                </span>
                <button type="button" onClick={() => setYearBlockStart(y => y + YEAR_GRID_SIZE)}
                  disabled={yearBlockStart + YEAR_GRID_SIZE > maxYear}
                  className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-brand transition-colors disabled:opacity-30 disabled:pointer-events-none">
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 p-4">
                {Array.from({ length: YEAR_GRID_SIZE }, (_, i) => yearBlockStart + i).map((y) => (
                  <button
                    key={y}
                    type="button"
                    disabled={y < minYear || y > maxYear}
                    onClick={() => pickYear(y)}
                    className={`py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-30 disabled:pointer-events-none ${
                      y === month.getFullYear()
                        ? 'bg-brand text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-brand/10 hover:text-brand'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800 flex justify-end">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors"
            >
              <ClearIcon size={11} /> Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
