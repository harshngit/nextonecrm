import { useState, useEffect, useRef, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  Clock, Calendar, ChevronLeft, ChevronRight, Download,
  MapPin, User, Users, CheckCircle2, XCircle, AlertCircle,
  Loader2, Camera, LogIn, LogOut, RefreshCw,
  TrendingUp, ChevronDown, Pencil, X,
  Timer, BarChart3, UserCheck,
} from 'lucide-react'
import {
  fetchAttendanceToday,
  fetchMyAttendance,
  fetchAttendanceCalendar,
  fetchAttendanceByMonth,
  fetchAttendanceByDate,
  fetchAttendanceSummary,
  uploadAttendancePhoto,
  checkIn,
  checkOut,
  fetchPendingApprovals,
  approveAttendanceStatus,
  clearError,
  manualAttendanceEntry,
} from '../store/attendanceSlice'
import {
  fetchMySummary,
  fetchMyLeads,
  fetchMyTasks,
  fetchMySiteVisits,
} from '../store/myDataSlice'
import api from '../api/axios'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import CustomSelect from '../components/ui/CustomSelect'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  present:  { label: 'Present',  color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20',  border: 'border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  late:     { label: 'Late',     color: 'text-amber-600',   bg: 'bg-amber-50 dark:bg-amber-900/20',      border: 'border-amber-200 dark:border-amber-800',     dot: 'bg-amber-500',   badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  absent:   { label: 'Absent',   color: 'text-red-600',     bg: 'bg-red-50 dark:bg-red-900/20',          border: 'border-red-200 dark:border-red-800',         dot: 'bg-red-500',     badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  on_leave: { label: 'On Leave', color: 'text-indigo-600',  bg: 'bg-indigo-50 dark:bg-indigo-900/20',    border: 'border-indigo-200 dark:border-indigo-800',   dot: 'bg-indigo-500',  badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
  half_day: { label: 'Half Day', color: 'text-pink-600',    bg: 'bg-pink-50 dark:bg-pink-900/20',        border: 'border-pink-200 dark:border-pink-800',       dot: 'bg-pink-500',    badge: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300' },
  weekend:  { label: 'Weekend',  color: 'text-gray-400',    bg: 'bg-gray-50 dark:bg-gray-800/40',        border: 'border-gray-100 dark:border-gray-800',       dot: 'bg-gray-300',    badge: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
}

const STATUS_OPTIONS = [
  { value: 'present',  label: 'Present'  },
  { value: 'late',     label: 'Late'     },
  { value: 'absent',   label: 'Absent'   },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'half_day', label: 'Half Day' },
]

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const ROLES_ADMIN   = ['super_admin', 'admin', 'superadmin']
const ROLES_MANAGER = ['super_admin', 'admin', 'superadmin', 'sales_manager']

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

// ─── Export helpers (all use new /api/v1/export/* endpoints) ─────────────────

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

const handleExportExcel = async (month, year) => {
  // Legacy attendance export (kept for Month Grid tab button)
  try {
    const start = `${year}-${String(month).padStart(2,'0')}-01`
    const end   = new Date(year, month, 0).toISOString().split('T')[0]
    const res   = await api.get('/export/attendance', { params: { from: start, to: end }, responseType: 'blob' })
    downloadBlob(res.data, `Attendance_${MONTH_NAMES[month-1]}_${year}.xlsx`)
  } catch (err) { console.error('Export failed:', err) }
}

const handleExport = async (module, params = {}) => {
  try {
    const res = await api.get(`/export/${module}`, { params, responseType: 'blob' })
    const today = new Date().toISOString().split('T')[0]
    downloadBlob(res.data, `${module.replace('-','_')}_${today}.xlsx`)
  } catch (err) { console.error(`Export ${module} failed:`, err) }
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

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue:   'from-blue-500 to-[#0082f3]',
    green:  'from-emerald-500 to-green-400',
    amber:  'from-amber-500 to-orange-400',
    red:    'from-red-500 to-rose-400',
    indigo: 'from-indigo-500 to-purple-400',
  }
  return (
    <div className="relative overflow-hidden bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-md shadow-blue-100/40 dark:shadow-blue-900/10 transition-all duration-200">
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full bg-gradient-to-br ${colors[color]} opacity-5 translate-x-6 -translate-y-6`} />
      <div className="mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center shadow-sm`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value ?? '—'}</p>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-[#888] mt-1 truncate">{sub}</p>}
    </div>
  )
}

// ─── Check-In / Out Card ──────────────────────────────────────────────────────

function CheckInCard({ todayData, loading, dispatch, user }) {
  const [showCam,       setShowCam]       = useState(false)
  const [photoType,     setPhotoType]     = useState('checkin')
  const [capturedPhoto, setCapturedPhoto] = useState(null)
  const [uploading,     setUploading]     = useState(false)
  const [geoLoading,    setGeoLoading]    = useState(false)
  const [location,      setLocation]      = useState({ latitude: null, longitude: null, address: null })
  const [photoUrl,      setPhotoUrl]      = useState(null)
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const isCheckedIn  = todayData?.is_checked_in
  const isCheckedOut = todayData?.is_checked_out

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
      const res = await dispatch(uploadAttendancePhoto({ file, type: photoType }))
      if (uploadAttendancePhoto.fulfilled.match(res)) setPhotoUrl(res.payload.photo_url)
      setUploading(false)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }, 'image/jpeg', 0.85)
  }

  const retake = () => {
    setCapturedPhoto(null)
    setPhotoUrl(null)
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
  }

  return (
    <>
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-[#0082f3] to-blue-600 px-6 py-5 flex items-center justify-between">
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0082f3] to-blue-600 flex items-center justify-center flex-shrink-0">
              <User size={17} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.name || 'You'}
              </p>
              <p className="text-xs text-gray-400 capitalize">{user?.role?.replace(/_/g, ' ')}</p>
            </div>
            <StatusBadge status={todayData?.status || 'absent'} size="md" />
          </div>

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

          {todayData?.working_hours && (
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl px-3 py-2.5 mb-4">
              <Timer size={14} className="text-[#0082f3]" />
              <span className="text-sm text-[#0082f3] font-semibold">{todayData.working_hours}h worked today</span>
            </div>
          )}

          {todayData?.checkin_location?.address && (
            <div className="flex items-start gap-1.5 text-xs text-gray-400 mb-4">
              <MapPin size={12} className="mt-0.5 flex-shrink-0 text-[#0082f3]" />
              <span className="truncate">{todayData.checkin_location.address}</span>
            </div>
          )}

          {/* Action button */}
          {!isCheckedIn ? (
            <button onClick={() => openCamera('checkin')} disabled={loading.checkin}
              className="w-full py-3 bg-gradient-to-r from-[#0082f3] to-blue-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] transition-all disabled:opacity-60">
              {loading.checkin ? <Loader2 size={17} className="animate-spin" /> : <LogIn size={17} />}
              Check In
            </button>
          ) : !isCheckedOut ? (
            <button onClick={() => openCamera('checkout')} disabled={loading.checkout}
              className="w-full py-3 bg-gradient-to-r from-rose-500 to-red-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-rose-500/25 active:scale-[0.98] transition-all disabled:opacity-60">
              {loading.checkout ? <Loader2 size={17} className="animate-spin" /> : <LogOut size={17} />}
              Check Out
            </button>
          ) : (
            <div className="w-full py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-semibold rounded-xl flex items-center justify-center gap-2">
              <CheckCircle2 size={17} /> Attendance Complete
            </div>
          )}
        </div>
      </div>

      {/* Camera Modal */}
      {showCam && (
        <div className="fixed inset-0 z-[999] bg-black/90 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-[#1a1a1a] rounded-3xl overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-[#0082f3] to-blue-600 px-5 py-4 flex items-center justify-between">
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
                      <Loader2 size={16} className="animate-spin text-[#0082f3]" />
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
                  <button onClick={getLocation} className="text-xs text-[#0082f3] hover:underline">Retry</button>
                )}
              </div>

              {!capturedPhoto ? (
                <button onClick={capture} className="w-full py-3 bg-gradient-to-r from-[#0082f3] to-blue-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
                  <Camera size={18} /> Capture Selfie
                </button>
              ) : (
                <div className="flex gap-3">
                  <button onClick={retake} className="flex-1 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <RefreshCw size={15} /> Retake
                  </button>
                  <button onClick={handleAction} disabled={uploading || loading.checkin || loading.checkout}
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

function CalendarView({ dispatch }) {
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
          <button onClick={prev} className="w-8 h-8 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:border-[#0082f3] hover:text-[#0082f3] transition-colors"><ChevronLeft size={15} /></button>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 min-w-[110px] text-center">{MONTH_NAMES[month - 1]} {year}</span>
          <button onClick={next} className="w-8 h-8 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:border-[#0082f3] hover:text-[#0082f3] transition-colors"><ChevronRight size={15} /></button>
        </div>
      </div>

      {sum && (
        <div className="px-6 py-3 flex flex-wrap gap-2 border-b border-gray-100 dark:border-gray-800">
          {[
            { k: 'present',  l: 'Present', c: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
            { k: 'late',     l: 'Late',    c: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
            { k: 'absent',   l: 'Absent',  c: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
            { k: 'on_leave', l: 'Leave',   c: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
          ].map(x => (
            <span key={x.k} className={`px-3 py-1 rounded-full text-xs font-semibold ${x.c}`}>{sum[x.k]} {x.l}</span>
          ))}
          {sum.total_working_hours > 0 && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-[#0082f3] dark:bg-blue-900/30 dark:text-blue-400">{sum.total_working_hours}h worked</span>
          )}
        </div>
      )}

      {loading.calendar ? (
        <div className="p-10 flex justify-center"><Loader2 size={22} className="animate-spin text-[#0082f3]" /></div>
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
              const cfg     = STATUS_CONFIG[day.status] || STATUS_CONFIG.absent
              const isWk    = day.is_weekend
              return (
                <button key={day.date}
                  onClick={() => setSelected(selected?.date === day.date ? null : day)}
                  className={`relative flex flex-col items-center justify-center rounded-xl aspect-square text-xs font-semibold transition-all hover:scale-105
                    ${isToday ? 'ring-2 ring-[#0082f3] ring-offset-1 dark:ring-offset-[#1a1a1a]' : ''}
                    ${selected?.date === day.date ? 'scale-105 shadow-md' : ''}
                    ${isWk ? 'bg-gray-50 dark:bg-gray-800/40 text-gray-400' : `${cfg.bg} ${cfg.color}`}`}
                >
                  <span className={`text-xs ${isToday ? 'text-[#0082f3] font-bold' : ''}`}>{parseInt(day.date.split('-')[2])}</span>
                  {!isWk && <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${cfg.dot}`} />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {selected && !selected.is_weekend && (
        <div className={`mx-4 mb-4 p-4 rounded-xl border ${STATUS_CONFIG[selected.status]?.border || 'border-gray-200 dark:border-gray-700'} ${STATUS_CONFIG[selected.status]?.bg || 'bg-gray-50'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{fmtDate(selected.date)}</span>
            <StatusBadge status={selected.status} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5"><LogIn size={11} className="text-emerald-500" /> {fmtTime(selected.check_in_time)}</div>
            <div className="flex items-center gap-1.5"><LogOut size={11} className="text-rose-500" /> {fmtTime(selected.check_out_time)}</div>
            {selected.working_hours && <div className="flex items-center gap-1.5 col-span-2"><Timer size={11} className="text-[#0082f3]" /> {selected.working_hours}h working hours</div>}
            {selected.checkin_address && <div className="flex items-center gap-1.5 col-span-2"><MapPin size={11} className="text-[#0082f3]" /> {selected.checkin_address}</div>}
          </div>
          {selected.checkin_photo && <img src={selected.checkin_photo} alt="selfie" className="w-12 h-12 rounded-xl object-cover mt-2 border-2 border-white dark:border-gray-700 shadow-sm" />}
        </div>
      )}
    </div>
  )
}

// ─── My History ───────────────────────────────────────────────────────────────

function MyHistory({ dispatch }) {
  const { myHistory, loading } = useSelector(s => s.attendance)
  const [page, setPage] = useState(1)

  useEffect(() => { dispatch(fetchMyAttendance({ page, per_page: 15 })) }, [dispatch, page])

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
            { v: sum.present,  l: 'Present', c: 'text-emerald-600 dark:text-emerald-400' },
            { v: sum.absent,   l: 'Absent',  c: 'text-red-500 dark:text-red-400' },
            { v: sum.late,     l: 'Late',    c: 'text-amber-600 dark:text-amber-400' },
            { v: sum.on_leave, l: 'Leave',   c: 'text-indigo-600 dark:text-indigo-400' },
          ].map(x => (
            <div key={x.l} className="py-3 text-center">
              <p className={`text-xl font-bold ${x.c}`}>{x.v}</p>
              <p className="text-[10px] text-gray-400 font-medium">{x.l}</p>
            </div>
          ))}
        </div>
      )}

      {loading.myHistory ? (
        <div className="p-8 flex justify-center"><Loader2 size={20} className="animate-spin text-[#0082f3]" /></div>
      ) : data.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">No records found</div>
      ) : (
        <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
          {data.map(rec => {
            const d = rec.date?.split('T')[0] || rec.date
            return (
              <div key={rec.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50/60 dark:hover:bg-gray-800/20 transition-colors">
                <div className={`w-2 h-8 rounded-full flex-shrink-0 ${STATUS_CONFIG[rec.status]?.dot || 'bg-gray-300'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{fmtDate(d)}</span>
                    <StatusBadge status={rec.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
                    <span className="flex items-center gap-1"><LogIn size={10} className="text-emerald-500" />{fmtTime(rec.check_in_time)}</span>
                    <span className="flex items-center gap-1"><LogOut size={10} className="text-rose-500" />{fmtTime(rec.check_out_time)}</span>
                    {rec.working_hours && <span className="flex items-center gap-1"><Timer size={10} className="text-[#0082f3]" />{rec.working_hours}h</span>}
                  </div>
                </div>
                {rec.checkin_photo && <img src={rec.checkin_photo} alt="" className="w-9 h-9 rounded-lg object-cover border border-gray-200 dark:border-gray-700 flex-shrink-0" />}
              </div>
            )
          })}
        </div>
      )}

      {(pg?.total_pages || 0) > 1 && (
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <span className="text-xs text-gray-400">Showing {data.length} of {pg?.total || 0}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Button size="sm" variant="outline" onClick={() => setPage(p => p + 1)} disabled={page >= pg?.total_pages}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Admin: Month Grid ────────────────────────────────────────────────────────

function AdminMonthGrid({ dispatch }) {
  const { byMonth, loading } = useSelector(s => s.attendance)
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())
  const [page,  setPage]  = useState(1)

  useEffect(() => { dispatch(fetchAttendanceByMonth({ month, year, page, per_page: 50 })) }, [dispatch, month, year, page])

  const prev = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const next = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const allDays  = byMonth?.all_days || []
  const userData = byMonth?.data     || []
  const workDays = allDays.filter(d => ![0, 6].includes(new Date(d).getDay()))

  const ABBR       = { present: 'P', late: 'L', absent: 'A', on_leave: 'OL', half_day: 'H', weekend: '-' }
  const ABBR_STYLE = {
    P:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    L:  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    A:  'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
    OL: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
    H:  'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400',
    '-':'bg-gray-50 text-gray-300 dark:bg-gray-800/30 dark:text-gray-600',
  }

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-md overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold text-gray-900 dark:text-white">Monthly Attendance Grid</h3>
          <p className="text-xs text-gray-400 mt-0.5">All employees · {MONTH_NAMES[month - 1]} {year}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prev} className="w-8 h-8 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:border-[#0082f3] hover:text-[#0082f3] transition-colors"><ChevronLeft size={15} /></button>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 min-w-[110px] text-center">{MONTH_NAMES[month - 1]} {year}</span>
          <button onClick={next} className="w-8 h-8 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:border-[#0082f3] hover:text-[#0082f3] transition-colors"><ChevronRight size={15} /></button>
          <Button size="sm" variant="outline" icon={Download} onClick={() => handleExportExcel(month, year)}>Export</Button>
        </div>
      </div>

      {loading.byMonth ? (
        <div className="p-10 flex justify-center"><Loader2 size={22} className="animate-spin text-[#0082f3]" /></div>
      ) : userData.length === 0 ? (
        <div className="p-10 text-center text-gray-400 text-sm">No data for this period</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60">
                <th className="sticky left-0 bg-gray-50 dark:bg-gray-800/60 px-4 py-3 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap z-10 min-w-[180px]">Employee</th>
                {workDays.map(d => {
                  const dt = new Date(d)
                  return (
                    <th key={d} className="px-1 py-3 text-center font-medium text-gray-400 dark:text-gray-500 min-w-[36px]">
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
                u.days?.forEach(d => { dayMap[d.date] = d.status })
                return (
                  <tr key={u.user?.id || ui} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/20 transition-colors">
                    <td className="sticky left-0 bg-white dark:bg-[#1a1a1a] px-4 py-2.5 z-10">
                      <div className="font-medium text-gray-700 dark:text-gray-200 truncate max-w-[160px]">{u.user?.full_name}</div>
                      <div className="text-[10px] text-gray-400 capitalize">{u.user?.role?.replace(/_/g, ' ')}</div>
                    </td>
                    {workDays.map(d => {
                      const st = dayMap[d] || 'absent'
                      const ab = ABBR[st] || 'A'
                      return (
                        <td key={d} className="px-0.5 py-2 text-center">
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

      {(byMonth?.pagination?.total_pages || 0) > 1 && (
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <span className="text-xs text-gray-400">Showing {userData.length} of {byMonth?.pagination?.total || 0} employees</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
            <Button size="sm" variant="outline" onClick={() => setPage(p => p + 1)} disabled={page >= byMonth?.pagination?.total_pages}>Next</Button>
          </div>
        </div>
      )}

      <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-2">
        {[['P','Present','bg-emerald-100 text-emerald-700'],['L','Late','bg-amber-100 text-amber-700'],['A','Absent','bg-red-100 text-red-600'],['OL','On Leave','bg-indigo-100 text-indigo-700'],['H','Half Day','bg-pink-100 text-pink-700']].map(([ab, label, cls]) => (
          <span key={ab} className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${cls}`}>{ab} = {label}</span>
        ))}
      </div>
    </div>
  )
}

// ─── Admin: Daily View ────────────────────────────────────────────────────────

function DailyView({ dispatch }) {
  const { byDate, loading } = useSelector(s => s.attendance)
  const [date, setDate] = useState(todayStr())

  useEffect(() => { dispatch(fetchAttendanceByDate({ date })) }, [dispatch, date])

  const records  = byDate?.records   || []
  const noRecord = byDate?.no_record || []
  const all      = [...records, ...noRecord]
  const summary  = byDate?.summary

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-md overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold text-gray-900 dark:text-white">Daily Attendance View</h3>
          {summary && <p className="text-xs text-gray-400 mt-0.5">{summary.present} present · {summary.absent} absent · {summary.on_leave} on leave</p>}
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-gray-700 dark:text-gray-300 outline-none focus:border-[#0082f3]" />
      </div>

      {summary && (
        <div className="grid grid-cols-4 divide-x divide-gray-100 dark:divide-gray-800 border-b border-gray-100 dark:border-gray-800">
          {[
            { v: summary.present,  l: 'Present',  c: 'text-emerald-600 dark:text-emerald-400' },
            { v: summary.late,     l: 'Late',      c: 'text-amber-600 dark:text-amber-400' },
            { v: summary.absent,   l: 'Absent',    c: 'text-red-500 dark:text-red-400' },
            { v: summary.on_leave, l: 'On Leave',  c: 'text-indigo-600 dark:text-indigo-400' },
          ].map(x => (
            <div key={x.l} className="py-3 text-center">
              <p className={`text-xl font-bold ${x.c}`}>{x.v}</p>
              <p className="text-[10px] text-gray-400 font-medium">{x.l}</p>
            </div>
          ))}
        </div>
      )}

      {loading.byDate ? (
        <div className="p-8 flex justify-center"><Loader2 size={20} className="animate-spin text-[#0082f3]" /></div>
      ) : all.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">No data for this date</div>
      ) : (
        <div className="divide-y divide-gray-50 dark:divide-gray-800/40 max-h-[400px] overflow-y-auto">
          {all.map((r, i) => (
            <div key={r.id || i} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50/60 dark:hover:bg-gray-800/20 transition-colors">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${STATUS_CONFIG[r.status]?.bg || 'bg-gray-100'}`}>
                <User size={14} className={STATUS_CONFIG[r.status]?.color || 'text-gray-400'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{r.full_name}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5 flex-wrap">
                  <span className="capitalize text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{r.role?.replace(/_/g, ' ')}</span>
                  {r.check_in_time  && <span className="flex items-center gap-1"><LogIn  size={10} className="text-emerald-500" />{fmtTime(r.check_in_time)}</span>}
                  {r.check_out_time && <span className="flex items-center gap-1"><LogOut size={10} className="text-rose-500" />{fmtTime(r.check_out_time)}</span>}
                  {r.working_hours  && <span className="flex items-center gap-1"><Timer  size={10} className="text-[#0082f3]" />{r.working_hours}h</span>}
                </div>
              </div>
              {r.checkin_photo && <img src={r.checkin_photo} alt="" className="w-9 h-9 rounded-lg object-cover border border-gray-200 dark:border-gray-700 flex-shrink-0" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Admin: Summary Table ─────────────────────────────────────────────────────

function SummaryTable({ dispatch }) {
  const { summary, loading } = useSelector(s => s.attendance)
  const now  = new Date()
  const [from, setFrom] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`)
  const [to,   setTo]   = useState(now.toISOString().split('T')[0])

  useEffect(() => { dispatch(fetchAttendanceSummary({ from, to })) }, [dispatch, from, to])

  const data = summary?.data || []

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-md overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-base font-semibold text-gray-900 dark:text-white">Team Summary</h3>
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-gray-700 dark:text-gray-300 outline-none focus:border-[#0082f3]" />
          <span className="text-gray-400 text-xs">to</span>
          <input type="date" value={to}   onChange={e => setTo(e.target.value)}   className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-gray-700 dark:text-gray-300 outline-none focus:border-[#0082f3]" />
        </div>
      </div>

      {loading.summary ? (
        <div className="p-8 flex justify-center"><Loader2 size={20} className="animate-spin text-[#0082f3]" /></div>
      ) : data.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">No data for this period</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60">
                {['Employee', 'Role', 'Present', 'Late', 'Absent', 'Leave', 'Working Hrs', 'Attend %'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/40">
              {data.map((r, i) => {
                const pct = r.attendance_percent || 0
                return (
                  <tr key={r.user_id || i} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-700 dark:text-gray-200 text-sm">{r.full_name}</div>
                      <div className="text-xs text-gray-400">{r.email}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 capitalize whitespace-nowrap">{r.role?.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">{r.present}</td>
                    <td className="px-4 py-3 font-bold text-amber-600 dark:text-amber-400">{r.late}</td>
                    <td className="px-4 py-3 font-bold text-red-500 dark:text-red-400">{r.absent}</td>
                    <td className="px-4 py-3 font-bold text-indigo-600 dark:text-indigo-400">{r.on_leave}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">{parseFloat(r.total_working_hours || 0).toFixed(1)}h</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 min-w-[40px]">
                          <div className={`h-1.5 rounded-full ${pct >= 90 ? 'bg-emerald-500' : pct >= 75 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                        <span className={`text-xs font-bold ${pct >= 90 ? 'text-emerald-600' : pct >= 75 ? 'text-amber-600' : 'text-red-500'}`}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Admin: Approvals Panel ───────────────────────────────────────────────────

function ApprovalPanel({ dispatch }) {
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
              className="px-3 py-1.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-gray-700 dark:text-gray-300 outline-none focus:border-[#0082f3]" />
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
          <div className="p-10 flex justify-center"><Loader2 size={22} className="animate-spin text-[#0082f3]" /></div>
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
            {records.map(rec => {
              const isSelected = selectedRec?.id === rec.id
              const cfg        = STATUS_CONFIG[rec.status] || STATUS_CONFIG.absent
              return (
                <div key={rec.id} className={`transition-colors ${isSelected ? 'bg-indigo-50/60 dark:bg-indigo-900/10' : 'hover:bg-gray-50/60 dark:hover:bg-gray-800/20'}`}>
                  <div className="flex items-center gap-4 px-6 py-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                      <User size={16} className={cfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{rec.full_name}</span>
                        <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded capitalize">{rec.role?.replace(/_/g, ' ')}</span>
                        <StatusBadge status={rec.status} />
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
                        {rec.working_hours && <span className="flex items-center gap-1"><Timer size={10} className="text-[#0082f3]" />{rec.working_hours}h</span>}
                        {rec.checkin_address && <span className="flex items-center gap-1 max-w-[180px] truncate"><MapPin size={10} className="text-[#0082f3] flex-shrink-0" />{rec.checkin_address}</span>}
                      </div>
                    </div>
                    {rec.checkin_photo && <img src={rec.checkin_photo} alt="selfie" className="w-10 h-10 rounded-xl object-cover border-2 border-white dark:border-gray-700 shadow-sm flex-shrink-0" />}
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
      </div>
    </div>
  )
}

// ─── Export Menu ─────────────────────────────────────────────────────────────

function ExportMenu({ isAdmin, now, handleExport, handleExportExcel }) {
  const [open,        setOpen]        = useState(false)
  const [exporting,   setExporting]   = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const EXPORTS = [
    { key: 'leads',       label: 'Leads',       color: 'text-blue-600',   show: true },
    { key: 'site-visits', label: 'Site Visits',  color: 'text-purple-600', show: true },
    { key: 'follow-ups',  label: 'Follow-Ups',   color: 'text-green-600',  show: true },
    { key: 'attendance',  label: 'Attendance',   color: 'text-indigo-600', show: true },
    { key: 'projects',    label: 'Projects',     color: 'text-amber-600',  show: isAdmin },
    { key: 'users',       label: 'Team Members', color: 'text-pink-600',   show: isAdmin },
    { key: 'all',         label: 'All Modules',  color: 'text-[#0082f3]',  show: isAdmin },
  ].filter(e => e.show)

  const doExport = async (key) => {
    setExporting(key)
    setOpen(false)
    const from = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
    const to   = now.toISOString().split('T')[0]
    await handleExport(key, { from, to })
    setExporting(null)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all
          ${open
            ? 'border-[#0082f3] text-[#0082f3] bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-[#0082f3] hover:text-[#0082f3]'
          }`}
      >
        {exporting ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Download size={13} />
        )}
        Export
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-52 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl shadow-black/10 z-50 overflow-hidden py-1">
          <p className="px-4 py-2 text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 mb-1">
            Download Excel (.xlsx)
          </p>
          {EXPORTS.map(({ key, label, color }) => (
            <button key={key}
              onClick={() => doExport(key)}
              disabled={!!exporting}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors disabled:opacity-50 disabled:cursor-wait"
            >
              <Download size={13} className={color} />
              <span className="text-gray-700 dark:text-gray-300 font-medium">{label}</span>
              {key === 'all' && (
                <span className="ml-auto text-[10px] text-[#0082f3] bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-full font-semibold">All</span>
              )}
              {exporting === key && <Loader2 size={11} className="ml-auto animate-spin text-gray-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Circular Clock Picker ───────────────────────────────────────────────────

function ClockPicker({ value, onChange, label, icon: Icon, iconColor = 'text-gray-400', required = false }) {
  const [open,    setOpen]    = useState(false)
  const [mode,    setMode]    = useState('hour')   // 'hour' | 'minute'
  const svgRef  = useRef(null)
  const ref     = useRef(null)

  const [hh, mm] = value ? value.split(':') : ['00', '00']
  const hour   = parseInt(hh || 0)
  const minute = parseInt(mm || 0)

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  // Compute angle from center click on SVG
  const getValueFromAngle = (clientX, clientY) => {
    const rect   = svgRef.current.getBoundingClientRect()
    const cx     = rect.left + rect.width  / 2
    const cy     = rect.top  + rect.height / 2
    const dx     = clientX - cx
    const dy     = clientY - cy
    let   angle  = Math.atan2(dy, dx) * (180 / Math.PI) + 90
    if (angle < 0) angle += 360
    if (mode === 'hour') {
      const h = Math.round(angle / 30) % 12
      return h === 0 ? 12 : h
    } else {
      return Math.round(angle / 6) % 60
    }
  }

  const handleClockClick = (e) => {
    const val = getValueFromAngle(e.clientX, e.clientY)
    if (mode === 'hour') {
      const newHH = String(val === 12 ? 0 : val).padStart(2,'0')
      onChange(`${newHH}:${mm || '00'}`)
      setMode('minute')
    } else {
      const newMM = String(val).padStart(2,'0')
      onChange(`${hh || '00'}:${newMM}`)
    }
  }

  const handleAMPM = (isAM) => {
    const h = parseInt(hh || 0)
    let newH = h
    if (isAM && h >= 12) newH = h - 12
    if (!isAM && h < 12) newH = h + 12
    onChange(`${String(newH).padStart(2,'0')}:${mm || '00'}`)
  }

  // Build clock face numbers + hand
  const SIZE    = 220
  const CX      = SIZE / 2
  const CY      = SIZE / 2
  const R_OUTER = 88
  const R_INNER = 62  // inner ring for 13-23

  // For hour mode: 1-12 outer, 13-24 inner (24h clock)
  // For minute mode: 0,5,10...55 outer
  const clockNumbers = mode === 'hour'
    ? [
        ...Array.from({length:12},(_,i)=>({ val: i===0?12:i,  r: R_OUTER, is12h: true  })),
        ...Array.from({length:12},(_,i)=>({ val: i===0?0:i+12, r: R_INNER, is12h: false })),
      ]
    : Array.from({length:12},(_,i)=>({ val: i*5, r: R_OUTER, is12h: true }))

  const activeVal = mode === 'hour' ? (hour === 0 ? 0 : hour % 24) : minute
  const handAngle = mode === 'hour'
    ? ((activeVal % 12 === 0 ? 12 : activeVal % 12) / 12) * 360 - 90
    : (activeVal / 60) * 360 - 90
  const handR     = mode === 'hour' ? (hour >= 13 || hour === 0 ? R_INNER : R_OUTER) : R_OUTER
  const handX     = CX + handR * Math.cos(handAngle * Math.PI / 180)
  const handY     = CY + handR * Math.sin(handAngle * Math.PI / 180)

  const isAM = hour < 12
  const display12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  const displayStr = value
    ? `${String(display12).padStart(2,'0')}:${mm || '00'} ${isAM ? 'AM' : 'PM'}`
    : '--:-- --'

  return (
    <div className="relative" ref={ref}>
      {label && (
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
          {label}{required && ' *'}
        </label>
      )}
      {/* Trigger */}
      <div
        onClick={() => { setOpen(o => !o); setMode('hour') }}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm border rounded-xl cursor-pointer transition-all select-none
          ${open
            ? 'border-[#0082f3] bg-white dark:bg-gray-800 ring-1 ring-[#0082f3]/20'
            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
      >
        {Icon && <Icon size={14} className={`flex-shrink-0 ${iconColor}`} />}
        <span className={`flex-1 font-mono text-base tracking-widest ${value ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
          {value || '--:--'}
        </span>
        <Clock size={14} className="text-gray-400 flex-shrink-0" />
      </div>

      {/* Clock panel — positioned fixed to avoid modal overflow clip */}
      {open && (
        <div className="absolute z-[9999] left-0 mt-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden"
          style={{ width: 240 }}>

          {/* Digital display + AM/PM */}
          <div className="bg-[#0082f3] px-4 py-3 flex items-center justify-between">
            <div className="flex items-baseline gap-0.5">
              <span
                onClick={() => setMode('hour')}
                className={`font-mono text-3xl font-bold cursor-pointer transition-opacity ${mode==='hour' ? 'opacity-100' : 'opacity-60'} text-white`}>
                {String(display12).padStart(2,'0')}
              </span>
              <span className="font-mono text-3xl font-bold text-white/80">:</span>
              <span
                onClick={() => setMode('minute')}
                className={`font-mono text-3xl font-bold cursor-pointer transition-opacity ${mode==='minute' ? 'opacity-100' : 'opacity-60'} text-white`}>
                {mm || '00'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => handleAMPM(true)}
                className={`w-10 h-7 text-xs font-bold rounded-lg transition-all ${isAM ? 'bg-white text-[#0082f3]' : 'text-white/60 hover:text-white/90'}`}>
                AM
              </button>
              <button onClick={() => handleAMPM(false)}
                className={`w-10 h-7 text-xs font-bold rounded-lg transition-all ${!isAM ? 'bg-white text-[#0082f3]' : 'text-white/60 hover:text-white/90'}`}>
                PM
              </button>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="flex border-b border-gray-100 dark:border-gray-800">
            <button onClick={() => setMode('hour')}
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${mode==='hour' ? 'text-[#0082f3] border-b-2 border-[#0082f3]' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
              HOUR
            </button>
            <button onClick={() => setMode('minute')}
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${mode==='minute' ? 'text-[#0082f3] border-b-2 border-[#0082f3]' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
              MINUTE
            </button>
          </div>

          {/* Circular clock face */}
          <div className="flex justify-center py-3 px-3">
            <svg ref={svgRef} width={SIZE} height={SIZE} onClick={handleClockClick}
              style={{ cursor: 'pointer' }}>
              {/* Background circle */}
              <circle cx={CX} cy={CY} r={CX - 4} fill="var(--clock-bg, #F1F5F9)" />

              {/* Inner ring separator (hour mode only) */}
              {mode === 'hour' && (
                <circle cx={CX} cy={CY} r={R_INNER + 14} fill="none"
                  stroke="#E2E8F0" strokeWidth="0.5" strokeDasharray="3,3" />
              )}

              {/* Hand */}
              <line
                x1={CX} y1={CY} x2={handX} y2={handY}
                stroke="#0082f3" strokeWidth="2" strokeLinecap="round" />
              {/* Center dot */}
              <circle cx={CX} cy={CY} r={4} fill="#0082f3" />
              {/* Tip dot */}
              <circle cx={handX} cy={handY} r={18} fill="#0082f3" opacity="0.15" />
              <circle cx={handX} cy={handY} r={8}  fill="#0082f3" />

              {/* Numbers */}
              {clockNumbers.map(({ val, r, is12h }) => {
                const displayVal = mode === 'hour'
                  ? (val === 0 ? '00' : String(val).padStart(2,'0'))
                  : String(val).padStart(2,'0')
                const indexAngle = mode === 'hour'
                  ? ((val % 12 === 0 ? 0 : val % 12) / 12) * 360 - 90
                  : (val / 60) * 360 - 90
                const x = CX + r * Math.cos(indexAngle * Math.PI / 180)
                const y = CY + r * Math.sin(indexAngle * Math.PI / 180)
                const isActive = mode === 'hour'
                  ? activeVal === val
                  : activeVal === val
                return (
                  <g key={`${mode}-${val}`}>
                    {isActive && <circle cx={x} cy={y} r={16} fill="#0082f3" />}
                    <text
                      x={x} y={y}
                      textAnchor="middle" dominantBaseline="central"
                      fontSize={is12h ? 12 : 10}
                      fontWeight={isActive ? 700 : 400}
                      fill={isActive ? '#ffffff' : is12h ? '#374151' : '#9CA3AF'}
                      style={{ userSelect: 'none', fontFamily: 'monospace' }}
                    >
                      {displayVal}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
            <button onClick={() => { onChange(''); setOpen(false) }}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              Clear
            </button>
            <button onClick={() => setOpen(false)}
              className="px-5 py-1.5 bg-[#0082f3] hover:bg-[#0070d4] text-white text-xs font-semibold rounded-xl transition-colors">
              OK
            </button>
          </div>
        </div>
      )}
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

  const statusOptions = STATUS_OPTIONS.map(o => ({ value: o.value, label: o.label }))

  const handleSave = async () => {
    setError('')
    if (!form.status) { setError('Please select a status'); return }
    if (['present','late','half_day'].includes(form.status) && !form.check_in_time) {
      setError('Check-in time is required for this status'); return
    }
    setSaving(true)

    // Build ISO datetime — API expects "2026-05-03T09:00:00.000Z"
    const toISO = (timeStr) => {
      if (!timeStr) return undefined
      return new Date(`${form.date}T${timeStr}:00`).toISOString()
    }

    // Payload matches API schema exactly:
    // { user_id, date, status, check_in_time, check_out_time, reason }
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

  const showTimes = ['present','late','half_day'].includes(form.status)

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
        {/* Feedback */}
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
            <div className="w-6 h-6 rounded-full bg-[#0082f3] flex items-center justify-center flex-shrink-0">
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
              className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-[#0082f3] text-gray-700 dark:text-gray-300 transition-colors" />
          </div>
          <CustomSelect
            label="Status *"
            value={form.status}
            onChange={v => set('status', v)}
            options={statusOptions}
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
            className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-[#0082f3] text-gray-700 dark:text-gray-300 placeholder-gray-400 transition-colors" />
        </div>
      </div>
    </Modal>
  )
}

// ─── MyData Overview Panel (non-admin users only) ─────────────────────────────

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
    { label: 'My Leads',         value: L.total      ?? 0, sub: `${L.booked ?? 0} booked · ${L.lost ?? 0} lost`,        color: 'text-[#0082f3] bg-blue-50 dark:bg-blue-900/20' },
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
      {/* Lead pipeline mini bar */}
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Attendance() {
  const dispatch = useDispatch()
  const { user }  = useSelector(s => s.auth)
  const { today: todayData, loading, error } = useSelector(s => s.attendance)

  const isAdmin   = ROLES_ADMIN.includes(user?.role)
  const isManager = ROLES_MANAGER.includes(user?.role)

  const [showManualEntry, setShowManualEntry] = useState(false)

  const now  = new Date()
  const TABS = [
    { id: 'overview',  label: 'Overview',   icon: BarChart3,  show: true },
    { id: 'calendar',  label: 'Calendar',   icon: Calendar,   show: true },
    { id: 'history',   label: 'My History', icon: Clock,      show: true },
    { id: 'monthly',   label: 'Month Grid', icon: Users,      show: isManager },
    { id: 'daily',     label: 'Daily View', icon: UserCheck,  show: isManager },
    { id: 'summary',   label: 'Summary',    icon: TrendingUp, show: isManager },
    { id: 'approvals', label: 'Approvals',  icon: CheckCircle2, show: isAdmin },
  ].filter(t => t.show)

  const [activeTab, setActiveTab] = useState('overview')

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
            className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-[#0082f3] hover:border-[#0082f3] transition-colors">
            <RefreshCw size={15} className={loading.today ? 'animate-spin' : ''} />
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowManualEntry(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0082f3] hover:bg-[#0070d4] text-white text-xs font-semibold transition-colors shadow-sm shadow-blue-500/20"
            >
              <Pencil size={13} /> Log My Attendance
            </button>
          )}
          {isManager && (
            <ExportMenu isAdmin={isAdmin} now={now} handleExport={handleExport} handleExportExcel={handleExportExcel} />
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800/60 rounded-2xl overflow-x-auto scrollbar-hide">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${activeTab === tab.id ? 'bg-white dark:bg-[#1a1a1a] text-[#0082f3] shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              {!isAdmin ? (
                /* Regular users: selfie check-in card */
                <CheckInCard todayData={todayData} loading={loading} dispatch={dispatch} user={user} />
              ) : (
                /* Admin / Super Admin: manual entry prompt */
                <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 h-full min-h-[220px]">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0082f3] to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <UserCheck size={24} className="text-white" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Admin Account</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                      Selfie check-in is not required.<br />Use the button below to log your attendance.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowManualEntry(true)}
                    className="w-full py-2.5 rounded-xl bg-[#0082f3] hover:bg-[#0070d4] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm shadow-blue-500/20"
                  >
                    <Pencil size={14} /> Log My Attendance
                  </button>
                  {todayData?.is_checked_in && (
                    <div className="w-full flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                      <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                      <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                        Checked in at {fmtTime(todayData.check_in_time)}
                        {todayData.is_checked_out ? ` · Out at ${fmtTime(todayData.check_out_time)}` : ''}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="lg:col-span-2 grid grid-cols-2 gap-4 content-start">
              <StatCard icon={CheckCircle2} label="Status Today"
                value={STATUS_CONFIG[todayData?.status || 'absent']?.label || 'Absent'}
                sub={todayData?.status === 'late' ? 'Arrived late' : todayData?.is_checked_in ? 'On time' : 'Not checked in'}
                color={todayData?.status === 'present' ? 'green' : todayData?.status === 'late' ? 'amber' : 'red'} />
              <StatCard icon={Timer} label="Working Hours"
                value={todayData?.working_hours ? `${todayData.working_hours}h` : '--'}
                sub="Today so far" color="blue" />
              <StatCard icon={LogIn} label="Check In"
                value={todayData?.is_checked_in ? fmtTime(todayData?.check_in_time) : '--:--'}
                sub={todayData?.checkin_location?.address || 'Not checked in yet'} color="green" />
              <StatCard icon={LogOut} label="Check Out"
                value={todayData?.is_checked_out ? fmtTime(todayData?.check_out_time) : '--:--'}
                sub={todayData?.checkout_location?.address || 'Not checked out yet'} color="red" />
            </div>
          </div>

          {/* MyData Overview — only shown for non-admin regular users */}
          {!isAdmin && (
            <MyDataOverview dispatch={dispatch} />
          )}
        </div>
      )}

      {activeTab === 'calendar'  && <CalendarView  dispatch={dispatch} />}
      {activeTab === 'history'   && <MyHistory      dispatch={dispatch} />}
      {activeTab === 'monthly'   && isManager && <AdminMonthGrid dispatch={dispatch} />}
      {activeTab === 'daily'     && isManager && <DailyView      dispatch={dispatch} />}
      {activeTab === 'summary'   && isManager && <SummaryTable   dispatch={dispatch} />}
      {activeTab === 'approvals' && isAdmin   && <ApprovalPanel  dispatch={dispatch} />}

      {/* Admin Manual Entry Modal */}
      {showManualEntry && (
        <AdminCheckInModal dispatch={dispatch} onClose={() => setShowManualEntry(false)} />
      )}
    </div>
  )
}