import { useState, useEffect, useRef, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  Clock, Calendar, ChevronLeft, ChevronRight, Download,
  MapPin, User, Users, CheckCircle2, XCircle, AlertCircle,
  Loader2, Camera, LogIn, LogOut, RefreshCw,
  TrendingUp, Pencil, X, Plus, Trash2,
  Timer, BarChart3, UserCheck, PartyPopper, ZoomIn, Info,
} from 'lucide-react'
import {
  fetchAttendanceToday,
  fetchMyAttendance,
  fetchAttendanceCalendar,
  fetchAttendanceByMonth,
  fetchAttendanceByDate,
  fetchTeamAttendance,
  fetchAttendanceSummary,
  fetchLateArrivals,
  uploadAttendancePhoto,
  checkIn,
  checkOut,
  fetchPendingApprovals,
  approveAttendanceStatus,
  clearError,
  manualAttendanceEntry,
  updateAttendanceStatus,
} from '../store/attendanceSlice'
import {
  fetchHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
} from '../store/holidaySlice'
import {
  fetchMySummary,
} from '../store/myDataSlice'
import { fetchUsers } from '../store/userSlice'
import api from '../api/axios'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ConfirmModal from '../components/ui/ConfirmModal'
import ExportModal from '../components/ui/ExportModal'
import CustomSelect from '../components/ui/CustomSelect'
import ClockPicker from '../components/ui/ClockPicker'

// ─── Constants ────────────────────────────────────────────────────────────────
// Matches the backend's real status set: present · late · absent · leave
// Plus two synthesized/derived display-only statuses:
//   not_joined — day before the user's account existed (never stored in DB)
//   holiday    — leave_type === 'holiday' on a 'leave' record (admin-declared holiday)
const STATUS_CONFIG = {
  present:    { label: 'Present',       color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20',  border: 'border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  late:       { label: 'Late',          color: 'text-amber-600',   bg: 'bg-amber-50 dark:bg-amber-900/20',      border: 'border-amber-200 dark:border-amber-800',     dot: 'bg-amber-500',   badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  absent:     { label: 'Absent',        color: 'text-red-600',     bg: 'bg-red-50 dark:bg-red-900/20',          border: 'border-red-200 dark:border-red-800',         dot: 'bg-red-500',     badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  leave:      { label: 'Leave',         color: 'text-indigo-600',  bg: 'bg-indigo-50 dark:bg-indigo-900/20',    border: 'border-indigo-200 dark:border-indigo-800',   dot: 'bg-indigo-500',  badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
  holiday:    { label: 'Holiday',       color: 'text-fuchsia-600', bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/20',  border: 'border-fuchsia-200 dark:border-fuchsia-800', dot: 'bg-fuchsia-500', badge: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300' },
  not_joined: { label: 'Not Joined Yet',color: 'text-gray-400',    bg: 'bg-gray-50 dark:bg-gray-800/40',        border: 'border-gray-100 dark:border-gray-800',       dot: 'bg-gray-300',    badge: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
  weekend:    { label: 'Weekend',       color: 'text-gray-400',    bg: 'bg-gray-50 dark:bg-gray-800/40',        border: 'border-gray-100 dark:border-gray-800',       dot: 'bg-gray-300',    badge: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
}

// Resolves the display status for a record: a 'leave' row with leave_type 'holiday'
// is shown as 'Holiday' (distinct color), everything else uses its real status as-is.
const displayStatus = (rec) => {
  if (!rec) return 'absent'
  if (rec.status === 'leave' && rec.leave_type === 'holiday') return 'holiday'
  return rec.status || 'absent'
}

// Real, valid statuses an admin can manually set on a record (matches backend CHECK constraint)
const STATUS_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'late',    label: 'Late'    },
  { value: 'absent',  label: 'Absent'  },
  { value: 'leave',   label: 'Leave'   },
]

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const ADMIN_ROLES   = ['super_admin', 'admin']
const HIERARCHY_ROLES = [
  'associate', 'associate_partner', 'cluster_head', 'cluster',
  'partner', 'team_leader', 'sales_manager',
]
const ALL_ROLES = [
  { value: 'all',                label: 'All Roles (Company-wide)' },
  { value: 'super_admin',        label: 'Super Admin' },
  { value: 'admin',              label: 'Admin' },
  { value: 'associate',          label: 'Associate' },
  { value: 'associate_partner',  label: 'Associate Partner' },
  { value: 'cluster_head',       label: 'Cluster Head' },
  { value: 'cluster',            label: 'Cluster' },
  { value: 'partner',            label: 'Partner' },
  { value: 'team_leader',        label: 'Team Leader' },
  { value: 'sales_manager',      label: 'Sales Manager' },
  { value: 'sales_executive',    label: 'Sales Executive' },
  { value: 'external_caller',    label: 'External Caller' },
  { value: 'digital_marketing',  label: 'Digital Marketing' },
  { value: 'hr_admin',           label: 'HR Admin' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtTime = (ts) => {
  if (!ts) return '--:--'
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const fmtDate = (d) => {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const todayStr = () => new Date().toISOString().split('T')[0]

const fmtLateBy = (mins) => {
  if (!mins || mins <= 0) return ''
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m} min`
}

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href    = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const handleExport = async (module, params = {}) => {
  try {
    const res = await api.get(`/export/${module}`, { params, responseType: 'blob' })
    const today = new Date().toISOString().split('T')[0]
    downloadBlob(res.data, `${module.replace('-','_')}_${today}.xlsx`)
  } catch (err) { console.error(`Export ${module} failed:`, err) }
}

// ─── Pagination ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10

// Client-side pagination helper — slices an already-fetched array into pages of
// PAGE_SIZE. Used on every list endpoint that doesn't support server-side paging
// (summary, late arrivals, pending approvals, daily list views, holidays).
function usePagedSlice(items) {
  const [page, setPage] = useState(1)
  useEffect(() => { setPage(1) }, [items?.length])
  const totalPages = Math.max(1, Math.ceil((items?.length || 0) / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * PAGE_SIZE
  const pageItems = (items || []).slice(start, start + PAGE_SIZE)
  return { page: safePage, setPage, totalPages, pageItems, total: items?.length || 0 }
}

function Pagination({ page, setPage, totalPages, shownCount, total, label = 'records' }) {
  if (totalPages <= 1) return null
  return (
    <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between flex-wrap gap-2">
      <span className="text-xs text-gray-400">Showing {shownCount} of {total} {label} · Page {page} of {totalPages}</span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
        <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status, size = 'sm' }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.absent
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${size === 'sm' ? 'text-xs' : 'text-sm'} ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

// ─── Photo Thumbnail (click → opens PhotoLightbox) ────────────────────────────
function PhotoThumb({ record, onOpen, size = 'md' }) {
  const sizes = { sm: 'w-9 h-9', md: 'w-10 h-10', lg: 'w-12 h-12' }
  const photo = record?.checkin_photo || record?.checkout_photo
  if (!photo) return null
  return (
    <button
      onClick={() => onOpen(record)}
      className={`relative ${sizes[size]} rounded-xl overflow-hidden border-2 border-white dark:border-gray-700 shadow-sm flex-shrink-0 group`}
      title="View photo"
    >
      <img src={photo} alt="selfie" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all">
        <ZoomIn size={14} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  )
}
// Click-to-enlarge popup for check-in/check-out selfies. Shows both photos side by
// side (when available) with full metadata, and — for admin/super_admin only —
// a "Change Status" control inline. Pass `record` (the attendance row) and
// `canChangeStatus` (true only for admin/super_admin per role rules).
function PhotoLightbox({ isOpen, onClose, record, canChangeStatus, onStatusChange, statusChanging, initialTab }) {
  const [tab, setTab] = useState('checkin') // 'checkin' | 'checkout'
  const [pendingStatus, setPendingStatus] = useState(null)
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab || (record?.checkin_photo ? 'checkin' : 'checkout'))
      setPendingStatus(null)
      setReason('')
    }
  }, [isOpen, record, initialTab])

  if (!isOpen || !record) return null

  const hasCheckin  = !!record.checkin_photo
  const hasCheckout = !!record.checkout_photo
  const activePhoto = tab === 'checkin' ? record.checkin_photo : record.checkout_photo
  const activeTime   = tab === 'checkin' ? record.check_in_time : record.check_out_time
  const activeAddr   = tab === 'checkin' ? record.checkin_address : record.checkout_address
  const activeLat    = tab === 'checkin' ? record.checkin_latitude : record.checkout_latitude
  const activeLng    = tab === 'checkin' ? record.checkin_longitude : record.checkout_longitude
  const status = displayStatus(record)

  const submitStatusChange = () => {
    if (!pendingStatus) return
    onStatusChange?.(record, pendingStatus, reason)
  }

  return (
    <div style={{marginTop: '0vh'}}  className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div   className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-blue-600 flex items-center justify-center flex-shrink-0">
              <User size={15} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{record.full_name || 'Employee'}</p>
              <p className="text-xs text-gray-400 capitalize truncate">{record.role?.replace(/_/g, ' ')} · {fmtDate(record.date)}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto">
          {/* Status + check-in/out tabs */}
          <div className="px-5 pt-4 flex items-center justify-between flex-wrap gap-2">
            <StatusBadge status={status} size="md" />
            {(hasCheckin || hasCheckout) && (
              <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800/60 rounded-xl">
                <button
                  onClick={() => setTab('checkin')}
                  disabled={!hasCheckin}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed ${tab === 'checkin' ? 'bg-white dark:bg-[#1a1a1a] text-brand shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  Check In
                </button>
                <button
                  onClick={() => setTab('checkout')}
                  disabled={!hasCheckout}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed ${tab === 'checkout' ? 'bg-white dark:bg-[#1a1a1a] text-brand shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  Check Out
                </button>
              </div>
            )}
          </div>

          {/* Photo */}
          <div className="px-5 pt-4">
            {activePhoto ? (
              <div className="relative rounded-2xl overflow-hidden bg-gray-900 aspect-square">
                <img src={activePhoto} alt={`${tab} selfie`} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/40 aspect-square flex flex-col items-center justify-center text-gray-300 dark:text-gray-600">
                <Camera size={32} />
                <p className="text-xs mt-2">No {tab === 'checkin' ? 'check-in' : 'check-out'} photo</p>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="px-5 py-4 space-y-2">
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                {tab === 'checkin' ? <LogIn size={12} className="text-emerald-500" /> : <LogOut size={12} className="text-rose-500" />}
                {fmtTime(activeTime)}
              </div>
              {/* {record.working_hours && (
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  <Timer size={12} className="text-brand" /> {record.working_hours}h worked
                </div>
              )} */}
            </div>
            {activeAddr && (
              <div className="flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <MapPin size={12} className="mt-0.5 flex-shrink-0 text-brand" />
                <span>{activeAddr}</span>
              </div>
            )}
            {!activeAddr && activeLat && (
              <div className="flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <MapPin size={12} className="mt-0.5 flex-shrink-0 text-brand" />
                <span>{Number(activeLat).toFixed(4)}, {Number(activeLng).toFixed(4)}</span>
              </div>
            )}
            {record.is_manual_entry && (
              <div className="flex items-start gap-1.5 text-xs text-purple-500">
                <Info size={12} className="mt-0.5 flex-shrink-0" />
                <span>Manually recorded{record.manual_reason ? `: ${record.manual_reason}` : ''}</span>
              </div>
            )}
            {record.reason && (
              <div className="flex items-start gap-1.5 text-xs text-gray-400">
                <Info size={12} className="mt-0.5 flex-shrink-0" />
                <span>{record.reason}</span>
              </div>
            )}
          </div>

          {/* Admin-only: change status */}
          {canChangeStatus && (
            <div className="px-5 pb-5 pt-2 border-t border-gray-100 dark:border-gray-800 mt-1">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2.5 mt-3">Change Status</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setPendingStatus(opt.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      pendingStatus === opt.value
                        ? `${STATUS_CONFIG[opt.value]?.bg} ${STATUS_CONFIG[opt.value]?.color} ${STATUS_CONFIG[opt.value]?.border} shadow-sm scale-105`
                        : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {pendingStatus && pendingStatus !== record.status && (
                <>
                  <input
                    type="text"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Reason (optional)"
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-brand text-gray-700 dark:text-gray-200 placeholder-gray-400 mb-3"
                  />
                  <div className="flex items-center gap-2 text-xs mb-3">
                    <StatusBadge status={record.status} />
                    <ChevronRight size={12} className="text-gray-400" />
                    <StatusBadge status={pendingStatus} />
                  </div>
                  <Button
                    variant="primary"
                    className="w-full rounded-xl"
                    onClick={submitStatusChange}
                    loading={statusChanging}
                    icon={CheckCircle2}
                  >
                    Confirm Change
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Check In / Check Out Card ─────────────────────────────────────────────────
function CheckInCard({ todayData, loading, dispatch, user, isAdmin, showStatusChange = false }) {
  const [showCam,       setShowCam]       = useState(false)
  const [photoType,     setPhotoType]     = useState('checkin')
  const [capturedPhoto, setCapturedPhoto] = useState(null)
  const [uploading,     setUploading]     = useState(false)
  const [geoLoading,    setGeoLoading]    = useState(false)
  const [location,      setLocation]      = useState({ latitude: null, longitude: null, address: null })
  const [photoUrl,      setPhotoUrl]      = useState(null)
  const [statusChanging, setStatusChanging] = useState(null)
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const isCheckedIn  = todayData?.is_checked_in
  const isCheckedOut = todayData?.is_checked_out
  const displayedStatus = displayStatus(todayData?.full_record) || todayData?.status || 'absent'

  const getLocation = useCallback(() => {
    setGeoLoading(true)
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, address: null })
        setGeoLoading(false)
      },
      () => setGeoLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  const openCamera = (type) => {
    setPhotoType(type)
    setShowCam(true)
    setCapturedPhoto(null)
    setPhotoUrl(null)
    getLocation()
    setTimeout(() => {
      navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user' } })
        .then(stream => { streamRef.current = stream; if (videoRef.current) videoRef.current.srcObject = stream })
        .catch(() => {})
    }, 100)
  }

  const [uploadError, setUploadError] = useState('')

  const capture = () => {
    const canvas = canvasRef.current
    const video  = videoRef.current
    if (!canvas || !video) return
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(async (blob) => {
      const file = new File([blob], `selfie_${Date.now()}.jpg`, { type: 'image/jpeg' })
      setCapturedPhoto(URL.createObjectURL(blob))
      setUploading(true)
      setUploadError('')
      const res = await dispatch(uploadAttendancePhoto({ file, type: photoType }))
      if (uploadAttendancePhoto.fulfilled.match(res)) {
        setPhotoUrl(res.payload.photo_url)
      } else {
        setUploadError(res.payload || 'Photo upload failed. Please retake.')
      }
      setUploading(false)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }, 'image/jpeg', 0.85)
  }

  const retake = () => {
    setCapturedPhoto(null)
    setPhotoUrl(null)
    setUploadError('')
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user' } })
      .then(stream => { streamRef.current = stream; if (videoRef.current) videoRef.current.srcObject = stream })
      .catch(() => {})
  }

  const handleAction = async () => {
    const payload = { photo_url: photoUrl, latitude: location.latitude, longitude: location.longitude, address: location.address, device: navigator.userAgent }
    const action  = photoType === 'checkin' ? checkIn(payload) : checkOut(payload)
    await dispatch(action)
    setShowCam(false)
    setCapturedPhoto(null)
    setPhotoUrl(null)
    dispatch(fetchAttendanceToday())
  }

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    setShowCam(false)
    setCapturedPhoto(null)
    setPhotoUrl(null)
    setUploadError('')
  }

  const changeStatus = async (status) => {
    if (!todayData?.full_record?.id || statusChanging) return
    setStatusChanging(status)
    await dispatch(updateAttendanceStatus({ id: todayData.full_record.id, status }))
    dispatch(fetchAttendanceToday())
    setStatusChanging(null)
  }

  // Selfie required — Confirm stays disabled until a photo has actually uploaded successfully.
  const canConfirm = !!capturedPhoto && !!photoUrl && !uploading

  return (
    <>
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-brand to-blue-600 px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-xs font-medium uppercase tracking-wider mb-1">Today's Attendance</p>
            <p className="text-white font-semibold text-base">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
            <Clock size={20} className="text-white" />
          </div>
        </div>

        <div className="p-5">
          {/* User row */}
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100 dark:border-gray-800">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-blue-600 flex items-center justify-center flex-shrink-0">
              <User size={17} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.name || 'You'}
              </p>
              <p className="text-xs text-gray-400 capitalize">{user?.role?.replace(/_/g, ' ')}</p>
            </div>
            <StatusBadge status={displayedStatus} size="md" />
          </div>

          {displayedStatus === 'holiday' && (
            <div className="flex items-center gap-2 bg-fuchsia-50 dark:bg-fuchsia-900/20 rounded-xl px-3 py-2.5 mb-4">
              <PartyPopper size={14} className="text-fuchsia-500 flex-shrink-0" />
              <span className="text-sm text-fuchsia-700 dark:text-fuchsia-400 font-medium">Today is a holiday — check-in is optional</span>
            </div>
          )}

          {/* Times */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <LogIn size={13} className="text-emerald-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Check In</span>
              </div>
              <p className={`text-lg font-bold ${isCheckedIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-300 dark:text-gray-600'}`}>
                {isCheckedIn ? fmtTime(todayData?.check_in_time) : '--:--'}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <LogOut size={13} className="text-rose-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Check Out</span>
              </div>
              <p className={`text-lg font-bold ${isCheckedOut ? 'text-rose-600 dark:text-rose-400' : 'text-gray-300 dark:text-gray-600'}`}>
                {isCheckedOut ? fmtTime(todayData?.check_out_time) : '--:--'}
              </p>
            </div>
          </div>

          {isAdmin && todayData?.working_hours && (
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl px-3 py-2.5 mb-4">
              <Timer size={14} className="text-brand" />
              <span className="text-sm text-brand font-semibold">{todayData.working_hours}h worked today</span>
            </div>
          )}

          {todayData?.checkin_location?.address && (
            <div className="flex items-start gap-1.5 text-xs text-gray-400 mb-4">
              <MapPin size={12} className="mt-0.5 flex-shrink-0 text-brand" />
              <span className="truncate">{todayData.checkin_location.address}</span>
            </div>
          )}

          {/* Action buttons — always show both, disabled based on state */}
          <div className="flex gap-2">
            <button onClick={() => openCamera('checkin')} disabled={loading.checkin || isCheckedIn}
              className={`flex-1 py-3 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all ${
                isCheckedIn
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-brand to-blue-600 text-white hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98]'
              } disabled:opacity-60`}>
              {loading.checkin ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
              Check In
            </button>
            <button onClick={() => openCamera('checkout')} disabled={loading.checkout || !isCheckedIn || isCheckedOut}
              className={`flex-1 py-3 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all ${
                isCheckedOut
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : !isCheckedIn
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-rose-500 to-red-500 text-white hover:shadow-lg hover:shadow-rose-500/25 active:scale-[0.98]'
              } disabled:opacity-60`}>
              {loading.checkout ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
              Check Out
            </button>
          </div>

          {/* Change Status — admin/super_admin only */}
          {showStatusChange && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2.5">Change Today's Status</p>
              {todayData?.full_record?.id ? (
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      disabled={statusChanging === opt.value}
                      onClick={() => changeStatus(opt.value)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                        todayData?.status === opt.value
                          ? `${STATUS_CONFIG[opt.value]?.bg} ${STATUS_CONFIG[opt.value]?.color} ${STATUS_CONFIG[opt.value]?.border} ring-1 ring-current ring-offset-1`
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                      } disabled:opacity-50`}
                    >
                      {statusChanging === opt.value && <Loader2 size={9} className="animate-spin" />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No record for today. Use "Log My Attendance" to create one first.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Camera Modal */}
      {showCam && (
        <div className="fixed inset-0 z-[999] bg-black/90 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-[#1a1a1a] rounded-3xl overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-brand to-blue-600 px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">{photoType === 'checkin' ? 'Check In Selfie' : 'Check Out Selfie'}</p>
                <p className="text-blue-200 text-xs mt-0.5">Take a selfie to mark attendance</p>
              </div>
              <button onClick={closeCamera} className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white hover:bg-white/30">
                <X size={16} />
              </button>
            </div>
            <div className="p-5">
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-900 mb-4">
                {capturedPhoto
                  ? <img src={capturedPhoto} alt="captured" className="w-full h-full object-cover" />
                  : <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                }
                <canvas ref={canvasRef} className="hidden" />
                {location.latitude && (
                  <div className="absolute bottom-3 left-3 right-3 bg-black/60 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                    <MapPin size={11} className="text-emerald-400 flex-shrink-0" />
                    <span className="text-white text-xs truncate">
                      {location.address || `${location.latitude?.toFixed(4)}, ${location.longitude?.toFixed(4)}`}
                    </span>
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="bg-white rounded-2xl px-4 py-3 flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin text-brand" />
                      <span className="text-sm font-medium">Uploading…</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mb-4">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium ${location.latitude ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                  {geoLoading ? <Loader2 size={11} className="animate-spin" /> : <MapPin size={11} />}
                  {geoLoading ? 'Getting location…' : location.latitude ? 'Location captured' : 'Location unavailable'}
                </div>
                {!location.latitude && !geoLoading && (
                  <button onClick={getLocation} className="text-xs text-brand hover:underline">Retry</button>
                )}
              </div>

              {uploadError && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-600 dark:text-red-400 flex-1">{uploadError}</p>
                </div>
              )}

              {!capturedPhoto ? (
                <button onClick={capture} className="w-full py-3 bg-gradient-to-r from-brand to-blue-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
                  <Camera size={18} /> Capture Selfie
                </button>
              ) : (
                <div className="flex gap-3">
                  <button onClick={retake} className="flex-1 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <RefreshCw size={15} /> Retake
                  </button>
                  <button onClick={handleAction} disabled={!canConfirm || loading.checkin || loading.checkout}
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-60">
                    {(uploading || loading.checkin || loading.checkout) ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    Confirm
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Calendar View ────────────────────────────────────────────────────────────
function CalendarView({ dispatch, isAdmin, onOpenPhoto }) {
  const { calendar, loading } = useSelector(s => s.attendance)
  const now = new Date()
  const [month,    setMonth]    = useState(now.getMonth() + 1)
  const [year,     setYear]     = useState(now.getFullYear())
  const [selected, setSelected] = useState(null)

  useEffect(() => { dispatch(fetchAttendanceCalendar({ month, year })) }, [dispatch, month, year])

  const prev = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const next = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const days     = calendar?.days || []
  const sum      = calendar?.summary
  const firstDow = days[0] ? new Date(days[0].date).getDay() : 0
  const padded   = [...Array(firstDow).fill(null), ...days]

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-md overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-semibold text-gray-900 dark:text-white">My Attendance Calendar</h3>
          <p className="text-xs text-gray-400 mt-0.5">{sum ? `${sum.present} present · ${sum.absent} absent · ${sum.late} late` : 'Monthly overview'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prev} className="w-8 h-8 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:border-brand hover:text-brand transition-colors"><ChevronLeft size={15} /></button>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 min-w-[110px] text-center">{MONTH_NAMES[month - 1]} {year}</span>
          <button onClick={next} className="w-8 h-8 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:border-brand hover:text-brand transition-colors"><ChevronRight size={15} /></button>
        </div>
      </div>

      {sum && (
        <div className="px-6 py-3 flex flex-wrap gap-2 border-b border-gray-100 dark:border-gray-800">
          {[
            { k: 'present', l: 'Present' },
            { k: 'late',    l: 'Late'    },
            { k: 'absent',  l: 'Absent'  },
            { k: 'leave',   l: 'Leave'   },
          ].map(x => (
            <span key={x.k} className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_CONFIG[x.k]?.badge}`}>{sum[x.k] ?? 0} {x.l}</span>
          ))}
          {isAdmin && sum.total_working_hours > 0 && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-brand dark:bg-blue-900/30 dark:text-blue-400">{sum.total_working_hours}h worked</span>
          )}
        </div>
      )}

      {loading.calendar ? (
        <div className="p-10 flex justify-center"><Loader2 size={22} className="animate-spin text-brand" /></div>
      ) : (
        <div className="p-4">
          <div className="grid grid-cols-7 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {padded.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />
              const isToday = day.date === todayStr()
              const status  = displayStatus(day)
              const cfg     = STATUS_CONFIG[status] || STATUS_CONFIG.absent
              return (
                <button key={day.date}
                  onClick={() => setSelected(selected?.date === day.date ? null : day)}
                  className={`relative flex flex-col items-center justify-center rounded-xl aspect-square text-xs font-semibold transition-all hover:scale-105
                    ${isToday ? 'ring-2 ring-brand ring-offset-1 dark:ring-offset-[#1a1a1a]' : ''}
                    ${selected?.date === day.date ? 'scale-105 shadow-md' : ''}
                    ${cfg.bg} ${cfg.color}`}
                >
                  <span className={`text-xs ${isToday ? 'text-brand font-bold' : ''}`}>{parseInt(day.date.split('-')[2])}</span>
                  {status !== 'not_joined' && <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${cfg.dot}`} />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {selected && selected.status !== 'not_joined' && (
        <div className={`mx-4 mb-4 p-4 rounded-xl border ${STATUS_CONFIG[displayStatus(selected)]?.border || 'border-gray-200 dark:border-gray-700'} ${STATUS_CONFIG[displayStatus(selected)]?.bg || 'bg-gray-50'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{fmtDate(selected.date)}</span>
            <StatusBadge status={displayStatus(selected)} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1.5"><LogIn size={11} className="text-emerald-500" /> {fmtTime(selected.check_in_time)}</div>
              <div className="flex items-center gap-1.5"><LogOut size={11} className="text-rose-500" /> {fmtTime(selected.check_out_time)}</div>
              {selected.late_by_minutes > 0 && <div className="flex items-center gap-1.5 col-span-2 text-amber-600 dark:text-amber-400 font-semibold"><AlertCircle size={11} /> Late by {fmtLateBy(selected.late_by_minutes)}</div>}
              {isAdmin && selected.working_hours && <div className="flex items-center gap-1.5 col-span-2"><Timer size={11} className="text-brand" /> {selected.working_hours}h working hours</div>}
              {selected.checkin_address && <div className="flex items-center gap-1.5 col-span-2"><MapPin size={11} className="text-brand" /> {selected.checkin_address}</div>}
            </div>
          {selected.checkin_photo && (
            <button onClick={() => onOpenPhoto(selected)} className="mt-2">
              <img src={selected.checkin_photo} alt="selfie" className="w-12 h-12 rounded-xl object-cover border-2 border-white dark:border-gray-700 shadow-sm hover:opacity-80 transition-opacity" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── My History ───────────────────────────────────────────────────────────────
function MyHistory({ dispatch, isAdmin, onOpenPhoto }) {
  const { myHistory, loading } = useSelector(s => s.attendance)
  const [page, setPage] = useState(1)

  useEffect(() => { dispatch(fetchMyAttendance({ page, per_page: PAGE_SIZE })) }, [dispatch, page])

  const sum  = myHistory?.summary
  const data = myHistory?.data || []
  const pg   = myHistory?.pagination

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-md overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
        <h3 className="font-display text-base font-semibold text-gray-900 dark:text-white">My Attendance History</h3>
      </div>

      {sum && (
        <div className="grid grid-cols-4 divide-x divide-gray-100 dark:divide-gray-800 border-b border-gray-100 dark:border-gray-800">
          {[
            { v: sum.present, l: 'Present' },
            { v: sum.absent,  l: 'Absent'  },
            { v: sum.late,    l: 'Late'    },
            { v: sum.leave,   l: 'Leave'   },
          ].map(x => (
            <div key={x.l} className="py-3 text-center">
              <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{x.v ?? 0}</p>
              <p className="text-[10px] text-gray-400 font-medium">{x.l}</p>
            </div>
          ))}
        </div>
      )}

      {loading.myHistory ? (
        <div className="p-8 flex justify-center"><Loader2 size={20} className="animate-spin text-brand" /></div>
      ) : data.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">No records found</div>
      ) : (
        <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
          {data.map(rec => {
            const d = rec.date?.split('T')[0] || rec.date
            const status = displayStatus(rec)
            return (
              <div key={rec.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50/60 dark:hover:bg-gray-800/20 transition-colors">
                <div className={`w-2 h-8 rounded-full flex-shrink-0 ${STATUS_CONFIG[status]?.dot || 'bg-gray-300'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{fmtDate(d)}</span>
                    <StatusBadge status={status} />
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
                    <span className="flex items-center gap-1"><LogIn size={10} className="text-emerald-500" />{fmtTime(rec.check_in_time)}</span>
                    <span className="flex items-center gap-1"><LogOut size={10} className="text-rose-500" />{fmtTime(rec.check_out_time)}</span>
                    {isAdmin && rec.working_hours && <span className="flex items-center gap-1"><Timer size={10} className="text-brand" />{rec.working_hours}h</span>}
                    {rec.late_by_minutes > 0 && <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold"><AlertCircle size={10} />Late by {fmtLateBy(rec.late_by_minutes)}</span>}
                  </div>
                </div>
                <PhotoThumb record={rec} onOpen={onOpenPhoto} size="sm" />
              </div>
            )
          })}
        </div>
      )}

      <Pagination page={page} setPage={setPage} totalPages={pg?.total_pages || 1} shownCount={data.length} total={pg?.total || 0} label="records" />
    </div>
  )
}

// ─── Month Grid (used for both "My Team" and Admin "Company Overview") ───────
function UserHistoryDrawer({ userId, userName, defaultFrom, defaultTo, onClose }) {
  const [from, setFrom] = useState(defaultFrom)
  const [to,   setTo]   = useState(defaultTo)
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(1)
  const [lightboxRecord, setLightboxRecord] = useState(null)
  const [statusFilter, setStatusFilter] = useState(null)

  useEffect(() => {
    setLoading(true)
    api.get(`/attendance/user/${userId}/history`, { params: { from, to, page, per_page: 20 } })
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [userId, from, to, page])

  useEffect(() => { setStatusFilter(null) }, [from, to])

  const records = data?.data || []
  const summary = data?.summary || {}
  const user    = data?.user    || {}
  const filteredRecords = statusFilter
    ? records.filter(rec => (displayStatus(rec) || rec.status) === statusFilter)
    : records

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose} style={{ margin: 0 }}>
        <div className="bg-white dark:bg-[#1a1a1a] w-full max-w-lg h-full overflow-y-auto border-l border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col"
          onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-[#1a1a1a] border-b border-gray-100 dark:border-gray-800 z-10">
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center">
                  <User size={16} className="text-brand" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{userName || user.full_name}</p>
                  <p className="text-xs text-gray-400 capitalize">{user.role?.replace(/_/g,' ') || 'Attendance History'}</p>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X size={15} />
              </button>
            </div>
            <div className="px-5 pb-4 flex gap-3">
              <div className="flex-1">
                <p className="text-[10px] text-gray-400 mb-1">From</p>
                <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1) }}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-brand text-gray-700 dark:text-gray-200" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-gray-400 mb-1">To</p>
                <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1) }}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-brand text-gray-700 dark:text-gray-200" />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center"><Loader2 size={22} className="animate-spin text-brand" /></div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {/* Summary */}
              {summary && (
                <div className="grid grid-cols-4 divide-x divide-gray-100 dark:divide-gray-800 border-b border-gray-100 dark:border-gray-800">
                  {[
                    { k: 'present', v: summary.present,  l: 'Present',  c: 'text-emerald-600 dark:text-emerald-400' },
                    { k: 'absent',  v: summary.absent,   l: 'Absent',   c: 'text-red-500 dark:text-red-400' },
                    { k: 'late',    v: summary.late,     l: 'Late',     c: 'text-amber-600 dark:text-amber-400' },
                    { k: 'leave',   v: summary.leave,    l: 'Leave',    c: 'text-indigo-600 dark:text-indigo-400' },
                  ].map(x => (
                    <button
                      key={x.l}
                      type="button"
                      onClick={() => setStatusFilter(f => f === x.k ? null : x.k)}
                      className={`py-3 text-center transition-colors ${statusFilter === x.k ? 'bg-gray-50 dark:bg-gray-800/60' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'}`}
                    >
                      <p className={`text-lg font-bold ${x.c} ${statusFilter && statusFilter !== x.k ? 'opacity-40' : ''}`}>{x.v ?? 0}</p>
                      <p className={`text-[10px] font-medium ${statusFilter === x.k ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400'}`}>{x.l}</p>
                    </button>
                  ))}
                </div>
              )}
              {statusFilter && (
                <div className="px-5 py-2 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
                  <span className="text-[11px] text-gray-500">Showing <span className="font-semibold capitalize">{statusFilter}</span> only</span>
                  <button onClick={() => setStatusFilter(null)} className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-500 transition-colors">
                    <X size={10} /> Clear filter
                  </button>
                </div>
              )}
              {summary?.total_working_hours && (
                <div className="px-5 py-2 border-b border-gray-50 dark:border-gray-800 flex items-center gap-2 text-xs text-gray-500">
                  <Timer size={12} className="text-brand" />
                  Total: <span className="font-semibold text-gray-800 dark:text-gray-200">{parseFloat(summary.total_working_hours).toFixed(1)}h</span>
                  {summary.avg_working_hours && <> · Avg: <span className="font-semibold text-gray-800 dark:text-gray-200">{parseFloat(summary.avg_working_hours).toFixed(1)}h/day</span></>}
                </div>
              )}

              {/* Records */}
              {filteredRecords.length === 0 ? (
                <div className="py-16 text-center text-gray-400 text-sm">
                  {statusFilter ? `No ${statusFilter} records for this period` : 'No records found for this period'}
                </div>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
                  {[...filteredRecords].sort((a, b) => new Date(b.date) - new Date(a.date)).map((rec, i) => {
                    const status = displayStatus(rec) || rec.status || 'absent'
                    const cfg    = STATUS_CONFIG[status] || STATUS_CONFIG.absent
                    const d      = rec.date?.split('T')[0] || rec.date
                    return (
                      <div key={rec.id || i} className="px-5 py-4 space-y-3">
                        {/* Date + Status */}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                              {d ? new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </p>
                            {rec.is_manual_entry && (
                              <p className="text-[10px] text-purple-500 mt-0.5">Manual entry by {rec.manual_by_name || 'Admin'}{rec.manual_reason ? ` · ${rec.manual_reason}` : ''}</p>
                            )}
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${cfg.badge}`}>
                            {cfg.label}
                          </span>
                        </div>

                        {/* Times row */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-2.5">
                            <div className="flex items-center gap-1.5 text-gray-400 mb-1"><LogIn size={10} className="text-emerald-500" /> Check In</div>
                            <p className="font-semibold text-gray-800 dark:text-gray-200">{fmtTime(rec.check_in_time)}</p>
                            {rec.late_by_minutes > 0 && <p className="text-amber-600 text-[10px] mt-0.5">Late by {fmtLateBy(rec.late_by_minutes)}</p>}
                            {rec.checkin_location?.address && <p className="text-gray-400 text-[10px] mt-0.5 line-clamp-1">{rec.checkin_location.address}</p>}
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-2.5">
                            <div className="flex items-center gap-1.5 text-gray-400 mb-1"><LogOut size={10} className="text-rose-500" /> Check Out</div>
                            <p className="font-semibold text-gray-800 dark:text-gray-200">{fmtTime(rec.check_out_time)}</p>
                            {rec.working_hours && <p className="text-brand text-[10px] mt-0.5">{rec.working_hours}h worked</p>}
                            {rec.checkout_location?.address && <p className="text-gray-400 text-[10px] mt-0.5 line-clamp-1">{rec.checkout_location.address}</p>}
                          </div>
                        </div>

                        {/* Photos */}
                        {(rec.checkin_photo || rec.checkout_photo) && (
                          <div className="flex gap-2">
                            {rec.checkin_photo && (
                              <button onClick={() => setLightboxRecord(rec)} className="text-left">
                                <p className="text-[10px] text-gray-400 mb-1">Check-in</p>
                                <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 group">
                                  <img src={rec.checkin_photo} alt="Check-in" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all">
                                    <ZoomIn size={14} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </div>
                              </button>
                            )}
                            {rec.checkout_photo && (
                              <button onClick={() => setLightboxRecord(rec)} className="text-left">
                                <p className="text-[10px] text-gray-400 mb-1">Check-out</p>
                                <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 group">
                                  <img src={rec.checkout_photo} alt="Check-out" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all">
                                    <ZoomIn size={14} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </div>
                              </button>
                            )}
                          </div>
                        )}

                        {/* Leave type */}
                        {rec.leave_type && (
                          <p className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1 rounded-lg w-fit">
                            Leave: {rec.leave_type}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Pagination */}
              {data?.pagination?.total_pages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-xs text-gray-400">Page {page} of {data.pagination.total_pages}</span>
                  <div className="flex gap-2">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:border-brand hover:text-brand transition-colors">Prev</button>
                    <button disabled={page >= data.pagination.total_pages} onClick={() => setPage(p => p + 1)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:border-brand hover:text-brand transition-colors">Next</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Photo Lightbox */}
      <PhotoLightbox
        isOpen={!!lightboxRecord}
        onClose={() => setLightboxRecord(null)}
        record={lightboxRecord}
        canChangeStatus={false}
      />
    </>
  )
}

function MonthGridView({ dispatch, title = 'Monthly Attendance Grid', scope = 'company' }) {
  // scope: 'company' (admin, all users via /by-month) | 'team' (team lead, own sub-tree via /by-month)
  const { byMonth, loading } = useSelector(s => s.attendance)
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())
  const [page,  setPage]  = useState(1)
  const [historyUser, setHistoryUser] = useState(null)

  useEffect(() => {
    // Backend scopes by role automatically — team leads get their recursive sub-tree,
    // admin gets everyone. Same endpoint, different caller role.
    dispatch(fetchAttendanceByMonth({ month, year, page, per_page: PAGE_SIZE }))
  }, [dispatch, month, year, page])

  const prev = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const next = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const allDays  = byMonth?.all_days || []
  const userData = byMonth?.data     || []
  // No weekly off — every calendar day is a working day now.

  const ABBR       = { present: 'P', late: 'L', absent: 'A', leave: 'LV', holiday: 'H', not_joined: 'NJ' }
  const ABBR_STYLE = {
    P:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    L:  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    A:  'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
    LV: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
    H:  'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-400',
    NJ: 'bg-gray-50 text-gray-300 dark:bg-gray-800/30 dark:text-gray-600',
  }

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-md overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{MONTH_NAMES[month - 1]} {year} · Mon–Sun, no weekly off</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prev} className="w-8 h-8 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:border-brand hover:text-brand transition-colors"><ChevronLeft size={15} /></button>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 min-w-[110px] text-center">{MONTH_NAMES[month - 1]} {year}</span>
          <button onClick={next} className="w-8 h-8 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:border-brand hover:text-brand transition-colors"><ChevronRight size={15} /></button>
        </div>
      </div>

      {loading.byMonth ? (
        <div className="p-10 flex justify-center"><Loader2 size={22} className="animate-spin text-brand" /></div>
      ) : userData.length === 0 ? (
        <div className="p-10 text-center text-gray-400 text-sm">No data for this period</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60">
                <th className="sticky left-0 bg-gray-50 dark:bg-gray-800/60 px-4 py-3 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap z-10 min-w-[180px]">Employee</th>
                {allDays.map(d => {
                  const dt = new Date(d)
                  const isWk = [0,6].includes(dt.getDay())
                  return (
                    <th key={d} className={`px-1 py-3 text-center font-medium min-w-[36px] ${isWk ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400 dark:text-gray-500'}`}>
                      <div>{dt.getDate()}</div>
                      <div className="text-[9px]">{dt.toLocaleDateString('en-IN', { weekday: 'short' })}</div>
                    </th>
                  )
                })}
                <th className="px-3 py-3 text-center font-semibold text-gray-500 whitespace-nowrap">P</th>
                <th className="px-3 py-3 text-center font-semibold text-gray-500 whitespace-nowrap">A</th>
                <th className="px-3 py-3 text-center font-semibold text-gray-500 whitespace-nowrap">L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/40">
              {userData.map((u, ui) => {
                const dayMap = {}
                u.days?.forEach(d => { dayMap[d.date] = d })
                return (
                  <tr key={u.user?.id || ui} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/20 transition-colors">
                    <td className="sticky left-0 bg-white dark:bg-[#1a1a1a] px-4 py-2.5 z-10 cursor-pointer"
                      onClick={() => u.user?.id && setHistoryUser(u.user)}>
                      <div className="font-medium text-gray-700 dark:text-gray-200 truncate max-w-[160px] hover:text-brand transition-colors">{u.user?.full_name}</div>
                      <div className="text-[10px] text-gray-400 capitalize">{u.user?.role?.replace(/_/g, ' ')}</div>
                    </td>
                    {allDays.map(d => {
                      const rec = dayMap[d]
                      const st  = displayStatus(rec) || 'absent'
                      const ab  = ABBR[st] || 'A'
                      return (
                        <td key={d} className="px-0.5 py-2 text-center" title={STATUS_CONFIG[st]?.label}>
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-[10px] font-bold ${ABBR_STYLE[ab] || 'bg-gray-100 text-gray-500'}`}>{ab}</span>
                        </td>
                      )
                    })}
                    <td className="px-3 py-2 text-center font-bold text-emerald-600 dark:text-emerald-400">{u.summary?.present ?? '-'}</td>
                    <td className="px-3 py-2 text-center font-bold text-red-500 dark:text-red-400">{u.summary?.absent ?? '-'}</td>
                    <td className="px-3 py-2 text-center font-bold text-amber-600 dark:text-amber-400">{u.summary?.late ?? '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} setPage={setPage} totalPages={byMonth?.pagination?.total_pages || 1} shownCount={userData.length} total={byMonth?.pagination?.total || 0} label="employees" />

      <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-2">
        {[['P','Present','bg-emerald-100 text-emerald-700'],['L','Late','bg-amber-100 text-amber-700'],['A','Absent','bg-red-100 text-red-600'],['LV','Leave','bg-indigo-100 text-indigo-700'],['H','Holiday','bg-fuchsia-100 text-fuchsia-700'],['NJ','Not Joined','bg-gray-100 text-gray-400']].map(([ab, label, cls]) => (
          <span key={ab} className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${cls}`}>{ab} = {label}</span>
        ))}
        <span className="text-[10px] text-gray-400 ml-auto italic">Click on any employee name to view details</span>
      </div>

      {historyUser && (
        <UserHistoryDrawer
          userId={historyUser.id}
          userName={historyUser.full_name}
          defaultFrom={`${year}-${String(month).padStart(2,'0')}-01`}
          defaultTo={new Date(year, month, 0).toISOString().split('T')[0]}
          onClose={() => setHistoryUser(null)}
        />
      )}
    </div>
  )
}

// ─── Daily List View (own/team/company — backend scopes by caller role) ──────
function AttendanceListView({ dispatch, title = 'Daily Attendance View', isAdmin, scope = 'auto', onOpenPhoto }) {
  const { byDate, teamHistory, loading } = useSelector(s => s.attendance)
  const [date, setDate] = useState(todayStr())

  useEffect(() => {
    if (scope === 'team') {
      dispatch(fetchTeamAttendance({ from: date, to: date, per_page: 200 }))
    } else {
      // Backend scopes automatically by role: admin → all, team lead → sub-tree, leaf → self
      dispatch(fetchAttendanceByDate({ date }))
    }
  }, [dispatch, date, scope])

  let rows = []
  let summary = null

  if (scope === 'team') {
    const records     = Array.isArray(teamHistory?.data)         ? teamHistory.data         : []
    const teamMembers = Array.isArray(teamHistory?.team_members) ? teamHistory.team_members : []
    const recordMap = {}
    records.forEach(r => { recordMap[r.user_id] = r })
    rows = teamMembers.map(m => {
      const rec = recordMap[m.id]
      return rec
        ? rec
        : { user_id: m.id, full_name: m.full_name, role: m.role, status: 'absent', check_in_time: null, check_out_time: null, working_hours: null, checkin_photo: null }
    })
    const present = rows.filter(r => ['present','late'].includes(displayStatus(r))).length
    const late    = rows.filter(r => displayStatus(r) === 'late').length
    const absent  = rows.filter(r => displayStatus(r) === 'absent').length
    const leave   = rows.filter(r => ['leave','holiday'].includes(displayStatus(r))).length
    summary = { present, late, absent, leave }
  } else {
    const records  = byDate?.records   || []
    const noRecord = byDate?.no_record || []
    rows = [...records, ...noRecord]
    summary = byDate?.summary
  }

  const { page, setPage, totalPages, pageItems, total } = usePagedSlice(rows)

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-md overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
          {summary && <p className="text-xs text-gray-400 mt-0.5">{summary.present} present · {summary.absent} absent · {summary.leave ?? 0} leave</p>}
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-gray-700 dark:text-gray-300 outline-none focus:border-brand" />
      </div>

      {summary && (
        <div className="grid grid-cols-4 divide-x divide-gray-100 dark:divide-gray-800 border-b border-gray-100 dark:border-gray-800">
          {[
            { v: summary.present, l: 'Present' },
            { v: summary.late,    l: 'Late'    },
            { v: summary.absent,  l: 'Absent'  },
            { v: summary.leave,   l: 'Leave'   },
          ].map(x => (
            <div key={x.l} className="py-3 text-center">
              <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{x.v ?? 0}</p>
              <p className="text-[10px] text-gray-400 font-medium">{x.l}</p>
            </div>
          ))}
        </div>
      )}

      {(scope === 'team' ? loading.teamHistory : loading.byDate) ? (
        <div className="p-8 flex justify-center"><Loader2 size={20} className="animate-spin text-brand" /></div>
      ) : rows.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">{scope === 'team' ? 'No team members assigned to you yet' : 'No data for this date'}</div>
      ) : (
        <div className="divide-y divide-gray-50 dark:divide-gray-800/40">
          {pageItems.map((r, i) => {
            const status = displayStatus(r)
            return (
              <div key={r.id || r.user_id || i} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50/60 dark:hover:bg-gray-800/20 transition-colors">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${STATUS_CONFIG[status]?.bg || 'bg-gray-100'}`}>
                  <User size={14} className={STATUS_CONFIG[status]?.color || 'text-gray-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{r.full_name}</span>
                    <StatusBadge status={status} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5 flex-wrap">
                    <span className="capitalize text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{r.role?.replace(/_/g, ' ')}</span>
                    {r.check_in_time  && <span className="flex items-center gap-1"><LogIn  size={10} className="text-emerald-500" />{fmtTime(r.check_in_time)}</span>}
                    {r.check_out_time && <span className="flex items-center gap-1"><LogOut size={10} className="text-rose-500" />{fmtTime(r.check_out_time)}</span>}
                    {isAdmin && r.working_hours && <span className="flex items-center gap-1"><Timer size={10} className="text-brand" />{r.working_hours}h</span>}
                  </div>
                </div>
                <PhotoThumb record={r} onOpen={onOpenPhoto} size="sm" />
              </div>
            )
          })}
        </div>
      )}

      <Pagination page={page} setPage={setPage} totalPages={totalPages} shownCount={pageItems.length} total={total} label={scope === 'team' ? 'team members' : 'records'} />
    </div>
  )
}

// ─── Summary Table (own scope determined by backend role) ────────────────────
function SummaryView({ dispatch, isAdmin }) {
  const { summary, loading } = useSelector(s => s.attendance)
  const now = new Date()
  const [from, setFrom] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`)
  const [to,   setTo]   = useState(now.toISOString().split('T')[0])

  useEffect(() => { dispatch(fetchAttendanceSummary({ from, to })) }, [dispatch, from, to])

  const data = summary?.data || []
  const { page, setPage, totalPages, pageItems, total } = usePagedSlice(data)

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-md overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold text-gray-900 dark:text-white">Attendance Summary</h3>
          <p className="text-xs text-gray-400 mt-0.5">{data.length} employee{data.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-gray-700 dark:text-gray-300 outline-none focus:border-brand" />
          <span className="text-gray-400 text-xs">to</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-gray-700 dark:text-gray-300 outline-none focus:border-brand" />
        </div>
      </div>

      {loading.summary ? (
        <div className="p-10 flex justify-center"><Loader2 size={22} className="animate-spin text-brand" /></div>
      ) : data.length === 0 ? (
        <div className="p-10 text-center text-gray-400 text-sm">No data for this period</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60">
                {['Employee', 'Present', 'Late', 'Absent', 'Leave', ...(isAdmin ? ['Hours'] : []), 'Attendance %'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/40">
              {pageItems.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-700 dark:text-gray-200">{r.full_name}</div>
                    <div className="text-xs text-gray-400 capitalize">{r.role?.replace(/_/g, ' ')}</div>
                  </td>
                  <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">{r.present}</td>
                  <td className="px-4 py-3 font-bold text-amber-600 dark:text-amber-400">{r.late}</td>
                  <td className="px-4 py-3 font-bold text-red-500 dark:text-red-400">{r.absent}</td>
                  <td className="px-4 py-3 font-bold text-indigo-600 dark:text-indigo-400">{r.leave}</td>
                  {isAdmin && <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.total_working_hours}h</td>}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div className={`h-full rounded-full ${r.attendance_percent >= 90 ? 'bg-emerald-500' : r.attendance_percent >= 75 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${r.attendance_percent}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{r.attendance_percent}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} setPage={setPage} totalPages={totalPages} shownCount={pageItems.length} total={total} label="employees" />
    </div>
  )
}

// ─── Late Arrivals Report (admin only) ────────────────────────────────────────
function LateArrivalsReport({ dispatch, onOpenPhoto }) {
  const { lateArrivals, loading } = useSelector(s => s.attendance)
  const now = new Date()
  const [from, setFrom] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`)
  const [to,   setTo]   = useState(now.toISOString().split('T')[0])

  useEffect(() => {
    dispatch(fetchLateArrivals({ from, to }))
  }, [dispatch, from, to])

  const data = lateArrivals?.data || []
  const { page, setPage, totalPages, pageItems, total } = usePagedSlice(data)

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-md overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold text-gray-900 dark:text-white">Late Arrivals Report</h3>
          <p className="text-xs text-gray-400 mt-0.5">{data.length} records found</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-gray-700 dark:text-gray-300 outline-none focus:border-brand" />
          <span className="text-gray-400 text-xs">to</span>
          <input type="date" value={to}   onChange={e => setTo(e.target.value)}   className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-gray-700 dark:text-gray-300 outline-none focus:border-brand" />
        </div>
      </div>

      {loading.lateArrivals ? (
        <div className="p-8 flex justify-center"><Loader2 size={20} className="animate-spin text-brand" /></div>
      ) : data.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">No late arrivals in this period</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60">
                {['Employee', 'Date', 'Check In', 'Late By', 'Location', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/40">
              {pageItems.map((r, i) => (
                <tr key={r.id || i} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-700 dark:text-gray-200">{r.full_name}</div>
                    <div className="text-xs text-gray-400 capitalize">{r.role?.replace(/_/g, ' ')}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(r.date)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-amber-600 font-bold">
                      <LogIn size={12} />
                      {fmtTime(r.check_in_time)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-amber-600 font-medium">{r.late_by_minutes ? fmtLateBy(r.late_by_minutes) : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-1.5 max-w-[200px]">
                      <MapPin size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-gray-500 truncate">{r.checkin_address || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><PhotoThumb record={r} onOpen={onOpenPhoto} size="sm" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} setPage={setPage} totalPages={totalPages} shownCount={pageItems.length} total={total} label="records" />
    </div>
  )
}

// ─── Approval Panel (admin/super_admin only) ──────────────────────────────────
function ApprovalPanel({ dispatch, onOpenPhoto }) {
  const { pending, loading } = useSelector(s => s.attendance)
  const [date,        setDate]        = useState(todayStr())
  const [selectedRec, setSelectedRec] = useState(null)
  const [newStatus,   setNewStatus]   = useState('')
  const [reason,      setReason]      = useState('')
  const [approvingId, setApprovingId] = useState(null)
  const [successMsg,  setSuccessMsg]  = useState('')

  useEffect(() => { dispatch(fetchPendingApprovals({ date })) }, [dispatch, date])

  const records = pending?.records || []
  const summary = pending?.summary
  const { page, setPage, totalPages, pageItems, total } = usePagedSlice(records)

  const openApprove = (rec) => {
    setSelectedRec(rec)
    setNewStatus(rec.status)
    setReason('')
    setSuccessMsg('')
  }

  const handleApprove = async () => {
    if (!newStatus || !selectedRec) return
    setApprovingId(selectedRec.id)
    const res = await dispatch(approveAttendanceStatus({ id: selectedRec.id, status: newStatus, reason }))
    setApprovingId(null)
    if (approveAttendanceStatus.fulfilled.match(res)) {
      setSuccessMsg(`Status changed to "${newStatus}" for ${selectedRec.full_name}`)
      setSelectedRec(null)
      dispatch(fetchPendingApprovals({ date }))
      setTimeout(() => setSuccessMsg(''), 4000)
    }
  }

  return (
    <div className="space-y-5">
      {successMsg && (
        <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3">
          <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
          <p className="text-sm text-emerald-700 dark:text-emerald-400">{successMsg}</p>
        </div>
      )}

      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-semibold text-white">Attendance Approvals</h3>
            <p className="text-indigo-200 text-xs mt-0.5">Review and approve employee attendance status</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <UserCheck size={18} className="text-white" />
          </div>
        </div>

        {/* Date + summary */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-gray-400" />
            <input type="date" value={date} onChange={e => { setDate(e.target.value); setSelectedRec(null) }}
              className="px-3 py-1.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-gray-700 dark:text-gray-300 outline-none focus:border-brand" />
          </div>
          {summary && (
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-full font-medium">
                <Clock size={10} /> {summary.not_checked_out} not checked out
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-full font-medium">
                <XCircle size={10} /> {summary.absent} absent
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full font-medium">
                <AlertCircle size={10} /> {summary.late} late
              </span>
            </div>
          )}
        </div>

        {/* Records */}
        {loading.pending ? (
          <div className="p-10 flex justify-center"><Loader2 size={22} className="animate-spin text-brand" /></div>
        ) : records.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={24} className="text-emerald-500" />
            </div>
            <p className="font-medium text-gray-600 dark:text-gray-300">All caught up!</p>
            <p className="text-sm text-gray-400 mt-1">No pending approvals for {fmtDate(date)}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800/40">
            {pageItems.map(rec => {
              const isSelected = selectedRec?.id === rec.id
              const status = displayStatus(rec)
              return (
                <div key={rec.id} className={`transition-colors ${isSelected ? 'bg-indigo-50/60 dark:bg-indigo-900/10' : 'hover:bg-gray-50/60 dark:hover:bg-gray-800/20'}`}>
                  <div className="flex items-center gap-4 px-6 py-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${STATUS_CONFIG[status]?.bg}`}>
                      <User size={16} className={STATUS_CONFIG[status]?.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{rec.full_name}</span>
                        <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded capitalize">{rec.role?.replace(/_/g, ' ')}</span>
                        <StatusBadge status={status} />
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <LogIn size={10} className="text-emerald-500" />
                          {rec.check_in_time ? fmtTime(rec.check_in_time) : 'Not checked in'}
                        </span>
                        <span className="flex items-center gap-1">
                          <LogOut size={10} className="text-rose-500" />
                          {rec.check_out_time ? fmtTime(rec.check_out_time) : 'Not checked out'}
                        </span>
                        {rec.working_hours && <span className="flex items-center gap-1"><Timer size={10} className="text-brand" />{rec.working_hours}h</span>}
                        {rec.checkin_address && <span className="flex items-center gap-1 max-w-[180px] truncate"><MapPin size={10} className="text-brand flex-shrink-0" />{rec.checkin_address}</span>}
                      </div>
                    </div>
                    <PhotoThumb record={rec} onOpen={onOpenPhoto} size="md" />
                    <button onClick={() => isSelected ? setSelectedRec(null) : openApprove(rec)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex-shrink-0 ${isSelected ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'}`}>
                      <Pencil size={11} />
                      {isSelected ? 'Cancel' : 'Change'}
                    </button>
                  </div>

                  {isSelected && (
                    <div className="px-6 pb-5">
                      <div className="bg-white dark:bg-[#222] rounded-xl border border-indigo-100 dark:border-indigo-900/40 p-4 space-y-4">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Change Status for {rec.full_name}</p>
                        <div>
                          <p className="text-xs text-gray-500 mb-2">New Status</p>
                          <div className="flex flex-wrap gap-2">
                            {STATUS_OPTIONS.map(opt => (
                              <button key={opt.value} onClick={() => setNewStatus(opt.value)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${newStatus === opt.value ? `${STATUS_CONFIG[opt.value]?.bg} ${STATUS_CONFIG[opt.value]?.color} ${STATUS_CONFIG[opt.value]?.border} shadow-sm scale-105` : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1.5">Reason <span className="text-gray-400">(optional)</span></p>
                          <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Employee was on field visit…"
                            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-indigo-400 dark:focus:border-indigo-600 text-gray-700 dark:text-gray-200 placeholder-gray-400" />
                        </div>
                        {newStatus !== rec.status && (
                          <div className="flex items-center gap-2 text-xs">
                            <StatusBadge status={rec.status} />
                            <ChevronRight size={12} className="text-gray-400" />
                            <StatusBadge status={newStatus} />
                          </div>
                        )}
                        <div className="flex gap-3 pt-1">
                          <button onClick={() => setSelectedRec(null)} className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
                          <button onClick={handleApprove} disabled={!newStatus || approvingId === rec.id}
                            className="flex-1 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] transition-all disabled:opacity-60">
                            {approvingId === rec.id ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><CheckCircle2 size={14} /> Confirm Change</>}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        <Pagination page={page} setPage={setPage} totalPages={totalPages} shownCount={pageItems.length} total={total} label="records" />
      </div>
    </div>
  )
}

// ─── Admin Manual Check-in Modal ─────────────────────────────────────────────
function AdminCheckInModal({ onClose, dispatch }) {
  const today    = todayStr()
  const { user } = useSelector(s => s.auth)

  const nowTime = () => {
    const d = new Date()
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  }

  const [form, setForm] = useState({
    date:           today,
    status:         'present',
    check_in_time:  nowTime(),
    check_out_time: '',
    reason:         '',
  })
  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState('')
  const [error,   setError]   = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setError('')
    if (!form.status) { setError('Please select a status'); return }
    if (['present','late'].includes(form.status) && !form.check_in_time) {
      setError('Check-in time is required for this status'); return
    }
    setSaving(true)

    // Build ISO datetime — API expects "2026-05-03T09:00:00.000Z"
    const toISO = (timeStr) => {
      if (!timeStr) return undefined
      return new Date(`${form.date}T${timeStr}:00`).toISOString()
    }

    const payload = {
      user_id:        user?.id,
      date:           form.date,
      status:         form.status,
      check_in_time:  toISO(form.check_in_time),
      check_out_time: form.check_out_time ? toISO(form.check_out_time) : undefined,
      reason:         form.reason || undefined,
    }

    const res = await dispatch(manualAttendanceEntry(payload))
    setSaving(false)
    if (manualAttendanceEntry.fulfilled.match(res)) {
      setSuccess('Attendance recorded successfully!')
      dispatch(fetchAttendanceToday())
      setTimeout(() => { setSuccess(''); onClose() }, 1600)
    } else {
      setError(res.payload || 'Failed to save attendance')
    }
  }

  const showTimes = ['present','late'].includes(form.status)

  return (
    <Modal isOpen={true} onClose={onClose} title="Manual Attendance Entry" size="md"
      footer={
        <>
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Cancel
          </button>
          <Button onClick={handleSave} loading={saving} disabled={saving} icon={CheckCircle2}>
            Save Record
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {success && (
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3">
            <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
            <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">{success}</p>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
            <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Employee — DISABLED, shows logged-in user name */}
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Employee</label>
          <div className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm bg-gray-100 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-xl cursor-not-allowed opacity-70">
            <div className="w-6 h-6 rounded-full bg-brand flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[10px] font-bold">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </span>
            </div>
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              {user?.first_name} {user?.last_name}
            </span>
            <span className="ml-auto text-[10px] text-gray-400 capitalize bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
              {(user?.role || '').replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Date + Status */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Date</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} max={today}
              className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-brand text-gray-700 dark:text-gray-300 transition-colors" />
          </div>
          <CustomSelect
            label="Status *"
            value={form.status}
            onChange={v => set('status', v)}
            options={STATUS_OPTIONS}
          />
        </div>

        {/* Clock pickers — only for time-relevant statuses */}
        {showTimes && (
          <div className="grid grid-cols-2 gap-3">
            <ClockPicker
              label="Check In Time"
              required
              value={form.check_in_time}
              onChange={v => set('check_in_time', v)}
              icon={LogIn}
              iconColor="text-emerald-500"
            />
            <ClockPicker
              label="Check Out Time"
              value={form.check_out_time}
              onChange={v => set('check_out_time', v)}
              icon={LogOut}
              iconColor="text-rose-500"
            />
          </div>
        )}

        {/* Reason */}
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
            Reason / Notes <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input type="text" value={form.reason} onChange={e => set('reason', e.target.value)}
            placeholder="e.g. Field visit, WFH, Client meeting…"
            className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-brand text-gray-700 dark:text-gray-300 placeholder-gray-400 transition-colors" />
        </div>
      </div>
    </Modal>
  )
}

// ─── My Month at a Glance (cross-module summary widget) ───────────────────────
function MyDataOverview({ dispatch }) {
  const { summary, loading } = useSelector(s => s.myData)

  useEffect(() => { dispatch(fetchMySummary()) }, [dispatch])

  if (loading.summary) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-2xl p-4 animate-pulse">
            <div className="h-3 w-16 bg-gray-100 dark:bg-gray-800 rounded mb-3" />
            <div className="h-7 w-10 bg-gray-100 dark:bg-gray-800 rounded" />
          </div>
        ))}
      </div>
    )
  }
  if (!summary) return null

  const L = summary.leads       || {}
  const V = summary.site_visits || {}
  const T = summary.tasks       || {}
  const ATT = summary.attendance_this_month || {}

  const cards = [
    { label: 'My Leads',         value: L.total      ?? 0, sub: `${L.booked ?? 0} booked · ${L.lost ?? 0} lost`,        color: 'text-brand bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Site Visits',      value: V.total      ?? 0, sub: `${V.upcoming ?? 0} upcoming · ${V.done ?? 0} done`,     color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/20' },
    { label: 'Pending Tasks',    value: T.pending    ?? 0, sub: `${T.overdue ?? 0} overdue · ${T.due_today ?? 0} today`, color: T.overdue > 0 ? 'text-red-600 bg-red-50 dark:bg-red-900/20' : 'text-green-600 bg-green-50 dark:bg-green-900/20' },
    { label: 'Days Present',     value: ATT.present  ?? 0, sub: `${ATT.absent ?? 0} absent · ${ATT.on_leave ?? 0} leave`,color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">My Month at a Glance</h3>
        <span className="text-xs text-gray-400">({new Date().toLocaleString('en-IN',{month:'long',year:'numeric'})})</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <div key={i} className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
            <div className={`inline-flex p-2 rounded-xl mb-3 ${c.color}`}>
              {i === 0 && <Users size={15} />}
              {i === 1 && <Calendar size={15} />}
              {i === 2 && <Clock size={15} />}
              {i === 3 && <CheckCircle2 size={15} />}
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{c.value}</p>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">{c.label}</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>
      {L.total > 0 && (
        <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">My Lead Pipeline</p>
          <div className="flex gap-1 h-2 rounded-full overflow-hidden">
            {[
              { key: 'new',                  color: '#94a3b8' },
              { key: 'contacted',            color: '#60a5fa' },
              { key: 'interested',           color: '#0082f3' },
              { key: 'follow_up',            color: '#f59e0b' },
              { key: 'site_visit_scheduled', color: '#8b5cf6' },
              { key: 'site_visit_done',      color: '#06b6d4' },
              { key: 'negotiation',          color: '#f97316' },
              { key: 'booked',               color: '#10b981' },
              { key: 'lost',                 color: '#ef4444' },
            ].map(({ key, color }) => {
              const pct = L.total > 0 ? ((L[key] || 0) / L.total) * 100 : 0
              return pct > 0 ? (
                <div key={key} className="h-full rounded-sm transition-all" style={{ width: `${pct}%`, backgroundColor: color }} title={`${key.replace(/_/g,' ')}: ${L[key]}`} />
              ) : null
            })}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            {[
              { key: 'new', label: 'New', color: '#94a3b8' },
              { key: 'interested', label: 'Interested', color: '#0082f3' },
              { key: 'negotiation', label: 'Negotiation', color: '#f97316' },
              { key: 'booked', label: 'Booked', color: '#10b981' },
              { key: 'lost', label: 'Lost', color: '#ef4444' },
            ].map(({ key, label, color }) => L[key] > 0 ? (
              <span key={key} className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: color }} />
                {label}: {L[key]}
              </span>
            ) : null)}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Holiday Form Modal (create / edit) ───────────────────────────────────────
function HolidayFormModal({ holiday, onClose, onSaved, dispatch }) {
  const isEdit = !!holiday
  const { list: users = [] } = useSelector(s => s.users)
  const [form, setForm] = useState({
    date:        holiday?.date?.split('T')[0] || todayStr(),
    name:        holiday?.name || '',
    description: holiday?.description || '',
    roles:       holiday?.roles    || [],
    user_ids:    holiday?.user_ids || [],
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  useEffect(() => { dispatch(fetchUsers({ per_page: 500 })) }, [dispatch])

  const userOptions = users.map(u => ({
    value: u.id,
    label: `${u.first_name} ${u.last_name || ''}`.trim(),
    sublabel: u.role?.replace(/_/g, ' '),
  }))

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setError('')
    if (!form.date) { setError('Date is required'); return }
    if (!form.name.trim()) { setError('Name is required'); return }
    if (form.roles.length === 0 && form.user_ids.length === 0) {
      setError('Select at least one role (or "All Roles") or a specific user'); return
    }
    setSaving(true)
    const payload = {
      date: form.date,
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      roles: form.roles,
      user_ids: form.user_ids,
    }
    const res = isEdit
      ? await dispatch(updateHoliday({ id: holiday.id, payload }))
      : await dispatch(createHoliday(payload))
    setSaving(false)
    const success = isEdit ? updateHoliday.fulfilled.match(res) : createHoliday.fulfilled.match(res)
    if (success) {
      onSaved?.()
      onClose()
    } else {
      setError(res.payload || 'Failed to save holiday')
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} title={isEdit ? 'Edit Holiday' : 'Create Holiday'} size="md"
      footer={
        <>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Cancel
          </button>
          <Button onClick={handleSave} loading={saving} disabled={saving} icon={CheckCircle2}>
            {isEdit ? 'Save Changes' : 'Create Holiday'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
            <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Date *</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-brand text-gray-700 dark:text-gray-300 transition-colors" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Name *</label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Diwali"
              className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-brand text-gray-700 dark:text-gray-300 placeholder-gray-400 transition-colors" />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Description <span className="text-gray-400 font-normal">(optional)</span></label>
          <input type="text" value={form.description} onChange={e => set('description', e.target.value)} placeholder="e.g. Festival of Lights — company holiday"
            className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-brand text-gray-700 dark:text-gray-300 placeholder-gray-400 transition-colors" />
        </div>

        <CustomSelect
          label="Apply to Roles"
          value={form.roles}
          onChange={v => set('roles', v)}
          options={ALL_ROLES}
          multiple
          searchable
          placeholder="Select roles, or 'All Roles' for company-wide…"
        />

        <CustomSelect
          label="Also apply to specific users"
          value={form.user_ids}
          onChange={v => set('user_ids', v)}
          options={userOptions}
          multiple
          searchable
          placeholder="Search and select individual employees…"
        />

        <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl px-3 py-2.5">
          <Info size={13} className="text-brand mt-0.5 flex-shrink-0" />
          <p className="text-xs text-brand/90 dark:text-blue-300">
            At least one role (or "All Roles") or specific user is required. Targeted employees will show "Holiday" for this date
            and won't be marked absent — they can still check in voluntarily if they want.
          </p>
        </div>
      </div>
    </Modal>
  )
}

// ─── Holidays Panel (admin/super_admin only — full CRUD) ──────────────────────
function HolidaysPanel({ dispatch, onExport, exporting }) {
  const { list, pagination, loading } = useSelector(s => s.holidays)
  const [showForm,    setShowForm]    = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [deletingItem, setDeletingItem] = useState(null)
  const [deleting,    setDeleting]    = useState(false)
  const [yearFilter,  setYearFilter]  = useState(new Date().getFullYear())
  const [page,        setPage]        = useState(1)

  useEffect(() => { dispatch(fetchHolidays({ year: yearFilter, page, per_page: PAGE_SIZE })) }, [dispatch, yearFilter, page])
  useEffect(() => { setPage(1) }, [yearFilter])

  const openCreate = () => { setEditingItem(null); setShowForm(true) }
  const openEdit   = (h) => { setEditingItem(h); setShowForm(true) }

  const refetch = () => dispatch(fetchHolidays({ year: yearFilter, page, per_page: PAGE_SIZE }))

  const confirmDelete = async () => {
    if (!deletingItem) return
    setDeleting(true)
    const res = await dispatch(deleteHoliday(deletingItem.id))
    setDeleting(false)
    if (deleteHoliday.fulfilled.match(res)) {
      setDeletingItem(null)
      refetch()
    }
  }

  const describeTarget = (h) => {
    const parts = []
    if (h.roles?.includes('all')) parts.push('All Roles (Company-wide)')
    else if (h.roles?.length) parts.push(`${h.roles.length} role${h.roles.length !== 1 ? 's' : ''}`)
    if (h.user_ids?.length) parts.push(`${h.user_ids.length} specific user${h.user_ids.length !== 1 ? 's' : ''}`)
    return parts.join(' + ') || 'No target'
  }

  const isUpcoming = (date) => date?.split('T')[0] >= todayStr()

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-fuchsia-600 to-purple-600 px-6 py-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-display text-base font-semibold text-white">Holidays</h3>
            <p className="text-fuchsia-200 text-xs mt-0.5">Declare company or team-specific holidays</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={yearFilter} onChange={e => setYearFilter(parseInt(e.target.value))}
              className="px-3 py-2 text-sm rounded-xl bg-white/20 text-white outline-none border border-white/20">
              {[yearFilter - 1, yearFilter, yearFilter + 1].map(y => (
                <option key={y} value={y} className="text-gray-900">{y}</option>
              ))}
            </select>
            <button onClick={onExport} disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 text-white text-xs font-semibold hover:bg-white/30 transition-all disabled:opacity-50">
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Export
            </button>
            <button onClick={openCreate}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-fuchsia-700 text-xs font-semibold hover:shadow-md transition-all">
              <Plus size={14} /> New Holiday
            </button>
          </div>
        </div>

        {loading.list ? (
          <div className="p-10 flex justify-center"><Loader2 size={22} className="animate-spin text-brand" /></div>
        ) : list.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-fuchsia-50 dark:bg-fuchsia-900/20 flex items-center justify-center mx-auto mb-3">
              <PartyPopper size={24} className="text-fuchsia-400" />
            </div>
            <p className="font-medium text-gray-600 dark:text-gray-300">No holidays for {yearFilter}</p>
            <p className="text-sm text-gray-400 mt-1">Create one to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800/40">
            {list.map(h => (
              <div key={h.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/60 dark:hover:bg-gray-800/20 transition-colors">
                <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${isUpcoming(h.date) ? 'bg-fuchsia-50 dark:bg-fuchsia-900/20 text-fuchsia-600' : 'bg-gray-50 dark:bg-gray-800/40 text-gray-400'}`}>
                  <span className="text-[9px] font-semibold uppercase">{new Date(h.date).toLocaleDateString('en-IN', { month: 'short' })}</span>
                  <span className="text-sm font-bold leading-none">{new Date(h.date).getDate()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{h.name}</span>
                    {!isUpcoming(h.date) && <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">Past</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                    <span>{fmtDate(h.date)}</span>
                    <span className="flex items-center gap-1"><Users size={10} /> {describeTarget(h)}</span>
                  </div>
                  {h.description && <p className="text-xs text-gray-400 mt-1 truncate">{h.description}</p>}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => openEdit(h)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-brand hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setDeletingItem(h)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <Pagination page={page} setPage={setPage} totalPages={pagination?.total_pages || 1} shownCount={list.length} total={pagination?.total || 0} label="holidays" />
      </div>

      {showForm && (
        <HolidayFormModal holiday={editingItem} onClose={() => setShowForm(false)} onSaved={refetch} dispatch={dispatch} />
      )}

      <ConfirmModal
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        variant="danger"
        title="Delete Holiday"
        message={`Delete "${deletingItem?.name}"? Employees who haven't checked in on this date will lose their holiday marking. Anyone who already checked in keeps their real attendance record.`}
        confirmText="Delete Holiday"
      />
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Attendance() {
  const dispatch = useDispatch()
  const { user }  = useSelector(s => s.auth)
  const { today: todayData, loading, error } = useSelector(s => s.attendance)

  const isAdmin = ADMIN_ROLES.includes(user?.role)
  const isTeamLead = HIERARCHY_ROLES.includes(user?.role)
  // Per role rules: admin/super_admin → everything. Team leads → own + team. Everyone else → own only.

  const [showManualEntry, setShowManualEntry] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportingKey,   setExportingKey]   = useState(null)
  const [exportModule,   setExportModule]   = useState('attendance')

  // Photo lightbox — shared across every tab. canChangeStatus only true for admin/super_admin.
  const [lightboxRecord, setLightboxRecord] = useState(null)
  const [statusChangingId, setStatusChangingId] = useState(null)
  const openLightbox = (rec) => setLightboxRecord(rec)
  const closeLightbox = () => setLightboxRecord(null)

  const handleLightboxStatusChange = async (record, newStatus, reason) => {
    setStatusChangingId(record.id)
    const res = await dispatch(updateAttendanceStatus({ id: record.id, status: newStatus, reason }))
    setStatusChangingId(null)
    if (updateAttendanceStatus.fulfilled.match(res)) {
      setLightboxRecord(null)
      // Refresh whichever views might show this record
      dispatch(fetchAttendanceToday())
    }
  }

  const handleExportSubmit = async (dateRange) => {
    try {
      setExportingKey(exportModule)
      const params = { ...dateRange }
      const res = await api.get(`/export/${exportModule}`, { params, responseType: 'blob' })
      downloadBlob(res.data, `${exportModule.replace('-', '_')}_${dateRange.from}_to_${dateRange.to}.xlsx`)
      setShowExportModal(false)
    } catch (err) {
      console.error(`Export ${exportModule} failed:`, err)
    } finally {
      setExportingKey(null)
    }
  }

  // ── Tabs — strictly role-based per the agreed structure ──────────────────────
  const TABS = [
    { id: 'today',     label: 'Check In/Out', icon: Clock,       show: true },
    { id: 'calendar',  label: 'Calendar',     icon: Calendar,    show: true },
    { id: 'history',   label: 'My History',   icon: BarChart3,   show: true },
    { id: 'team',      label: 'My Team',      icon: Users,       show: isTeamLead },
    { id: 'team-month',label: 'Team Month',   icon: UserCheck,   show: isTeamLead },
    { id: 'company',   label: 'Company Overview', icon: TrendingUp, show: isAdmin },
    { id: 'monthly',   label: 'Month Grid',   icon: Users,       show: isAdmin },
    { id: 'summary',   label: 'Summary',      icon: TrendingUp,  show: isAdmin },
    { id: 'late',      label: 'Late Reports', icon: AlertCircle, show: isAdmin },
    { id: 'approvals', label: 'Approvals',    icon: CheckCircle2,show: isAdmin },
    { id: 'holidays',  label: 'Holidays',     icon: PartyPopper, show: isAdmin },
  ].filter(t => t.show)

  const [activeTab, setActiveTab] = useState('today')

  useEffect(() => { dispatch(fetchAttendanceToday()) }, [dispatch])

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => dispatch(clearError()), 4000)
      return () => clearTimeout(t)
    }
  }, [error, dispatch])

  return (
    <div className="space-y-6">
      {/* Error toast */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400 flex-1">{error}</p>
          <button onClick={() => dispatch(clearError())} className="text-red-400 hover:text-red-600 flex-shrink-0"><X size={14} /></button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Attendance</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => dispatch(fetchAttendanceToday())}
            className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-brand hover:border-brand transition-colors">
            <RefreshCw size={15} className={loading.today ? 'animate-spin' : ''} />
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowManualEntry(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-semibold transition-colors shadow-sm shadow-blue-500/20"
            >
              <Pencil size={13} /> Log My Attendance
            </button>
          )}
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              loading={!!exportingKey}
              onClick={() => { setExportModule('attendance'); setShowExportModal(true) }}
              className="rounded-xl border-gray-200 dark:border-gray-700 shadow-md"
            >
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800/60 rounded-2xl overflow-x-auto scrollbar-hide">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${activeTab === tab.id ? 'bg-white dark:bg-[#1a1a1a] text-brand shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'today' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <CheckInCard todayData={todayData} loading={loading} dispatch={dispatch} user={user} isAdmin={isAdmin} showStatusChange={isAdmin} />
          </div>
          <div className="lg:col-span-2">
            <MyDataOverview dispatch={dispatch} />
          </div>
        </div>
      )}

      {activeTab === 'calendar' && <CalendarView dispatch={dispatch} isAdmin={isAdmin} onOpenPhoto={openLightbox} />}
      {activeTab === 'history'  && <MyHistory dispatch={dispatch} isAdmin={isAdmin} onOpenPhoto={openLightbox} />}

      {activeTab === 'team' && isTeamLead && (
        <AttendanceListView dispatch={dispatch} title="My Team — Today" isAdmin={isAdmin} scope="team" onOpenPhoto={openLightbox} />
      )}
      {activeTab === 'team-month' && isTeamLead && (
        <MonthGridView dispatch={dispatch} title="My Team — Monthly Grid" scope="team" />
      )}

      {activeTab === 'company' && isAdmin && (
        <AttendanceListView dispatch={dispatch} title="Company Overview — Today" isAdmin={isAdmin} scope="company" onOpenPhoto={openLightbox} />
      )}
      {activeTab === 'monthly' && isAdmin && (
        <MonthGridView dispatch={dispatch} title="Company — Monthly Grid" scope="company" />
      )}
      {activeTab === 'summary' && isAdmin && <SummaryView dispatch={dispatch} isAdmin={isAdmin} />}
      {activeTab === 'late'    && isAdmin && <LateArrivalsReport dispatch={dispatch} onOpenPhoto={openLightbox} />}
      {activeTab === 'approvals' && isAdmin && <ApprovalPanel dispatch={dispatch} onOpenPhoto={openLightbox} />}
      {activeTab === 'holidays'  && isAdmin && (
        <HolidaysPanel
          dispatch={dispatch}
          exporting={exportingKey === 'holidays'}
          onExport={() => { setExportModule('holidays'); setShowExportModal(true) }}
        />
      )}

      {/* Admin Manual Entry Modal */}
      {showManualEntry && (
        <AdminCheckInModal dispatch={dispatch} onClose={() => setShowManualEntry(false)} />
      )}

      {/* Photo Lightbox — shared across all tabs */}
      <PhotoLightbox
        isOpen={!!lightboxRecord}
        onClose={closeLightbox}
        record={lightboxRecord}
        canChangeStatus={isAdmin}
        onStatusChange={handleLightboxStatusChange}
        statusChanging={!!statusChangingId}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportSubmit}
        loading={!!exportingKey}
        title={exportModule === 'holidays' ? 'Export Holidays' : 'Export Attendance'}
      />
    </div>
  )
}