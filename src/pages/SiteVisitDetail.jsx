import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { ArrowLeft, Calendar, Clock, User, Building2, MapPin, CheckCircle, XCircle, RefreshCw, Loader2, UserCheck, Phone, Mail } from 'lucide-react'
import { fetchSiteVisitById, clearCurrentVisit } from '../store/siteVisitSlice'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'

export default function SiteVisitDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const { currentVisit: visit, detailLoading } = useSelector(s => s.siteVisits)

  useEffect(() => {
    dispatch(fetchSiteVisitById(id))
    return () => dispatch(clearCurrentVisit())
  }, [dispatch, id])

  if (detailLoading && !visit) return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <Loader2 className="animate-spin text-brand mb-4" size={40} />
      <p className="text-gray-500 font-medium">Loading site visit details...</p>
    </div>
  )

  if (!visit && !detailLoading) return (
    <div className="flex items-center justify-center h-[60vh] text-gray-400 dark:text-[#888]">
      <div className="text-center max-w-sm px-6">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">🏢</div>
        <h3 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-2">Visit not found</h3>
        <Button variant="outline" onClick={() => navigate('/site-visits')} className="mt-4 rounded-xl">Back to Visits</Button>
      </div>
    </div>
  )

  const statusLabel = { scheduled: 'Scheduled', done: 'Done', cancelled: 'Cancelled', rescheduled: 'Rescheduled' }
  const statusColor = {
    scheduled:   'bg-blue-100 text-[#0082f3]',
    done:        'bg-green-100 text-green-600',
    cancelled:   'bg-red-100 text-red-500',
    rescheduled: 'bg-blue-50 text-blue-500',
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <button
        onClick={() => navigate('/site-visits')}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand transition-colors group"
      >
        <div className="w-8 h-8 rounded-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 flex items-center justify-center group-hover:border-brand/30 transition-all">
          <ArrowLeft size={16} />
        </div>
        Back to Site Visits
      </button>

      {visit && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-8 shadow-sm">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center text-brand">
                  <MapPin size={28} />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Site Visit to {visit.project_name || 'Project'}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${statusColor[visit.status] || ''}`}>
                      {statusLabel[visit.status] || visit.status}
                    </span>
                    <span className="text-xs text-gray-400">Visit ID: #{visit.id?.slice(0,8)}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => navigate(`/leads/${visit.lead_id}`)}>
                  View Lead
                </Button>
                {visit.status === 'scheduled' && (
                  <Button size="sm" className="rounded-xl font-bold shadow-lg shadow-blue-100/50">
                    Mark Outcome
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mt-10">
              <div className="p-4 rounded-2xl bg-gray-50/50 dark:bg-[#0f0f0f]/50 border border-gray-50 dark:border-gray-800">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar size={14} className="text-gray-400" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Visit Date</span>
                </div>
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {new Date(visit.visit_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50/50 dark:bg-[#0f0f0f]/50 border border-gray-50 dark:border-gray-800">
                <div className="flex items-center gap-3 mb-2">
                  <Clock size={14} className="text-gray-400" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Visit Time</span>
                </div>
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{visit.visit_time || 'Not set'}</div>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50/50 dark:bg-[#0f0f0f]/50 border border-gray-50 dark:border-gray-800">
                <div className="flex items-center gap-3 mb-2">
                  <Building2 size={14} className="text-gray-400" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Project</span>
                </div>
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{visit.project_name || '—'}</div>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50/50 dark:bg-[#0f0f0f]/50 border border-gray-50 dark:border-gray-800">
                <div className="flex items-center gap-3 mb-2">
                  <RefreshCw size={14} className="text-gray-400" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Transport</span>
                </div>
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {visit.transport_arranged ? 'Arranged' : 'Self Arrangement'}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 space-y-6">
              {/* Feedback Card */}
              <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-brand">
                    <MessageSquare size={18} />
                  </div>
                  <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">Visit Feedback</h3>
                </div>
                <div className="bg-gray-50 dark:bg-[#0f0f0f] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 min-h-[120px]">
                  {visit.feedback ? (
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{visit.feedback}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No feedback recorded for this visit yet.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="md:col-span-4 space-y-6">
              {/* Lead Ownership Card */}
              <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
                <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                  <User size={18} className="text-blue-500" /> Lead Information
                </h3>
                <div className="p-4 rounded-[20px] bg-gray-50/50 dark:bg-[#0f0f0f]/50 border border-gray-50 dark:border-gray-800">
                  <div className="flex items-center gap-4">
                    <Avatar name={visit.lead_name || 'User'} size="lg" className="rounded-2xl" />
                    <div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">{visit.lead_name || 'Lead Name'}</div>
                      <div className="text-[10px] font-bold text-brand uppercase tracking-wider mt-0.5">Prospect</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Coordinator Card */}
              <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
                <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                  <UserCheck size={18} className="text-teal-500" /> Coordinator
                </h3>
                <div className="p-4 rounded-[20px] bg-gray-50/50 dark:bg-[#0f0f0f]/50 border border-gray-50 dark:border-gray-800">
                  <div className="flex items-center gap-4">
                    <Avatar name={visit.assigned_to || 'Admin'} size="lg" className="rounded-2xl" />
                    <div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">{visit.assigned_to || 'Team Member'}</div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Sales Executive</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
