import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { ArrowLeft, Phone, Mail, Building2, Calendar, Send, ChevronDown, Loader2, UserCheck } from 'lucide-react'
import { fetchLeadById, fetchLeadActivities, addLeadNote, updateLeadStatus, clearCurrentLead } from '../store/leadSlice'
import { fetchUsers } from '../store/userSlice'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'

const leadStages = ['New', 'Contacted', 'Interested', 'Follow-up', 'Site Visit Scheduled', 'Site Visit Done', 'Negotiation', 'Booked', 'Lost']

const activityIconMap = {
  status_change: { emoji: '🔄', color: 'bg-blue-50 dark:bg-blue-900/20' },
  note: { emoji: '📝', color: 'bg-gray-50 dark:bg-gray-800' },
  followup: { emoji: '📞', color: 'bg-purple-50 dark:bg-purple-900/20' },
  visit_scheduled: { emoji: '📅', color: 'bg-teal-50 dark:bg-teal-900/20' },
  visit_done: { emoji: '✅', color: 'bg-green-50 dark:bg-green-900/20' },
  created: { emoji: '🆕', color: 'bg-yellow-50 dark:bg-yellow-900/20' },
  reassigned: { emoji: '👤', color: 'bg-indigo-50 dark:bg-indigo-900/20' },
}

export default function LeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const { currentLead: lead, activities, detailLoading, actionLoading } = useSelector(s => s.leads)
  const { list: userList } = useSelector(s => s.users)

  const [note, setNote] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [noteError, setNoteError] = useState('')

  useEffect(() => {
    dispatch(fetchLeadById(id))
    dispatch(fetchLeadActivities(id))
    dispatch(fetchUsers())
    return () => dispatch(clearCurrentLead())
  }, [dispatch, id])

  useEffect(() => {
    if (lead?.status) setNewStatus(lead.status)
  }, [lead])

  if (detailLoading && !lead) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-brand" size={32} />
    </div>
  )

  if (!lead && !detailLoading) return (
    <div className="flex items-center justify-center h-64 text-gray-400 dark:text-[#888]">
      <div className="text-center">
        <div className="text-4xl mb-2">🔍</div>
        <div className="font-medium">Lead not found</div>
        <Button variant="ghost" onClick={() => navigate('/leads')} className="mt-3">Back to Leads</Button>
      </div>
    </div>
  )

  const stageIndex = leadStages.indexOf(lead?.status)

  const handleAddNote = async () => {
    if (!note.trim()) { setNoteError('Note cannot be empty'); return }
    setNoteError('')
    const result = await dispatch(addLeadNote({ id, note }))
    if (addLeadNote.fulfilled.match(result)) {
      setNote('')
      // Refresh activities
      dispatch(fetchLeadActivities(id))
    }
  }

  const handleStatusChange = async () => {
    if (newStatus === lead.status) return
    await dispatch(updateLeadStatus({ id, status: newStatus }))
    dispatch(fetchLeadById(id))
    dispatch(fetchLeadActivities(id))
  }

  const assignedUser = userList.find(u => u.id === lead?.assigned_to)

  return (
    <div className="space-y-4">
      {/* Back */}
      <button
        onClick={() => navigate('/leads')}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-[#888] hover:text-brand transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Leads
      </button>

      {lead && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-3 space-y-4">

            {/* Lead Info Card */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-2xl p-6">
              <div className="flex items-start gap-4 mb-5">
                <Avatar name={lead.name} size="xl" />
                <div className="flex-1">
                  <h2 className="font-display text-xl font-semibold text-gray-900 dark:text-white">{lead.name}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge label={lead.status || 'New'} />
                    <span className="text-xs text-gray-400 dark:text-[#888]">Lead #{lead.id?.slice?.(0, 8) || lead.id}</span>
                    {lead.source_name && (
                      <span className="text-xs px-2 py-0.5 bg-brand/10 text-brand rounded-lg">{lead.source_name}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: Phone, label: 'Phone', value: lead.phone },
                  { icon: Mail, label: 'Email', value: lead.email || '—' },
                  { icon: Building2, label: 'Project', value: lead.project_name || '—' },
                  { icon: Calendar, label: 'Created', value: lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '—' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3 p-3 bg-[#f5f2ee] dark:bg-[#0f0f0f] rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
                      <Icon size={14} className="text-brand" />
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400 dark:text-[#888] uppercase tracking-wide">{label}</div>
                      <div className="text-sm text-gray-800 dark:text-gray-200 font-medium">{value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {lead.budget && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl">
                  <div className="text-xs font-medium text-green-700 dark:text-green-400 mb-0.5">Budget</div>
                  <div className="text-sm text-green-800 dark:text-green-300">{lead.budget}</div>
                </div>
              )}

              {lead.notes && (
                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <div className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Notes</div>
                  <div className="text-sm text-amber-800 dark:text-amber-300">{lead.notes}</div>
                </div>
              )}
            </div>

            {/* Activity Timeline */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-2xl p-6">
              <h3 className="font-display text-base font-semibold text-gray-900 dark:text-white mb-4">Activity Timeline</h3>

              {/* Add Note */}
              <div className="mb-5">
                <div className="flex gap-2">
                  <textarea
                    value={note}
                    onChange={e => { setNote(e.target.value); setNoteError('') }}
                    placeholder="Add a note or update..."
                    rows={2}
                    className="flex-1 px-3 py-2 text-sm bg-[#f5f2ee] dark:bg-[#0f0f0f] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand resize-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
                  />
                  <Button icon={actionLoading ? undefined : Send} loading={actionLoading} onClick={handleAddNote} className="self-end" />
                </div>
                {noteError && <p className="text-xs text-red-500 mt-1">{noteError}</p>}
              </div>

              {activities.length === 0 ? (
                <div className="text-center py-8 text-gray-400 dark:text-[#888]">
                  <div className="text-3xl mb-2">📋</div>
                  <p className="text-sm">No activity yet</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-[#e0d8ce] dark:bg-[#2a2a2a]" />
                  <div className="space-y-4">
                    {activities.map(activity => {
                      const { emoji, color } = activityIconMap[activity.type] || { emoji: '📌', color: 'bg-gray-50 dark:bg-gray-800' }
                      return (
                        <div key={activity.id} className="flex gap-3 pl-2">
                          <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center text-sm flex-shrink-0 border-2 border-white dark:border-[#1a1a1a] relative z-10`}>
                            {emoji}
                          </div>
                          <div className="flex-1 pb-2">
                            <p className="text-sm text-gray-700 dark:text-gray-300">{activity.description}</p>
                            <p className="text-xs text-gray-400 dark:text-[#888] mt-0.5">
                              {activity.created_at ? new Date(activity.created_at).toLocaleString() : activity.timestamp}
                              {activity.user_name && ` · ${activity.user_name}`}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-4">

            {/* Stage Progress */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-2xl p-5">
              <h3 className="font-display text-sm font-semibold text-gray-900 dark:text-white mb-3">Stage Progress</h3>
              <div className="space-y-1.5">
                {leadStages.filter(s => s !== 'Lost').map((stage, i) => (
                  <div key={stage} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${i === stageIndex ? 'bg-brand/10 dark:bg-brand/15' : ''}`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${i < stageIndex ? 'bg-brand border-brand' : i === stageIndex ? 'border-brand' : 'border-gray-300 dark:border-gray-600'}`}>
                      {i < stageIndex && <div className="w-2 h-2 bg-white rounded-full" />}
                      {i === stageIndex && <div className="w-2 h-2 bg-brand rounded-full" />}
                    </div>
                    <span className={`text-xs ${i === stageIndex ? 'font-semibold text-brand' : i < stageIndex ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-400 dark:text-[#888]'}`}>{stage}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-2xl p-5">
              <h3 className="font-display text-sm font-semibold text-gray-900 dark:text-white mb-3">Update Status</h3>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value)}
                    className="w-full appearance-none px-3 py-2 text-xs bg-[#f5f2ee] dark:bg-[#0f0f0f] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100"
                  >
                    {leadStages.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <Button size="sm" onClick={handleStatusChange} loading={actionLoading} disabled={newStatus === lead.status}>
                  Update
                </Button>
              </div>
            </div>

            {/* Assigned To */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-2xl p-5">
              <h3 className="font-display text-sm font-semibold text-gray-900 dark:text-white mb-3">Assigned To</h3>
              {assignedUser ? (
                <div className="flex items-center gap-3">
                  <Avatar name={`${assignedUser.first_name} ${assignedUser.last_name}`} size="md" />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {assignedUser.first_name} {assignedUser.last_name}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-[#888]">{assignedUser.role?.replace(/_/g, ' ')}</div>
                  </div>
                </div>
              ) : lead.assigned_to_name ? (
                <div className="flex items-center gap-3">
                  <Avatar name={lead.assigned_to_name} size="md" />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{lead.assigned_to_name}</div>
                    <div className="text-xs text-gray-400">Sales Executive</div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-[#888]">Unassigned</p>
              )}
            </div>

            {/* Lead Source */}
            {(lead.source_name || lead.source) && (
              <div className="bg-white dark:bg-[#1a1a1a] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-2xl p-5">
                <h3 className="font-display text-sm font-semibold text-gray-900 dark:text-white mb-2">Source</h3>
                <span className="text-sm px-3 py-1.5 bg-brand/10 dark:bg-brand/15 text-brand rounded-xl font-medium">
                  {lead.source_name || lead.source}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}