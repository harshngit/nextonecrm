import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  ArrowLeft, Phone, Mail, MapPin, Calendar, Send,
  ChevronDown, Loader2, UserCheck, MessageSquare,
  Clock, CheckCircle, Info, ExternalLink, ShieldCheck,
  PlusCircle, CalendarPlus, ArrowRight, RefreshCw, History, Users, PhoneCall as PhoneCallIcon,
} from 'lucide-react'
import api from '../api/axios'
import CustomSelect from '../components/ui/CustomSelect'
import { fetchLeadById, fetchLeadActivities, addLeadNote, updateLeadStatus, clearCurrentLead } from '../store/leadSlice'
import { fetchUsers } from '../store/userSlice'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import ConvertLeadModal from '../components/modals/ConvertLeadModal'

const leadStages = [
  { value: 'new',                  label: 'New' },
  { value: 'contacted',            label: 'Contacted' },
  { value: 'interested',           label: 'Interested' },
  { value: 'follow_up',            label: 'Follow-up' },
  { value: 'site_visit_scheduled', label: 'Site Visit Scheduled' },
  { value: 'site_visit_done',      label: 'Site Visit Done' },
  { value: 'negotiation',          label: 'Negotiation' },
  { value: 'booked',               label: 'Booked' },
  { value: 'lost',                 label: 'Lost' },
]

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

  const { user: currentUser } = useSelector(s => s.auth)
  const [note, setNote] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [noteError, setNoteError] = useState('')
  const [showConvertModal, setShowConvertModal] = useState(false)

  // Reassignment history — visible for admin, super_admin, sales_manager
  const canSeeHistory = ['admin', 'super_admin', 'sales_manager'].includes(currentUser?.role)
  const canSeePhone   = ['admin', 'super_admin'].includes(currentUser?.role)
  const [phoneAccess, setPhoneAccess] = useState(null)  // null=loading, { has_access, phone, request }
  const [showPhoneReq,setShowPhoneReq]= useState(false)
  const [reqReason,   setReqReason]   = useState('')
  const [reqLoading,  setReqLoading]  = useState(false)
  const [reqError,    setReqError]    = useState('')
  const [reqSuccess,  setReqSuccess]  = useState('')
  const [reassignHistory,     setReassignHistory]     = useState([])
  const [historyLoading,      setHistoryLoading]      = useState(false)
  const [historyTotal,        setHistoryTotal]         = useState(0)
  const [historyPage,         setHistoryPage]         = useState(1)
  const [historyTotalPages,   setHistoryTotalPages]   = useState(1)

  const [showReassignAction, setShowReassignAction] = useState(false)
  const [reassignTo,         setReassignTo]         = useState('')
  const [reassignReason,     setReassignReason]     = useState('')
  const [reassigning,        setReassigning]        = useState(false)
  const [reassignError,      setReassignError]      = useState('')
  const [reassignSuccess,    setReassignSuccess]    = useState('')
  const [activeTab,          setActiveTab]          = useState('activity')

  const fetchReassignHistory = async (pg = 1) => {
    if (!canSeeHistory || !id) return
    try {
      setHistoryLoading(true)
      const res = await api.get(`/leads/${id}/reassignment-history`, { params: { page: pg, per_page: 5 } })
      const d = res.data.data
      setReassignHistory(d.history || [])
      setHistoryTotal(d.total_reassignments || 0)
      setHistoryPage(d.pagination?.page || 1)
      setHistoryTotalPages(d.pagination?.total_pages || 1)
    } catch (e) { console.error('Reassign history failed:', e.message) }
    finally { setHistoryLoading(false) }
  }

  useEffect(() => {
    dispatch(fetchLeadById(id))
    dispatch(fetchLeadActivities(id))
    dispatch(fetchUsers())
    fetchReassignHistory(1)
    return () => dispatch(clearCurrentLead())
  }, [dispatch, id])

  // Fetch phone access when lead data arrives
  useEffect(() => {
    if (lead?.id) fetchPhoneAccess()
  }, [lead?.id, canSeePhone])

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

  const stageIndex = leadStages.findIndex(s => s.value === lead?.status)
  // assigned_to from API is an object { id, full_name, phone } — read directly
  const assignedUser = lead?.assigned_to && typeof lead.assigned_to === 'object'
    ? lead.assigned_to
    : null

  const salesExecs = userList.filter(u =>
    ['sales_executive', 'sales_manager', 'external_caller'].includes(u.role) && u.is_active
  )

  const fetchPhoneAccess = async () => {
    if (canSeePhone) { setPhoneAccess({ has_access: true, phone: lead?.phone }); return }
    try {
      const r = await api.get(`/phone-reveal/check/${id}`)
      setPhoneAccess(r.data.data)
    } catch { setPhoneAccess({ has_access: false, phone: null, request: null }) }
  }

  const submitPhoneRequest = async () => {
    setReqError(''); setReqLoading(true)
    try {
      await api.post('/phone-reveal/request', { lead_id: id, reason: reqReason || undefined })
      setReqSuccess('Request submitted! Admin will be notified.')
      setPhoneAccess(p => ({ ...p, request: { status: 'pending' } }))
      setTimeout(() => { setShowPhoneReq(false); setReqSuccess(''); setReqReason('') }, 800)
    } catch(e) { setReqError(e.response?.data?.message || 'Request failed') }
    finally { setReqLoading(false) }
  }

  const handleReassign = async () => {
    if (!reassignTo) { setReassignError('Please select a team member'); return }
    setReassignError(''); setReassigning(true)
    try {
      await api.patch(`/leads/${id}/reassign`, { assigned_to: reassignTo, reason: reassignReason || undefined })
      setReassignSuccess('Lead reassigned successfully!')
      fetchReassignHistory(1)
      dispatch(fetchLeadById(id))
      setTimeout(() => { setShowReassignAction(false); setReassignTo(''); setReassignReason(''); setReassignSuccess('') }, 800)
    } catch (e) { setReassignError(e.response?.data?.message || 'Reassignment failed') }
    finally { setReassigning(false) }
  }

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
          {lead?.status !== 'Booked' && lead?.status !== 'Lost' && (
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-xl border-purple-200 hover:border-purple-300 hover:bg-purple-50 text-purple-600 dark:border-purple-900/30 dark:hover:bg-purple-900/20"
              onClick={() => setShowConvertModal(true)}
            >
              <CalendarPlus size={14} className="mr-2" /> Convert Lead
            </Button>
          )}
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
                  {/* Phone Number tile — smart: admin sees full, others see masked + request */}
                  <div className="p-4 rounded-2xl border border-gray-50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-[#0f0f0f]/50">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-600 bg-blue-50 dark:bg-opacity-10"><Phone size={14}/></div>
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Phone Number</span>
                    </div>
                    {phoneAccess === null ? (
                      <div className="h-5 w-24 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"/>
                    ) : phoneAccess.has_access ? (
                      <a href={`tel:${phoneAccess.phone || lead.phone}`} className="text-sm font-semibold text-brand hover:underline">{phoneAccess.phone || lead.phone}</a>
                    ) : phoneAccess.request?.status === 'pending' ? (
                      <div>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{lead.phone?.slice(0,5)}*****</p>
                        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full mt-1 inline-block">⏳ Request Pending</span>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{lead.phone?.slice(0,5)}*****</p>
                        {!canSeePhone && (
                          <button onClick={() => setShowPhoneReq(true)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-brand bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 px-2.5 py-1.5 rounded-lg transition-colors">
                            <Phone size={11}/> Request Access
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Alt Phone tile */}
                  <div className="p-4 rounded-2xl border border-gray-50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-[#0f0f0f]/50">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-indigo-600 bg-indigo-50 dark:bg-opacity-10"><Phone size={14}/></div>
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Alt Phone</span>
                    </div>
                    {lead.alternate_phone_number ? (
                      (canSeePhone || phoneAccess?.has_access) ? (
                        <a href={`tel:${lead.alternate_phone_number}`} className="text-sm font-semibold text-brand hover:underline">{lead.alternate_phone_number}</a>
                      ) : (
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{lead.alternate_phone_number?.slice(0,5)}*****</p>
                      )
                    ) : <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Not provided</p>}
                  </div>

                  {/* Email + Location tiles */}
                  {[
                    { icon: Mail,   label: 'Email Address', color: 'text-purple-600 bg-purple-50', value: lead.email || 'Not provided', href: lead.email ? `mailto:${lead.email}` : null },
                    { icon: MapPin, label: 'Finding Location', color: 'text-teal-600 bg-teal-50',  value: lead.location_preference || 'Not specified', href: null },
                  ].map(({ icon: Icon, label, value, color, href }) => (
                    <div key={label} className="p-4 rounded-2xl border border-gray-50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-[#0f0f0f]/50">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color} dark:bg-opacity-10`}><Icon size={14}/></div>
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
                      </div>
                      {href ? <a href={href} className="text-sm font-semibold text-brand hover:underline truncate block">{value}</a>
                             : <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{value}</div>}
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

            {/* 3. Activity History + Reassignment History — tabbed */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-8 shadow-sm">

              {/* Tab header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex gap-1 p-1 bg-gray-100 dark:bg-[#0f0f0f] rounded-xl w-fit">
                  <button onClick={() => setActiveTab('activity')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'activity' ? 'bg-white dark:bg-[#1a1a1a] text-brand shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                    <Clock size={14} /> Activity
                  </button>
                  {canSeeHistory && (
                    <button onClick={() => { setActiveTab('history'); if (reassignHistory.length === 0) fetchReassignHistory(1) }}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-white dark:bg-[#1a1a1a] text-brand shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                      <History size={14} /> Reassign History
                      {historyTotal > 0 && <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">{historyTotal}</span>}
                    </button>
                  )}
                </div>

                {/* Reassign action button — only on history tab for canSeeHistory */}
                {canSeeHistory && activeTab === 'history' && (
                  <button onClick={() => { setShowReassignAction(true); setReassignTo(''); setReassignReason(''); setReassignError(''); setReassignSuccess('') }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold transition-colors border border-indigo-100 dark:border-indigo-800/40">
                    <Users size={13} /> Reassign Lead
                  </button>
                )}
              </div>

              {/* ── Activity tab ── */}
              {activeTab === 'activity' && (
                <div>
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
                      <div className="space-y-8 max-h-[calc(100vh-400px)] overflow-auto overflow-x-hidden">
                        {activities.map((activity, idx) => {
                          const config = activityIconMap[activity.type] || { emoji: '📌', color: 'bg-gray-50 dark:bg-gray-800', icon: Info }
                          return (
                            <div key={activity.id} className="relative pl-10 group">
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
              )}

              {/* ── Reassignment History tab ── */}
              {activeTab === 'history' && canSeeHistory && (
                <div>
                  {historyLoading ? (
                    <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse"/>)}</div>
                  ) : reassignHistory.length === 0 ? (
                    <div className="text-center py-10 bg-gray-50 dark:bg-[#0f0f0f] rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                      <div className="text-3xl mb-2">🔄</div>
                      <p className="text-sm text-gray-400">This lead has never been reassigned</p>
                      <button onClick={() => setShowReassignAction(true)}
                        className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 text-xs font-semibold mx-auto transition-colors hover:bg-indigo-100">
                        <Users size={13}/> Reassign now
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {reassignHistory.map((h, i) => (
                        <div key={h.id} className="p-4 rounded-2xl bg-gray-50 dark:bg-[#0f0f0f] border border-gray-100 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-900/40 transition-all">
                          {/* From → To */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar name={h.from?.name || 'Unassigned'} size="xs"/>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{h.from?.name || <span className="italic text-gray-400">Unassigned</span>}</p>
                                {h.from?.role && <p className="text-[9px] text-gray-400 capitalize">{h.from.role.replace(/_/g,' ')}</p>}
                              </div>
                            </div>
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                              <ArrowRight size={11} className="text-indigo-500"/>
                            </div>
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar name={h.to?.name} size="xs"/>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{h.to?.name}</p>
                                {h.to?.role && <p className="text-[9px] text-gray-400 capitalize">{h.to.role.replace(/_/g,' ')}</p>}
                              </div>
                            </div>
                            {i === 0 && <span className="ml-auto flex-shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Latest</span>}
                          </div>
                          {h.reason && (
                            <div className="mt-2.5 flex items-start gap-1.5">
                              <Info size={11} className="text-gray-400 mt-0.5 flex-shrink-0"/>
                              <p className="text-xs text-gray-500 dark:text-gray-400 italic">"{h.reason}"</p>
                            </div>
                          )}
                          <div className="mt-2.5 flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-1.5">
                              <Avatar name={h.performed_by?.name} size="xs"/>
                              <span className="text-[10px] text-gray-400">By <span className="font-medium text-gray-600 dark:text-gray-300">{h.performed_by?.name}</span>
                                {h.performed_by?.role && <span> · {h.performed_by.role.replace(/_/g,' ')}</span>}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400 flex-shrink-0">
                              {h.reassigned_at ? new Date(h.reassigned_at).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'}
                            </span>
                          </div>
                        </div>
                      ))}
                      {historyTotalPages > 1 && (
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-xs text-gray-400">Page {historyPage} of {historyTotalPages}</span>
                          <div className="flex gap-2">
                            <button disabled={historyPage<=1} onClick={()=>{const p=historyPage-1;setHistoryPage(p);fetchReassignHistory(p)}} className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-40 hover:border-indigo-300 hover:text-indigo-500 transition-colors">Prev</button>
                            <button disabled={historyPage>=historyTotalPages} onClick={()=>{const p=historyPage+1;setHistoryPage(p);fetchReassignHistory(p)}} className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-40 hover:border-indigo-300 hover:text-indigo-500 transition-colors">Next</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
                    {leadStages.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
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
                    <span>{stageIndex >= 0 ? Math.round(((stageIndex + 1) / leadStages.length) * 100) : 0}%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-brand rounded-full transition-all duration-700 ease-out shadow-[0_0_12px_rgba(0,130,243,0.4)]"
                      style={{ width: `${stageIndex >= 0 ? ((stageIndex + 1) / leadStages.length) * 100 : 0}%` }}
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
                    <Avatar name={assignedUser.full_name} size="lg" className="rounded-2xl" />
                    <div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">{assignedUser.full_name}</div>
                      <div className="text-[10px] font-bold text-brand uppercase tracking-wider mt-0.5">Sales Executive</div>
                      {assignedUser.phone && <div className="text-[11px] text-gray-400 mt-1">{assignedUser.phone}</div>}
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

      {/* Phone Request Modal */}
      {showPhoneReq && !canSeePhone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowPhoneReq(false)}>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                <Phone size={18} className="text-brand"/>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">Request Phone Access</p>
                <p className="text-xs text-gray-400">{lead?.name}</p>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-[#0f0f0f] rounded-xl px-4 py-3 border border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-500">
                Admins will be notified and can approve your request. The phone number will be revealed once approved.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Reason <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input value={reqReason} onChange={e => setReqReason(e.target.value)}
                placeholder="e.g. Need to confirm site visit timing"
                autoFocus
                className="w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100"/>
            </div>
            {reqError   && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">{reqError}</p>}
            {reqSuccess && <p className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-xl">{reqSuccess}</p>}
            <div className="flex gap-3">
              <button onClick={() => setShowPhoneReq(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 hover:bg-gray-50">Cancel</button>
              <button onClick={submitPhoneRequest} disabled={reqLoading}
                className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand/90 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                {reqLoading ? <Loader2 size={13} className="animate-spin"/> : <Phone size={13}/>}
                {reqLoading ? 'Sending…' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reassign Action Modal */}
      {showReassignAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowReassignAction(false)}>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl w-full max-w-md"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-display text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Users size={16} className="text-indigo-500"/> Reassign Lead
              </h3>
              <button onClick={() => setShowReassignAction(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <ChevronDown size={16} className="rotate-90"/>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Current lead info */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-[#0f0f0f] border border-gray-100 dark:border-gray-800">
                <Avatar name={lead?.name} size="sm"/>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{lead?.name}</p>
                  <p className="text-xs text-gray-400">{(canSeePhone || phoneAccess?.has_access) ? (phoneAccess?.phone || lead?.phone) : lead?.phone?.slice(0,5) + '*****'}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-[10px] text-gray-400">Currently assigned to</p>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {assignedUser?.full_name || 'Unassigned'}
                  </p>
                </div>
              </div>

              <CustomSelect
                label="Assign To *"
                value={reassignTo}
                onChange={setReassignTo}
                options={salesExecs.map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name} · ${u.role.replace(/_/g,' ')}` }))}
                placeholder="Select team member"
              />

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Reason <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  value={reassignReason}
                  onChange={e => setReassignReason(e.target.value)}
                  placeholder="e.g. Better territorial alignment"
                  className="w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm"
                />
              </div>

              {reassignError   && <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5"><Info size={13} className="text-red-500"/><p className="text-xs text-red-600">{reassignError}</p></div>}
              {reassignSuccess && <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-2.5"><CheckCircle size={13} className="text-green-500"/><p className="text-xs text-green-600">{reassignSuccess}</p></div>}
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button onClick={() => setShowReassignAction(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button onClick={handleReassign} disabled={!reassignTo || reassigning}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">
                {reassigning ? <><Loader2 size={14} className="animate-spin"/> Reassigning…</> : <><Users size={14}/> Reassign</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {showConvertModal && lead && (
        <ConvertLeadModal
          lead={lead}
          onClose={() => setShowConvertModal(false)}
          onSuccess={(type) => {
            setShowConvertModal(false)
            dispatch(fetchLeadById(id))
            dispatch(fetchLeadActivities(id))
          }}
        />
      )}
    </div>
  )
}