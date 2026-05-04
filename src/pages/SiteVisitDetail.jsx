import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { 
  ArrowLeft, Calendar, Clock, User, Building2, MapPin, 
  CheckCircle, XCircle, RefreshCw, Loader2, UserCheck, 
  Phone, Mail, MessageSquare, ShieldCheck, ExternalLink,
  ChevronDown, Send, Info
} from 'lucide-react'
import { fetchSiteVisitById, clearCurrentVisit, updateSiteVisitStatus } from '../store/siteVisitSlice'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'

export default function SiteVisitDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const { currentVisit: visit, detailLoading, actionLoading } = useSelector(s => s.siteVisits)

  const [newStatus, setNewStatus] = useState('')
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    dispatch(fetchSiteVisitById(id))
    return () => dispatch(clearCurrentVisit())
  }, [dispatch, id])

  useEffect(() => {
    if (visit?.status) setNewStatus(visit.status)
    if (visit?.feedback) setFeedback(visit.feedback)
  }, [visit])

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

  const statusLabel = { scheduled: 'Scheduled', done: 'Completed', cancelled: 'Cancelled', rescheduled: 'Rescheduled', no_show: 'No Show' }
  const statusColor = {
    scheduled:   'bg-blue-100 text-[#0082f3]',
    done:        'bg-green-100 text-green-600',
    cancelled:   'bg-red-100 text-red-500',
    rescheduled: 'bg-blue-50 text-blue-500',
    no_show:     'bg-gray-100 text-gray-500',
  }

  const visitStatuses = ['scheduled', 'done', 'cancelled', 'rescheduled', 'no_show']

  const handleStatusUpdate = async () => {
    if (newStatus === visit.status && feedback === visit.feedback) return
    const result = await dispatch(updateSiteVisitStatus({ id, status: newStatus, feedback }))
    if (updateSiteVisitStatus.fulfilled.match(result)) {
      dispatch(fetchSiteVisitById(id))
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12">
      {/* Top Header / Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/site-visits')}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 flex items-center justify-center group-hover:border-brand/30 transition-all">
            <ArrowLeft size={16} />
          </div>
          Back to Site Visits
        </button>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => navigate(`/leads/${visit.lead_id}`)}>
            View Lead
          </Button>
          <Button size="sm" className="rounded-xl px-5 font-bold shadow-lg shadow-blue-100/50">
            Edit Visit
          </Button>
        </div>
      </div>

      {visit && (
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
                      <MapPin size={48} />
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 mb-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">Visit to {visit.project_name || 'Project'}</h1>
                      <Badge label={statusLabel[visit.status] || visit.status} className={`px-3 py-1 text-xs ${statusColor[visit.status] || ''}`} />
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-brand" /> ID: {visit.id?.slice?.(0, 8) || visit.id}</span>
                      <span className="flex items-center gap-1.5"><Calendar size={14} /> Visit Date: {new Date(visit.visit_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-10">
                  {[
                    { icon: Calendar, label: 'Visit Date', value: new Date(visit.visit_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }), color: 'text-blue-600 bg-blue-50' },
                    { icon: Clock, label: 'Visit Time', value: visit.visit_time || 'Not set', color: 'text-indigo-600 bg-indigo-50' },
                    { icon: Building2, label: 'Project', value: visit.project_name || '—', color: 'text-purple-600 bg-purple-50' },
                    { icon: RefreshCw, label: 'Transport', value: visit.transport_arranged ? 'Arranged' : 'Self Arrangement', color: 'text-teal-600 bg-teal-50' },
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

            {/* 2. Visit Feedback */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <MessageSquare size={18} className="text-brand" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">Visit Feedback</h3>
                  <p className="text-xs text-gray-400">Notes and client feedback from the visit</p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-[#0f0f0f] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 min-h-[120px]">
                {visit.feedback ? (
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{visit.feedback}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">No feedback recorded for this visit yet.</p>
                )}
              </div>
            </div>

            {/* 3. Visit Notes */}
            {visit.notes && (
              <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                    <Info size={18} className="text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">Pre-visit Notes</h3>
                    <p className="text-xs text-gray-400">Instructions and requirements provided before the visit</p>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-[#0f0f0f] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 min-h-[100px]">
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{visit.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 4. Mark Outcome Card */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
              <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <CheckCircle size={18} className="text-green-500" /> Mark Outcome
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 px-1">Visit Status</label>
                  <div className="relative">
                    <select
                      value={newStatus}
                      onChange={e => setNewStatus(e.target.value)}
                      className="w-full appearance-none pl-4 pr-10 py-3 text-sm bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-2xl outline-none focus:border-brand focus:ring-4 focus:ring-brand/5 transition-all text-gray-900 dark:text-gray-100 font-semibold"
                    >
                      {visitStatuses.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 px-1">Feedback</label>
                  <textarea
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    placeholder="Enter visit feedback..."
                    rows={3}
                    className="w-full px-4 py-3 text-sm bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-2xl outline-none focus:border-brand transition-all resize-none text-gray-900 dark:text-gray-100"
                  />
                </div>
                
                <Button 
                  className="w-full rounded-2xl py-3 font-bold shadow-lg shadow-blue-500/20" 
                  onClick={handleStatusUpdate} 
                  loading={actionLoading} 
                  disabled={newStatus === visit.status && feedback === visit.feedback}
                >
                  Update Outcome
                </Button>
              </div>
            </div>

            {/* 5. Lead Information */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
              <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <User size={18} className="text-blue-500" /> Lead Information
              </h3>
              
              <div className="p-4 rounded-[20px] bg-gray-50/50 dark:bg-[#0f0f0f]/50 border border-gray-50 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#0f0f0f] transition-all"
                onClick={() => navigate(`/leads/${visit.lead_id}`)}>
                <div className="flex items-center gap-4">
                  <Avatar name={visit.lead_name} size="lg" className="rounded-2xl" />
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">{visit.lead_name || 'Lead Name'}</div>
                    <div className="text-[10px] font-bold text-brand uppercase tracking-wider mt-0.5">Prospect</div>
                    <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                      <ExternalLink size={10} /> View Profile
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 6. Coordinator / Ownership */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
              <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <UserCheck size={18} className="text-teal-500" /> Coordinator
              </h3>
              
              <div className="p-4 rounded-[20px] bg-gray-50/50 dark:bg-[#0f0f0f]/50 border border-gray-50 dark:border-gray-800">
                <div className="flex items-center gap-4">
                  <Avatar 
                    name={typeof visit.assigned_to === 'object' ? visit.assigned_to.full_name : visit.assigned_to || 'Admin'} 
                    size="lg" 
                    className="rounded-2xl" 
                  />
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                      {typeof visit.assigned_to === 'object' ? visit.assigned_to.full_name : visit.assigned_to || 'Team Member'}
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Sales Executive</div>
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
