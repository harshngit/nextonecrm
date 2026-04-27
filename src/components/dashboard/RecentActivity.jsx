import { MessageSquare, DollarSign, CreditCard } from 'lucide-react'

const mockActivities = [
  { id: 1, type: 'booking', description: 'New booking', details: 'Karthik Menon - Unit T-301', time: '2 hours ago', icon: MessageSquare, iconColor: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
  { id: 2, type: 'payment', description: 'Payment received', details: '₹10,00,000 - Token amount', time: '3 hours ago', icon: DollarSign, iconColor: 'text-green-500', bgColor: 'bg-green-50 dark:bg-green-900/20' },
  { id: 3, type: 'commission', description: 'Commission credited', details: '₹92,400 - BK-2024-0001', time: '5 hours ago', icon: CreditCard, iconColor: 'text-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-900/20' },
  { id: 4, type: 'booking', description: 'New booking', details: 'Priya Sharma - Unit A-102', time: '1 day ago', icon: MessageSquare, iconColor: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
  { id: 5, type: 'payment', description: 'Payment received', details: '₹5,00,000 - Advance payment', time: '2 days ago', icon: DollarSign, iconColor: 'text-green-500', bgColor: 'bg-green-50 dark:bg-green-900/20' },
]

export default function RecentActivity() {
  return (
    <div className="bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 rounded-2xl p-5 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 hover:shadow-lg hover:shadow-gray-300/50 dark:hover:shadow-gray-900/50 transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-base font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
        <a href="#" className="text-sm text-brand hover:underline">View All</a>
      </div>

      <div className="space-y-4">
        {mockActivities.map(activity => (
          <div key={activity.id} className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full ${activity.bgColor} flex items-center justify-center flex-shrink-0`}>
              <activity.icon size={16} className={activity.iconColor} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{activity.description}</p>
              <p className="text-xs text-gray-500 dark:text-[#888]">{activity.details}</p>
              <p className="text-xs text-gray-400 dark:text-[#888] mt-0.5">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

