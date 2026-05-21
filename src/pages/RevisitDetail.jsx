import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Calendar, Clock, User, Building2, MapPin, 
  CheckCircle, RefreshCw, Loader2, UserCheck, 
  MessageSquare, ShieldCheck, ExternalLink,
  ChevronDown, Info, Star, TrendingUp, Target
} from 'lucide-react'
import api from '../api/axios'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'

export default function RevisitDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [revisit, setRevisit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [note, setNewNote] = useState('')

  const fetchRevisit = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/site-revisits/${id}`)
      setRevisit(res.data.data)
      setNewStatus(res.data.data.status)
    } catch (err) {
      console.error('Failed to fetch revisit:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRevisit()
  }, [id])

  const statusLabel = { scheduled: 'Scheduled', done: 'Completed', cancelled: 'Cancelled', rescheduled: 'Rescheduled', no_show: 'No Show' }
  const statusColor = {
    scheduled:   'bg-blue-100 text-[#0082f3]',
    done:        'bg-green-100 text-green-600',
    cancelled:   'bg-red-100 text-red-500',
    rescheduled: 'bg-amber-100 text-amber-600',
    no_show:     'bg-gray-100 text-gray-500',
  }

  const reactionLabel = { very_positive:'Very Positive', positive:'Positive', neutral:'Neutral', negative:'Negative', not_interested:'Not Interested' }
  const nextStepLabel = { negotiation:'Negotiation', follow_up:'Follow Up', send_proposal:'Send Proposal', booked:'Booked', lost:'Lost', another_revisit:'Another Revisit' }

  const handleStatusUpdate = async () => {
    setActionLoading(true)
    try {
      await api.patch(`/site-revisits/${id}/status`, { status: newStatus, note: note || undefined })
      await fetchRevisit()
      setNewNote('')
    } catch (err) {
      console.error('Failed to update status:', err)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading && !revisit) return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <Loader2 className="animate-spin text-brand mb-4" size={40} />
      <p className="text-gray-500 font-medium">Loading revisit details...</p>
    </div>
  )

  if (!revisit && !loading) return (
    <div className="flex items-center justify-center h-[60vh] text-gray-400 dark:text-[#888]">
      <div className="text-center max-w-sm px-6">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">🔄</div>
        <h3 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-2">Revisit not found</h3>
        <Button variant="outline" onClick={() => navigate('/revisits')} className="mt-4 rounded-xl">Back to Revisits</Button>
      </div>
    </div>
  )

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12">
      {/* Top Header / Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/revisits')}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 flex items-center justify-center group-hover:border-brand/30 transition-all">
            <ArrowLeft size={16} />
          </div>
          Back to Revisits
        </button>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => navigate(`/leads/${revisit.lead_id}`)}>
            View Lead
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => navigate(`/site-visits/${revisit.original_visit_id}`)}>
            View Original Visit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Main Info (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* 1. Profile Header Card */}
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] overflow-hidden shadow-sm hover:shadow-md transition-all">
            <div className="h-24 bg-gradient-to-r from-purple-500 to-brand relative opacity-10 dark:opacity-20" />
            <div className="px-8 pb-8 relative">
              <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-10">
                <div className="p-1.5 bg-white dark:bg-[#1a1a1a] rounded-[28px] shadow-xl">
                  <div className="w-24 h-24 md:w-32 md:h-32 bg-brand rounded-[22px] flex items-center justify-center text-white">
                    <RefreshCw size={48} />
                  </div>
                </div>
                <div className="flex-1 space-y-2 mb-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">Revisit: {revisit.project_name || 'Project'}</h1>
                    <Badge label={statusLabel[revisit.status] || revisit.status} className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-xl ${statusColor[revisit.status] || ''}`} />
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-brand" /> ID: {revisit.id?.slice?.(0, 8) || revisit.id}</span>
                    <span className="flex items-center gap-1.5"><Calendar size={14} /> Scheduled: {new Date(revisit.visit_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-10">
                {[
                  { icon: Calendar, label: 'Date', value: new Date(revisit.visit_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }), color: 'text-blue-600 bg-blue-50' },
                  { icon: Clock, label: 'Time', value: revisit.visit_time || '—', color: 'text-indigo-600 bg-indigo-50' },
                  { icon: Building2, label: 'Project', value: revisit.project_name || '—', color: 'text-purple-600 bg-purple-50' },
                  { icon: RefreshCw, label: 'Transport', value: revisit.transport_arranged ? 'Arranged' : 'Self', color: 'text-teal-600 bg-teal-50' },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="p-4 rounded-2xl border border-gray-50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-[#0f0f0f]/50 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color} dark:bg-opacity-10 shadow-sm`}>
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

          {/* 2. Feedback Card (If completed) */}
          {revisit.client_reaction && (
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shadow-sm">
                    <Star size={18} className="text-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">Client Feedback</h3>
                    <p className="text-xs text-gray-400">Post-visit evaluation and next steps</p>
                  </div>
                </div>
                {revisit.rating && (
                  <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-xl border border-amber-100 dark:border-amber-900/30">
                    <Star size={14} className="text-amber-500" fill="currentColor" />
                    <span className="text-sm font-bold text-amber-700 dark:text-amber-400">{revisit.rating}/5</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-[#0f0f0f] border border-gray-100 dark:border-gray-800 shadow-sm">
                    <TrendingUp size={18} className="text-blue-500" />
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reaction</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{reactionLabel[revisit.client_reaction] || revisit.client_reaction}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-[#0f0f0f] border border-gray-100 dark:border-gray-800 shadow-sm">
                    <Target size={18} className="text-purple-500" />
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Next Step</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{nextStepLabel[revisit.next_step] || revisit.next_step}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#0f0f0f] border border-gray-100 dark:border-gray-800 shadow-sm">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Interested In</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                    {revisit.interested_in || 'No specific interest recorded'}
                  </p>
                </div>
              </div>

              {revisit.remarks && (
                <div className="bg-blue-50/50 dark:bg-blue-900/5 rounded-2xl p-6 border border-blue-100/50 dark:border-blue-900/20 shadow-inner">
                  <p className="text-xs font-bold text-blue-600/70 dark:text-blue-400/70 uppercase tracking-widest mb-2">Detailed Remarks</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{revisit.remarks}</p>
                </div>
              )}
            </div>
          )}

          {/* 3. Reason & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {revisit.reason && (
              <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center shadow-sm">
                    <Info size={18} className="text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">Reason</h3>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-[#0f0f0f] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 min-h-[100px] shadow-inner">
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{revisit.reason}</p>
                </div>
              </div>
            )}
            {revisit.notes && (
              <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center shadow-sm">
                    <MessageSquare size={18} className="text-gray-500" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">Notes</h3>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-[#0f0f0f] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 min-h-[100px] shadow-inner">
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{revisit.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* 4. Update Status Card */}
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
            <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
              <CheckCircle size={18} className="text-green-500" /> Update Status
            </h3>
            
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 px-1">Current Status</label>
                <div className="relative group">
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value)}
                    className="w-full appearance-none pl-4 pr-10 py-3.5 text-sm bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-2xl outline-none focus:border-brand focus:ring-4 focus:ring-brand/5 transition-all text-gray-900 dark:text-gray-100 font-bold shadow-sm group-hover:border-gray-300 dark:group-hover:border-gray-700"
                  >
                    {Object.keys(statusLabel).map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-gray-600 transition-colors" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 px-1">Note (Optional)</label>
                <textarea
                  value={note}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Reason for status change..."
                  rows={3}
                  className="w-full px-4 py-3.5 text-sm bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-2xl outline-none focus:border-brand transition-all resize-none text-gray-900 dark:text-gray-100 shadow-sm hover:border-gray-300 dark:hover:border-gray-700"
                />
              </div>
              
              <Button 
                className="w-full rounded-2xl py-4 font-bold shadow-xl shadow-blue-500/25 active:scale-[0.98] transition-all" 
                onClick={handleStatusUpdate} 
                loading={actionLoading} 
                disabled={newStatus === revisit.status && !note}
              >
                Update Status
              </Button>
            </div>
          </div>

          {/* 5. Lead Information */}
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
            <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
              <User size={18} className="text-blue-500" /> Lead Information
            </h3>
            
            <div className="p-4 rounded-[20px] bg-gray-50/50 dark:bg-[#0f0f0f]/50 border border-gray-50 dark:border-gray-800 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-all shadow-sm group"
              onClick={() => navigate(`/leads/${revisit.lead_id}`)}>
              <div className="flex items-center gap-4">
                <Avatar name={revisit.lead_name} size="lg" className="rounded-2xl shadow-md" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-brand transition-colors">{revisit.lead_name || 'Lead Name'}</div>
                  <div className="text-[10px] font-bold text-brand uppercase tracking-wider mt-0.5 bg-brand/5 px-2 py-0.5 rounded-full inline-block">Prospect</div>
                  <div className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                    <ExternalLink size={10} /> View Profile
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 6. Coordinator */}
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
            <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
              <UserCheck size={18} className="text-teal-500" /> Coordinator
            </h3>
            
            <div className="p-4 rounded-[20px] bg-gray-50/50 dark:bg-[#0f0f0f]/50 border border-gray-50 dark:border-gray-800 shadow-sm">
              <div className="flex items-center gap-4">
                <Avatar 
                  name={revisit.assigned_to_name || 'Admin'} 
                  size="lg" 
                  className="rounded-2xl shadow-md" 
                />
                <div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {revisit.assigned_to_name || 'Team Member'}
                  </div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Sales Executive</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
