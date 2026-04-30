import { RefreshCw } from 'lucide-react'

export default function CommissionOverviewChart() {
  return (
    <div className="bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-blue-100/50 dark:shadow-blue-900/20 rounded-2xl p-5 shadow-md shadow-blue-100/50 dark:shadow-blue-900/20 hover:shadow-lg hover:shadow-blue-200/50 dark:hover:shadow-blue-900/30 transition-all duration-200">
      <h2 className="font-display text-base font-semibold text-gray-900 dark:text-white mb-1">Commission Overview</h2>
      <p className="text-sm text-gray-500 dark:text-[#888] mb-4">Earnings and projections</p>
      <div className="h-64 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-xl">
        <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-3">
          <RefreshCw size={24} className="text-[#0082f3] opacity-20" />
        </div>
        <p className="text-sm font-medium">Coming Soon</p>
        <p className="text-xs">Real-time commission tracking</p>
      </div>
    </div>
  )
}
