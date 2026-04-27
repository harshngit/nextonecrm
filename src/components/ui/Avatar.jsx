const colors = [
  'bg-brand text-white',
  'bg-blue-500 text-white',
  'bg-purple-500 text-white',
  'bg-teal-500 text-white',
  'bg-rose-500 text-white',
  'bg-amber-500 text-white',
]

export default function Avatar({ name, initials, size = 'md', className = '' }) {
  const displayName = name || initials || ''
  const text = initials || (displayName ? displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?')
  const colorIndex = text.charCodeAt(0) % colors.length
  const colorClass = colors[colorIndex]

  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
    xl: 'w-14 h-14 text-lg',
  }

  return (
    <div className={`${sizes[size]} ${colorClass} rounded-full flex items-center justify-center font-semibold flex-shrink-0 ${className}`}>
      {text}
    </div>
  )
}
