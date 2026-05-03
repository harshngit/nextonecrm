import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { Users, Calendar, Phone, Clock, LogIn, LogOut, CheckCircle2, X, AlertCircle, Loader2, Pencil } from 'lucide-react'
import { checkIn, checkOut, uploadAttendancePhoto, fetchAttendanceToday, manualAttendanceEntry } from '../../store/attendanceSlice'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import CustomSelect from '../ui/CustomSelect'

const fmtTime = (ts) => ts ? new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'
const todayStr = () => new Date().toISOString().split('T')[0]
const STATUS_OPTIONS = [
  { value: 'present', label: 'Present' }, { value: 'late', label: 'Late' },
  { value: 'absent', label: 'Absent' }, { value: 'on_leave', label: 'On Leave' },
  { value: 'half_day', label: 'Half Day' },
]
const STATUS_COLOR = {
  present: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  late: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  absent: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  on_leave: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400',
  half_day: 'bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400',
}

function SelfieCheckInModal({ onClose, dispatch, photoType }) {
  const videoRef = useRef(null), canvasRef = useRef(null), streamRef = useRef(null)
  const { loading } = useSelector(s => s.attendance)
  const [capturedPhoto, setCapturedPhoto] = useState(null)
  const [photoUrl, setPhotoUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [location, setLocation] = useState({})
  const [error, setError] = useState('')

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(pos => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }), () => {})
  }, [])
  useEffect(() => {
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user' } })
      .then(stream => { streamRef.current = stream; if (videoRef.current) videoRef.current.srcObject = stream })
      .catch(() => setError('Camera access denied'))
    return () => streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  const capture = () => {
    const canvas = canvasRef.current, video = videoRef.current
    if (!canvas || !video) return
    canvas.width = video.videoWidth; canvas.height = video.videoHeight
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
    setCapturedPhoto(null); setPhotoUrl(null)
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user' } })
      .then(stream => { streamRef.current = stream; if (videoRef.current) videoRef.current.srcObject = stream })
  }
  const handleAction = async () => {
    const payload = { photo_url: photoUrl, ...location, device: navigator.userAgent }
    await dispatch(photoType === 'checkin' ? checkIn(payload) : checkOut(payload))
    dispatch(fetchAttendanceToday())
    onClose()
  }

  return (
    <Modal isOpen={true} onClose={onClose} title={photoType === 'checkin' ? 'Check In Selfie' : 'Check Out Selfie'} size="md">
      <div className="space-y-4">
        {error && <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3"><AlertCircle size={15} className="text-red-500" /><p className="text-sm text-red-600">{error}</p></div>}
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
          {capturedPhoto ? <img src={capturedPhoto} alt="selfie" className="w-full h-full object-cover" /> : <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />}
          {location.latitude && <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full">📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</div>}
          {uploading && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 size={28} className="animate-spin text-white" /></div>}
        </div>
        <canvas ref={canvasRef} className="hidden" />
        <div className="flex gap-3">
          {capturedPhoto ? (
            <>
              <button onClick={retake} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">↩ Retake</button>
              <Button onClick={handleAction} disabled={!photoUrl || uploading} loading={loading.action} className="flex-1">
                <CheckCircle2 size={15} /> {photoType === 'checkin' ? 'Confirm Check In' : 'Confirm Check Out'}
              </Button>
            </>
          ) : (
            <Button onClick={capture} className="flex-1">📸 Take Selfie</Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

function ManualEntryModal({ onClose, dispatch }) {
  const today = todayStr()
  const { user } = useSelector(s => s.auth)
  const [form, setForm] = useState({
    date: today, status: 'present',
    check_in_time: (() => { const d = new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` })(),
    check_out_time: '', reason: '',
  })
  const [saving, setSaving] = useState(false), [success, setSuccess] = useState(''), [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toISO = (t) => t ? new Date(`${form.date}T${t}:00`).toISOString() : undefined
  const handleSave = async () => {
    setError('')
    if (['present','late','half_day'].includes(form.status) && !form.check_in_time) { setError('Check-in time required'); return }
    setSaving(true)
    const res = await dispatch(manualAttendanceEntry({ user_id: user?.id, date: form.date, status: form.status, check_in_time: toISO(form.check_in_time), check_out_time: form.check_out_time ? toISO(form.check_out_time) : undefined, reason: form.reason || undefined }))
    setSaving(false)
    if (manualAttendanceEntry.fulfilled.match(res)) { setSuccess('Attendance recorded!'); dispatch(fetchAttendanceToday()); setTimeout(() => { setSuccess(''); onClose() }, 1400) }
    else setError(res.payload || 'Failed to save')
  }
  const showTimes = ['present','late','half_day'].includes(form.status)
  return (
    <Modal isOpen={true} onClose={onClose} title="Log My Attendance" size="md"
      footer={<><button onClick={onClose} className="px-5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500">Cancel</button><Button onClick={handleSave} loading={saving} icon={CheckCircle2}>Save</Button></>}>
      <div className="space-y-4">
        {success && <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3"><CheckCircle2 size={14} className="text-emerald-500" /><p className="text-sm text-emerald-700 dark:text-emerald-400">{success}</p></div>}
        {error && <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3"><AlertCircle size={14} className="text-red-500" /><p className="text-sm text-red-600 dark:text-red-400">{error}</p></div>}
        <div className="flex items-center gap-2.5 px-3 py-2.5 bg-gray-100 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-xl opacity-70">
          <div className="w-7 h-7 rounded-full bg-[#0082f3] flex items-center justify-center"><span className="text-white text-[10px] font-bold">{user?.first_name?.[0]}{user?.last_name?.[0]}</span></div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{user?.first_name} {user?.last_name}</span>
          <span className="ml-auto text-[10px] text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full capitalize">{(user?.role||'').replace(/_/g,' ')}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Date</label><input type="date" value={form.date} onChange={e => set('date',e.target.value)} max={today} className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-[#0082f3] text-gray-700 dark:text-gray-300" /></div>
          <CustomSelect label="Status *" value={form.status} onChange={v => set('status',v)} options={STATUS_OPTIONS.map(o=>({value:o.value,label:o.label}))} />
        </div>
        {showTimes && (
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Check In *</label><div className="relative"><input type="time" value={form.check_in_time} onChange={e => set('check_in_time',e.target.value)} className="w-full px-3 py-2.5 pl-9 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-[#0082f3] text-gray-700 dark:text-gray-300" /><LogIn size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" /></div></div>
            <div><label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Check Out</label><div className="relative"><input type="time" value={form.check_out_time} onChange={e => set('check_out_time',e.target.value)} className="w-full px-3 py-2.5 pl-9 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-[#0082f3] text-gray-700 dark:text-gray-300" /><LogOut size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-500 pointer-events-none" /></div></div>
          </div>
        )}
        <div><label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Reason <span className="font-normal text-gray-400">(optional)</span></label><input type="text" value={form.reason} onChange={e => set('reason',e.target.value)} placeholder="e.g. Field visit, WFH…" className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-[#0082f3] text-gray-700 dark:text-gray-300 placeholder-gray-400" /></div>
      </div>
    </Modal>
  )
}

function AttendanceQuickModal({ onClose }) {
  const dispatch = useDispatch()
  const { user } = useSelector(s => s.auth)
  const { today: todayData, loading } = useSelector(s => s.attendance)
  const isAdmin = ['super_admin','admin'].includes(user?.role)
  const [mode, setMode] = useState(null)

  useEffect(() => { dispatch(fetchAttendanceToday()) }, [dispatch])

  if (mode === 'checkin' || mode === 'checkout') return <SelfieCheckInModal dispatch={dispatch} photoType={mode} onClose={() => setMode(null)} />
  if (mode === 'manual') return <ManualEntryModal dispatch={dispatch} onClose={() => setMode(null)} />

  const status = todayData?.status || 'absent'
  const checkedIn = todayData?.is_checked_in, checkedOut = todayData?.is_checked_out
  const statusCls = STATUS_COLOR[status] || 'bg-gray-50 text-gray-500'

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={onClose}>
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden" style={{ width: '80%', maxWidth: 520, maxHeight: '80vh' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-[#0082f3] to-blue-600">
          <div><h3 className="font-display text-lg font-semibold text-white">Attendance</h3><p className="text-blue-200 text-xs mt-0.5">{new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</p></div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-5 overflow-y-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0082f3] flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30"><span className="text-white text-sm font-bold">{user?.first_name?.[0]}{user?.last_name?.[0]}</span></div>
            <div className="flex-1"><p className="font-semibold text-gray-900 dark:text-white">{user?.first_name} {user?.last_name}</p><p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{(user?.role||'').replace(/_/g,' ')}</p></div>
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize ${statusCls}`}>{status.replace(/_/g,' ')}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1"><LogIn size={14} className="text-emerald-500" /><span className="text-xs font-medium text-gray-500 dark:text-gray-400">Check In</span></div>
              <p className="text-xl font-bold text-gray-900 dark:text-white font-mono">{checkedIn ? fmtTime(todayData.check_in_time) : '--:--'}</p>
              {todayData?.checkin_address && <p className="text-[10px] text-gray-400 mt-1 truncate">{todayData.checkin_address}</p>}
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1"><LogOut size={14} className="text-rose-500" /><span className="text-xs font-medium text-gray-500 dark:text-gray-400">Check Out</span></div>
              <p className="text-xl font-bold text-gray-900 dark:text-white font-mono">{checkedOut ? fmtTime(todayData.check_out_time) : '--:--'}</p>
              {todayData?.working_hours && <p className="text-[10px] text-gray-400 mt-1">{todayData.working_hours}h worked</p>}
            </div>
          </div>
          {isAdmin ? (
            <button onClick={() => setMode('manual')} className="w-full py-3 rounded-2xl bg-[#0082f3] hover:bg-[#0070d4] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors">
              <Pencil size={16} /> Log My Attendance
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setMode('checkin')} disabled={checkedIn || loading.action} className={`py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${checkedIn ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}>
                <LogIn size={16} /> {checkedIn ? 'Checked In ✓' : 'Check In'}
              </button>
              <button onClick={() => setMode('checkout')} disabled={!checkedIn || checkedOut || loading.action} className={`py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${(!checkedIn || checkedOut) ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-rose-500 hover:bg-rose-600 text-white'}`}>
                <LogOut size={16} /> {checkedOut ? 'Checked Out ✓' : 'Check Out'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DashboardStats({ loading }) {
  const navigate = useNavigate()
  const { stats } = useSelector((s) => s.dashboard)
  const [showAttendance, setShowAttendance] = useState(false)
  const s = stats?.stats
  const fmt = (v) => v != null ? (v >= 0 ? `+${v}%` : `${v}%`) : null

  const statsConfig = [
    { label: 'Total Leads',      value: s?.total_leads?.value       ?? 0, change: fmt(s?.total_leads?.change),       icon: Users,    color: 'text-[#0082f3] bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400',        onClick: () => navigate('/leads')         },
    { label: 'Total Site Visits',value: s?.total_site_visits?.value ?? 0, change: fmt(s?.total_site_visits?.change), icon: Calendar, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400', onClick: () => navigate('/site-visits')   },
    { label: 'Total Follow ups', value: s?.total_follow_ups?.value  ?? 0, change: fmt(s?.total_follow_ups?.change),  icon: Phone,    color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',   onClick: () => navigate('/follow-ups')    },
    { label: 'Attendance',       value: null,                             change: null,                               icon: Clock,    color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',    onClick: () => setShowAttendance(true), isAttendance: true },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-200 dark:border-gray-700 animate-pulse shadow-md shadow-blue-100/50 dark:shadow-blue-900/20">
            <div className="flex items-center justify-between mb-4"><div className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-lg" /><div className="w-16 h-4 bg-gray-50 dark:bg-gray-800 rounded" /></div>
            <div className="w-24 h-8 bg-gray-50 dark:bg-gray-800 rounded mb-2" /><div className="w-20 h-4 bg-gray-50 dark:bg-gray-800 rounded" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsConfig.map((stat, i) => (
          <div key={i} onClick={stat.onClick}
            className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md shadow-blue-100/50 dark:shadow-blue-900/20 hover:shadow-xl hover:shadow-blue-200/50 dark:hover:shadow-black/50 transition-all duration-300 cursor-pointer group active:scale-[0.98]">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-110 ${stat.color}`}><stat.icon size={20} /></div>
              {stat.change && <span className={`text-xs font-medium px-2 py-1 rounded-full ${stat.change.startsWith('+') ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-red-600 bg-red-50 dark:bg-red-900/20'}`}>{stat.change}</span>}
            </div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">{stat.label}</h3>
            {stat.isAttendance ? (
              <div><p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-[#0082f3] transition-colors">Tap to check in</p><p className="text-xs text-gray-400 mt-0.5">Today's attendance</p></div>
            ) : (
              <p className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-[#0082f3] transition-colors">{(stat.value || 0).toLocaleString('en-IN')}</p>
            )}
          </div>
        ))}
      </div>
      {showAttendance && <AttendanceQuickModal onClose={() => setShowAttendance(false)} />}
    </>
  )
}