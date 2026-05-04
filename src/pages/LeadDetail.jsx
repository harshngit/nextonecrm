import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { 
  ArrowLeft, Phone, Mail, MapPin, Calendar, Send, 
  ChevronDown, Loader2, UserCheck, MessageSquare, 
  Clock, CheckCircle, Info, ExternalLink, ShieldCheck,
  PlusCircle
} from 'lucide-react'
import { fetchLeadById, fetchLeadActivities, addLeadNote, updateLeadStatus, clearCurrentLead } from '../store/leadSlice'
import { fetchUsers } from '../store/userSlice'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'

const leadStages = ['New', 'Contacted', 'Interested', 'Follow-up', 'Site Visit Scheduled', 'Site Visit Done', 'Negotiation', 'Booked', 'Lost']

const activityIconMap = {
  status_change: { emoji: '🔄', color: 'bg-blue-50 dark:bg-blue-900/20', icon: Clock },
  note: { emoji: '📝', color: 'bg-gray-50 dark:bg-gray-800', icon: Info },
  followup: { emoji: '📞', color: 'bg-purple-50 dark:bg-purple-900/20', icon: Phone },
  visit_scheduled: { emoji: '📅', color: 'bg-teal-50 dark:bg-teal-900/20', icon: Calendar },
  visit_done: { emoji: '✅', color: 'bg-green-50 dark:bg-green-900/20', icon: CheckCircle },
  created: { emoji: '🆕', color: 'bg-blue-50 dark:bg-blue-900/20', icon: PlusCircle },
  reassigned: { emoji: '👤', color: 'bg-indigo-50 dark:bg-indigo-900/20', icon: UserCheck },
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
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <Loader2 className="animate-spin text-brand mb-4" size={40} />
      <p className="text-gray-500 font-medium">Loading lead profile...</p>
    </div>
  )

  if (!lead && !detailLoading) return (
    <div className="flex items-center justify-center h-[60vh] text-gray-400 dark:text-[#888]">
      <div className="text-center max-w-sm px-6">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">🔍</div>
        <h3 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-2">Lead not found</h3>
        <p className="text-sm mb-6">The lead you're looking for doesn't exist or has been moved.</p>
        <Button variant="outline" onClick={() => navigate('/leads')} className="w-full rounded-xl">Back to Leads</Button>
      </div>
    </div>
  )

  const stageIndex = leadStages.indexOf(lead?.status)
  const assignedUser = userList.find(u => u.id === lead?.assigned_to)

  const handleAddNote = async () => {
    if (!note.trim()) { setNoteError('Note cannot be empty'); return }
    setNoteError('')
    const result = await dispatch(addLeadNote({ id, note }))
    if (addLeadNote.fulfilled.match(result)) {
      setNote('')
      dispatch(fetchLeadActivities(id))
    }
  }

  const handleStatusChange = async () => {
    if (newStatus === lead.status) return
    await dispatch(updateLeadStatus({ id, status: newStatus }))
    dispatch(fetchLeadById(id))
    dispatch(fetchLeadActivities(id))
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12">
      {/* Top Header / Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/leads')}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 flex items-center justify-center group-hover:border-brand/30 transition-all">
            <ArrowLeft size={16} />
          </div>
          Back to Leads
        </button>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-xl hidden sm:flex">
            <ExternalLink size={14} className="mr-2" /> Share
          </Button>
          <Button size="sm" className="rounded-xl px-5 font-bold shadow-lg shadow-blue-100/50">
            Edit Lead
          </Button>
        </div>
      </div>

      {lead && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Main Info (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. Profile Header Card */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] overflow-hidden shadow-sm hover:shadow-md transition-all">
              <div className="h-24 bg-gradient-to-r from-blue-500 to-[#0082f3] relative opacity-10 dark:opacity-20" />
              <div className="px-8 pb-8 relative">
                <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-10">
                  <div className="p-1.5 bg-white dark:bg-[#1a1a1a] rounded-[28px] shadow-xl">
                    <Avatar name={lead.name} size="2xl" className="rounded-[22px] w-24 h-24 md:w-32 md:h-32 text-3xl" />
                  </div>
                  <div className="flex-1 space-y-2 mb-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">{lead.name}</h1>
                      <Badge label={lead.status || 'New'} className="px-3 py-1 text-xs" />
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-brand" /> ID: {lead.id?.slice?.(0, 8) || lead.id}</span>
                      <span className="flex items-center gap-1.5"><Calendar size={14} /> Created {new Date(lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-10">
                  {[
                    { icon: Phone, label: 'Phone Number', value: lead.phone, color: 'text-blue-600 bg-blue-50' },
                    { icon: Phone, label: 'Alt Phone', value: lead.alternate_phone_number || 'Not provided', color: 'text-indigo-600 bg-indigo-50' },
                    { icon: Mail, label: 'Email Address', value: lead.email || 'Not provided', color: 'text-purple-600 bg-purple-50' },
                    { icon: MapPin, label: 'Finding Location', value: lead.location_preference || 'Not specified', color: 'text-teal-600 bg-teal-50' },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="p-4 rounded-2xl border border-gray-50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-[#0f0f0f]/50">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color} dark:bg-opacity-10`}>
                          <Icon size={14} />
                        </div>
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
                      </div>
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Configuration / Notes */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <MessageSquare size={18} className="text-brand" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">Configuration</h3>
                  <p className="text-xs text-gray-400">Additional lead requirements and notes</p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-[#0f0f0f] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 min-h-[120px]">
                {lead.notes ? (
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{lead.notes}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">No configuration details provided for this lead.</p>
                )}
              </div>
            </div>

            {/* 3. Activity Timeline */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                    <Clock size={18} className="text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">Activity History</h3>
                    <p className="text-xs text-gray-400">Timeline of all interactions</p>
                  </div>
                </div>
              </div>

              {/* Add Note Input */}
              <div className="relative mb-10">
                <textarea
                  value={note}
                  onChange={e => { setNote(e.target.value); setNoteError('') }}
                  placeholder="Type a new update or note here..."
                  rows={2}
                  className="w-full pl-5 pr-14 py-4 text-sm bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-2xl outline-none focus:border-brand focus:ring-4 focus:ring-brand/5 transition-all resize-none text-gray-900 dark:text-gray-100 placeholder-gray-400 shadow-inner"
                />
                <button 
                  onClick={handleAddNote}
                  disabled={actionLoading || !note.trim()}
                  className="absolute right-3 bottom-3 w-10 h-10 bg-brand text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all"
                >
                  {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
                {noteError && <p className="text-xs text-red-500 mt-2 ml-2">{noteError}</p>}
              </div>

              {activities.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-[#0f0f0f] rounded-[24px] border-2 border-dashed border-gray-100 dark:border-gray-800">
                  <div className="text-4xl mb-3">📋</div>
                  <p className="text-sm font-medium text-gray-500">No activity recorded yet</p>
                </div>
              ) : (
                <div className="relative ml-4">
                  <div className="absolute left-0 top-2 bottom-0 w-[2px] bg-gray-100 dark:bg-gray-800" />
                  <div className="space-y-8 h-[calc(100vh-400px)] overflow-auto overflow-x-hidden">
                    {activities.map((activity, idx) => {
                      const config = activityIconMap[activity.type] || { emoji: '📌', color: 'bg-gray-50 dark:bg-gray-800', icon: Info }
                      return (
                        <div key={activity.id} className="relative pl-10 group">
                          {/* Dot on line */}
                          <div className={`absolute left-[-5px] top-2 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#1a1a1a] z-10 transition-transform group-hover:scale-125 ${idx === 0 ? 'bg-brand shadow-[0_0_0_4px_rgba(0,130,243,0.15)]' : 'bg-gray-300 dark:bg-gray-600'}`} />
                          
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-400 dark:text-gray-500">
                                {activity.created_at ? new Date(activity.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : activity.timestamp}
                              </span>
                              <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${config.color} dark:bg-opacity-10 border border-current opacity-60`}>
                                {activity.type?.replace('_', ' ')}
                              </div>
                            </div>
                            <div className="bg-gray-50/50 dark:bg-[#0f0f0f]/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 group-hover:border-brand/20 transition-all group-hover:bg-white dark:group-hover:bg-[#1a1a1a]">
                              <p className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed">{activity.note}</p>
                              {activity.performed_by && (
                                <div className="mt-3 flex items-center gap-2">
                                  <Avatar name={activity.performed_by} size="xs" />
                                  <span className="text-[11px] text-gray-400">Added by <span className="text-gray-600 dark:text-gray-200 font-semibold">{activity.performed_by}</span></span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 4. Status Update Card */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
              <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <CheckCircle size={18} className="text-green-500" /> Pipeline Status
              </h3>
              
              <div className="space-y-4">
                <div className="relative">
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value)}
                    className="w-full appearance-none pl-4 pr-10 py-3 text-sm bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-2xl outline-none focus:border-brand focus:ring-4 focus:ring-brand/5 transition-all text-gray-900 dark:text-gray-100 font-semibold"
                  >
                    {leadStages.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                
                <Button 
                  className="w-full rounded-2xl py-3 font-bold shadow-lg shadow-blue-500/20" 
                  onClick={handleStatusChange} 
                  loading={actionLoading} 
                  disabled={newStatus === lead.status}
                >
                  Update Stage
                </Button>

                <div className="pt-4 border-t border-gray-50 dark:border-gray-800">
                  <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 px-1">
                    <span>Progress</span>
                    <span>{Math.round(((stageIndex + 1) / leadStages.length) * 100)}%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-brand rounded-full transition-all duration-700 ease-out shadow-[0_0_12px_rgba(0,130,243,0.4)]"
                      style={{ width: `${((stageIndex + 1) / leadStages.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Assigned Team Member */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
              <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <UserCheck size={18} className="text-blue-500" /> Ownership
              </h3>
              
              <div className="p-4 rounded-[20px] bg-gray-50/50 dark:bg-[#0f0f0f]/50 border border-gray-50 dark:border-gray-800">
                {assignedUser ? (
                  <div className="flex items-center gap-4">
                    <Avatar name={`${assignedUser.first_name} ${assignedUser.last_name}`} size="lg" className="rounded-2xl" />
                    <div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {assignedUser.first_name} {assignedUser.last_name}
                      </div>
                      <div className="text-[10px] font-bold text-brand uppercase tracking-wider mt-0.5">{assignedUser.role?.replace(/_/g, ' ')}</div>
                      <div className="text-[11px] text-gray-400 mt-1">{assignedUser.email}</div>
                    </div>
                  </div>
                ) : lead.assigned_to_name ? (
                  <div className="flex items-center gap-4">
                    <Avatar name={lead.assigned_to_name} size="lg" className="rounded-2xl" />
                    <div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">{lead.assigned_to_name}</div>
                      <div className="text-[10px] font-bold text-brand uppercase tracking-wider mt-0.5">Sales Executive</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-400 italic mb-3">No one assigned yet</p>
                    <Button variant="outline" size="sm" className="rounded-xl w-full text-xs">Assign Member</Button>
                  </div>
                )}
              </div>
            </div>

            {/* 6. Lead Source & Metadata */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
              <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <Info size={18} className="text-teal-500" /> Additional Info
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 px-1">Source</label>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 dark:bg-teal-900/10 text-teal-700 dark:text-teal-400 rounded-xl font-bold text-xs border border-teal-100 dark:border-teal-900/30">
                    <ExternalLink size={12} />
                    {lead.source_name || lead.source || 'Direct Entry'}
                  </div>
                </div>

                {lead.project_name && (
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 px-1">Project Interest</label>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/10 text-[#0082f3] dark:text-blue-400 rounded-xl font-bold text-xs border border-blue-100 dark:border-blue-900/30">
                      <Building2 size={12} />
                      {lead.project_name}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
