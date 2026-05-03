import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { ArrowLeft, Calendar, Clock, User, Phone, MessageSquare, AlertCircle, CheckCircle, Loader2, UserCheck, MapPin } from 'lucide-react'
import { fetchFollowUpById, clearCurrentTask } from '../store/followUpSlice'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'

export default function FollowUpDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const { currentTask: task, detailLoading } = useSelector(s => s.followUps)

  useEffect(() => {
    dispatch(fetchFollowUpById(id))
    return () => dispatch(clearCurrentTask())
  }, [dispatch, id])

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

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <button
        onClick={() => navigate('/follow-ups')}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand transition-colors group"
      >
        <div className="w-8 h-8 rounded-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 flex items-center justify-center group-hover:border-brand/30 transition-all">
          <ArrowLeft size={16} />
        </div>
        Back to Follow-ups
      </button>

      {task && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-8 shadow-sm">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center text-brand">
                  <Phone size={28} />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">{task.title || 'Follow-up Interaction'}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge label={task.is_completed ? 'Completed' : 'Pending'} variant={task.is_completed ? 'success' : 'warning'} />
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider ${priorityStyle[task.priority] || priorityStyle.medium}`}>
                      {task.priority} Priority
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => navigate(`/leads/${task.lead_id}`)}>
                  View Lead Profile
                </Button>
                {!task.is_completed && (
                  <Button size="sm" className="rounded-xl font-bold shadow-lg shadow-blue-100/50">
                    Mark as Done
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-10">
              <div className="p-4 rounded-2xl bg-gray-50/50 dark:bg-[#0f0f0f]/50 border border-gray-50 dark:border-gray-800">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar size={14} className="text-gray-400" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Scheduled For</span>
                </div>
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50/50 dark:bg-[#0f0f0f]/50 border border-gray-50 dark:border-gray-800">
                <div className="flex items-center gap-3 mb-2">
                  <Clock size={14} className="text-gray-400" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Time</span>
                </div>
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {task.due_date ? new Date(task.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Anytime'}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50/50 dark:bg-[#0f0f0f]/50 border border-gray-50 dark:border-gray-800">
                <div className="flex items-center gap-3 mb-2">
                  <User size={14} className="text-gray-400" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lead Name</span>
                </div>
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{task.lead_name || '—'}</div>
              </div>
            </div>
          </div>

          {/* Details & Ownership */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 space-y-6">
              {/* Notes Card */}
              <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-brand">
                    <MessageSquare size={18} />
                  </div>
                  <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">Interaction Notes</h3>
                </div>
                <div className="bg-gray-50 dark:bg-[#0f0f0f] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 min-h-[120px]">
                  {task.notes ? (
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{task.notes}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No detailed notes provided for this follow-up.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="md:col-span-4 space-y-6">
              {/* Ownership Card */}
              <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
                <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                  <UserCheck size={18} className="text-blue-500" /> Assigned To
                </h3>
                <div className="p-4 rounded-[20px] bg-gray-50/50 dark:bg-[#0f0f0f]/50 border border-gray-50 dark:border-gray-800">
                  <div className="flex items-center gap-4">
                    <Avatar name={task.assigned_to_name || 'User'} size="lg" className="rounded-2xl" />
                    <div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">{task.assigned_to_name || 'Assigned Member'}</div>
                      <div className="text-[10px] font-bold text-brand uppercase tracking-wider mt-0.5">Sales Executive</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Contact */}
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
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
