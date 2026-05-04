import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { 
  ArrowLeft, Calendar, Clock, User, Phone, 
  MessageSquare, AlertCircle, CheckCircle, Loader2, 
  UserCheck, MapPin, ExternalLink, ShieldCheck, Info,
  Send, ChevronDown, CalendarPlus
} from 'lucide-react'
import { fetchFollowUpById, clearCurrentTask, completeFollowUp } from '../store/followUpSlice'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import ConvertFollowUpModal from '../components/modals/ConvertFollowUpModal'

export default function FollowUpDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const { currentTask: task, detailLoading, actionLoading } = useSelector(s => s.followUps)
  const [completeNotes, setCompleteNotes] = useState('')
  const [showConvertModal, setShowConvertModal] = useState(false)

  useEffect(() => {
    dispatch(fetchFollowUpById(id))
    return () => dispatch(clearCurrentTask())
  }, [dispatch, id])

  useEffect(() => {
    if (task?.completion_notes) setCompleteNotes(task.completion_notes)
  }, [task])

  if (detailLoading && !task) return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <Loader2 className="animate-spin text-brand mb-4" size={40} />
      <p className="text-gray-500 font-medium">Loading follow-up details...</p>
    </div>
  )

  if (!task && !detailLoading) return (
    <div className="flex items-center justify-center h-[60vh] text-gray-400 dark:text-[#888]">
      <div className="text-center max-w-sm px-6">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">📞</div>
        <h3 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-2">Follow-up not found</h3>
        <Button variant="outline" onClick={() => navigate('/follow-ups')} className="mt-4 rounded-xl">Back to Follow-ups</Button>
      </div>
    </div>
  )

  const priorityStyle = {
    high:   'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    medium: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    low:    'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
  }

  const handleMarkDone = async () => {
    const result = await dispatch(completeFollowUp({ id, notes: completeNotes }))
    if (completeFollowUp.fulfilled.match(result)) {
      dispatch(fetchFollowUpById(id))
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12">
      {/* Top Header / Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/follow-ups')}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 flex items-center justify-center group-hover:border-brand/30 transition-all">
            <ArrowLeft size={16} />
          </div>
          Back to Follow-ups
        </button>
        
        <div className="flex gap-2">
          {!task?.is_completed && (
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-xl border-purple-200 hover:border-purple-300 hover:bg-purple-50 text-purple-600 dark:border-purple-900/30 dark:hover:bg-purple-900/20"
              onClick={() => setShowConvertModal(true)}
            >
              <CalendarPlus size={14} className="mr-2" /> Schedule Visit
            </Button>
          )}
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => navigate(`/leads/${task.lead_id}`)}>
            View Lead Profile
          </Button>
          <Button size="sm" className="rounded-xl px-5 font-bold shadow-lg shadow-blue-100/50">
            Edit Task
          </Button>
        </div>
      </div>

      {task && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Main Info (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. Profile Header Card */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] overflow-hidden shadow-sm hover:shadow-md transition-all">
              <div className="h-24 bg-gradient-to-r from-blue-500 to-[#0082f3] relative opacity-10 dark:opacity-20" />
              <div className="px-8 pb-8 relative">
                <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-10">
                  <div className="p-1.5 bg-white dark:bg-[#1a1a1a] rounded-[28px] shadow-xl">
                    <div className="w-24 h-24 md:w-32 md:h-32 bg-brand rounded-[22px] flex items-center justify-center text-white">
                      <Phone size={48} />
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 mb-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">{task.title || 'Follow-up Interaction'}</h1>
                      <Badge label={task.is_completed ? 'Completed' : 'Pending'} variant={task.is_completed ? 'success' : 'warning'} className="px-3 py-1 text-xs" />
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-brand" /> ID: {task.id?.slice?.(0, 8) || task.id}</span>
                      <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg font-bold uppercase text-[10px] ${priorityStyle[task.priority] || priorityStyle.medium}`}>
                        {task.priority} Priority
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-10">
                  {[
                    { icon: Calendar, label: 'Due Date', value: new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }), color: 'text-blue-600 bg-blue-50' },
                    { icon: Clock, label: 'Due Time', value: task.due_date ? new Date(task.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Anytime', color: 'text-indigo-600 bg-indigo-50' },
                    { icon: User, label: 'Lead Name', value: task.lead_name || '—', color: 'text-purple-600 bg-purple-50' },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="p-4 rounded-2xl border border-gray-50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-[#0f0f0f]/50">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color} dark:bg-opacity-10`}>
                          <Icon size={14} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
                      </div>
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Interaction Notes */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <MessageSquare size={18} className="text-brand" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">Interaction Notes</h3>
                  <p className="text-xs text-gray-400">Context and instructions for this follow-up</p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-[#0f0f0f] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 min-h-[120px]">
                {task.notes ? (
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{task.notes}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">No detailed notes provided for this follow-up.</p>
                )}
              </div>
            </div>

            {/* 3. Completion Feedback */}
            {task.is_completed && (
              <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                    <CheckCircle size={18} className="text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">Completion Summary</h3>
                    <p className="text-xs text-gray-400">Outcome recorded when task was marked done</p>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-[#0f0f0f] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 min-h-[100px]">
                  {task.completion_notes ? (
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{task.completion_notes}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No completion notes recorded.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 4. Mark Outcome Card (Only if not completed) */}
            {!task.is_completed && (
              <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
                <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                  <CheckCircle size={18} className="text-green-500" /> Mark as Done
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 px-1">Completion Notes</label>
                    <textarea
                      value={completeNotes}
                      onChange={e => setCompleteNotes(e.target.value)}
                      placeholder="Discussed pricing, client will visit site on Sunday..."
                      rows={4}
                      className="w-full px-4 py-3 text-sm bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-2xl outline-none focus:border-brand transition-all resize-none text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  
                  <Button 
                    className="w-full rounded-2xl py-3 font-bold shadow-lg shadow-blue-500/20" 
                    onClick={handleMarkDone} 
                    loading={actionLoading}
                  >
                    ✓ Complete Task
                  </Button>
                </div>
              </div>
            )}

            {/* 5. Lead Information */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
              <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <User size={18} className="text-blue-500" /> Lead Information
              </h3>
              
              <div className="p-4 rounded-[20px] bg-gray-50/50 dark:bg-[#0f0f0f]/50 border border-gray-50 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#0f0f0f] transition-all"
                onClick={() => navigate(`/leads/${task.lead_id}`)}>
                <div className="flex items-center gap-4">
                  <Avatar name={task.lead_name} size="lg" className="rounded-2xl" />
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">{task.lead_name || 'Lead Name'}</div>
                    <div className="text-[10px] font-bold text-brand uppercase tracking-wider mt-0.5">Prospect</div>
                    <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                      <ExternalLink size={10} /> View Profile
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 6. Quick Contact */}
            {task.lead_phone && (
              <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
                <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-5">Quick Contact</h3>
                <a href={`tel:${task.lead_phone}`} className="flex items-center justify-between p-4 rounded-[20px] bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 group hover:bg-green-500 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center text-green-600 group-hover:bg-white/20 group-hover:text-white">
                      <Phone size={18} />
                    </div>
                    <div className="text-sm font-bold text-green-700 dark:text-green-400 group-hover:text-white">{task.lead_phone}</div>
                  </div>
                  <ArrowLeft size={16} className="text-green-400 rotate-180 group-hover:text-white" />
                </a>
              </div>
            )}

            {/* 7. Assigned To */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
              <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <UserCheck size={18} className="text-teal-500" /> Assigned To
              </h3>
              
              <div className="p-4 rounded-[20px] bg-gray-50/50 dark:bg-[#0f0f0f]/50 border border-gray-50 dark:border-gray-800">
                <div className="flex items-center gap-4">
                  <Avatar name={task.assigned_to_name} size="lg" className="rounded-2xl" />
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">{task.assigned_to_name || 'Team Member'}</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Sales Executive</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {showConvertModal && task && (
        <ConvertFollowUpModal
          task={task}
          onClose={() => setShowConvertModal(false)}
          onSuccess={() => {
            setShowConvertModal(false)
            dispatch(fetchFollowUpById(id))
          }}
        />
      )}
    </div>
  )
}
