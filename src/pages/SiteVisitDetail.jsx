import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  ArrowLeft, Calendar, Clock, User, Building2, MapPin,
  CheckCircle, RefreshCw, Loader2, UserCheck,
  MessageSquare, ShieldCheck, ExternalLink,
  Info, Star, TrendingUp, Target, Eye
} from 'lucide-react'
import { fetchSiteVisitById, clearCurrentVisit, updateSiteVisitStatus, submitSiteVisitFeedback } from '../store/siteVisitSlice'
import { fetchTeamTree } from '../store/userSlice'
import api from '../api/axios'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import CustomSelect from '../components/ui/CustomSelect'
import AsyncSearchSelect from '../components/ui/AsyncSearchSelect'
import DatePicker from '../components/ui/DatePicker'
import ClockPicker from '../components/ui/ClockPicker'
import PhoneActions from '../components/ui/PhoneActions'

const ROLE_LABEL = { super_admin: 'Super Admin', admin: 'Admin', associate_partner: 'Associate Partner', cluster_head: 'Cluster Head', partner: 'Partner', team_leader: 'Team Leader', sales_manager: 'Sales Manager', sales_executive: 'Sales Executive', external_caller: 'External Caller' }

// ── Schedule Re-visit — opened automatically after a visit's status is
// changed to "rescheduled", same flow as the Site Visits list page ──────────
function RevisitModal({ visit, salesExecs, currentUser, onClose, onSuccess }) {
  const ic = "w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm transition-all duration-200"
  const lc = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"

  const [form, setForm] = useState({
    original_visit_id: visit.id,
    project_id: visit.project_id || '',
    project_name: visit.project_id ? '' : (visit.project_name || ''),
    visit_date: '',
    visit_time: '',
    assigned_to: visit.assigned_to && typeof visit.assigned_to === 'object' ? visit.assigned_to.id : (visit.assigned_to || ''),
    reason: '',
    notes: '',
    transport_arranged: false,
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const execOptions = [
    ...(currentUser ? [{ value: currentUser.id, label: `Self · ${ROLE_LABEL[currentUser.role] || currentUser.role}` }] : []),
    ...salesExecs.filter(u => u.id !== currentUser?.id).map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name} · ${ROLE_LABEL[u.role] || u.role}` }))
  ]

  const searchProjects = async q => {
    const res = await api.get('/projects', { params: { search: q, per_page: 20 } })
    return (res.data.data || []).map(p => ({ value: p.id, label: `${p.name}${p.city ? ` — ${p.city}` : ''}` }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.visit_date || !form.visit_time) {
      setError('Date and time are required'); return
    }
    setLoading(true); setError('')
    try {
      const { project_name, ...rest } = form
      await api.post('/site-revisits', { ...rest, project_id: form.project_id || project_name || undefined })
      onSuccess()
      onClose()
    } catch (e) { setError(e.response?.data?.message || 'Failed to schedule re-visit') }
    finally { setLoading(false) }
  }

  return (
    <Modal isOpen onClose={onClose} title="Schedule Re-visit" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-xl">
          <Avatar name={visit.lead_name || '?'} size="sm" />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{visit.lead_name}</p>
            <p className="text-xs text-gray-400">{visit.project_name} · Original Visit: {visit.visit_date?.split('T')[0]}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DatePicker
            label="Visit Date"
            required
            value={form.visit_date}
            onChange={val => setForm(p => ({ ...p, visit_date: val }))}
            min={new Date().toISOString().split('T')[0]}
          />
          <ClockPicker
            label="Visit Time"
            required
            value={form.visit_time}
            onChange={val => setForm(p => ({ ...p, visit_time: val }))}
            icon={Clock}
          />
        </div>

        <AsyncSearchSelect
          label="Project"
          value={form.project_id}
          onChange={v => setForm(p => ({ ...p, project_id: v, project_name: '' }))}
          onTextChange={text => setForm(p => ({ ...p, project_name: text }))}
          onSearch={searchProjects}
          placeholder="Default: original visit's project — type to override..."
          fallbackToInput
          defaultText={form.project_id ? '' : (form.project_name || '')}
        />

        <CustomSelect label="Assign To" value={form.assigned_to}
          onChange={v => setForm(p => ({ ...p, assigned_to: v }))}
          options={execOptions} placeholder="Select team member" searchable />

        <div>
          <label className={lc}>Reason for Re-visit</label>
          <input value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
            placeholder="Client wanted to see 3BHK units again..." className={ic} />
        </div>

        <div>
          <label className={lc}>Notes</label>
          <textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            placeholder="Bring updated price list..." className={ic} />
        </div>

        <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-xl cursor-pointer">
          <input type="checkbox" checked={form.transport_arranged}
            onChange={e => setForm(p => ({ ...p, transport_arranged: e.target.checked }))}
            className="w-4 h-4 accent-brand" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Transport arranged for client</span>
        </label>

        {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">{error}</p>}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" loading={loading}>Schedule Re-visit</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function SiteVisitDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const { currentVisit: visit, detailLoading, actionLoading } = useSelector(s => s.siteVisits)
  const { user: currentUser } = useSelector(s => s.auth)

  const { teamTree: teamMembers = [] } = useSelector(s => s.users)

  const isAdmin = ['admin', 'super_admin'].includes(currentUser?.role)
  const [showPhone, setShowPhone] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [feedback, setFeedback] = useState('')
  const [showChangeStatusModal, setShowChangeStatusModal] = useState(false)
  const [showRevisitModal, setShowRevisitModal] = useState(false)

  const [feedbackForm, setFeedbackForm] = useState({
    rating: 0,
    client_reaction: '',
    interested_in: '',
    next_step: '',
    remarks: ''
  })

  useEffect(() => {
    dispatch(fetchSiteVisitById(id))
    return () => dispatch(clearCurrentVisit())
  }, [dispatch, id])

  useEffect(() => {
    if (visit?.status) setNewStatus(visit.status)
    if (visit?.feedback) setFeedback(visit.feedback)
  }, [visit])

  useEffect(() => {
    if (currentUser?.id) dispatch(fetchTeamTree(currentUser.id))
  }, [dispatch, currentUser?.id])

  const statusLabel = { scheduled: 'Scheduled', done: 'Completed', cancelled: 'Cancelled', rescheduled: 'Rescheduled', no_show: 'No Show' }
  const statusColor = {
    scheduled:   'bg-blue-100 text-[#0082f3]',
    done:        'bg-green-100 text-green-600',
    cancelled:   'bg-red-100 text-red-500',
    rescheduled: 'bg-blue-50 text-blue-500',
    no_show:     'bg-gray-100 text-gray-500',
  }

  const reactionLabel = { very_positive:'Very Positive', positive:'Positive', neutral:'Neutral', negative:'Negative', not_interested:'Not Interested' }
  const nextStepLabel = { negotiation:'Negotiation', follow_up:'Follow Up', send_proposal:'Send Proposal', booked:'Booked', lost:'Lost' }
  const visitStatuses = ['scheduled', 'done', 'cancelled', 'rescheduled', 'no_show']
  const reactionOptions = ['very_positive', 'positive', 'neutral', 'negative', 'not_interested']
  const nextStepOptions = ['negotiation', 'follow_up', 'send_proposal', 'booked', 'lost']

  const handleStatusUpdate = async () => {
    if (newStatus === visit.status && feedback === visit.feedback) return
    const targetStatus = newStatus
    const result = await dispatch(updateSiteVisitStatus({ id, status: targetStatus, feedback }))
    if (updateSiteVisitStatus.fulfilled.match(result)) {
      dispatch(fetchSiteVisitById(id))
      setShowChangeStatusModal(false)
      // Status is already saved at this point — chain straight into scheduling
      // the re-visit instead of leaving the admin to hunt for another button.
      if (targetStatus === 'rescheduled') setShowRevisitModal(true)
    }
  }

  const handleSubmitFeedback = async () => {
    const result = await dispatch(submitSiteVisitFeedback({ id, data: feedbackForm }))
    if (submitSiteVisitFeedback.fulfilled.match(result)) {
      dispatch(fetchSiteVisitById(id))
    }
  }

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

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <button
          onClick={() => navigate('/site-visits')}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand transition-colors group flex-shrink-0"
        >
          <div className="w-8 h-8 rounded-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 flex items-center justify-center group-hover:border-brand/30 transition-all">
            <ArrowLeft size={16} />
          </div>
          Back to Site Visits
        </button>
        <div className="flex gap-2 overflow-x-auto whitespace-nowrap pb-1 -mb-1 sm:pb-0 sm:-mb-0">
          <Button variant="outline" size="sm" className="rounded-xl flex-shrink-0" onClick={() => navigate(`/leads/${visit.lead_id}`)}>
            View Lead
          </Button>
          <Button size="sm" className="rounded-xl px-5 font-bold shadow-lg shadow-blue-100/50 flex-shrink-0">
            Edit Visit
          </Button>
        </div>
      </div>

      {visit && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column - 8 cols */}
          <div className="lg:col-span-8 space-y-4">
            {/* Profile Header */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="h-12 bg-gradient-to-r from-blue-500 to-[#0082f3] relative opacity-10 dark:opacity-20" />
              <div className="px-5 pb-5 relative">
                <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-6">
                  <div className="p-1.5 bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-lg">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-brand rounded-xl flex items-center justify-center text-white">
                      <MapPin size={32} />
                    </div>
                  </div>
                  <div className="flex-1 space-y-1.5 mb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Visit to {visit.project_name || 'Project'}</h1>
                      <Badge label={statusLabel[visit.status] || visit.status} className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-lg ${statusColor[visit.status] || ''}`} />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5"><ShieldCheck size={13} className="text-brand" /> ID: {visit.id?.slice?.(0, 8) || visit.id}</span>
                      <span className="flex items-center gap-1.5"><Calendar size={13} /> {new Date(visit.visit_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  {[
                    { icon: Calendar, label: 'Date', value: new Date(visit.visit_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }), color: 'text-blue-600 bg-blue-50' },
                    { icon: Clock, label: 'Time', value: visit.visit_time || 'Not set', color: 'text-indigo-600 bg-indigo-50' },
                    { icon: Building2, label: 'Project', value: visit.project_name || '—', color: 'text-purple-600 bg-purple-50' },
                    { icon: RefreshCw, label: 'Transport', value: visit.transport_arranged ? 'Arranged' : 'Self', color: 'text-teal-600 bg-teal-50' },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="p-3 rounded-xl border border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-[#0f0f0f]/50">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${color} dark:bg-opacity-10`}>
                          <Icon size={12} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
                      </div>
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes, Feedback Form & Submitted Feedback */}
            <div className="space-y-4">
              {/* Submit Feedback Card - Now on Left */}
              {visit.status === 'done' && !visit.client_reaction && (
                <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                  <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Star size={16} className="text-amber-500" /> Submit Feedback
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      {/* Rating */}
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 px-0.5">Rating</label>
                        <div className="flex gap-1.5">
                          {[1, 2, 3, 4, 5].map(num => (
                            <button
                              key={num}
                              onClick={() => setFeedbackForm(f => ({ ...f, rating: num }))}
                              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                                feedbackForm.rating >= num ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                              }`}
                            >
                              <Star size={16} fill={feedbackForm.rating >= num ? 'currentColor' : 'none'} />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Client Reaction */}
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 px-0.5">Client Reaction</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {reactionOptions.map(reaction => (
                            <button
                              key={reaction}
                              onClick={() => setFeedbackForm(f => ({ ...f, client_reaction: reaction }))}
                              className={`px-2 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                                feedbackForm.client_reaction === reaction ? 'bg-brand/10 text-brand border border-brand/20' : 'bg-gray-50 text-gray-600 border border-gray-100 hover:border-gray-200'
                              }`}
                            >
                              {reactionLabel[reaction]}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Next Step */}
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 px-0.5">Next Step</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {nextStepOptions.map(step => (
                            <button
                              key={step}
                              onClick={() => setFeedbackForm(f => ({ ...f, next_step: step }))}
                              className={`px-2 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                                feedbackForm.next_step === step ? 'bg-brand/10 text-brand border border-brand/20' : 'bg-gray-50 text-gray-600 border border-gray-100 hover:border-gray-200'
                              }`}
                            >
                              {nextStepLabel[step]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Interested In */}
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 px-0.5">Interested In</label>
                        <textarea
                          value={feedbackForm.interested_in}
                          onChange={e => setFeedbackForm(f => ({ ...f, interested_in: e.target.value }))}
                          placeholder="What are they interested in..."
                          rows={2}
                          className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:border-brand transition-all resize-none text-gray-900 dark:text-gray-100"
                        />
                      </div>

                      {/* Remarks */}
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 px-0.5">Remarks</label>
                        <textarea
                          value={feedbackForm.remarks}
                          onChange={e => setFeedbackForm(f => ({ ...f, remarks: e.target.value }))}
                          placeholder="Additional remarks..."
                          rows={3}
                          className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:border-brand transition-all resize-none text-gray-900 dark:text-gray-100"
                        />
                      </div>

                      <Button
                        className="w-full rounded-xl py-3 font-bold shadow-xl shadow-blue-500/25 active:scale-[0.98] transition-all"
                        onClick={handleSubmitFeedback}
                        loading={actionLoading}
                      >
                        Submit Feedback
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes & Submitted Feedback - Side by Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Visit Notes */}
                {visit.notes && (
                  <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                        <Info size={16} className="text-purple-600" />
                      </div>
                      <h3 className="font-display text-base font-bold text-gray-900 dark:text-white">Pre-visit Notes</h3>
                    </div>
                    <div className="bg-gray-50 dark:bg-[#0f0f0f] rounded-xl p-4 border border-gray-100 dark:border-gray-800 min-h-[80px]">
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{visit.notes}</p>
                    </div>
                  </div>
                )}

                {/* Submitted Feedback */}
                {visit.client_reaction && (
                  <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                          <Star size={16} className="text-amber-500" />
                        </div>
                        <h3 className="font-display text-base font-bold text-gray-900 dark:text-white">Client Feedback</h3>
                      </div>
                      {visit.rating && (
                        <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-lg border border-amber-100 dark:border-amber-900/30">
                          <Star size={12} className="text-amber-500" fill="currentColor" />
                          <span className="text-xs font-bold text-amber-700 dark:text-amber-400">{visit.rating}/5</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-[#0f0f0f] border border-gray-100 dark:border-gray-800">
                        <TrendingUp size={14} className="text-blue-500" />
                        <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Reaction</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{reactionLabel[visit.client_reaction] || visit.client_reaction}</p>
                        </div>
                      </div>
                      {visit.next_step && (
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-[#0f0f0f] border border-gray-100 dark:border-gray-800">
                          <Target size={14} className="text-purple-500" />
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Next Step</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{nextStepLabel[visit.next_step] || visit.next_step}</p>
                          </div>
                        </div>
                      )}
                      {visit.interested_in && (
                        <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-[#0f0f0f] border border-gray-100 dark:border-gray-800">
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Interested In</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{visit.interested_in}</p>
                        </div>
                      )}
                      {visit.remarks && (
                        <div className="bg-blue-50/50 dark:bg-blue-900/5 rounded-lg p-3 border border-blue-100/50 dark:border-blue-900/20">
                          <p className="text-[9px] font-bold text-blue-600/70 dark:text-blue-400/70 uppercase tracking-widest mb-1">Remarks</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{visit.remarks}</p>
                        </div>
                      )}
                      {visit.closing_person && (
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/5 border border-emerald-100/50 dark:border-emerald-900/20">
                          <UserCheck size={14} className="text-emerald-600" />
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Closing Person</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{visit.closing_person}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Old style feedback section */}
              {(visit.feedback && !visit.client_reaction) && (
                <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                      <MessageSquare size={16} className="text-brand" />
                    </div>
                    <h3 className="font-display text-base font-bold text-gray-900 dark:text-white">Visit Feedback</h3>
                  </div>
                  <div className="bg-gray-50 dark:bg-[#0f0f0f] rounded-xl p-4 border border-gray-100 dark:border-gray-800 min-h-[80px]">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{visit.feedback}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - 4 cols */}
          <div className="lg:col-span-4 space-y-4">
            {/* Status Card */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
              <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <CheckCircle size={16} className="text-green-500" /> Status
              </h3>
              <div className="flex items-center justify-between gap-3">
                <Badge label={statusLabel[visit.status] || visit.status} className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-lg ${statusColor[visit.status] || ''}`} />
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl flex-shrink-0"
                  onClick={() => { setNewStatus(visit.status); setFeedback(visit.feedback || ''); setShowChangeStatusModal(true) }}
                >
                  <RefreshCw size={13} className="mr-1.5" /> Change Status
                </Button>
              </div>
              {visit.feedback && <p className="text-xs text-gray-400 mt-3 italic">{visit.feedback}</p>}
            </div>

            {/* Lead Information */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
              <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <User size={16} className="text-blue-500" /> Lead Information
              </h3>
              <div className="p-3.5 rounded-xl bg-gray-50/50 dark:bg-[#0f0f0f]/50 border border-gray-50 dark:border-gray-800 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-all group"
                   onClick={() => navigate(`/leads/${visit.lead_id}`)}>
                <div className="flex items-center gap-3">
                  <Avatar name={visit.lead_name || visit['lead name']} size="md" className="rounded-xl shadow-md" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-brand transition-colors">{visit.lead_name || visit['lead name'] || 'Lead Name'}</div>
                    <div className="text-[9px] font-bold text-brand uppercase tracking-wider mt-0.5 bg-brand/5 px-1.5 py-0.5 rounded-full inline-block">Prospect</div>
                    <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                      <ExternalLink size={9} /> View Profile
                    </div>
                  </div>
                </div>
              </div>

              {/* Phone Number Section */}
              {visit.lead_phone && (
                <div className="mt-4">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Phone Number</p>
                  {isAdmin ? (
                    <PhoneActions phone={visit.lead_phone}><span className="text-sm font-semibold text-brand hover:underline">{visit.lead_phone}</span></PhoneActions>
                  ) : showPhone ? (
                    <PhoneActions phone={visit.lead_phone}><span className="text-sm font-semibold text-brand hover:underline">{visit.lead_phone}</span></PhoneActions>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">*****{visit.lead_phone?.slice(-5)}</p>
                      <button onClick={() => setShowPhone(true)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-brand bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 px-2.5 py-1.5 rounded-lg transition-colors">
                        <Eye size={11}/> View
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Coordinator */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
              <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <UserCheck size={16} className="text-teal-500" /> Coordinator
              </h3>
              <div className="p-3.5 rounded-xl bg-gray-50/50 dark:bg-[#0f0f0f]/50 border border-gray-50 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <Avatar
                    name={visit.assigned_to_name || (typeof visit.assigned_to === 'object' ? visit.assigned_to.full_name : visit.assigned_to) || 'Admin'}
                    size="md"
                    className="rounded-xl shadow-md"
                  />
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                      {visit.assigned_to_name || (typeof visit.assigned_to === 'object' ? visit.assigned_to.full_name : visit.assigned_to) || 'Team Member'}
                    </div>
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Sales Executive</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Change Status ─────────────────────────────────────────────── */}
      {visit && (
        <Modal isOpen={showChangeStatusModal} onClose={() => setShowChangeStatusModal(false)} title="Change Visit Status" size="sm">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-xl">
              <Avatar name={visit.lead_name || '?'} size="sm" />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{visit.lead_name}</p>
                <p className="text-xs text-gray-400">Current status: {statusLabel[visit.status] || visit.status}</p>
              </div>
            </div>

            <CustomSelect
              label="New Status *"
              value={newStatus}
              onChange={setNewStatus}
              options={visitStatuses.map(s => ({ value: s, label: statusLabel[s] }))}
              placeholder="Select status"
            />

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 px-0.5">Note (Optional)</label>
              <textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="Reason for status change..."
                rows={2}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:border-brand transition-all resize-none text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowChangeStatusModal(false)}>Cancel</Button>
            <Button
              className="flex-1 rounded-xl font-bold"
              onClick={handleStatusUpdate}
              loading={actionLoading}
              disabled={newStatus === visit.status && feedback === visit.feedback}
            >
              Update Status
            </Button>
          </div>
        </Modal>
      )}

      {/* ── Modal: Schedule Re-visit — opened automatically after status is
          changed to "rescheduled" ─────────────────────────────────────────── */}
      {showRevisitModal && visit && (
        <RevisitModal
          visit={visit}
          salesExecs={teamMembers}
          currentUser={currentUser}
          onClose={() => setShowRevisitModal(false)}
          onSuccess={() => dispatch(fetchSiteVisitById(id))}
        />
      )}
    </div>
  )
}
