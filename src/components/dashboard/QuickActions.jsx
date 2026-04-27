import { UserPlus, CalendarPlus, Book, MessageSquare } from 'lucide-react'

const quickActions = [
  { label: 'Add Lead', icon: UserPlus, bgColor: 'bg-blue-500', link: '/leads/add' },
  { label: 'Schedule Visit', icon: CalendarPlus, bgColor: 'bg-green-500', link: '/site-visits/schedule' },
  { label: 'New Booking', icon: Book, bgColor: 'bg-purple-500', link: '/bookings/add' },
  { label: 'Send WhatsApp', icon: MessageSquare, bgColor: 'bg-teal-500', link: '/whatsapp' },
]

export default function QuickActions() {
  return (
    <div className="bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 rounded-2xl p-5 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 hover:shadow-lg hover:shadow-gray-300/50 dark:hover:shadow-gray-900/50 transition-all duration-200">
      <h2 className="font-display text-base font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {quickActions.map((action, i) => (
          <a key={i} href={action.link} className="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <div className={`w-10 h-10 rounded-full ${action.bgColor} flex items-center justify-center mb-2`}>
              <action.icon size={20} className="text-white" />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center">{action.label}</span>
          </a>
        ))}
      </div>
    </div>
  )
}

