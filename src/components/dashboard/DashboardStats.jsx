import { useNavigate } from 'react-router-dom'
import { Users, Calendar, Phone, Building2 } from 'lucide-react'

export default function DashboardStats({ loading }) {
  const navigate = useNavigate()

  const stats = [
    {
      label: 'Total Leads',
      value: '2,845',
      change: '+12.5%',
      icon: Users,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
      path: '/leads'
    },
    {
      label: 'Total Site Visits',
      value: '45',
      change: '-4.3%',
      icon: Calendar,
      color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400',
      path: '/site-visits'
    },
    {
      label: 'Total Follow ups',
      value: '156',
      change: '+18.2%',
      icon: Phone,
      color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
      path: '/follow-ups'
    },
    {
      label: 'Total Projects',
      value: '12',
      change: '+5.7%',
      icon: Building2,
      color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400',
      path: '/projects'
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-200 dark:border-gray-700 animate-pulse shadow-md shadow-gray-300/50 dark:shadow-gray-900/50">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-lg"></div>
              <div className="w-16 h-4 bg-gray-50 dark:bg-gray-800 rounded"></div>
            </div>
            <div className="w-24 h-8 bg-gray-50 dark:bg-gray-800 rounded mb-2"></div>
            <div className="w-20 h-4 bg-gray-50 dark:bg-gray-800 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <div 
          key={i} 
          onClick={() => navigate(stat.path)}
          className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 hover:shadow-xl hover:shadow-gray-400/20 dark:hover:shadow-black/50 transition-all duration-300 cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-110 ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              stat.change.startsWith('+') 
                ? 'text-green-600 bg-green-50 dark:bg-green-900/20' 
                : 'text-red-600 bg-red-50 dark:bg-red-900/20'
            }`}>
              {stat.change}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">{stat.label}</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-[#0082f3] transition-colors">{stat.value}</p>
        </div>
      ))}
    </div>
  )
}


