import { useState, useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  Phone, CheckCircle2, X, Clock, RefreshCw, Search,
  ChevronDown, Eye, AlertCircle, Loader2, Users,
  FileSpreadsheet, Info, ShieldCheck, Shield,
} from 'lucide-react'
import api from '../api/axios'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import CustomSelect from '../components/ui/CustomSelect'

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmtDate = d => d
  ? new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
  : '—'

const STATUS_CFG = {
  pending:  { label:'Pending',  cls:'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',  dot:'bg-amber-500'  },
  approved: { label:'Approved', cls:'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',  dot:'bg-green-500'  },
  declined: { label:'Declined', cls:'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',         dot:'bg-red-500'    },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.pending
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}/>
      {cfg.label}
    </span>
  )
}

// ─── Admin: Approve/Decline modal ─────────────────────────────────────────────
function ReviewModal({ request, action, onClose, onDone }) {
  const [note,    setNote]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const isApprove = action === 'approve'

  const submit = async () => {
    setError(''); setLoading(true)
    try {
      await api.patch(`/phone-reveal/${request.id}/${action}`, { note: note || undefined })
      onDone()
    } catch(e) { setError(e.response?.data?.message || `${action} failed`) }
    finally { setLoading(false) }
  }

  return (
    <Modal isOpen={true} onClose={onClose}
      title={isApprove ? '✅ Approve Phone Request' : '❌ Decline Phone Request'}
      size="sm">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-[#111] border border-gray-100 dark:border-gray-800">
          <Avatar name={request.requester_name} size="sm"/>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{request.requester_name}</p>
            <p className="text-xs text-gray-400 capitalize">{request.requester_role?.replace(/_/g,' ')}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[10px] text-gray-400">For lead</p>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{request.lead_name}</p>
          </div>
        </div>

        {request.reason && (
          <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl px-3 py-2.5">
            <Info size={13} className="text-blue-500 flex-shrink-0 mt-0.5"/>
            <p className="text-xs text-blue-700 dark:text-blue-300 italic">"{request.reason}"</p>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
            {isApprove ? 'Note (optional)' : 'Reason for declining (optional)'}
          </label>
          <input value={note} onChange={e => setNote(e.target.value)}
            placeholder={isApprove ? 'e.g. Approved for site visit follow-up' : 'e.g. Not required at this stage'}
            className="w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100"/>
        </div>

        {error && <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2.5"><AlertCircle size={13} className="text-red-500"/><p className="text-xs text-red-600">{error}</p></div>}

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className={`flex-1 ${isApprove ? '' : '!bg-red-600 hover:!bg-red-700'}`}
            loading={loading} onClick={submit}>
            {isApprove ? 'Approve' : 'Decline'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Non-admin: Single request modal ─────────────────────────────────────────
function RequestModal({ lead, onClose, onDone }) {
  const [reason,   setReason]   = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState('')

  const submit = async () => {
    setError(''); setLoading(true)
    try {
      await api.post('/phone-reveal/request', { lead_id: lead.id, reason: reason || undefined })
      setSuccess('Request submitted! Admin will be notified.')
      setTimeout(() => { onDone(); onClose() }, 1000)
    } catch(e) { setError(e.response?.data?.message || 'Request failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="📞 Request Phone Number Access" size="sm">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-[#111] border border-gray-100 dark:border-gray-800">
          <Avatar name={lead?.name} size="sm"/>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{lead?.name}</p>
            <p className="text-xs text-gray-400">{lead?.phone || '—'}</p>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
            Reason <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input value={reason} onChange={e => setReason(e.target.value)}
            placeholder="e.g. Need to follow up on site visit"
            className="w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100"/>
        </div>
        {error   && <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2.5"><AlertCircle size={13} className="text-red-500"/><p className="text-xs text-red-600">{error}</p></div>}
        {success && <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-3 py-2.5"><CheckCircle2 size={13} className="text-green-500"/><p className="text-xs text-green-600">{success}</p></div>}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" loading={loading} onClick={submit} icon={Phone}>
            Submit Request
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Non-admin: Bulk request modal ───────────────────────────────────────────
function BulkRequestModal({ onClose, onDone }) {
  const [leads,    setLeads]    = useState([])
  const [search,   setSearch]   = useState('')
  const [selected, setSelected] = useState([])
  const [reason,   setReason]   = useState('')
  const [loading,  setLoading]  = useState(false)
  const [fetching, setFetching] = useState(false)
  const [error,    setError]    = useState('')
  const [result,   setResult]   = useState(null)

  useEffect(() => {
    const load = async () => {
      setFetching(true)
      try {
        const r = await api.get('/leads', { params: { per_page: 100, page: 1 } })
        setLeads(r.data?.data || [])
      } catch { setError('Failed to load leads') }
      finally { setFetching(false) }
    }
    load()
  }, [])

  const filtered = leads.filter(l =>
    l.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.phone?.includes(search)
  )

  const toggle = id => setSelected(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id])
  const toggleAll = () => setSelected(selected.length === filtered.length ? [] : filtered.map(l => l.id))

  const submit = async () => {
    if (!selected.length) { setError('Select at least one lead'); return }
    setError(''); setLoading(true)
    try {
      const r = await api.post('/phone-reveal/bulk-request', {
        lead_ids: selected,
        reason:   reason || undefined,
      })
      setResult(r.data.data)
    } catch(e) { setError(e.response?.data?.message || 'Bulk request failed') }
    finally { setLoading(false) }
  }

  if (result) return (
    <Modal isOpen={true} onClose={() => { onDone(); onClose() }} title="Bulk Request Submitted" size="sm">
      <div className="space-y-4 py-2">
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
            <CheckCircle2 size={28} className="text-green-500"/>
          </div>
          <p className="text-base font-bold text-gray-900 dark:text-white">Requests Submitted!</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label:'Submitted', val:result.inserted,  c:'text-green-600 dark:text-green-400', bg:'bg-green-50 dark:bg-green-900/20' },
            { label:'Skipped',   val:result.skipped,   c:'text-amber-600 dark:text-amber-400', bg:'bg-amber-50 dark:bg-amber-900/20' },
          ].map(x => (
            <div key={x.label} className={`rounded-xl px-4 py-3 text-center ${x.bg}`}>
              <p className={`text-2xl font-bold ${x.c}`}>{x.val ?? 0}</p>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mt-0.5">{x.label}</p>
            </div>
          ))}
        </div>
        {result.skipped_details?.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-xl p-3 max-h-32 overflow-y-auto">
            <p className="text-xs font-semibold text-amber-600 mb-1.5">Skipped:</p>
            {result.skipped_details.map((s,i) => (
              <p key={i} className="text-xs text-amber-500">{s.lead_name}: {s.reason}</p>
            ))}
          </div>
        )}
        <Button className="w-full" onClick={() => { onDone(); onClose() }}>Done</Button>
      </div>
    </Modal>
  )

  return (
    <Modal isOpen={true} onClose={onClose} title="Bulk Phone Number Request" size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
            Reason <span className="font-normal text-gray-400">(optional — applies to all)</span>
          </label>
          <input value={reason} onChange={e => setReason(e.target.value)}
            placeholder="e.g. Bulk follow-up campaign"
            className="w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100"/>
        </div>

        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search leads by name or phone..."
            className="w-full pl-8 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-brand"/>
        </div>

        {/* Lead list */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0}
                onChange={toggleAll} className="rounded border-gray-300"/>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                {selected.length > 0 ? `${selected.length} selected` : `All leads (${filtered.length})`}
              </span>
            </label>
          </div>
          {fetching ? (
            <div className="py-8 flex justify-center"><Loader2 size={20} className="animate-spin text-brand"/></div>
          ) : filtered.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-400">No leads found</div>
          ) : (
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/40">
              {filtered.map(l => (
                <label key={l.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/60 dark:hover:bg-gray-800/20 cursor-pointer">
                  <input type="checkbox" checked={selected.includes(l.id)} onChange={() => toggle(l.id)}
                    className="rounded border-gray-300 flex-shrink-0"/>
                  <Avatar name={l.name} size="xs"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{l.name}</p>
                    <p className="text-[10px] text-gray-400">{l.phone?.slice(0,5)}*****</p>
                  </div>
                  <Badge label={l.status || 'new'}/>
                </label>
              ))}
            </div>
          )}
        </div>

        {error && <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2.5"><AlertCircle size={13} className="text-red-500"/><p className="text-xs text-red-600">{error}</p></div>}

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" loading={loading} disabled={!selected.length}
            icon={Phone} onClick={submit}>
            Request {selected.length > 0 ? `${selected.length} Numbers` : 'Numbers'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Admin: All / Pending table ───────────────────────────────────────────────
function AdminRequestsTable({ tab, onRefresh }) {
  const [data,     setData]     = useState([])
  const [loading,  setLoading]  = useState(false)
  const [page,     setPage]     = useState(1)
  const [totalPg,  setTotalPg]  = useState(1)
  const [total,    setTotal]    = useState(0)
  const [search,   setSearch]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [reviewing, setReviewing] = useState(null)   // { request, action }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const endpoint = tab === 'pending' ? '/phone-reveal/pending' : '/phone-reveal/all'
      const params = { page, per_page: 15 }
      if (filterStatus && tab === 'all') params.status = filterStatus
      const r = await api.get(endpoint, { params })
      const d = r.data
      setData(d.data || [])
      setTotal(d.pagination?.total || 0)
      setTotalPg(d.pagination?.total_pages || 1)
    } catch { setData([]) } finally { setLoading(false) }
  }, [tab, page, filterStatus])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [tab, filterStatus])

  const filtered = search
    ? data.filter(r =>
        r.requester_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.lead_name?.toLowerCase().includes(search.toLowerCase())
      )
    : data

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or lead…"
            className="pl-8 pr-4 py-2 text-sm bg-card border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-brand w-52"/>
        </div>
        {tab === 'all' && (
          <div className="w-40">
            <CustomSelect value={filterStatus} onChange={setFilterStatus}
              options={[{value:'',label:'All Status'},{value:'pending',label:'Pending'},{value:'approved',label:'Approved'},{value:'declined',label:'Declined'}]}
              placeholder="All Status"/>
          </div>
        )}
        <button onClick={load} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-brand hover:border-brand transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''}/>
        </button>
        {total > 0 && <span className="text-xs text-gray-400 ml-1">{total} total</span>}
      </div>

      {/* Table */}
      <div className="bg-card border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 size={22} className="animate-spin text-brand"/></div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center text-gray-400 text-sm">
            <Phone size={36} className="mx-auto mb-3 text-gray-200 dark:text-gray-700" strokeWidth={1.5}/>
            {tab === 'pending' ? 'No pending requests' : 'No requests found'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-blue-50/50 dark:bg-blue-900/10 border-b border-gray-200 dark:border-gray-800">
                    {['Requester','Lead','Reason','Status','Requested At','Reviewed By','Actions'].map(h => (
                      <th key={h} className="py-3 px-4 text-left text-[11px] font-semibold text-blue-900/70 dark:text-blue-200/70 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/40">
                  {filtered.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Avatar name={r.requester_name} size="xs"/>
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{r.requester_name}</p>
                            <p className="text-[10px] text-gray-400 capitalize">{r.requester_role?.replace(/_/g,' ')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{r.lead_name}</p>
                        {r.status === 'approved' && r.lead_phone && (
                          <a href={`tel:${r.lead_phone}`} className="text-[11px] text-brand hover:underline">{r.lead_phone}</a>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-[180px]">
                        <p className="text-xs text-gray-500 italic truncate">{r.reason || '—'}</p>
                      </td>
                      <td className="py-3 px-4"><StatusBadge status={r.status}/></td>
                      <td className="py-3 px-4 text-xs text-gray-400 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                      <td className="py-3 px-4">
                        {r.reviewed_by_name ? (
                          <div>
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{r.reviewed_by_name}</p>
                            <p className="text-[10px] text-gray-400">{fmtDate(r.reviewed_at)}</p>
                          </div>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="py-3 px-4">
                        {r.status === 'pending' && (
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => setReviewing({ request: r, action: 'approve' })}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 hover:bg-green-100 text-green-700 dark:text-green-400 text-xs font-semibold transition-colors">
                              <CheckCircle2 size={12}/> Approve
                            </button>
                            <button onClick={() => setReviewing({ request: r, action: 'decline' })}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 text-red-600 dark:text-red-400 text-xs font-semibold transition-colors">
                              <X size={12}/> Decline
                            </button>
                          </div>
                        )}
                        {r.review_note && (
                          <p className="text-[10px] text-gray-400 italic mt-0.5 max-w-[120px] truncate">"{r.review_note}"</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPg > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500">
                <span>Page {page} of {totalPg} · {total} requests</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Prev</Button>
                  <Button size="sm" variant="outline" disabled={page>=totalPg} onClick={()=>setPage(p=>p+1)}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {reviewing && (
        <ReviewModal
          request={reviewing.request}
          action={reviewing.action}
          onClose={() => setReviewing(null)}
          onDone={() => { setReviewing(null); load(); onRefresh() }}
        />
      )}
    </div>
  )
}

// ─── Non-Admin: My Requests table ────────────────────────────────────────────
function MyRequestsTable({ onRequestSingle, onRequestBulk }) {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(false)
  const [page,    setPage]    = useState(1)
  const [totalPg, setTotalPg] = useState(1)
  const [total,   setTotal]   = useState(0)
  const [filterStatus, setFilterStatus] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, per_page: 15 }
      if (filterStatus) params.status = filterStatus
      const r = await api.get('/phone-reveal/my-requests', { params })
      setData(r.data?.data || [])
      setTotal(r.data?.pagination?.total || 0)
      setTotalPg(r.data?.pagination?.total_pages || 1)
    } catch { setData([]) } finally { setLoading(false) }
  }, [page, filterStatus])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <div className="w-40">
            <CustomSelect value={filterStatus} onChange={v => { setFilterStatus(v); setPage(1) }}
              options={[{value:'',label:'All Status'},{value:'pending',label:'Pending'},{value:'approved',label:'Approved'},{value:'declined',label:'Declined'}]}
              placeholder="All Status"/>
          </div>
          <button onClick={load} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-brand hover:border-brand transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''}/>
          </button>
          {total > 0 && <span className="text-xs text-gray-400">{total} requests</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={Phone} onClick={onRequestSingle}>
            Request Number
          </Button>
          <Button size="sm" icon={Users} onClick={onRequestBulk}>
            Bulk Request
          </Button>
        </div>
      </div>

      <div className="bg-card border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 size={22} className="animate-spin text-brand"/></div>
        ) : data.length === 0 ? (
          <div className="py-14 text-center">
            <Phone size={36} className="mx-auto mb-3 text-gray-200 dark:text-gray-700" strokeWidth={1.5}/>
            <p className="text-sm text-gray-500">No requests yet</p>
            <p className="text-xs text-gray-400 mt-1">Click "Request Number" to get started</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-blue-50/50 dark:bg-blue-900/10 border-b border-gray-200 dark:border-gray-800">
                    {['Lead','Your Reason','Status','Phone (if approved)','Requested At','Reviewed At'].map(h => (
                      <th key={h} className="py-3 px-4 text-left text-[11px] font-semibold text-blue-900/70 dark:text-blue-200/70 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/40">
                  {data.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/20 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-800 dark:text-gray-200">{r.lead_name}</td>
                      <td className="py-3 px-4 text-xs text-gray-500 italic max-w-[160px] truncate">{r.reason || '—'}</td>
                      <td className="py-3 px-4"><StatusBadge status={r.status}/></td>
                      <td className="py-3 px-4">
                        {r.status === 'approved' && r.lead_phone ? (
                          <a href={`tel:${r.lead_phone}`} className="text-brand font-semibold hover:underline">{r.lead_phone}</a>
                        ) : (
                          <span className="text-xs text-gray-400">
                            {r.status === 'pending' ? 'Awaiting approval' : 'Not revealed'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-400 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                      <td className="py-3 px-4 text-xs text-gray-400 whitespace-nowrap">{fmtDate(r.reviewed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPg > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500">
                <span>Page {page} of {totalPg} · {total} requests</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Prev</Button>
                  <Button size="sm" variant="outline" disabled={page>=totalPg} onClick={()=>setPage(p=>p+1)}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PhoneRequests() {
  const { user } = useSelector(s => s.auth)
  const isAdmin  = ['admin','super_admin'].includes(user?.role)

  const [tab,            setTab]            = useState(isAdmin ? 'pending' : 'my')
  const [pendingCount,   setPendingCount]   = useState(0)
  const [showSingle,     setShowSingle]     = useState(false)
  const [showBulk,       setShowBulk]       = useState(false)
  const [selectedLead,   setSelectedLead]   = useState(null)

  const fetchPendingCount = useCallback(async () => {
    if (!isAdmin) return
    try {
      const r = await api.get('/phone-reveal/pending', { params: { page:1, per_page:1 } })
      setPendingCount(r.data?.pagination?.total || 0)
    } catch {}
  }, [isAdmin])

  useEffect(() => { fetchPendingCount() }, [fetchPendingCount])

  const adminTabs = [
    { id:'pending', label:'Pending',  badge: pendingCount },
    { id:'all',     label:'All Requests' },
  ]
  const nonAdminTabs = [
    { id:'my', label:'My Requests' },
  ]
  const tabs = isAdmin ? adminTabs : nonAdminTabs

  return (
    <div className="space-y-5 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            {isAdmin ? <ShieldCheck size={20} className="text-brand"/> : <Phone size={20} className="text-brand"/>}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {isAdmin ? 'Phone Number Access Control' : 'Phone Number Requests'}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {isAdmin
                ? 'Review and manage requests to reveal lead phone numbers'
                : 'Request access to lead phone numbers for follow-ups'}
            </p>
          </div>
        </div>

        {/* Non-admin quick actions */}
        {!isAdmin && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" icon={Phone} onClick={() => setShowSingle(true)}>
              Request Number
            </Button>
            <Button size="sm" icon={Users} onClick={() => setShowBulk(true)}>
              Bulk Request
            </Button>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-[#111] rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-white dark:bg-[#1a1a1a] text-brand shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}>
            {t.label}
            {t.badge > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {isAdmin ? (
        <AdminRequestsTable key={tab} tab={tab} onRefresh={fetchPendingCount}/>
      ) : (
        <MyRequestsTable
          onRequestSingle={() => setShowSingle(true)}
          onRequestBulk={() => setShowBulk(true)}
        />
      )}

      {/* Single request modal — non-admin asks for a specific lead */}
      {showSingle && (
        <RequestModal
          lead={selectedLead || { id: '', name: 'Select a lead', phone: '' }}
          onClose={() => { setShowSingle(false); setSelectedLead(null) }}
          onDone={() => setTab('my')}
        />
      )}

      {/* Bulk request modal */}
      {showBulk && (
        <BulkRequestModal
          onClose={() => setShowBulk(false)}
          onDone={() => setTab('my')}
        />
      )}
    </div>
  )
}
