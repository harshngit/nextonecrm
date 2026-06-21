import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useModulePermissions } from '../hooks/usePermission'
import {
  Target, RefreshCw, Edit2, RotateCcw, MoreVertical, X,
  CheckCircle2, AlertCircle, Users, TrendingUp, Building2,
} from 'lucide-react'
import { fetchTargets, fetchMyTarget, createTarget, updateTarget, deleteTarget, clearTargetError } from '../store/targetSlice'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ConfirmModal from '../components/ui/ConfirmModal'
import CustomSelect from '../components/ui/CustomSelect'
import ListSkeleton from '../components/loaders/ListSkeleton'

const PER_PAGE = 10

const MONTHS = [
  { v: 1, l: 'January' }, { v: 2, l: 'February' }, { v: 3, l: 'March' },
  { v: 4, l: 'April' },   { v: 5, l: 'May' },       { v: 6, l: 'June' },
  { v: 7, l: 'July' },    { v: 8, l: 'August' },    { v: 9, l: 'September' },
  { v: 10, l: 'October' },{ v: 11, l: 'November' }, { v: 12, l: 'December' },
]

const thisMonth = new Date().getMonth() + 1
const thisYear  = new Date().getFullYear()
const YEARS     = Array.from({ length: 5 }, (_, i) => thisYear - i)

const roleColors = {
  super_admin:     'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30',
  admin:           'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
  sales_manager:   'text-brand bg-brand/10 dark:bg-brand/15',
  sales_executive: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
  external_caller: 'text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-900/30',
}

const ic = 'w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm transition-all'
const lc = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'

// ── Helpers to read the target progress row — matches the confirmed API
// shape from GET /targets/me: { user_id, user_name, role, target_month,
// site_visit_target, site_visits_done, site_visits_remaining,
// closure_target, closures_done, closures_remaining, is_custom } ───────────
const getUserId   = t => t.user_id
const getUserName = t => t.user_name || '—'
const getRole      = t => t.role
const getSvTarget  = t => t.site_visit_target ?? 15
const getSvDone    = t => t.site_visits_done ?? 0
const getSvLeft    = t => t.site_visits_remaining ?? Math.max(getSvTarget(t) - getSvDone(t), 0)
const getClTarget  = t => t.closure_target ?? 1
const getClDone    = t => t.closures_done ?? 0
const getClLeft    = t => t.closures_remaining ?? Math.max(getClTarget(t) - getClDone(t), 0)
const isCustomTarget = t => t.is_custom ?? false

function ProgressBar({ done, target, color }) {
  const pct = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden min-w-[60px]">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-bold text-gray-400 w-8 text-right">{pct}%</span>
    </div>
  )
}

// ── Set / Edit Target Modal ───────────────────────────────────────────────────
function TargetFormModal({ target, userName, monthStr, monthLabel, isEdit, onClose, onSuccess }) {
  const dispatch = useDispatch()
  const [siteVisitTarget, setSiteVisitTarget] = useState(target ? getSvTarget(target) : 15)
  const [closureTarget,   setClosureTarget]   = useState(target ? getClTarget(target) : 1)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const userId = target ? getUserId(target) : null

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true); setError('')
    const payload = {
      month: monthStr,
      site_visit_target: Number(siteVisitTarget),
      closure_target: Number(closureTarget),
    }
    const thunk = isEdit ? updateTarget : createTarget
    const result = await dispatch(thunk({ userId, data: payload }))
    setLoading(false)
    if (thunk.fulfilled.match(result)) {
      onSuccess()
      onClose()
    } else {
      setError(result.payload || 'Failed to save target')
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={isEdit ? 'Edit Target' : 'Set Custom Target'} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0f0f0f] rounded-xl border border-gray-100 dark:border-gray-800">
          <Avatar name={userName} size="sm" />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{userName}</p>
            <p className="text-xs text-gray-400">{monthLabel}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lc}>Site Visit Target *</label>
            <input required type="number" min="0" value={siteVisitTarget}
              onChange={e => setSiteVisitTarget(e.target.value)} className={ic} />
          </div>
          <div>
            <label className={lc}>Closure Target *</label>
            <input required type="number" min="0" value={closureTarget}
              onChange={e => setClosureTarget(e.target.value)} className={ic} />
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30">
          <Target size={13} className="text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
            Default is 15 site visits / 1 closure per month. This overrides it for {monthLabel} only.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5">
            <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" loading={loading}>Save Target</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Targets() {
  const dispatch = useDispatch()
  const { list: rawList, myTarget, loading, actionError } = useSelector(s => s.targets)
  const { user: currentUser } = useSelector(s => s.auth)
  const perms = useModulePermissions('targets')

  const [selectedMonth, setSelectedMonth] = useState(thisMonth)
  const [selectedYear,  setSelectedYear]  = useState(thisYear)
  const [page,          setPage]          = useState(1)
  const [openMenuId,    setOpenMenuId]    = useState(null)
  const [menuPos,       setMenuPos]       = useState(null)
  const [showFormModal, setShowFormModal] = useState(false)
  const [formTarget,    setFormTarget]    = useState(null)
  const [formIsEdit,    setFormIsEdit]    = useState(false)
  const [showResetModal,setShowResetModal]= useState(false)
  const [resetTarget,   setResetTarget]   = useState(null)
  const [resetting,     setResetting]     = useState(false)
  const [success,       setSuccess]       = useState('')
  const [localError,    setLocalError]    = useState('')
  const menuRef = useRef(null)

  const monthStr   = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`
  const monthLabel = `${MONTHS.find(m => m.v === selectedMonth)?.l} ${selectedYear}`

  const isAdmin    = ['super_admin', 'admin'].includes(currentUser?.role)
  const isTeamLead = ['associate', 'associate_partner', 'cluster_head', 'cluster', 'partner', 'team_leader', 'sales_manager'].includes(currentUser?.role)
  const canManage  = isAdmin || isTeamLead
  const list       = canManage
    ? (Array.isArray(rawList) ? rawList : [])
    : (myTarget ? [myTarget] : [])

  useEffect(() => {
    if (canManage) {
      dispatch(fetchTargets({ month: monthStr }))
    } else {
      dispatch(fetchMyTarget({ month: monthStr }))
    }
    setPage(1)
  }, [dispatch, monthStr, canManage])

  useEffect(() => {
    if (actionError) {
      setLocalError(actionError)
      const t = setTimeout(() => { dispatch(clearTargetError()); setLocalError('') }, 5000)
      return () => clearTimeout(t)
    }
  }, [actionError, dispatch])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const refresh = () => dispatch(fetchTargets({ month: monthStr }))

  const canEditRow = (t) => {
    if (isAdmin) return true
    if (isTeamLead) return getUserId(t) !== currentUser?.id
    return false
  }

  const openSetTarget = (t) => { setFormTarget(t); setFormIsEdit(isCustomTarget(t)); setShowFormModal(true) }
  const openReset     = (t) => { setResetTarget(t); setShowResetModal(true) }

  const confirmReset = async () => {
    if (!resetTarget) return
    setResetting(true)
    const result = await dispatch(deleteTarget({ userId: getUserId(resetTarget), month: monthStr }))
    setResetting(false)
    if (deleteTarget.fulfilled.match(result)) {
      setSuccess('Target reset to default!')
      refresh()
      setShowResetModal(false)
      setResetTarget(null)
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  const totalSv = list.reduce((sum, t) => sum + getSvDone(t), 0)
  const totalCl = list.reduce((sum, t) => sum + getClDone(t), 0)

  const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const paginatedList = list.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)

  return (
    <div className="space-y-4">

      {/* Error / Success notifications */}
      {localError && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400 flex-1">{localError}</p>
          <button onClick={() => { setLocalError(''); dispatch(clearTargetError()) }} className="text-red-400 hover:text-red-600 flex-shrink-0"><X size={14} /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
          <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-600 dark:text-green-400 flex-1">{success}</p>
          <button onClick={() => setSuccess('')} className="text-green-400 hover:text-green-600 flex-shrink-0"><X size={14} /></button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Target size={20} className="text-brand" /> Targets
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Monthly site visit & closure targets per user</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-36">
            <CustomSelect value={selectedMonth} onChange={v => setSelectedMonth(v)}
              options={MONTHS.map(m => ({ value: m.v, label: m.l }))} placeholder="Month" />
          </div>
          <div className="w-28">
            <CustomSelect value={selectedYear} onChange={v => setSelectedYear(v)}
              options={YEARS.map(y => ({ value: y, label: y }))} placeholder="Year" />
          </div>
          <button onClick={refresh}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-brand hover:border-brand transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Summary cards — managers/admins only */}
      {canManage && !loading && list.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Team Members',       value: list.length, icon: Users,      color: 'text-[#0082f3] bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Site Visits Done',   value: totalSv,      icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
            { label: 'Closures Done',      value: totalCl,      icon: Building2,  color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-card border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">{label}</p>
                <p className="text-base font-bold text-gray-900 dark:text-white">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary line */}
      {!loading && (
        <div className="text-sm text-gray-500 dark:text-[#888]">
          Showing <span className="font-semibold text-gray-900 dark:text-white">{paginatedList.length}</span>
          {list.length > paginatedList.length && <> of <span className="font-semibold text-gray-900 dark:text-white">{list.length}</span></>} target{list.length !== 1 ? 's' : ''} for <span className="font-semibold text-gray-900 dark:text-white">{monthLabel}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm">
        {loading ? (
          <div className="p-4"><ListSkeleton rows={5} /></div>
        ) : list.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <Target size={28} className="text-gray-400" strokeWidth={1.5} />
            </div>
            <p className="text-gray-500 font-medium">No targets found</p>
            <p className="text-sm text-gray-400 mt-1">No team members visible for {monthLabel}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#0f0f0f] border-b border-gray-200 dark:border-gray-800">
                  {['User', 'Role', 'Site Visits', 'Closures', 'Actions'].map(h => (
                    <th key={h} className={`py-3 px-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap ${h === 'Actions' ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {paginatedList.map((t, tIdx) => {
                  const userId   = getUserId(t)
                  const userName = getUserName(t)
                  const role     = getRole(t)
                  const svTarget = getSvTarget(t), svDone = getSvDone(t), svLeft = getSvLeft(t)
                  const clTarget = getClTarget(t), clDone = getClDone(t), clLeft = getClLeft(t)
                  const custom   = isCustomTarget(t)
                  const showActions = canEditRow(t)
                  return (
                    <tr key={userId} className="hover:bg-gray-50/60 dark:hover:bg-[#0f0f0f]/60 transition-colors">
                      {/* User */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={userName} size="sm" />
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white text-sm">{userName}</p>
                            {custom && <p className="text-[10px] text-brand font-semibold">Custom target</p>}
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4">
                        {role && (
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${roleColors[role] || 'bg-gray-100 text-gray-600'}`}>
                            {role.replace(/_/g, ' ')}
                          </span>
                        )}
                      </td>

                      {/* Site Visits */}
                      <td className="py-3 px-4 min-w-[160px]">
                        <div className="flex items-center justify-between mb-1 text-xs">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">{svDone} / {svTarget}</span>
                          <span className="text-gray-400">{svLeft} left</span>
                        </div>
                        <ProgressBar done={svDone} target={svTarget} color="bg-[#0082f3]" />
                      </td>

                      {/* Closures */}
                      <td className="py-3 px-4 min-w-[160px]">
                        <div className="flex items-center justify-between mb-1 text-xs">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">{clDone} / {clTarget}</span>
                          <span className="text-gray-400">{clLeft} left</span>
                        </div>
                        <ProgressBar done={clDone} target={clTarget} color="bg-emerald-500" />
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4" onClick={e => e.stopPropagation()} ref={openMenuId === userId ? menuRef : null}>
                        {showActions ? (
                          <div className="flex items-center justify-end">
                            <div className="relative">
                              <button
                                onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); const below = window.innerHeight - r.bottom; setMenuPos({ right: window.innerWidth - r.right, ...(below > 200 ? { top: r.bottom + 4 } : { bottom: window.innerHeight - r.top + 4 }) }); setOpenMenuId(openMenuId === userId ? null : userId) }}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand hover:bg-brand/10 transition-all"
                              >
                                <MoreVertical size={16} />
                              </button>
                              {openMenuId === userId && (
                                <div style={{ top: menuPos?.top, bottom: menuPos?.bottom, right: menuPos?.right }} className="fixed w-48 max-h-64 overflow-y-auto bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg z-[9999] py-1">
                                  <button
                                    onClick={() => { openSetTarget(t); setOpenMenuId(null) }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                  >
                                    <Edit2 size={14} />
                                    {custom ? 'Edit Target' : 'Set Custom Target'}
                                  </button>
                                  {custom && (
                                    <button
                                      onClick={() => { openReset(t); setOpenMenuId(null) }}
                                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                      <RotateCcw size={14} />
                                      Reset to Default
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300 dark:text-gray-700 block text-right">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 text-xs text-gray-500">
          <span>Page {currentPage} of {totalPages} · {list.length} total</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
            <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Set / Edit Target Modal */}
      {showFormModal && formTarget && (
        <TargetFormModal
          target={formTarget}
          userName={getUserName(formTarget)}
          monthStr={monthStr}
          monthLabel={monthLabel}
          isEdit={formIsEdit}
          onClose={() => { setShowFormModal(false); setFormTarget(null) }}
          onSuccess={() => { setSuccess(formIsEdit ? 'Target updated!' : 'Custom target set!'); refresh(); setTimeout(() => setSuccess(''), 3000) }}
        />
      )}

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={showResetModal}
        onClose={() => { setShowResetModal(false); setResetTarget(null) }}
        onConfirm={confirmReset}
        title="Reset Target"
        message={`Reset ${resetTarget ? getUserName(resetTarget) : 'this user'}'s target for ${monthLabel} back to the default (15 site visits / 1 closure)?`}
        confirmText="Reset Target"
        variant="warning"
        loading={resetting}
      />
    </div>
  )
}
