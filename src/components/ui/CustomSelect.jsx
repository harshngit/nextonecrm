import { useState, useRef, useEffect } from 'react'
import { ChevronDown, X, Search } from 'lucide-react'

export default function CustomSelect({ value, onChange, options, placeholder = 'Select option...', label, required, multiple = false, searchable = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [dropdownPosition, setDropdownPosition] = useState('bottom') // 'bottom' or 'top' or 'bottom-right'
  const containerRef = useRef(null)
  const dropdownRef = useRef(null)
  const searchRef = useRef(null)

  const filteredOptions = searchable && search.trim()
    ? options.filter(opt =>
        opt.label.toLowerCase().includes(search.toLowerCase()) ||
        opt.sublabel?.toLowerCase().includes(search.toLowerCase())
      )
    : options

  const isValueSelected = (optValue) => {
    if (multiple) {
      return Array.isArray(value) && value.includes(optValue)
    }
    return value === optValue
  }

  const getSelectedDisplay = () => {
    if (multiple) {
      if (!Array.isArray(value) || value.length === 0) return placeholder
      const selected = options.filter(opt => value.includes(opt.value))
      if (selected.length === 1) return selected[0].label
      return `${selected.length} selected`
    }
    const selectedOption = options.find(opt => opt.value === value)
    return selectedOption ? selectedOption.label : placeholder
  }

  const handleOptionClick = (optValue) => {
    if (multiple) {
      if (Array.isArray(value) && value.includes(optValue)) {
        onChange(value.filter(v => v !== optValue))
      } else {
        onChange([...(Array.isArray(value) ? value : []), optValue])
      }
    } else {
      onChange(optValue)
      setIsOpen(false)
      setSearch('')
    }
  }

  const removeValue = (e, optValue) => {
    e.stopPropagation()
    if (multiple && Array.isArray(value)) {
      onChange(value.filter(v => v !== optValue))
    }
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && searchable) {
      setTimeout(() => searchRef.current?.focus(), 50)
    }
    if (!isOpen) setSearch('')
  }, [isOpen, searchable])

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - containerRect.bottom
      const spaceAbove = containerRect.top
      const spaceRight = window.innerWidth - containerRect.right
      
      let newPosition = 'bottom'
      if (spaceBelow < 280 && spaceAbove > spaceBelow) {
        newPosition = 'top'
      }
      
      // Check if we need to align to right edge
      if (spaceRight < 200) {
        newPosition = newPosition.replace('bottom', 'bottom-right').replace('top', 'top-right')
      }
      
      setDropdownPosition(newPosition)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          {label} {required && '*'}
        </label>
      )}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 text-sm bg-background border rounded-xl outline-none cursor-pointer flex items-center justify-between transition-all duration-200 ${
          isOpen ? 'border-brand ring-1 ring-brand/20' : 'border-[#e2e8f0] dark:border-[#2a2a2a]'
        } text-gray-900 dark:text-gray-100 shadow-sm`}
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          {multiple && Array.isArray(value) && value.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {options
                .filter(opt => value.includes(opt.value))
                .map(opt => (
                  <span key={opt.value} className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand/10 text-brand text-[11px] rounded-md">
                    {opt.label}
                    <button onClick={(e) => removeValue(e, opt.value)} className="hover:text-red-500">
                      <X size={10} />
                    </button>
                  </span>
                ))}
            </div>
          ) : (
            <span className={`truncate ${!getSelectedDisplay() || getSelectedDisplay() === placeholder ? 'text-gray-400' : ''}`}>
              {getSelectedDisplay()}
            </span>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180 text-brand' : ''}`}
        />
      </div>

      {isOpen && (
        <div ref={dropdownRef} className={`absolute z-[100] w-full mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200 ${
          dropdownPosition === 'top' ? 'bottom-full mb-1' : 
          dropdownPosition === 'bottom-right' ? 'right-0' : 
          dropdownPosition === 'top-right' ? 'right-0 bottom-full mb-1' : 
          'top-full'
        }`}>
          {searchable && (
            <div className="px-2 pt-2 pb-1 border-b border-gray-100 dark:border-gray-800">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  placeholder="Search..."
                  className="w-full pl-7 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-brand text-gray-700 dark:text-gray-300 placeholder-gray-400"
                />
                {search && (
                  <button
                    onClick={e => { e.stopPropagation(); setSearch('') }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="max-h-60 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-xs text-gray-400 text-center">
                {search ? `No results for "${search}"` : 'No options available'}
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => handleOptionClick(opt.value)}
                  className={`px-4 py-2 text-sm cursor-pointer transition-colors flex items-center gap-2 ${
                    isValueSelected(opt.value)
                      ? 'bg-brand/10 text-brand font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {multiple && (
                    <div className={`w-4 h-4 border rounded flex items-center justify-center flex-shrink-0 ${isValueSelected(opt.value) ? 'bg-brand border-brand' : 'border-gray-300 dark:border-gray-600'}`}>
                      {isValueSelected(opt.value) && <span className="text-white text-xs">✓</span>}
                    </div>
                  )}
                  {opt.color && (
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />
                  )}
                  {opt.sublabel ? (
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="truncate text-sm">{opt.label}</span>
                      <span className="flex-shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {opt.sublabel}
                      </span>
                    </div>
                  ) : (
                    <span className="truncate">{opt.label}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
