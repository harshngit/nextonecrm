import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { revenueBookingsData } from '../../mockData'

export default function RevenueBookingsChart() {
  const [timeframe, setTimeframe] = useState('Month') // Week, Month, Year

  return (
    <div className="bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 rounded-2xl p-5 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 hover:shadow-lg hover:shadow-gray-300/50 dark:hover:shadow-gray-900/50 transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-base font-semibold text-gray-900 dark:text-white">Revenue</h2>
          <p className="text-sm text-gray-500 dark:text-[#888]">Monthly performance overview</p>
        </div>
        <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-1 border border-gray-100 dark:border-gray-700">
          {['Week', 'Month', 'Year'].map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 rounded-md text-xs font-medium ${
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
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={revenueBookingsData}
            margin={{
              top: 5,
              right: 10,
              left: 10,
              bottom: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="name" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #f3f4f6', borderRadius: '8px' }}
              labelStyle={{ color: '#333' }}
              itemStyle={{ color: '#333' }}
            />
            <Line type="monotone" dataKey="revenue" stroke="#0082f3" strokeWidth={2} dot={false} name="Revenue (Cr)" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

