import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Users, Calendar, Phone, Building2 } from 'lucide-react'

export default function DashboardStats({ loading }) {
  const navigate = useNavigate()
  const { stats } = useSelector((s) => s.dashboard)

  const statsConfig = [
    {
      label: 'Total Leads',
      value: stats?.total_leads || '0',
      change: stats?.leads_change || '0%',
      icon: Users,
      color: 'text-[#0082f3] bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400',
      path: '/leads'
    },
    {
      label: 'Total Site Visits',
      value: stats?.total_visits || '0',
      change: stats?.visits_change || '0%',
      icon: Calendar,
      color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400',
      path: '/site-visits'
    },
    {
      label: 'Total Follow ups',
      value: stats?.total_followups || '0',
      change: stats?.followups_change || '0%',
      icon: Phone,
      color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
      path: '/follow-ups'
    },
    {
      label: 'Total Projects',
      value: stats?.total_projects || '0',
      change: stats?.projects_change || '0%',
      icon: Building2,
      color: 'text-blue-700 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300',
      path: '/projects'
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-200 dark:border-gray-700 animate-pulse shadow-md shadow-blue-100/50 dark:shadow-blue-900/20">
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
      {statsConfig.map((stat, i) => (
        <div 
          key={i} 
          onClick={() => navigate(stat.path)}
          className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md shadow-blue-100/50 dark:shadow-blue-900/20 hover:shadow-xl hover:shadow-blue-200/50 dark:hover:shadow-black/50 transition-all duration-300 cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-110 ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              stat.change?.startsWith('+') 
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
