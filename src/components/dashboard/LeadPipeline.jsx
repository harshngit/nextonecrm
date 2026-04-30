import { useSelector } from 'react-redux'

const STAGE_COLORS = {
  Qualified:    '#0082f3',
  'Site Visit': '#00C49F',
  Negotiation:  '#339bf5',
  Booking:      '#0068c2',
  'Closed Won': '#10b981',
  'Closed Lost':'#ef4444',
}

export default function LeadPipeline() {
  const { leadPipeline, loading } = useSelector((s) => s.dashboard)

  const stages = leadPipeline?.stages || []
  const total  = leadPipeline?.total || 1   // avoid divide-by-zero

  return (
    <div className="bg-card text-card-foreground border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-md shadow-blue-100/50 dark:shadow-blue-900/20 hover:shadow-lg hover:shadow-blue-200/50 dark:hover:shadow-blue-900/30 transition-all duration-200">
      <h2 className="font-display text-base font-semibold text-gray-900 dark:text-white mb-1">Lead Pipeline</h2>
      <p className="text-sm text-gray-500 dark:text-[#888] mb-4">Current lead distribution</p>

      {loading.pipeline ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex justify-between mb-1">
                <div className="h-3 w-24 bg-gray-100 dark:bg-gray-800 rounded" />
                <div className="h-3 w-8 bg-gray-100 dark:bg-gray-800 rounded" />
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full" />
            </div>
          ))}
        </div>
      ) : stages.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-gray-400 text-sm">No pipeline data</div>
      ) : (
        <div className="space-y-4">
          {stages.map((item, i) => {
            const color = STAGE_COLORS[item.label] || '#0082f3'
            const pct   = Math.min(100, Math.round((item.value / total) * 100))
            return (
              <div key={i}>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.value.toLocaleString('en-IN')}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}