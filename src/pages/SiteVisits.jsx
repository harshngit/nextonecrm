import { useState, useEffect } from 'react'
import { Plus, List, CalendarDays, ChevronDown } from 'lucide-react'
import ListSkeleton from '../components/loaders/ListSkeleton'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Avatar from '../components/ui/Avatar'
import { mockSiteVisits, mockLeads, mockTeam } from '../mockData'

export default function SiteVisits() {
  const [loading, setLoading] = useState(false)
  const [visits, setVisits] = useState(mockSiteVisits)
  const [viewMode, setViewMode] = useState('list')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ leadName: '', project: '', date: '', time: '', assignedTo: '', notes: '', status: 'Scheduled' })

  useEffect(() => {
    // No artificial delays
  }, [])

  const handleAdd = () => {
    setVisits([{ id: visits.length + 1, ...form, feedback: '' }, ...visits])
    setShowModal(false)
    setForm({ leadName: '', project: '', date: '', time: '', assignedTo: '', notes: '', status: 'Scheduled' })
  }

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay() + 1 + i)
    return d
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex bg-white dark:bg-[#1a1a1a] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-xl p-1 gap-1">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-brand text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
          >
            <List size={14} /> List
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'calendar' ? 'bg-brand text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
          >
            <CalendarDays size={14} /> Calendar
          </button>
        </div>
        <Button icon={Plus} onClick={() => setShowModal(true)}>Schedule Visit</Button>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-[#1a1a1a] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-2xl p-4">
          <ListSkeleton rows={6} />
        </div>
      ) : viewMode === 'calendar' ? (
        /* Calendar View */
        <div className="bg-white dark:bg-[#1a1a1a] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-2xl p-5">
          <h3 className="font-display text-base font-semibold text-gray-900 dark:text-white mb-4">This Week</h3>
          <div className="grid grid-cols-7 gap-2">
            {weekDates.map((date, i) => {
              const dateStr = date.toISOString().split('T')[0]
              const dayVisits = visits.filter(v => v.date === dateStr)
              const isToday = dateStr === new Date().toISOString().split('T')[0]
              return (
                <div key={i} className={`rounded-xl border ${isToday ? 'border-brand bg-brand/5 dark:bg-brand/10' : 'border-[#e0d8ce] dark:border-[#2a2a2a]'} p-2 min-h-[100px]`}>
                  <div className={`text-xs font-medium mb-1 ${isToday ? 'text-brand' : 'text-gray-500 dark:text-[#888]'}`}>{days[i]}</div>
                  <div className={`text-lg font-display font-bold mb-2 ${isToday ? 'text-brand' : 'text-gray-900 dark:text-white'}`}>{date.getDate()}</div>
                  {dayVisits.map(v => (
                    <div key={v.id} className="text-[10px] bg-brand/10 dark:bg-brand/20 text-brand rounded-lg px-1.5 py-0.5 mb-1 truncate">
                      {v.leadName}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="bg-white dark:bg-[#1a1a1a] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e0d8ce] dark:border-[#2a2a2a] bg-[#f5f2ee] dark:bg-[#0f0f0f]">
                  {['Lead Name', 'Project', 'Date & Time', 'Assigned To', 'Status', 'Feedback', 'Actions'].map(h => (
                    <th key={h} className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-[#888] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0d8ce] dark:divide-[#2a2a2a]">
                {visits.map(visit => (
                  <tr key={visit.id} className="hover:bg-[#f5f2ee] dark:hover:bg-[#0f0f0f] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={visit.leadName} size="sm" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{visit.leadName}</div>
                          <div className="text-xs text-gray-400 dark:text-[#888]">{visit.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{visit.project}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{visit.date}</div>
                      <div className="text-xs text-gray-400 dark:text-[#888]">{visit.time}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <Avatar name={visit.assignedTo} size="xs" />
                        <span className="text-xs text-gray-600 dark:text-gray-400">{visit.assignedTo}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4"><Badge label={visit.status} /></td>
                    <td className="py-3 px-4">
                      <span className="text-xs text-gray-500 dark:text-[#888] line-clamp-2 max-w-[200px]">
                        {visit.feedback || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="text-xs">Edit</Button>
                        <Button size="sm" variant="ghost" className="text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">Cancel</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Schedule Site Visit"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Schedule</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lead Name</label>
            <div className="relative">
              <select value={form.leadName} onChange={e => setForm({ ...form, leadName: e.target.value })}
                className="w-full appearance-none px-3 py-2 text-sm bg-[#f5f2ee] dark:bg-[#0f0f0f] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100">
                <option value="">Select lead...</option>
                {mockLeads.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project</label>
            <input value={form.project} onChange={e => setForm({ ...form, project: e.target.value })} placeholder="Project name"
              className="w-full px-3 py-2 text-sm bg-[#f5f2ee] dark:bg-[#0f0f0f] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#f5f2ee] dark:bg-[#0f0f0f] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time</label>
              <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#f5f2ee] dark:bg-[#0f0f0f] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign To</label>
            <select value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-[#f5f2ee] dark:bg-[#0f0f0f] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100">
              <option value="">Select...</option>
              {mockTeam.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Additional notes..."
              className="w-full px-3 py-2 text-sm bg-[#f5f2ee] dark:bg-[#0f0f0f] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand resize-none text-gray-900 dark:text-gray-100" />
          </div>
        </div>
      </Modal>
    </div>
  )
}
