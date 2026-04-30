import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { MapPin } from 'lucide-react'

function formatTime(timeStr) {
  if (!timeStr) return ''
  // timeStr comes as "10:00:00" from Postgres TIME column
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12  = hour % 12 || 12
  return `${h12}:${m} ${ampm}`
}

const STATUS_COLORS = {
  scheduled:   'text-gray-500 dark:text-gray-400',
  rescheduled: 'text-amber-500',
  confirmed:   'text-green-600',
  done:        'text-blue-500',
  cancelled:   'text-red-500',
}

export default function UpcomingSiteVisits() {
  const navigate = useNavigate()
  const { upcomingSiteVisits, loading } = useSelector((s) => s.dashboard)

  return (
    <div className="bg-card text-card-foreground border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-md shadow-blue-100/50 dark:shadow-blue-900/20 hover:shadow-lg hover:shadow-blue-200/50 dark:hover:shadow-blue-900/30 transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-base font-semibold text-gray-900 dark:text-white">Upcoming Site Visits</h2>
        <button
          onClick={() => navigate('/site-visits')}
          className="text-sm text-[#0082f3] hover:underline"
        >
          View All
        </button>
      </div>

      {loading.siteVisits ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex-shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-3 w-28 bg-gray-100 dark:bg-gray-800 rounded" />
                  <div className="h-2.5 w-20 bg-gray-100 dark:bg-gray-800 rounded" />
                </div>
              </div>
              <div className="space-y-1.5 text-right">
                <div className="h-3 w-16 bg-gray-100 dark:bg-gray-800 rounded" />
                <div className="h-2.5 w-12 bg-gray-100 dark:bg-gray-800 rounded ml-auto" />
              </div>
            </div>
          ))}
        </div>
      ) : upcomingSiteVisits.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-gray-400 text-sm">No upcoming visits</div>
      ) : (
        <div className="space-y-4">
          {upcomingSiteVisits.map((visit) => (
            <div key={visit.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                  <MapPin size={16} className="text-[#0082f3]" />
                </div>
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{visit.lead_name}</p>
                  <p className="text-xs text-gray-500 dark:text-[#888]">
                    {visit.project_name}
                    {visit.project_locality && `, ${visit.project_locality}`}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatTime(visit.visit_time)}</p>
                <p className={`text-xs capitalize ${STATUS_COLORS[visit.status] || 'text-gray-500'}`}>
                  {visit.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}