import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, Search, X } from 'lucide-react'

export default function AsyncSearchSelect({
  label,
  placeholder = 'Search...',
  value,
  onChange,
  onSearch,           // async fn(query) → [{ value, label }]
  initialOptions = [], // pre-load options (e.g. recently used)
  required = false,
  searchable = true,
  disabled = false,
}) {
  const [query,    setQuery]    = useState('')
  const [options,  setOptions]  = useState(initialOptions)
  const [open,     setOpen]     = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [display,  setDisplay]  = useState('') // label of current value
  const ref    = useRef(null)
  const timer  = useRef(null)

  // When value is set externally, find and show its label from options
  useEffect(() => {
    if (!value) { setDisplay(''); return }
    const found = options.find(o => String(o.value) === String(value))
    if (found) setDisplay(found.label)
  }, [value, options])

  // Close on outside click
  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const runSearch = useCallback(async (q) => {
    setLoading(true)
    try {
      const results = await onSearch(q)
      setOptions(results)
    } catch { setOptions([]) }
    finally { setLoading(false) }
  }, [onSearch])

  const handleInput = e => {
    const q = e.target.value
    setQuery(q)
    setDisplay(q)
    if (!open) setOpen(true)
    clearTimeout(timer.current)
    if (q.length >= 1) {
      timer.current = setTimeout(() => runSearch(q), 300)
    } else {
      setOptions(initialOptions)
    }
  }

  const handleFocus = () => {
    setOpen(true)
    if (options.length === 0 && initialOptions.length === 0) runSearch('')
  }

  const select = opt => {
    onChange(opt.value)
    setDisplay(opt.label)
    setQuery('')
    setOpen(false)
  }

  const clear = e => {
    e.stopPropagation()
    onChange('')
    setDisplay('')
    setQuery('')
    setOptions(initialOptions)
  }

  const ic = `w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm transition-all pr-9`

  return (
    <div className="relative" ref={ref}>
      {label && (
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          {label}{required && ' *'}
        </label>
      )}
      <div className="relative">
        <input
          value={open ? query : display}
          onChange={handleInput}
          onFocus={handleFocus}
          placeholder={value && display && !open ? display : placeholder}
          disabled={disabled}
          className={ic + (disabled ? ' opacity-60 cursor-not-allowed' : ' cursor-text')}
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && <Loader2 size={13} className="animate-spin text-gray-400" />}
          {!loading && value && (
            <button type="button" onClick={clear} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={13} />
            </button>
          )}
          {!loading && !value && <Search size={13} className="text-gray-300" />}
        </div>
      </div>

      {open && options.length > 0 && (
        <div className="absolute z-[9999] w-full mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl max-h-52 overflow-y-auto">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => select(opt)}
              className={`w-full text-left px-3 py-2.5 text-sm transition-colors first:rounded-t-xl last:rounded-b-xl
                ${String(opt.value) === String(value)
                  ? 'bg-brand/10 text-brand font-semibold'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {open && options.length === 0 && !loading && query.length >= 1 && (
        <div className="absolute z-[9999] w-full mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl px-3 py-3 text-xs text-gray-400 text-center">
          No results for "{query}"
        </div>
      )}
    </div>
  )
}
