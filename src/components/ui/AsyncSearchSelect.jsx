import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, Search, X } from 'lucide-react'

export default function AsyncSearchSelect({
  label,
  placeholder = 'Search...',
  value,
  onChange,
  onSearch,            // async fn(query) → [{ value, label }]
  onTextChange,        // called with raw typed text as the user types, and with '' when cleared
  fallbackToInput = false, // when true: switch to plain-text input if search returns no results
  defaultText = '',    // pre-fill free text on mount (edit mode with no project_id)
  initialOptions = [],
  required = false,
  searchable = true,
  disabled = false,
}) {
  const initInputMode = fallbackToInput && !!defaultText && !value
  const [query,     setQuery]     = useState('')
  const [options,   setOptions]   = useState(initialOptions)
  const [open,      setOpen]      = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [display,   setDisplay]   = useState(initInputMode ? defaultText : '')
  const [inputMode, setInputMode] = useState(initInputMode) // true = plain-text / no-dropdown mode
  const [dropdownPosition, setDropdownPosition] = useState('bottom')
  const ref          = useRef(null)
  const timer        = useRef(null)
  const inputModeRef = useRef(initInputMode) // stable ref so useEffect can read without deps
  inputModeRef.current = inputMode

  // Sync display label when value or options change externally
  useEffect(() => {
    if (!value) {
      if (!inputModeRef.current) setDisplay('')
      return
    }
    const found = options.find(o => String(o.value) === String(value))
    if (found) { setDisplay(found.label); setInputMode(false) }
  }, [value, options])

  // Close on outside click
  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  // Detect dropdown position
  useEffect(() => {
    if (open && ref.current) {
      const rect = ref.current.getBoundingClientRect()
      let pos = 'bottom'
      if (window.innerHeight - rect.bottom < 280 && rect.top > window.innerHeight - rect.bottom) pos = 'top'
      if (window.innerWidth - rect.right < 200) pos = pos.replace('bottom', 'bottom-right').replace('top', 'top-right')
      setDropdownPosition(pos)
    }
  }, [open])

  const runSearch = useCallback(async (q) => {
    setLoading(true)
    try {
      const results = await onSearch(q)
      setOptions(results)
      if (fallbackToInput && q.length >= 1) {
        const noMatch = results.length === 0
        setInputMode(noMatch)
        // if results came back after being in input-mode, open the dropdown
        if (!noMatch) setOpen(true)
      }
    } catch {
      setOptions([])
      if (fallbackToInput) setInputMode(true)
    } finally {
      setLoading(false)
    }
  }, [onSearch, fallbackToInput])

  const handleInput = e => {
    const q = e.target.value
    setQuery(q)
    setDisplay(q)
    clearTimeout(timer.current)
    onTextChange?.(q)
    if (q.length >= 1) {
      // only open dropdown when not in input-mode; runSearch will open it if results found
      if (!open && !inputModeRef.current) setOpen(true)
      timer.current = setTimeout(() => runSearch(q), 300)
    } else {
      setOptions(initialOptions)
      if (fallbackToInput) setInputMode(false)
      setOpen(true) // show initial options when text cleared
    }
  }

  const handleFocus = () => {
    // restore typed text when refocusing a field that has free text but no selected ID
    if (!value && display) setQuery(display)
    // don't open dropdown when in plain-text input mode
    if (!inputModeRef.current) setOpen(true)
    if (!inputModeRef.current && options.length === 0 && initialOptions.length === 0) runSearch('')
  }

  const select = opt => {
    onChange(opt.value)
    setDisplay(opt.label)
    setQuery('')
    setOpen(false)
    setInputMode(false)
    // No onTextChange('') here — callers that also track free text
    // (id/text dual-binding forms) already clear their text field inside
    // onChange. Calling both re-fires the text handler after the id handler,
    // and in every such caller that handler unconditionally resets the id
    // back to '' — wiping out the selection this function just made.
  }

  const clear = e => {
    e.stopPropagation()
    onChange('')
    setDisplay('')
    setQuery('')
    setOptions(initialOptions)
    setInputMode(false)
    onTextChange?.('')
  }

  const ic = `w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm transition-all pr-9`
  const dropCls = `absolute z-[9999] w-full mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl ${
    dropdownPosition === 'top'         ? 'bottom-full mb-1' :
    dropdownPosition === 'bottom-right'? 'right-0' :
    dropdownPosition === 'top-right'   ? 'right-0 bottom-full mb-1' : 'top-full'
  }`

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
          {!loading && (value || inputMode) && (
            <button type="button" onClick={clear} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={13} />
            </button>
          )}
          {!loading && !value && !inputMode && <Search size={13} className="text-gray-300" />}
        </div>
      </div>

      {/* Dropdown — hidden in plain-text mode */}
      {open && !inputMode && options.length > 0 && (
        <div className={`${dropCls} max-h-52 overflow-y-auto`}>
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

      {/* "No results" message — only shown when fallbackToInput is OFF */}
      {open && !inputMode && !fallbackToInput && options.length === 0 && !loading && query.length >= 1 && (
        <div className={`${dropCls} px-3 py-3 text-xs text-gray-400 text-center`}>
          No results for "{query}"
        </div>
      )}
    </div>
  )
}
