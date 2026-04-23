import { Loader2 } from 'lucide-react'

const variants = {
  primary: 'bg-brand hover:bg-brand-dark text-white shadow-sm hover:shadow-md',
  secondary: 'border-2 border-brand text-brand hover:bg-brand hover:text-white',
  ghost: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
  danger: 'bg-red-500 hover:bg-red-600 text-white shadow-sm',
  outline: 'border border-[#e0d8ce] dark:border-[#2a2a2a] text-gray-700 dark:text-gray-300 hover:border-brand dark:hover:border-brand hover:text-brand',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-base',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  iconRight: IconRight,
  children,
  className = '',
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-xl
        transition-all duration-150 select-none
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : Icon ? (
        <Icon size={14} />
      ) : null}
      {children}
      {IconRight && !loading && <IconRight size={14} />}
    </button>
  )
}
