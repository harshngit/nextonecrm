import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Calendar, User, Building2, MapPin,
  CheckCircle, Loader2, UserCheck,
  ShieldCheck, ExternalLink,
  ChevronDown, Info, IndianRupee, CreditCard, Banknote, Home, BadgeCheck, FileText
} from 'lucide-react'
import api from '../api/axios'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import { ClosureDocumentManager } from './Closures'

export default function ClosureDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [closure, setClosure] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [note, setNewNote] = useState('')

  const fetchClosure = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/closures/${id}`)
      setClosure(res.data.data)
      setNewStatus(res.data.data.status)
    } catch (err) {
      console.error('Failed to fetch closure:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClosure()
  }, [id])

  const statusLabel = { confirmed: 'Confirmed', on_hold: 'On Hold', cancelled: 'Cancelled' }
  const statusColor = {
    confirmed: 'bg-green-100 text-green-600',
    on_hold:   'bg-amber-100 text-amber-600',
    cancelled: 'bg-red-100 text-red-500',
  }

  const handleStatusUpdate = async () => {
    setActionLoading(true)
    try {
      await api.patch(`/closures/${id}/status`, { status: newStatus, note: note || undefined })
      await fetchClosure()
      setNewNote('')
    } catch (err) {
      console.error('Failed to update status:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const fmtCurrency = n => n ? `₹${Number(n).toLocaleString('en-IN')}` : '—'
  const fmtDate = value => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  const unit = closure?.unit || {}
  const financials = closure?.financials || {}
  const commission = closure?.commission || {}
  const lead = closure?.lead || {}
  const project = closure?.project || {}
  const closedBy = closure?.closed_by || {}
  const closedByManager = closure?.closed_by_manager || {}
  const leadId = lead.id

  if (loading && !closure) return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <Loader2 className="animate-spin text-brand mb-4" size={40} />
      <p className="text-gray-500 font-medium">Loading closure details...</p>
    </div>
  )

  if (!closure && !loading) return (
    <div className="flex items-center justify-center h-[60vh] text-gray-400 dark:text-[#888]">
      <div className="text-center max-w-sm px-6">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">✅</div>
        <h3 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-2">Closure not found</h3>
        <Button variant="outline" onClick={() => navigate('/closures')} className="mt-4 rounded-xl">Back to Closures</Button>
      </div>
    </div>
  )

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12">
      {/* Top Header / Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/closures')}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 flex items-center justify-center group-hover:border-brand/30 transition-all">
            <ArrowLeft size={16} />
          </div>
          Back to Closures
        </button>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => leadId && navigate(`/leads/${leadId}`)}
            disabled={!leadId}
          >
            View Lead
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Main Info (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* 1. Profile Header Card */}
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] overflow-hidden shadow-sm hover:shadow-md transition-all">
            <div className="h-24 bg-gradient-to-r from-emerald-500 to-green-600 relative opacity-10 dark:opacity-20" />
            <div className="px-8 pb-8 relative">
              <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-10">
                <div className="p-1.5 bg-white dark:bg-[#1a1a1a] rounded-[28px] shadow-xl">
                  <div className="w-24 h-24 md:w-32 md:h-32 bg-emerald-500 rounded-[22px] flex items-center justify-center text-white">
                    <BadgeCheck size={48} />
                  </div>
                </div>
                <div className="flex-1 space-y-2 mb-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">Closure: {project.name || 'Project'}</h1>
                    <Badge label={statusLabel[closure.status] || closure.status} className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-xl ${statusColor[closure.status] || ''}`} />
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-brand" /> ID: {closure.id?.slice?.(0, 8) || closure.id}</span>
                    <span className="flex items-center gap-1.5"><Calendar size={14} /> Booking Date: {fmtDate(closure.booking_date)}</span>
                    <span className="flex items-center gap-1.5"><Building2 size={14} /> {project.city || 'City Unavailable'}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-10">
                {[
                  { icon: Home, label: 'Unit', value: [unit.unit_type, unit.unit_number].filter(Boolean).join(' - ') || '—', color: 'text-blue-600 bg-blue-50' },
                  { icon: Building2, label: 'Tower', value: unit.tower_block ? String(unit.tower_block).toUpperCase() : '—', color: 'text-indigo-600 bg-indigo-50' },
                  { icon: MapPin, label: 'Floor', value: unit.floor_number || '—', color: 'text-purple-600 bg-purple-50' },
                  { icon: IndianRupee, label: 'Deal Value', value: fmtCurrency(financials.agreed_price), color: 'text-emerald-600 bg-emerald-50' },
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

          {/* 2. Financials Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-8 shadow-sm">
              <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shadow-sm">
                  <CreditCard size={18} className="text-blue-500" />
                </div>
                Payment Details
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 rounded-2xl bg-gray-50 dark:bg-[#0f0f0f] border border-gray-100 dark:border-gray-800">
                  <span className="text-xs font-bold text-gray-400 uppercase">Booking Amount</span>
                  <span className="text-sm font-bold text-blue-600">{fmtCurrency(financials.booking_amount)}</span>
                </div>
                <div className="flex justify-between items-center p-4 rounded-2xl bg-gray-50 dark:bg-[#0f0f0f] border border-gray-100 dark:border-gray-800">
                  <span className="text-xs font-bold text-gray-400 uppercase">Payment Plan</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{financials.payment_plan || '—'}</span>
                </div>
                <div className="flex justify-between items-center p-4 rounded-2xl bg-gray-50 dark:bg-[#0f0f0f] border border-gray-100 dark:border-gray-800">
                  <span className="text-xs font-bold text-gray-400 uppercase">Home Loan</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{financials.loan_required ? `Yes (${financials.loan_bank || 'TBD'})` : 'No'}</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-8 shadow-sm">
              <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shadow-sm">
                  <Banknote size={18} className="text-emerald-500" />
                </div>
                Commission
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 rounded-2xl bg-gray-50 dark:bg-[#0f0f0f] border border-gray-100 dark:border-gray-800">
                  <span className="text-xs font-bold text-gray-400 uppercase">Amount</span>
                  <span className="text-sm font-bold text-emerald-600">{fmtCurrency(commission.amount)} ({commission.percent || 0}%)</span>
                </div>
                <div className="flex justify-between items-center p-4 rounded-2xl bg-gray-50 dark:bg-[#0f0f0f] border border-gray-100 dark:border-gray-800">
                  <span className="text-xs font-bold text-gray-400 uppercase">Payment Status</span>
                  <Badge 
                    label={commission.paid ? 'Paid' : 'Pending'} 
                    className={`px-3 py-1 text-[10px] font-bold uppercase ${commission.paid ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`} 
                  />
                </div>
                {commission.paid && (
                  <div className="flex justify-between items-center p-4 rounded-2xl bg-gray-50 dark:bg-[#0f0f0f] border border-gray-100 dark:border-gray-800">
                    <span className="text-xs font-bold text-gray-400 uppercase">Paid Date</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{fmtDate(commission.paid_date)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. Notes */}
          {closure.closure_notes && (
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center shadow-sm">
                  <Info size={18} className="text-gray-500" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">Closure Notes</h3>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-[#0f0f0f] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 min-h-[100px] shadow-inner">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{closure.closure_notes}</p>
              </div>
            </div>
          )}

          {/* 4. Documents */}
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shadow-sm">
                <FileText size={18} className="text-blue-500" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">Documents</h3>
              </div>
            </div>
            <ClosureDocumentManager closureId={closure.id} />
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
                disabled={newStatus === closure.status && !note}
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
              onClick={() => leadId && navigate(`/leads/${leadId}`)}>
              <div className="flex items-center gap-4">
                <Avatar name={lead.name} size="lg" className="rounded-2xl shadow-md" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-brand transition-colors">{lead.name || 'Lead Name'}</div>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <div className="text-[10px] font-bold text-brand uppercase tracking-wider bg-brand/5 px-2 py-0.5 rounded-full inline-block">{lead.source || 'Prospect'}</div>
                    {lead.budget && (
                      <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-full inline-block">{lead.budget}</div>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-2 truncate">{lead.phone || 'No phone available'}</div>
                  <div className="text-[11px] text-gray-400 truncate">{lead.email || 'No email available'}</div>
                  <div className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                    <ExternalLink size={10} /> {leadId ? 'View Profile' : 'Lead unavailable'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 6. Project */}
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
            <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
              <Building2 size={18} className="text-indigo-500" /> Project Details
            </h3>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#0f0f0f] border border-gray-100 dark:border-gray-800">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Project</div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">{project.name || '—'}</div>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#0f0f0f] border border-gray-100 dark:border-gray-800">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Developer</div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">{project.developer || '—'}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#0f0f0f] border border-gray-100 dark:border-gray-800">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">City</div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">{project.city || '—'}</div>
                </div>
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#0f0f0f] border border-gray-100 dark:border-gray-800">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Range</div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">{project.price_range || '—'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* 7. Coordinator */}
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] p-6 shadow-sm">
            <h3 className="font-display text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
              <UserCheck size={18} className="text-teal-500" /> Closed By
            </h3>
            
            <div className="p-4 rounded-[20px] bg-gray-50/50 dark:bg-[#0f0f0f]/50 border border-gray-50 dark:border-gray-800 shadow-sm">
              <div className="flex items-center gap-4">
                <Avatar 
                  name={closedBy.name || 'Admin'} 
                  size="lg" 
                  className="rounded-2xl shadow-md" 
                />
                <div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {closedBy.name || 'Team Member'}
                  </div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{closedBy.email || 'Sales Executive'}</div>
                  {closedByManager.name?.trim() && (
                    <div className="text-[11px] text-gray-500 mt-2">Manager: {closedByManager.name.trim()}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
