import { useState, useEffect, useRef, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  Clock, Calendar, ChevronLeft, ChevronRight, Download,
  MapPin, User, Users, CheckCircle2, XCircle, AlertCircle,
  Loader2, Camera, LogIn, LogOut, RefreshCw, FileText,
  TrendingUp, Filter, ChevronDown, Eye, Pencil, X,
  Coffee, Moon, Sun, Timer, BarChart3, UserCheck,
} from 'lucide-react'
import {
  fetchAttendanceToday, fetchMyAttendance, fetchAttendanceCalendar,
  fetchAttendanceByMonth, fetchAttendanceByDate, fetchAllAttendance,
  fetchAttendanceSummary, fetchLateArrivals,
  uploadAttendancePhoto, checkIn, checkOut,
  markLeave, manualAttendanceEntry, updateAttendanceRecord,
  clearError, clearPhotos,
  fetchPendingApprovals, approveAttendanceStatus,
} from '../store/attendanceSlice'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  present:  { label: 'Present',  color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20',  border: 'border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  late:     { label: 'Late',     color: 'text-amber-600',   bg: 'bg-amber-50 dark:bg-amber-900/20',      border: 'border-amber-200 dark:border-amber-800',     dot: 'bg-amber-500',   badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  absent:   { label: 'Absent',   color: 'text-red-600',     bg: 'bg-red-50 dark:bg-red-900/20',          border: 'border-red-200 dark:border-red-800',         dot: 'bg-red-500',     badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  on_leave: { label: 'On Leave', color: 'text-indigo-600',  bg: 'bg-indigo-50 dark:bg-indigo-900/20',    border: 'border-indigo-200 dark:border-indigo-800',   dot: 'bg-indigo-500',  badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
  half_day: { label: 'Half Day', color: 'text-pink-600',    bg: 'bg-pink-50 dark:bg-pink-900/20',        border: 'border-pink-200 dark:border-pink-800',       dot: 'bg-pink-500',    badge: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300' },
  weekend:  { label: 'Weekend',  color: 'text-gray-400',    bg: 'bg-gray-50 dark:bg-gray-800/40',        border: 'border-gray-100 dark:border-gray-800',       dot: 'bg-gray-300',    badge: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const ROLES_ADMIN = ['super_admin','admin','superadmin']
const ROLES_MANAGER = ['super_admin','admin','superadmin','sales_manager']

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtTime = (ts) => {
  if (!ts) return '--:--'
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}
const fmtDate = (d) => {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
const today = () => new Date().toISOString().split('T')[0]

function StatusBadge({ status, size = 'sm' }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.absent
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${size === 'sm' ? 'text-xs' : 'text-sm'} ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function StatCard({ icon: Icon, label, value, sub, color = 'blue', onClick }) {
  const colors = {
    blue:   'from-blue-500 to-[#0082f3]',
    green:  'from-emerald-500 to-green-400',
    amber:  'from-amber-500 to-orange-400',
    red:    'from-red-500 to-rose-400',
    indigo: 'from-indigo-500 to-purple-400',
  }
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-md shadow-blue-100/40 dark:shadow-blue-900/10 ${onClick ? 'cursor-pointer hover:shadow-xl hover:shadow-blue-200/40 dark:hover:shadow-black/40 hover:-translate-y-0.5' : ''} transition-all duration-200`}
    >
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full bg-gradient-to-br ${colors[color]} opacity-5 translate-x-6 -translate-y-6`} />
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center shadow-sm`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value ?? '—'}</p>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-[#888] mt-1">{sub}</p>}
    </div>
  )
}

// ─── Check-In/Out Card ────────────────────────────────────────────────────────

function CheckInCard({ todayData, loading, dispatch, user }) {
  const [showCam, setShowCam] = useState(false)
  const [photoType, setPhotoType] = useState('checkin')
  const [capturedPhoto, setCapturedPhoto] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const [location, setLocation] = useState({ latitude: null, longitude: null, address: null })
  const [photoUrl, setPhotoUrl] = useState(null)
  const videoRef = useRef(null)
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
      navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user' } }).then(stream => {
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      }).catch(() => {})
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
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user' } }).then(stream => {
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
    }).catch(() => {})
  }

  const handleAction = async () => {
    const payload = {
      photo_url:  photoUrl,
      latitude:   location.latitude,
      longitude:  location.longitude,
      address:    location.address,
      device:     navigator.userAgent,
    }
    const action = photoType === 'checkin' ? checkIn(payload) : checkOut(payload)
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
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-md shadow-blue-100/40 dark:shadow-blue-900/10 overflow-hidden">
        {/* Header gradient */}
        <div className="bg-gradient-to-r from-[#0082f3] to-blue-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs font-medium uppercase tracking-wider mb-1">Today's Attendance</p>
              <p className="text-white font-semibold text-lg">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <Clock size={22} className="text-white" />
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* User info */}
          <div className="flex items-center gap-3 mb-5 pb-5 border-b border-gray-100 dark:border-gray-800">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0082f3] to-blue-600 flex items-center justify-center">
              <User size={18} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">
                {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.name || 'You'}
              </p>
              <p className="text-xs text-gray-400 capitalize">{user?.role?.replace(/_/g, ' ')}</p>
            </div>
            <div className="ml-auto">
              <StatusBadge status={todayData?.status || 'absent'} size="md" />
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3.5">
              <div className="flex items-center gap-2 mb-1">
                <LogIn size={14} className="text-emerald-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Check In</span>
              </div>
              <p className={`text-lg font-bold ${isCheckedIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-300 dark:text-gray-600'}`}>
                {isCheckedIn ? fmtTime(todayData?.check_in_time) : '--:--'}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3.5">
              <div className="flex items-center gap-2 mb-1">
                <LogOut size={14} className="text-rose-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Check Out</span>
              </div>
              <p className={`text-lg font-bold ${isCheckedOut ? 'text-rose-600 dark:text-rose-400' : 'text-gray-300 dark:text-gray-600'}`}>
                {isCheckedOut ? fmtTime(todayData?.check_out_time) : '--:--'}
              </p>
            </div>
          </div>

          {/* Working hours */}
          {todayData?.working_hours && (
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl px-4 py-3 mb-5">
              <Timer size={15} className="text-[#0082f3]" />
              <span className="text-sm text-[#0082f3] font-semibold">{todayData.working_hours}h worked today</span>
            </div>
          )}

          {/* Location */}
          {todayData?.checkin_location?.address && (
            <div className="flex items-start gap-2 text-xs text-gray-400 mb-5">
              <MapPin size={13} className="mt-0.5 flex-shrink-0 text-[#0082f3]" />
              <span>{todayData.checkin_location.address}</span>
            </div>
          )}

          {/* Action Buttons */}
          {!isCheckedIn ? (
            <button
              onClick={() => openCamera('checkin')}
              disabled={loading.checkin}
              className="w-full py-3 bg-gradient-to-r from-[#0082f3] to-blue-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {loading.checkin ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
              Check In
            </button>
          ) : !isCheckedOut ? (
            <button
              onClick={() => openCamera('checkout')}
              disabled={loading.checkout}
              className="w-full py-3 bg-gradient-to-r from-rose-500 to-red-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-rose-500/25 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {loading.checkout ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
              Check Out
            </button>
          ) : (
            <div className="w-full py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-semibold rounded-xl flex items-center justify-center gap-2">
              <CheckCircle2 size={18} />
              Attendance Complete
            </div>
          )}
        </div>
      </div>

      {/* Camera Modal */}
      {showCam && (
        <div className="fixed inset-0 z-[999] bg-black/90 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-[#1a1a1a] rounded-3xl overflow-hidden shadow-2xl">
            {/* Camera header */}
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
              {/* Video / Preview */}
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-900 mb-4">
                {capturedPhoto ? (
                  <img src={capturedPhoto} alt="captured" className="w-full h-full object-cover" />
                ) : (
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                )}
                <canvas ref={canvasRef} className="hidden" />
                {/* Location pill */}
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

              {/* Location status */}
              <div className="flex items-center gap-2 mb-4">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium ${location.latitude ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                  {geoLoading ? <Loader2 size={11} className="animate-spin" /> : <MapPin size={11} />}
                  {geoLoading ? 'Getting location…' : location.latitude ? 'Location captured' : 'Location not available'}
                </div>
                {!location.latitude && !geoLoading && (
                  <button onClick={getLocation} className="text-xs text-[#0082f3] hover:underline">Retry</button>
                )}
              </div>

              {/* Buttons */}
              {!capturedPhoto ? (
                <button
                  onClick={capture}
                  className="w-full py-3 bg-gradient-to-r from-[#0082f3] to-blue-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] transition-all"
                >
                  <Camera size={18} />
                  Capture Selfie
                </button>
              ) : (
                <div className="flex gap-3">
                  <button onClick={retake} className="flex-1 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <RefreshCw size={16} />
                    Retake
                  </button>
                  <button
                    onClick={handleAction}
                    disabled={uploading || loading.checkin || loading.checkout}
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-emerald-500/25 active:scale-[0.98] transition-all disabled:opacity-60"
                  >
                    {(uploading || loading.checkin || loading.checkout) ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
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

function CalendarView({ dispatch, user }) {
  const { calendar, loading } = useSelector(s => s.attendance)
  const now  = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    dispatch(fetchAttendanceCalendar({ month, year }))
  }, [dispatch, month, year])

  const prev = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const next = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const days  = calendar?.days || []
  const sum   = calendar?.summary

  // Pad with empty cells for first-day offset
  const firstDow = days[0] ? new Date(days[0].date).getDay() : 0
  const padded   = [...Array(firstDow).fill(null), ...days]

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-md shadow-blue-100/40 dark:shadow-blue-900/10 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-semibold text-gray-900 dark:text-white">My Attendance Calendar</h3>
          <p className="text-xs text-gray-400 mt-0.5">{sum ? `${sum.present} present · ${sum.absent} absent · ${sum.late} late` : 'Monthly overview'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prev} className="w-8 h-8 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:border-[#0082f3] hover:text-[#0082f3] transition-colors">
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 min-w-[110px] text-center">{MONTH_NAMES[month-1]} {year}</span>
          <button onClick={next} className="w-8 h-8 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:border-[#0082f3] hover:text-[#0082f3] transition-colors">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Summary chips */}
      {sum && (
        <div className="px-6 py-3 flex flex-wrap gap-2 border-b border-gray-100 dark:border-gray-800">
          {[
            { k:'present', l:'Present', c:'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
            { k:'late',    l:'Late',    c:'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
            { k:'absent',  l:'Absent',  c:'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
            { k:'on_leave',l:'Leave',   c:'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
          ].map(x => (
            <span key={x.k} className={`px-3 py-1 rounded-full text-xs font-semibold ${x.c}`}>
              {sum[x.k]} {x.l}
            </span>
          ))}
          {sum.total_working_hours > 0 && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-[#0082f3] dark:bg-blue-900/30 dark:text-blue-400">
              {sum.total_working_hours}h worked
            </span>
          )}
        </div>
      )}

      {/* Calendar grid */}
      {loading.calendar ? (
        <div className="p-8 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-[#0082f3]" />
        </div>
      ) : (
        <div className="p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>
            ))}
          </div>
          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {padded.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />
              const isToday   = day.date === today()
              const cfg       = STATUS_CONFIG[day.status] || STATUS_CONFIG.absent
              const isWk      = day.is_weekend
              return (
                <button
                  key={day.date}
                  onClick={() => setSelected(selected?.date === day.date ? null : day)}
                  className={`relative flex flex-col items-center justify-center rounded-xl aspect-square text-xs font-semibold transition-all hover:scale-105
                    ${isToday ? 'ring-2 ring-[#0082f3] ring-offset-1 dark:ring-offset-[#1a1a1a]' : ''}
                    ${selected?.date === day.date ? 'scale-105 shadow-md' : ''}
                    ${isWk ? 'bg-gray-50 dark:bg-gray-800/40 text-gray-400' : cfg.bg}
                    ${isWk ? '' : cfg.color}
                  `}
                >
                  <span className={`text-xs ${isToday ? 'text-[#0082f3] font-bold' : ''}`}>
                    {parseInt(day.date.split('-')[2])}
                  </span>
                  {!isWk && (
                    <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${cfg.dot}`} />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Selected day detail */}
      {selected && !selected.is_weekend && (
        <div className={`mx-4 mb-4 p-4 rounded-xl border ${STATUS_CONFIG[selected.status]?.border || 'border-gray-200 dark:border-gray-700'} ${STATUS_CONFIG[selected.status]?.bg || 'bg-gray-50'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{fmtDate(selected.date)}</span>
            <StatusBadge status={selected.status} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5"><LogIn size={12} className="text-emerald-500" /> {fmtTime(selected.check_in_time)}</div>
            <div className="flex items-center gap-1.5"><LogOut size={12} className="text-rose-500" /> {fmtTime(selected.check_out_time)}</div>
            {selected.working_hours && <div className="flex items-center gap-1.5 col-span-2"><Timer size={12} className="text-[#0082f3]" /> {selected.working_hours}h working hours</div>}
            {selected.checkin_address && <div className="flex items-center gap-1.5 col-span-2"><MapPin size={12} className="text-[#0082f3]" /> {selected.checkin_address}</div>}
          </div>
          {selected.checkin_photo && (
            <img src={selected.checkin_photo} alt="selfie" className="w-12 h-12 rounded-xl object-cover mt-2 border-2 border-white dark:border-gray-700 shadow-sm" />
          )}
        </div>
      )}
    </div>
  )
}

// ─── My History ───────────────────────────────────────────────────────────────

function MyHistory({ dispatch }) {
  const { myHistory, loading } = useSelector(s => s.attendance)
  const [page, setPage] = useState(1)

  useEffect(() => {
    dispatch(fetchMyAttendance({ page, per_page: 15 }))
  }, [dispatch, page])

  const sum = myHistory.summary

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-md shadow-blue-100/40 dark:shadow-blue-900/10 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
        <h3 className="font-display text-base font-semibold text-gray-900 dark:text-white">My Attendance History</h3>
      </div>

      {/* Summary */}
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

      {/* List */}
      {loading.myHistory ? (
        <div className="p-8 flex justify-center"><Loader2 size={20} className="animate-spin text-[#0082f3]" /></div>
      ) : (myHistory?.data?.length || 0) === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">No records found</div>
      ) : (
        <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
          {myHistory.data.map(rec => {
            const d = rec.date?.split('T')[0] || rec.date
            return (
              <div key={rec.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50/60 dark:hover:bg-gray-800/20 transition-colors">
                <div className={`w-2 h-8 rounded-full flex-shrink-0 ${STATUS_CONFIG[rec.status]?.dot || 'bg-gray-300'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{fmtDate(d)}</span>
                    <StatusBadge status={rec.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><LogIn size={10} className="text-emerald-500" />{fmtTime(rec.check_in_time)}</span>
                    <span className="flex items-center gap-1"><LogOut size={10} className="text-rose-500" />{fmtTime(rec.check_out_time)}</span>
                    {rec.working_hours && <span className="flex items-center gap-1"><Timer size={10} className="text-[#0082f3]" />{rec.working_hours}h</span>}
                  </div>
                </div>
                {rec.checkin_photo && (
                  <img src={rec.checkin_photo} alt="" className="w-9 h-9 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {(myHistory?.pagination?.total_pages || 0) > 1 && (
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <span className="text-xs text-gray-400">Showing {myHistory.data?.length || 0} of {myHistory.pagination?.total || 0}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>Previous</Button>
            <Button size="sm" variant="outline" onClick={() => setPage(p => p+1)} disabled={page >= myHistory.pagination?.total_pages}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Admin: By-Month Grid ─────────────────────────────────────────────────────

function AdminMonthGrid({ dispatch }) {
  const { byMonth, loading } = useSelector(s => s.attendance)
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())
  const [page,  setPage]  = useState(1)

  useEffect(() => {
    dispatch(fetchAttendanceByMonth({ month, year, page, per_page: 50 }))
  }, [dispatch, month, year, page])

  const prev = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const next = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const allDays   = byMonth?.all_days || []
  const userData  = byMonth?.data     || []

  // Show only weekdays for compactness
  const workDays  = allDays.length > 0 
    ? allDays.filter(d => ![0,6].includes(new Date(d).getDay()))
    : []

  const abbr = { present:'P', late:'L', absent:'A', on_leave:'OL', half_day:'H', weekend:'-' }
  const ABBR_COLORS = {
    P:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    L:  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    A:  'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
    OL: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
    H:  'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400',
    '-':'bg-gray-50 text-gray-300 dark:bg-gray-800/30 dark:text-gray-600',
  }

  const handleExport = async () => {
    try {
      const token    = localStorage.getItem('n1r_access_token')
      const base     = import.meta.env?.VITE_API_URL || 'https://nextoneapi.onrender.com/api/v1'
      const response = await fetch(`${base}/attendance/export?month=${month}&year=${year}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Export failed')
      const blob = await response.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `Attendance_${month}_${year}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error:', err)
    }
  }

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-md shadow-blue-100/40 dark:shadow-blue-900/10 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-display text-base font-semibold text-gray-900 dark:text-white">Monthly Attendance Grid</h3>
          <p className="text-xs text-gray-400 mt-0.5">All employees · {MONTH_NAMES[month-1]} {year}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prev} className="w-8 h-8 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:border-[#0082f3] hover:text-[#0082f3] transition-colors">
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 min-w-[110px] text-center">{MONTH_NAMES[month-1]} {year}</span>
          <button onClick={next} className="w-8 h-8 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:border-[#0082f3] hover:text-[#0082f3] transition-colors">
            <ChevronRight size={15} />
          </button>
          <Button size="sm" variant="outline" icon={Download} onClick={handleExport}>Export</Button>
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
                  const date = new Date(d)
                  return (
                    <th key={d} className="px-1 py-3 text-center font-medium text-gray-400 dark:text-gray-500 min-w-[36px]">
                      <div>{date.getDate()}</div>
                      <div className="text-[9px]">{date.toLocaleDateString('en-IN',{weekday:'short'})}</div>
                    </th>
                  )
                })}
                <th className="px-3 py-3 text-center font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">P</th>
                <th className="px-3 py-3 text-center font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">A</th>
                <th className="px-3 py-3 text-center font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/40">
              {userData.map((u, ui) => {
                const dayMap = {}
                u.days?.forEach(d => { dayMap[d.date] = d.status })
                return (
                  <tr key={u.user?.id || ui} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/20 transition-colors">
                    <td className="sticky left-0 bg-white dark:bg-[#1a1a1a] hover:bg-gray-50/60 dark:hover:bg-gray-800/20 px-4 py-2.5 z-10 transition-colors">
                      <div className="font-medium text-gray-700 dark:text-gray-200 truncate max-w-[160px]">{u.user?.full_name}</div>
                      <div className="text-[10px] text-gray-400 capitalize">{u.user?.role?.replace(/_/g,' ')}</div>
                    </td>
                    {workDays.map(d => {
                      const st  = dayMap[d] || 'absent'
                      const ab  = abbr[st] || 'A'
                      return (
                        <td key={d} className="px-0.5 py-2 text-center">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-[10px] font-bold ${ABBR_COLORS[ab] || 'bg-gray-100 text-gray-500'}`}>
                            {ab}
                          </span>
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

      {/* Pagination */}
      {(byMonth?.pagination?.total_pages || 0) > 1 && (
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <span className="text-xs text-gray-400">Showing {userData.length} of {byMonth.pagination?.total || 0} employees</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}>Prev</Button>
            <Button size="sm" variant="outline" onClick={() => setPage(p => p+1)} disabled={page >= byMonth.pagination?.total_pages}>Next</Button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-2">
        {[['P','Present','bg-emerald-100 text-emerald-700'],['L','Late','bg-amber-100 text-amber-700'],['A','Absent','bg-red-100 text-red-600'],['OL','On Leave','bg-indigo-100 text-indigo-700'],['H','Half Day','bg-pink-100 text-pink-700']].map(([ab,label,cls]) => (
          <span key={ab} className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${cls}`}>{ab} = {label}</span>
        ))}
      </div>
    </div>
  )
}

// ─── Admin: Summary Table ─────────────────────────────────────────────────────

function SummaryTable({ dispatch }) {
  const { summary, loading } = useSelector(s => s.attendance)
  const now = new Date()
  const [from, setFrom] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`)
  const [to,   setTo]   = useState(now.toISOString().split('T')[0])

  useEffect(() => { dispatch(fetchAttendanceSummary({ from, to })) }, [dispatch, from, to])

  const data = summary?.data || []

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-md shadow-blue-100/40 dark:shadow-blue-900/10 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-base font-semibold text-gray-900 dark:text-white">Team Summary</h3>
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-gray-700 dark:text-gray-300 outline-none focus:border-[#0082f3]" />
          <span className="text-gray-400 text-xs">to</span>
          <input type="date" value={to}   onChange={e=>setTo(e.target.value)}   className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-gray-700 dark:text-gray-300 outline-none focus:border-[#0082f3]" />
        </div>
      </div>

      {loading.summary ? (
        <div className="p-8 flex justify-center"><Loader2 size={20} className="animate-spin text-[#0082f3]" /></div>
      ) : data.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">No data</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60">
                {['Employee','Role','Present','Late','Absent','Leave','Working Hrs','Attend %'].map(h => (
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
                    <td className="px-4 py-3 text-xs text-gray-500 capitalize whitespace-nowrap">{r.role?.replace(/_/g,' ')}</td>
                    <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">{r.present}</td>
                    <td className="px-4 py-3 font-bold text-amber-600 dark:text-amber-400">{r.late}</td>
                    <td className="px-4 py-3 font-bold text-red-500 dark:text-red-400">{r.absent}</td>
                    <td className="px-4 py-3 font-bold text-indigo-600 dark:text-indigo-400">{r.on_leave}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">{parseFloat(r.total_working_hours||0).toFixed(1)}h</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 min-w-[40px]">
                          <div
                            className={`h-1.5 rounded-full ${pct>=90?'bg-emerald-500':pct>=75?'bg-amber-500':'bg-red-500'}`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold ${pct>=90?'text-emerald-600':pct>=75?'text-amber-600':'text-red-500'}`}>{pct}%</span>
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

// ─── Admin: Today's Status ────────────────────────────────────────────────────

function TodayAllUsers({ dispatch }) {
  const { byDate, loading } = useSelector(s => s.attendance)
  const [date, setDate] = useState(today())

  useEffect(() => { dispatch(fetchAttendanceByDate({ date })) }, [dispatch, date])

  const records   = byDate?.records   || []
  const noRecord  = byDate?.no_record || []
  const all       = [...records, ...noRecord]
  const summary   = byDate?.summary

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-md shadow-blue-100/40 dark:shadow-blue-900/10 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold text-gray-900 dark:text-white">Daily Attendance View</h3>
          {summary && (
            <p className="text-xs text-gray-400 mt-0.5">
              {summary.present} present · {summary.absent} absent · {summary.on_leave} on leave
            </p>
          )}
        </div>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-gray-700 dark:text-gray-300 outline-none focus:border-[#0082f3]" />
      </div>

      {/* Summary chips */}
      {summary && (
        <div className="grid grid-cols-4 divide-x divide-gray-100 dark:divide-gray-800 border-b border-gray-100 dark:border-gray-800">
          {[
            { v:summary.present,  l:'Present',  c:'text-emerald-600 dark:text-emerald-400' },
            { v:summary.late,     l:'Late',      c:'text-amber-600 dark:text-amber-400' },
            { v:summary.absent,   l:'Absent',    c:'text-red-500 dark:text-red-400' },
            { v:summary.on_leave, l:'On Leave',  c:'text-indigo-600 dark:text-indigo-400' },
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
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{r.full_name}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                  <span className="capitalize text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{r.role?.replace(/_/g,' ')}</span>
                  {r.check_in_time && <span className="flex items-center gap-1"><LogIn size={10} className="text-emerald-500" />{fmtTime(r.check_in_time)}</span>}
                  {r.check_out_time && <span className="flex items-center gap-1"><LogOut size={10} className="text-rose-500" />{fmtTime(r.check_out_time)}</span>}
                  {r.working_hours && <span className="flex items-center gap-1"><Timer size={10} className="text-[#0082f3]" />{r.working_hours}h</span>}
                </div>
              </div>
              {r.checkin_photo && (
                <img src={r.checkin_photo} alt="" className="w-9 h-9 rounded-lg object-cover border border-gray-200 dark:border-gray-700 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


// ─── Admin: Approval Panel ────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'present',  label: 'Present',  color: 'text-emerald-600' },
  { value: 'late',     label: 'Late',     color: 'text-amber-600' },
  { value: 'absent',   label: 'Absent',   color: 'text-red-500' },
  { value: 'on_leave', label: 'On Leave', color: 'text-indigo-600' },
  { value: 'half_day', label: 'Half Day', color: 'text-pink-600' },
]

function ApprovalPanel({ dispatch }) {
  const { pending, loading } = useSelector(s => s.attendance)
  const [date, setDate]           = useState(today())
  const [approvingId, setApprovingId] = useState(null)
  const [selectedRec, setSelectedRec] = useState(null)
  const [newStatus, setNewStatus]     = useState('')
  const [reason, setReason]           = useState('')
  const [successMsg, setSuccessMsg]   = useState('')

  useEffect(() => {
    dispatch(fetchPendingApprovals({ date }))
  }, [dispatch, date])

  const records  = pending?.records  || []
  const summary  = pending?.summary

  const openApprove = (rec) => {
    setSelectedRec(rec)
    setNewStatus(rec.status)
    setReason('')
    setSuccessMsg('')
  }

  const handleApprove = async () => {
    if (!newStatus || !selectedRec) return
    setApprovingId(selectedRec.id)
    const res = await dispatch(approveAttendanceStatus({
      id: selectedRec.id, status: newStatus, reason,
    }))
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
      {/* Success toast */}
      {successMsg && (
        <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3">
          <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
          <p className="text-sm text-emerald-700 dark:text-emerald-400">{successMsg}</p>
        </div>
      )}

      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-md shadow-blue-100/40 dark:shadow-blue-900/10 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold text-white">Attendance Approvals</h3>
              <p className="text-indigo-200 text-xs mt-0.5">Review and approve employee attendance status</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <UserCheck size={18} className="text-white" />
            </div>
          </div>
        </div>

        {/* Date picker + summary */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-gray-400" />
            <input
              type="date"
              value={date}
              onChange={e => { setDate(e.target.value); setSelectedRec(null) }}
              className="px-3 py-1.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-gray-700 dark:text-gray-300 outline-none focus:border-[#0082f3]"
            />
          </div>
          {summary && (
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-full font-medium">
                <Clock size={11} /> {summary.not_checked_out} not checked out
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-full font-medium">
                <XCircle size={11} /> {summary.absent} absent
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full font-medium">
                <AlertCircle size={11} /> {summary.late} late
              </span>
            </div>
          )}
        </div>

        {/* Records list */}
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
                  {/* Row */}
                  <div className="flex items-center gap-4 px-6 py-4">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                      <User size={16} className={cfg.color} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{rec.full_name}</span>
                        <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded capitalize">{rec.role?.replace(/_/g,' ')}</span>
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
                        {rec.working_hours && (
                          <span className="flex items-center gap-1"><Timer size={10} className="text-[#0082f3]" />{rec.working_hours}h</span>
                        )}
                        {rec.checkin_address && (
                          <span className="flex items-center gap-1 max-w-[200px] truncate"><MapPin size={10} className="text-[#0082f3] flex-shrink-0" />{rec.checkin_address}</span>
                        )}
                      </div>
                    </div>

                    {/* Photo */}
                    {rec.checkin_photo && (
                      <img src={rec.checkin_photo} alt="selfie" className="w-10 h-10 rounded-xl object-cover border-2 border-white dark:border-gray-700 shadow-sm flex-shrink-0" />
                    )}

                    {/* Approve button */}
                    <button
                      onClick={() => isSelected ? setSelectedRec(null) : openApprove(rec)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex-shrink-0 ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                          : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'
                      }`}
                    >
                      <Pencil size={11} />
                      {isSelected ? 'Cancel' : 'Change'}
                    </button>
                  </div>

                  {/* Approval form (expands inline) */}
                  {isSelected && (
                    <div className="px-6 pb-5">
                      <div className="bg-white dark:bg-[#222] rounded-xl border border-indigo-100 dark:border-indigo-900/40 p-4 space-y-4">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Change Status for {rec.full_name}</p>

                        {/* Status selector */}
                        <div>
                          <p className="text-xs text-gray-500 mb-2">New Status</p>
                          <div className="flex flex-wrap gap-2">
                            {STATUS_OPTIONS.map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => setNewStatus(opt.value)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                                  newStatus === opt.value
                                    ? `${STATUS_CONFIG[opt.value]?.bg} ${STATUS_CONFIG[opt.value]?.color} ${STATUS_CONFIG[opt.value]?.border} shadow-sm scale-105`
                                    : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Reason */}
                        <div>
                          <p className="text-xs text-gray-500 mb-1.5">Reason <span className="text-gray-400">(optional)</span></p>
                          <input
                            type="text"
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="e.g. Employee was on field visit..."
                            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-indigo-400 dark:focus:border-indigo-600 text-gray-700 dark:text-gray-200 placeholder-gray-400"
                          />
                        </div>

                        {/* Current → New preview */}
                        {newStatus !== rec.status && (
                          <div className="flex items-center gap-2 text-xs">
                            <StatusBadge status={rec.status} />
                            <ChevronRight size={12} className="text-gray-400" />
                            <StatusBadge status={newStatus} />
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-3 pt-1">
                          <button
                            onClick={() => setSelectedRec(null)}
                            className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleApprove}
                            disabled={!newStatus || approvingId === rec.id}
                            className="flex-1 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] transition-all disabled:opacity-60"
                          >
                            {approvingId === rec.id
                              ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                              : <><CheckCircle2 size={14} /> Confirm Change</>
                            }
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Attendance() {
  const dispatch = useDispatch()
  const { user }       = useSelector(s => s.auth)
  const { today: todayData, loading, error } = useSelector(s => s.attendance)
  const isAdmin   = ROLES_ADMIN.includes(user?.role)
  const isManager = ROLES_MANAGER.includes(user?.role)

  const TABS = [
    { id: 'overview',  label: 'Overview',    icon: BarChart3, show: true },
    { id: 'calendar',  label: 'Calendar',    icon: Calendar,  show: true },
    { id: 'history',   label: 'My History',  icon: Clock,     show: true },
    { id: 'monthly',   label: 'Month Grid',  icon: Users,     show: isManager },
    { id: 'daily',     label: 'Daily View',  icon: UserCheck, show: isManager },
    { id: 'summary',   label: 'Summary',     icon: TrendingUp,show: isManager },
  { id: 'approvals', label: 'Approvals',    icon: UserCheck, show: isAdmin },
  ].filter(t => t.show)

  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    dispatch(fetchAttendanceToday())
  }, [dispatch])

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
          <button onClick={() => dispatch(clearError())} className="text-red-400 hover:text-red-600"><X size={14} /></button>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Attendance</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => dispatch(fetchAttendanceToday())}
            className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-[#0082f3] hover:border-[#0082f3] transition-colors"
          >
            <RefreshCw size={15} className={loading.today ? 'animate-spin' : ''} />
          </button>
          {isManager && (
            <Button
              size="sm"
              variant="outline"
              icon={Download}
              onClick={() => {
                const now = new Date()
                ;(async () => {
                  try {
                    const token    = localStorage.getItem('n1r_access_token')
                    const base     = import.meta.env?.VITE_API_URL || 'https://nextoneapi.onrender.com/api/v1'
                    const now2     = new Date()
                    const response = await fetch(`${base}/attendance/export?month=${now2.getMonth()+1}&year=${now2.getFullYear()}`, {
                      headers: { Authorization: `Bearer ${token}` },
                    })
                    if (!response.ok) throw new Error('Export failed')
                    const blob = await response.blob()
                    const url  = URL.createObjectURL(blob)
                    const a    = document.createElement('a')
                    a.href     = url
                    a.download = `Attendance_${now2.getMonth()+1}_${now2.getFullYear()}.xlsx`
                    document.body.appendChild(a)
                    a.click()
                    a.remove()
                    URL.revokeObjectURL(url)
                  } catch (err) { console.error('Export error:', err) }
                })()
              }}
            >
              Export Excel
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800/60 rounded-2xl overflow-x-auto scrollbar-hide">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              activeTab === tab.id
                ? 'bg-white dark:bg-[#1a1a1a] text-[#0082f3] shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Check-in card */}
            <div className="lg:col-span-1">
              <CheckInCard
                todayData={todayData}
                loading={loading}
                dispatch={dispatch}
                user={user}
              />
            </div>

            {/* Today's stats */}
            <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-2 gap-4 content-start">
              <StatCard
                icon={CheckCircle2}
                label="Status Today"
                value={STATUS_CONFIG[todayData?.status || 'absent']?.label || 'Absent'}
                sub={todayData?.status === 'late' ? 'Arrived late' : todayData?.is_checked_in ? 'On time' : 'Not checked in'}
                color={todayData?.status === 'present' ? 'green' : todayData?.status === 'late' ? 'amber' : 'red'}
              />
              <StatCard
                icon={Timer}
                label="Working Hours"
                value={todayData?.working_hours ? `${todayData.working_hours}h` : '--'}
                sub="Today so far"
                color="blue"
              />
              <StatCard
                icon={LogIn}
                label="Check In"
                value={todayData?.is_checked_in ? fmtTime(todayData?.check_in_time) : '--:--'}
                sub={todayData?.checkin_location?.address || 'Not checked in yet'}
                color="green"
              />
              <StatCard
                icon={LogOut}
                label="Check Out"
                value={todayData?.is_checked_out ? fmtTime(todayData?.check_out_time) : '--:--'}
                sub={todayData?.checkout_location?.address || 'Not checked out yet'}
                color="red"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Calendar */}
      {activeTab === 'calendar' && (
        <CalendarView dispatch={dispatch} user={user} />
      )}

      {/* Tab: My History */}
      {activeTab === 'history' && (
        <MyHistory dispatch={dispatch} />
      )}

      {/* Tab: Monthly Grid (admin/manager) */}
      {activeTab === 'monthly' && isManager && (
        <AdminMonthGrid dispatch={dispatch} />
      )}

      {/* Tab: Daily View (admin/manager) */}
      {activeTab === 'daily' && isManager && (
        <TodayAllUsers dispatch={dispatch} />
      )}

      {/* Tab: Summary (admin/manager) */}
      {activeTab === 'summary' && isManager && (
        <SummaryTable dispatch={dispatch} />
      )}

      {/* Tab: Approvals (admin/super_admin) */}
      {activeTab === 'approvals' && isAdmin && (
        <ApprovalPanel dispatch={dispatch} />
      )}
    </div>
  )
}