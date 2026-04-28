import { useState, useEffect } from 'react'
import { Users, TrendingUp, Calendar, Percent, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import CardSkeleton from '../components/loaders/CardSkeleton'
import ListSkeleton from '../components/loaders/ListSkeleton'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import { mockLeads, mockActivities, mockTeam, leadStages } from '../mockData'

const statCards = [
  { label: 'Total Leads', value: '20', change: '+12%', up: true, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { label: 'New Leads Today', value: '3', change: '+50%', up: true, icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
  { label: 'Site Visits This Week', value: '6', change: '-8%', up: false, icon: Calendar, color: 'text-brand', bg: 'bg-brand/10 dark:bg-brand/15' },
  { label: 'Conversion Rate', value: '15%', change: '+3%', up: true, icon: Percent, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
]

const stageCounts = leadStages.map(stage => ({
  stage,
  count: mockLeads.filter(l => l.status === stage).length,
}))

const stageColors = {
  'New': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'Contacted': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  'Interested': 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  'Follow-up': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  'Site Visit Scheduled': 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  'Site Visit Done': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  'Negotiation': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'Booked': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  'Lost': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

const activityIcons = {
  status_change: '🔄',
  note: '📝',
  followup: '📞',
  visit_scheduled: '📅',
  visit_done: '✅',
}

export default function Dashboard() {
  const [cardsLoading, setCardsLoading] = useState(false)
  const [listLoading, setListLoading] = useState(false)

  useEffect(() => {
    // No artificial delays
  }, [])

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      {cardsLoading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, i) => (
            <div key={i} className="bg-white dark:bg-[#1a1a1a] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-2xl p-5 animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                  <card.icon size={20} className={card.color} />
                </div>
                <span className={`flex items-center gap-0.5 text-xs font-medium ${card.up ? 'text-green-600' : 'text-red-500'}`}>
                  {card.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {card.change}
                </span>
              </div>
              <div className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-0.5">{card.value}</div>
              <div className="text-sm text-gray-500 dark:text-[#888]">{card.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Lead Funnel */}
      <div className="bg-white dark:bg-[#1a1a1a] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-2xl p-5">
        <h2 className="font-display text-base font-semibold text-gray-900 dark:text-white mb-4">Lead Funnel</h2>
        <div className="flex flex-wrap gap-2">
          {stageCounts.map(({ stage, count }) => (
            <div key={stage} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium ${stageColors[stage]}`}>
              <span>{stage}</span>
              <span className="w-5 h-5 rounded-full bg-white/40 dark:bg-black/20 flex items-center justify-center font-bold text-[10px]">{count}</span>
            </div>
          ))}
        </div>
        {/* Progress bar */}
        <div className="mt-4 flex h-2 rounded-full overflow-hidden gap-0.5">
          {stageCounts.filter(s => s.stage !== 'Lost').map(({ stage, count }, i) => (
            <div
              key={stage}
              className="h-full rounded-full transition-all"
              style={{
                flex: count,
                backgroundColor: ['#3b82f6','#eab308','#f97316','#a855f7','#14b8a6','#06b6d4','#f59e0b','#22c55e'][i],
                minWidth: count > 0 ? '8px' : '0',
              }}
              title={`${stage}: ${count}`}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white dark:bg-[#1a1a1a] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-2xl p-5">
          <h2 className="font-display text-base font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
          {listLoading ? (
            <ListSkeleton rows={5} />
          ) : (
            <div className="space-y-3">
              {mockActivities.slice(0, 8).map(activity => {
                const lead = mockLeads.find(l => l.id === activity.leadId)
                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                      {activityIcons[activity.type] || '📌'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium text-brand">{lead?.name}</span> — {activity.description}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-[#888] mt-0.5">{activity.timestamp} · {activity.user}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Team Performance */}
        <div className="bg-white dark:bg-[#1a1a1a] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-2xl p-5">
          <h2 className="font-display text-base font-semibold text-gray-900 dark:text-white mb-4">Team Performance</h2>
          {listLoading ? (
            <ListSkeleton rows={4} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e0d8ce] dark:border-[#2a2a2a]">
                    <th className="text-left pb-2 text-xs font-medium text-gray-500 dark:text-[#888]">Member</th>
                    <th className="text-center pb-2 text-xs font-medium text-gray-500 dark:text-[#888]">Leads</th>
                    <th className="text-center pb-2 text-xs font-medium text-gray-500 dark:text-[#888]">Visits</th>
                    <th className="text-center pb-2 text-xs font-medium text-gray-500 dark:text-[#888]">Booked</th>
                    <th className="text-center pb-2 text-xs font-medium text-gray-500 dark:text-[#888]">Conv%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0d8ce] dark:divide-[#2a2a2a]">
                  {mockTeam.filter(m => m.role !== 'Super Admin').map(member => (
                    <tr key={member.id}>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <Avatar name={member.name} size="xs" />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100 text-xs">{member.name}</div>
                            <div className="text-[10px] text-gray-400 dark:text-[#888]">{member.role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-2.5 text-gray-700 dark:text-gray-300 font-medium">{member.leadsAssigned}</td>
                      <td className="text-center py-2.5 text-gray-700 dark:text-gray-300 font-medium">{member.visitsDone}</td>
                      <td className="text-center py-2.5 text-gray-700 dark:text-gray-300 font-medium">{member.bookings}</td>
                      <td className="text-center py-2.5">
                        <span className={`text-xs font-semibold ${member.leadsAssigned > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {member.leadsAssigned > 0 ? Math.round((member.bookings / member.leadsAssigned) * 100) : 0}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
