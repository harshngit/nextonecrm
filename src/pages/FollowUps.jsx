import { useState, useEffect } from 'react'
import { CheckCircle, Clock, AlertCircle, Phone } from 'lucide-react'
import ListSkeleton from '../components/loaders/ListSkeleton'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import { mockFollowUps } from '../mockData'

function FollowUpCard({ item, onComplete }) {
  const statusStyle = {
    overdue: 'border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10 shadow-sm',
    pending: 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] shadow-sm',
    upcoming: 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] shadow-sm',
    completed: 'border-green-200 dark:border-green-900/50 bg-green-50/50 dark:bg-green-900/10 opacity-60',
  }

  return (
    <div className={`border rounded-xl p-4 ${statusStyle[item.status]} hover:shadow-md transition-all duration-200`}>
      <div className="flex items-start gap-3">
        <Avatar name={item.leadName} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{item.leadName}</span>
            {item.status === 'overdue' && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full">
                <AlertCircle size={10} /> Overdue
              </span>
            )}
          </div>
          <div className="text-xs text-gray-400 dark:text-[#888] mt-0.5">{item.phone} · {item.project}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">"{item.lastInteraction}"</div>
          <div className="flex items-center gap-1 mt-1.5">
            <Clock size={11} className={item.status === 'overdue' ? 'text-red-500' : 'text-brand'} />
            <span className={`text-xs font-medium ${item.status === 'overdue' ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-[#888]'}`}>
              {item.dueDate} at {item.dueTime}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <Button size="sm" variant="ghost" icon={Phone} className="text-xs">Call</Button>
          {item.status !== 'completed' && (
            <Button size="sm" variant="secondary" onClick={() => onComplete(item.id)} className="text-xs">Done</Button>
          )}
        </div>
      </div>
    </div>
  )
}

const Section = ({ title, items, icon: Icon, iconColor, accent, onComplete }) => (
  items.length > 0 && (
    <div className={`bg-white dark:bg-[#1a1a1a] border ${accent || 'border-gray-200 dark:border-gray-800'} rounded-2xl p-5 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon size={16} className={iconColor} />
          <h3 className={`font-display text-sm font-semibold ${iconColor}`}>{title}</h3>
          <span className="w-5 h-5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs flex items-center justify-center font-bold text-gray-600 dark:text-gray-400">{items.length}</span>
        </div>
      </div>
      <div className="space-y-3">
        {items.map(item => <FollowUpCard key={item.id} item={item} onComplete={onComplete} />)}
      </div>
    </div>
  )
)

export default function FollowUps() {
  const [loading, setLoading] = useState(false)
  const [followUps, setFollowUps] = useState(mockFollowUps)

  useEffect(() => {
    // No artificial delays
  }, [])

  const handleComplete = (id) => {
    setFollowUps(prev => prev.map(f => f.id === id ? { ...f, status: 'completed' } : f))
  }

  const today = followUps.filter(f => f.status === 'pending')
  const overdue = followUps.filter(f => f.status === 'overdue')
  const upcoming = followUps.filter(f => f.status === 'upcoming')
  const completed = followUps.filter(f => f.status === 'completed')

  if (loading) return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 rounded-2xl p-4">
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-3 animate-pulse" />
          <ListSkeleton rows={2} />
        </div>
      ))}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Today's Tasks", count: today.length, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Overdue', count: overdue.length, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
          { label: 'Upcoming', count: upcoming.length, color: 'text-brand', bg: 'bg-brand/10 dark:bg-brand/15' },
          { label: 'Completed', count: completed.length, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl px-4 py-3`}>
            <div className={`text-2xl font-display font-bold ${s.color}`}>{s.count}</div>
            <div className="text-xs text-gray-500 dark:text-[#888] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <Section title="⚠️ Overdue" items={overdue} icon={AlertCircle} iconColor="text-red-600 dark:text-red-400" accent="border-red-200 dark:border-red-900/50" onComplete={handleComplete} />
      <Section title="📞 Today's Follow-ups" items={today} icon={Phone} iconColor="text-blue-600 dark:text-blue-400" onComplete={handleComplete} />
      <Section title="📅 Upcoming" items={upcoming} icon={Clock} iconColor="text-brand" onComplete={handleComplete} />
      <Section title="✅ Completed" items={completed} icon={CheckCircle} iconColor="text-green-600 dark:text-green-400" onComplete={handleComplete} />

      {followUps.length === 0 && (
        <div className="text-center py-20 text-gray-400 dark:text-[#888]">
          <div className="text-4xl mb-3">☀️</div>
          <p className="font-medium">All caught up!</p>
          <p className="text-sm">No follow-ups due.</p>
        </div>
      )}
    </div>
  )
}

