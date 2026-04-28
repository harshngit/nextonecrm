import { MapPin } from 'lucide-react'

const mockUpcomingVisits = [
  { id: 1, name: 'Rajesh Khanna', location: 'Lodha Park', time: '10:00 AM', status: 'confirmed' },
  { id: 2, name: 'Priya Nair', location: 'Godrej Emerald', time: '2:00 PM', status: 'scheduled' },
  { id: 3, name: 'Vikram Shah', location: 'Prestige Global', time: '11:30 AM', status: 'scheduled' },
]

export default function UpcomingSiteVisits() {
  return (
    <div className="bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 rounded-2xl p-5 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 hover:shadow-lg hover:shadow-gray-300/50 dark:hover:shadow-gray-900/50 transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-base font-semibold text-gray-900 dark:text-white">Upcoming Site Visits</h2>
        <a href="#" className="text-sm text-brand hover:underline">View All</a>
      </div>

      <div className="space-y-4">
        {mockUpcomingVisits.map(visit => (
          <div key={visit.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                <MapPin size={16} className="text-gray-500" />
              </div>
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{visit.name}</p>
                <p className="text-xs text-gray-500 dark:text-[#888]">{visit.location}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{visit.time}</p>
              <p className="text-xs text-gray-500 dark:text-[#888] capitalize">{visit.status}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

