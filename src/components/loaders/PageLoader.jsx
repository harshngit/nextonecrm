import logo from '../../asset/image.png';

export default function PageLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center backdrop-blur-xl bg-white/30 dark:bg-[#0f0f0f]/50 transition-all duration-300"
      style={{ backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
      <div className="relative flex items-center justify-center mb-10 scale-110">
        {/* Decorative background glow */}
        <div className="absolute w-32 h-32 bg-brand/10 rounded-full blur-2xl animate-pulse" />
        
        {/* Outer ring */}
        <div
          className="absolute w-32 h-32 rounded-full border-[2px] border-transparent animate-spin"
          style={{ borderTopColor: '#b1916c', borderRightColor: '#b1916c11', animationDuration: '4s' }}
        />
        {/* Middle ring */}
        <div
          className="absolute w-24 h-24 rounded-full border-[2px] border-transparent animate-spin"
          style={{ borderTopColor: '#b1916c88', borderLeftColor: '#b1916c22', animationDirection: 'reverse', animationDuration: '2.5s' }}
        />
        {/* Inner logo container - Premium Glassmorphism */}
        <div className="w-16 h-16 rounded-full bg-white/90 dark:bg-white/10 backdrop-blur-xl flex items-center justify-center shadow-[0_0_30px_rgba(177,145,108,0.2)] animate-pulse-ring border border-white/40 dark:border-white/20">
          <img src={logo} alt="NiR Logo" className="w-10 h-10 object-contain drop-shadow-sm" />
        </div>
      </div>

      <div className="text-center">
        {/* <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
          NiR <span className="text-brand/40 font-light mx-1">|</span> <span className="font-medium text-gray-600 dark:text-gray-400">Next One Realty</span>
        </h1> */}
        <p className="text-[11px] font-medium text-gray-400 dark:text-[#666] uppercase tracking-[0.2em] animate-pulse">
          Initializing Workspace
        </p>
      </div>

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
