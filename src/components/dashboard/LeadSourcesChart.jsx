import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { fetchLeadSources } from '../../store/dashboardSlice'

// API returns all 15 sources with a `color` field — use it directly.
// No fallback to mockData; show empty state if API hasn't loaded yet.

const DEFAULT_COLOR = '#cbd5e1'

export default function LeadSourcesChart() {
  const dispatch = useDispatch()
  const { leadSources, loading } = useSelector((s) => s.dashboard)

  useEffect(() => {
    dispatch(fetchLeadSources())
  }, [dispatch])

  // API shape: { total, sources: [{ source, color, count, booked, percentage }] }
  // Filter to only sources that have at least 1 lead so the donut isn't empty segments
  const allSources = leadSources?.sources || []
  const chartData = allSources.filter((s) => s.count > 0)

  // Legend always shows all sources (even zero-count ones) so the UI is stable
  const legendData = allSources

  return (
    <div className="bg-card text-card-foreground border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-md shadow-blue-100/50 dark:shadow-blue-900/20 hover:shadow-lg hover:shadow-blue-200/50 dark:hover:shadow-blue-900/30 transition-all duration-200">
      <div className="mb-6">
        <h2 className="font-display text-base font-semibold text-gray-900 dark:text-white">Lead Sources</h2>
        <p className="text-sm text-gray-500 dark:text-[#888]">Distribution by source</p>
      </div>

      <div className="h-64 relative">
        {loading.leadSources ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[#0082f3] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data available</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={3}
                dataKey="count"
                nameKey="source"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || DEFAULT_COLOR}
                    stroke="none"
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [value, name]}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #f3f4f6',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend — always renders all sources; grays out zero-count ones */}
      <div className="mt-6 grid grid-cols-3 gap-y-2 gap-x-4">
        {legendData.map((entry, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{
                backgroundColor: entry.color || DEFAULT_COLOR,
                opacity: entry.count === 0 ? 0.35 : 1,
              }}
            />
            <span
              className="text-xs truncate"
              style={{
                color: entry.count === 0
                  ? 'var(--tw-prose-muted, #9ca3af)'
                  : undefined,
              }}
            >
              <span className={entry.count === 0 ? 'text-gray-400 dark:text-gray-600' : 'text-gray-600 dark:text-gray-400'}>
                {entry.source}
              </span>
            </span>
          </div>
        ))}
      </div>

      {/* Total leads count */}
      {leadSources?.total > 0 && (
        <p className="mt-4 text-xs text-gray-400 dark:text-gray-600 text-center">
          {leadSources.total.toLocaleString('en-IN')} total leads in period
        </p>
      )}
    </div>
  )
}