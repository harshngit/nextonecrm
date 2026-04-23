export default function PageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#f5f2ee] dark:bg-[#0f0f0f]">
      <div className="relative flex items-center justify-center mb-8">
        {/* Outer ring */}
        <div
          className="absolute w-24 h-24 rounded-full border-4 border-transparent animate-spin"
          style={{ borderTopColor: '#b1916c', borderRightColor: '#b1916c33' }}
        />
        {/* Middle ring */}
        <div
          className="absolute w-16 h-16 rounded-full border-4 border-transparent animate-spin"
          style={{ borderTopColor: '#b1916c88', animationDirection: 'reverse', animationDuration: '0.8s' }}
        />
        {/* Inner logo */}
        <div className="w-12 h-12 rounded-full bg-brand flex items-center justify-center shadow-lg animate-pulse-ring">
          <span className="font-display font-bold text-white text-sm">N1R</span>
        </div>
      </div>

      <h1 className="font-display text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-2 tracking-wide">
        Next One Realty
      </h1>
      <p className="text-sm text-gray-500 dark:text-[#888] tracking-wider animate-pulse">
        Loading your workspace...
      </p>

      {/* Progress bar */}
      <div className="mt-8 w-48 h-0.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand rounded-full"
          style={{
            animation: 'loadbar 1.8s ease-in-out infinite',
          }}
        />
      </div>

      <style>{`
        @keyframes loadbar {
          0% { width: 0%; margin-left: 0; }
          50% { width: 70%; margin-left: 0; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  )
}
