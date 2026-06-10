import { useState, useRef, useEffect } from 'react'
import { ChevronDown, X } from 'lucide-react'

export default function CustomSelect({ value, onChange, options, placeholder = 'Select option...', label, required, multiple = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

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
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
                .slice(0, 2)
                .map(opt => (
                  <span key={opt.value} className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand/10 text-brand text-[11px] rounded-md">
                    {opt.label}
                    <button onClick={(e) => removeValue(e, opt.value)} className="hover:text-red-500">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              {value.length > 2 && (
                <span className="text-xs text-gray-500">+{value.length - 2} more</span>
              )}
            </div>
          ) : (
            <span className={`truncate ${!getSelectedDisplay() || getSelectedDisplay() === placeholder ? 'text-gray-400' : ''}`}>
              {getSelectedDisplay()}
            </span>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand' : ''}`}
        />
      </div>

      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="max-h-60 overflow-y-auto py-1">
            {options.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-400 text-center">No options available</div>
            ) : (
              options.map((opt) => (
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
                    <div className={`w-4 h-4 border rounded flex items-center justify-center ${isValueSelected(opt.value) ? 'bg-brand border-brand' : 'border-gray-300 dark:border-gray-600'}`}>
                      {isValueSelected(opt.value) && <span className="text-white text-xs">✓</span>}
                    </div>
                  )}
                  {opt.color && (
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />
                  )}
                  <span className="truncate">{opt.label}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
