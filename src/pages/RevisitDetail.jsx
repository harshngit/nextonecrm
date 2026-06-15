import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  ArrowLeft, Calendar, Clock, User, Building2, MapPin,
  CheckCircle, RefreshCw, Loader2, UserCheck,
  MessageSquare, ShieldCheck, ExternalLink,
  ChevronDown, Info, Star, TrendingUp, Target, Eye
} from 'lucide-react'
import api from '../api/axios'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'

export default function RevisitDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { user: currentUser } = useSelector(s => s.auth)
  const isAdmin = ['admin', 'super_admin'].includes(currentUser?.role)
  const [showPhone, setShowPhone] = useState(false)

  const [revisit, setRevisit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [note, setNewNote] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const [feedbackForm, setFeedbackForm] = useState({
    rating: 0,
    client_reaction: '',
    interested_in: '',
    next_step: '',
    remarks: ''
  })

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const statusLabel = { scheduled: 'Scheduled', done: 'Completed', cancelled: 'Cancelled', rescheduled: 'Rescheduled', no_show: 'No Show' }
  const statusColor = {
    scheduled:   'bg-blue-100 text-[#0082f3]',
    done:        'bg-green-100 text-green-600',
    cancelled:   'bg-red-100 text-red-500',
    rescheduled: 'bg-blue-50 text-blue-500',
    no_show:     'bg-gray-100 text-gray-500',
  }

  const reactionLabel = { very_positive:'Very Positive', positive:'Positive', neutral:'Neutral', negative:'Negative', not_interested:'Not Interested' }
  const nextStepLabel = { negotiation:'Negotiation', follow_up:'Follow Up', send_proposal:'Send Proposal', booked:'Booked', lost:'Lost', another_revisit:'Another Revisit' }
  const revisitStatuses = ['scheduled', 'done', 'cancelled', 'rescheduled', 'no_show']
  const reactionOptions = ['very_positive', 'positive', 'neutral', 'negative', 'not_interested']
  const nextStepOptions = ['negotiation', 'follow_up', 'send_proposal', 'booked', 'lost', 'another_revisit']

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

  const handleSubmitFeedback = async () => {
    setActionLoading(true)
    try {
      await api.post(`/site-revisits/${id}/feedback`, feedbackForm)
      await fetchRevisit()
    } catch (err) {
      console.error('Failed to submit feedback:', err)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-brand mb-4" size={40} />
        <p className="text-gray-500 font-medium">Loading revisit details...</p>
      </div>
    )
  }

  if (!revisit && !loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-gray-400 dark:text-[#888]">
        <div className="text-center max-w-sm px-6">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">🏢</div>
          <h3 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-2">Revisit not found</h3>
          <Button variant="outline" onClick={() => navigate('/site-visits')} className="mt-4 rounded-xl">Back to Visits</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/revisits')}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 flex items-center justify-center group-hover:border-brand/30 transition-all">
            <ArrowLeft size={16} />
          </div>
          Back
        </button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => navigate(`/leads/${revisit.lead_id}`)}>
            View Lead
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => navigate(`/site-visits/${revisit.original_visit_id}`)}>
            View Original Visit
          </Button>
          <Button size="sm" className="rounded-xl px-5 font-bold shadow-lg shadow-blue-100/50">
            Edit Revisit
          </Button>
        </div>
      </div>

      {revisit && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column - 8 cols */}
          <div className="lg:col-span-8 space-y-4">
            {/* Profile Header */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="h-12 bg-gradient-to-r from-purple-500 to-[#8b5cf6] relative opacity-10 dark:opacity-20" />
              <div className="px-5 pb-5 relative">
                <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-6">
                  <div className="p-1.5 bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-lg">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-purple-600 rounded-xl flex items-center justify-center text-white">
                      <RefreshCw size={32} />
                    </div>
                  </div>
                  <div className="flex-1 space-y-1.5 mb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Revisit to {revisit.project_name || 'Project'}</h1>
                      <Badge label={statusLabel[revisit.status] || revisit.status} className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-lg ${statusColor[revisit.status] || ''}`} />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5"><ShieldCheck size={13} className="text-purple-600" /> ID: {revisit.id?.slice?.(0, 8) || revisit.id}</span>
                      <span className="flex items-center gap-1.5"><Calendar size={13} /> {new Date(revisit.visit_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  {[
                    { icon: Calendar, label: 'Date', value: new Date(revisit.visit_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }), color: 'text-purple-600 bg-purple-50' },
                    { icon: Clock, label: 'Time', value: revisit.visit_time || 'Not set', color: 'text-indigo-600 bg-indigo-50' },
                    { icon: Building2, label: 'Project', value: revisit.project_name || '—', color: 'text-blue-600 bg-blue-50' },
                    { icon: RefreshCw, label: 'Transport', value: revisit.transport_arranged ? 'Arranged' : 'Self', color: 'text-teal-600 bg-teal-50' },
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

            {/* Images, Notes & Feedback (either form or display) */}
            <div className="space-y-4">
              {/* Images */}
              {(() => {
                let firstImage = null;
                if (Array.isArray(revisit.images) && revisit.images.length > 0) {
                  firstImage = revisit.images[0];
                } else if (Array.isArray(revisit.photos) && revisit.photos.length > 0) {
                  firstImage = revisit.photos[0];
                } else if (revisit.image) {
                  firstImage = revisit.image;
                } else if (revisit.photo) {
                  firstImage = revisit.photo;
                }

                if (firstImage) {
                  const imageUrl = typeof firstImage === 'string' ? firstImage : firstImage.url || firstImage.src;
                  if (imageUrl) {
                    return (
                      <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                        <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-3">Photo</h3>
                        <img 
                          src={imageUrl} 
                          alt="Revisit photo" 
                          className="w-full rounded-xl object-cover max-h-64"
                        />
                      </div>
                    );
                  }
                }
                return null;
              })()}

              {/* Notes & Feedback (either form or display) - Side by Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Visit Notes */}
                {revisit.notes && (
                  <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                        <Info size={16} className="text-purple-600" />
                      </div>
                      <h3 className="font-display text-base font-bold text-gray-900 dark:text-white">Pre-visit Notes</h3>
                    </div>
                    <div className="bg-gray-50 dark:bg-[#0f0f0f] rounded-xl p-4 border border-gray-100 dark:border-gray-800 min-h-[80px]">
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{revisit.notes}</p>
                    </div>
                  </div>
                )}

                {/* Determine if we should show feedback form or feedback display */}
                {(() => {
                  // Check if feedback exists
                  let feedbackData = null;
                  if (revisit.client_reaction) {
                    feedbackData = revisit;
                  } else if (revisit.feedback && typeof revisit.feedback === 'object') {
                    feedbackData = revisit.feedback;
                  }

                  // Check if we should show the submit form
                  const shouldShowForm = revisit.status === 'done' && !feedbackData;

                  if (shouldShowForm) {
                    // Show submit feedback form
                    return (
                      <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                        <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <Star size={16} className="text-amber-500" /> Submit Feedback
                        </h3>
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
                                    feedbackForm.client_reaction === reaction ? 'bg-purple-500/10 text-purple-600 border border-purple-500/20' : 'bg-gray-50 text-gray-600 border border-gray-100 hover:border-gray-200'
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
                                    feedbackForm.next_step === step ? 'bg-purple-500/10 text-purple-600 border border-purple-500/20' : 'bg-gray-50 text-gray-600 border border-gray-100 hover:border-gray-200'
                                  }`}
                                >
                                  {nextStepLabel[step]}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Interested In */}
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 px-0.5">Interested In</label>
                            <textarea
                              value={feedbackForm.interested_in}
                              onChange={e => setFeedbackForm(f => ({ ...f, interested_in: e.target.value }))}
                              placeholder="What are they interested in..."
                              rows={2}
                              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:border-purple-500 transition-all resize-none text-gray-900 dark:text-gray-100"
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
                              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:border-purple-500 transition-all resize-none text-gray-900 dark:text-gray-100"
                            />
                          </div>

                          <Button
                            className="w-full rounded-xl py-3 font-bold shadow-xl shadow-purple-500/25 active:scale-[0.98] transition-all"
                            onClick={handleSubmitFeedback}
                            loading={actionLoading}
                          >
                            Submit Feedback
                          </Button>
                        </div>
                      </div>
                    );
                  } else if (feedbackData) {
                    // Show client feedback display
                    return (
                      <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                              <Star size={16} className="text-amber-500" />
                            </div>
                            <h3 className="font-display text-base font-bold text-gray-900 dark:text-white">Client Feedback</h3>
                          </div>
                          {feedbackData.rating && (
                            <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-lg border border-amber-100 dark:border-amber-900/30">
                              <Star size={12} className="text-amber-500" fill="currentColor" />
                              <span className="text-xs font-bold text-amber-700 dark:text-amber-400">{feedbackData.rating}/5</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2.5">
                          {feedbackData.client_reaction && (
                            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-[#0f0f0f] border border-gray-100 dark:border-gray-800">
                              <TrendingUp size={14} className="text-blue-500" />
                              <div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Reaction</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">{reactionLabel[feedbackData.client_reaction] || feedbackData.client_reaction}</p>
                              </div>
                            </div>
                          )}
                          {feedbackData.next_step && (
                            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-[#0f0f0f] border border-gray-100 dark:border-gray-800">
                              <Target size={14} className="text-purple-500" />
                              <div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Next Step</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">{nextStepLabel[feedbackData.next_step] || feedbackData.next_step}</p>
                              </div>
                            </div>
                          )}
                          {feedbackData.interested_in && (
                            <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-[#0f0f0f] border border-gray-100 dark:border-gray-800">
                              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Interested In</p>
                              <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{feedbackData.interested_in}</p>
                            </div>
                          )}
                          {feedbackData.remarks && (
                            <div className="bg-blue-50/50 dark:bg-blue-900/5 rounded-lg p-3 border border-blue-100/50 dark:border-blue-900/20">
                              <p className="text-[9px] font-bold text-blue-600/70 dark:text-blue-400/70 uppercase tracking-widest mb-1">Remarks</p>
                              <p className="text-sm text-gray-700 dark:text-gray-300">{feedbackData.remarks}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return null;
                })()}
              </div>

              {/* Old style feedback section - only if feedback is a string */}
              {(revisit.feedback && typeof revisit.feedback === 'string' && !(revisit.client_reaction || (revisit.feedback && typeof revisit.feedback === 'object'))) && (
                <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                      <MessageSquare size={16} className="text-brand" />
                    </div>
                    <h3 className="font-display text-base font-bold text-gray-900 dark:text-white">Visit Feedback</h3>
                  </div>
                  <div className="bg-gray-50 dark:bg-[#0f0f0f] rounded-xl p-4 border border-gray-100 dark:border-gray-800 min-h-[80px]">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{revisit.feedback}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - 4 cols */}
          <div className="lg:col-span-4 space-y-4">
            {/* Update Status Card */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
              <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <CheckCircle size={16} className="text-green-500" /> Update Status
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 px-0.5">Revisit Status</label>
                  <div className="relative" ref={dropdownRef}>
                    <div
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full pl-3.5 pr-9 py-2.5 text-sm bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/5 transition-all text-gray-900 dark:text-gray-100 font-bold cursor-pointer hover:border-gray-300 dark:hover:border-gray-700"
                    >
                      {statusLabel[newStatus]}
                    </div>
                    <ChevronDown
                      size={14}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                    />
                    {isDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl z-50 overflow-hidden">
                        {revisitStatuses.map(s => (
                          <div
                            key={s}
                            onClick={() => {
                              setNewStatus(s)
                              setIsDropdownOpen(false)
                            }}
                            className={`px-3.5 py-2.5 text-sm font-bold cursor-pointer transition-all ${
                              newStatus === s
                                ? 'bg-purple-500/10 text-purple-600'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                          >
                            {statusLabel[s]}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 px-0.5">Note (Optional)</label>
                  <textarea
                    value={note}
                    onChange={e => setNewNote(e.target.value)}
                    placeholder="Reason for status change..."
                    rows={2}
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:border-purple-500 transition-all resize-none text-gray-900 dark:text-gray-100"
                  />
                </div>
                <Button
                  className="w-full rounded-xl py-3 font-bold shadow-xl shadow-purple-500/25 active:scale-[0.98] transition-all"
                  onClick={handleStatusUpdate}
                  loading={actionLoading}
                  disabled={newStatus === revisit.status && !note}
                >
                  Update Status
                </Button>
              </div>
            </div>



            {/* Lead Information */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
              <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <User size={16} className="text-purple-500" /> Lead Information
              </h3>
              <div className="p-3.5 rounded-xl bg-gray-50/50 dark:bg-[#0f0f0f]/50 border border-gray-50 dark:border-gray-800 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-all group"
                   onClick={() => navigate(`/leads/${revisit.lead_id}`)}>
                <div className="flex items-center gap-3">
                  <Avatar name={revisit.lead_name || revisit['lead name']} size="md" className="rounded-xl shadow-md" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-purple-600 transition-colors">{revisit.lead_name || revisit['lead name'] || 'Lead Name'}</div>
                    <div className="text-[9px] font-bold text-purple-600 uppercase tracking-wider mt-0.5 bg-purple-50 dark:bg-purple-900/20 px-1.5 py-0.5 rounded-full inline-block">Prospect</div>
                    <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                      <ExternalLink size={9} /> View Profile
                    </div>
                  </div>
                </div>
              </div>

              {/* Phone Number Section */}
              {revisit.lead_phone && (
                <div className="mt-4">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Phone Number</p>
                  {isAdmin ? (
                    <a href={`tel:${revisit.lead_phone}`} className="text-sm font-semibold text-purple-600 hover:underline">{revisit.lead_phone}</a>
                  ) : showPhone ? (
                    <a href={`tel:${revisit.lead_phone}`} className="text-sm font-semibold text-purple-600 hover:underline">{revisit.lead_phone}</a>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">*****{revisit.lead_phone?.slice(-5)}</p>
                      <button onClick={() => setShowPhone(true)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 px-2.5 py-1.5 rounded-lg transition-colors">
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
                    name={revisit.assigned_to_name || (typeof revisit.assigned_to === 'object' ? revisit.assigned_to.full_name : revisit.assigned_to) || 'Admin'}
                    size="md"
                    className="rounded-xl shadow-md"
                  />
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                      {revisit.assigned_to_name || (typeof revisit.assigned_to === 'object' ? revisit.assigned_to.full_name : revisit.assigned_to) || 'Team Member'}
                    </div>
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Sales Executive</div>
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
