import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { fetchRevenueTrend } from '../../store/dashboardSlice'

const TIMEFRAMES = ['Week', 'Month', 'Year']

const rangeMap = { Week: 'week', Month: 'month', Year: 'year' }

export default function RevenueBookingsChart() {
  const dispatch = useDispatch()
  const [timeframe, setTimeframe] = useState('Month')
  const { revenueTrend, loading } = useSelector((s) => s.dashboard)

  useEffect(() => {
    dispatch(fetchRevenueTrend({ range: rangeMap[timeframe] }))
  }, [dispatch, timeframe])

  // Map API data → chart-friendly shape
  const chartData = (revenueTrend?.data || []).map((d) => ({
    name: d.label,
    revenue: d.total_leads,   // total_leads as revenue proxy
    booked: d.booked,
    visits: d.site_visits,
  }))

  return (
    <div className="bg-card text-card-foreground border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-md shadow-blue-100/50 dark:shadow-blue-900/20 hover:shadow-lg hover:shadow-blue-200/50 dark:hover:shadow-blue-900/30 transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-base font-semibold text-gray-900 dark:text-white">Revenue</h2>
          <p className="text-sm text-gray-500 dark:text-[#888]">
            {timeframe === 'Week' ? 'Daily overview (last 7 days)' :
             timeframe === 'Year' ? 'Yearly overview' :
             'Monthly performance overview'}
          </p>
        </div>
        <div className="flex items-center space-x-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-1 border border-gray-100 dark:border-gray-700">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                timeframe === tf
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64">
        {loading.revenue ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[#0082f3] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data for this period</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="name"
                stroke="#888"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #f3f4f6',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: '#333', fontWeight: 600 }}
                itemStyle={{ color: '#555' }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#0082f3"
                strokeWidth={2}
                dot={false}
                name="Total Leads"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}