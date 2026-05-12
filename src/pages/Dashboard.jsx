import { useEffect, useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  Download, Loader2, RefreshCw, ChevronRight, ArrowUpRight,
  Users, CalendarDays, Phone, Building2, Clock, MapPin, TrendingUp,
  Bell, UserCheck, ClipboardList, BarChart3, LogIn, LogOut,
  CheckCircle2, X, AlertCircle, Pencil, Zap, Target, Activity,
  ChevronDown, PhoneCall, Star, BookOpen,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import {
  fetchDashboardStats, fetchRevenueTrend, fetchLeadSources,
  fetchLeadPipeline, fetchRecentActivity, fetchUpcomingSiteVisits,
} from '../store/dashboardSlice'
import {
  checkIn, checkOut, uploadAttendancePhoto,
  fetchAttendanceToday, manualAttendanceEntry,
} from '../store/attendanceSlice'
import api from '../api/axios'
import Modal from '../components/ui/Modal'
import ExportModal from '../components/ui/ExportModal'
import Button from '../components/ui/Button'
import CustomSelect from '../components/ui/CustomSelect'
import Avatar from '../components/ui/Avatar'

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmtTime = (ts) => ts
  ? new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  : '--:--'
const todayStr = () => new Date().toISOString().split('T')[0]
const timeAgo = (d) => {
  if (!d) return ''
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 60) return 'Just now'
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  if (s < 172800) return 'Yesterday'
  return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })
}

const ATT_STATUS_OPTS = [
  { value:'present',  label:'Present'  }, { value:'late',     label:'Late'     },
  { value:'absent',   label:'Absent'   }, { value:'on_leave', label:'On Leave' },
  { value:'half_day', label:'Half Day' },
]
const ATT_COLOR = {
  present: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  late:    'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  absent:  'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  on_leave:'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400',
  half_day:'bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400',
}

// ─── Attendance modals (shared) ───────────────────────────────────────────────
function SelfieModal({ dispatch, type, onClose }) {
  const vRef=useRef(null), cRef=useRef(null), sRef=useRef(null)
  const { loading } = useSelector(s => s.attendance)
  const [photo,setPhoto]=useState(null)
  const [url,setUrl]=useState(null)
  const [uploading,setUploading]=useState(false)
  const [loc,setLoc]=useState({})
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(p=>setLoc({latitude:p.coords.latitude,longitude:p.coords.longitude}),()=>{})
    navigator.mediaDevices?.getUserMedia({video:{facingMode:'user'}})
      .then(s=>{sRef.current=s;if(vRef.current)vRef.current.srcObject=s}).catch(()=>{})
    return ()=>sRef.current?.getTracks().forEach(t=>t.stop())
  },[])
  const capture=()=>{
    const c=cRef.current,v=vRef.current;if(!c||!v)return
    c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0)
    c.toBlob(async blob=>{
      const f=new File([blob],`s_${Date.now()}.jpg`,{type:'image/jpeg'})
      setPhoto(URL.createObjectURL(blob));setUploading(true)
      const r=await dispatch(uploadAttendancePhoto({file:f,type}))
      if(uploadAttendancePhoto.fulfilled.match(r))setUrl(r.payload.photo_url)
      setUploading(false);sRef.current?.getTracks().forEach(t=>t.stop())
    },'image/jpeg',0.85)
  }
  const confirm=async()=>{
    await dispatch(type==='checkin'?checkIn({photo_url:url,...loc,device:navigator.userAgent}):checkOut({photo_url:url,...loc,device:navigator.userAgent}))
    dispatch(fetchAttendanceToday());onClose()
  }
  return (
    <Modal isOpen={true} onClose={onClose} title={type==='checkin'?'Check In':'Check Out'} size="md">
      <div className="space-y-4">
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
          {photo?<img src={photo} alt="" className="w-full h-full object-cover"/>:<video ref={vRef} autoPlay playsInline muted className="w-full h-full object-cover"/>}
          {loc.latitude&&<div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full">📍 {loc.latitude?.toFixed(4)}, {loc.longitude?.toFixed(4)}</div>}
          {uploading&&<div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 size={28} className="animate-spin text-white"/></div>}
        </div>
        <canvas ref={cRef} className="hidden"/>
        <div className="flex gap-3">
          {photo?(
            <>
              <button onClick={()=>{setPhoto(null);setUrl(null);navigator.mediaDevices?.getUserMedia({video:{facingMode:'user'}}).then(s=>{sRef.current=s;if(vRef.current)vRef.current.srcObject=s})}} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600">↩ Retake</button>
              <Button onClick={confirm} disabled={!url||uploading} loading={loading.action} className="flex-1"><CheckCircle2 size={15}/> Confirm</Button>
            </>
          ):(
            <Button onClick={capture} className="flex-1">📸 Take Selfie</Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

function ManualModal({ dispatch, onClose }) {
  const {user}=useSelector(s=>s.auth)
  const today=todayStr()
  const nowHHMM=()=>{const d=new Date();return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`}
  const [form,setForm]=useState({date:today,status:'present',check_in_time:nowHHMM(),check_out_time:'',reason:''})
  const [saving,setSaving]=useState(false),[err,setErr]=useState('')
  const set=(k,v)=>setForm(f=>({...f,[k]:v}))
  const toISO=t=>t?new Date(`${form.date}T${t}:00`).toISOString():undefined
  const save=async()=>{
    setErr('');if(['present','late','half_day'].includes(form.status)&&!form.check_in_time){setErr('Check-in time required');return}
    setSaving(true)
    const r=await dispatch(manualAttendanceEntry({user_id:user?.id,date:form.date,status:form.status,check_in_time:toISO(form.check_in_time),check_out_time:form.check_out_time?toISO(form.check_out_time):undefined,reason:form.reason||undefined}))
    setSaving(false)
    if(manualAttendanceEntry.fulfilled.match(r)){dispatch(fetchAttendanceToday());onClose()}
    else setErr(r.payload||'Failed')
  }
  return (
    <Modal isOpen={true} onClose={onClose} title="Log Attendance" size="md"
      footer={<><button onClick={onClose} className="px-5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500">Cancel</button><Button onClick={save} loading={saving} icon={CheckCircle2}>Save</Button></>}>
      <div className="space-y-4">
        {err&&<div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3"><AlertCircle size={13} className="text-red-500"/><p className="text-sm text-red-600">{err}</p></div>}
        <div className="flex items-center gap-2.5 px-3 py-2.5 bg-gray-100 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-xl opacity-70">
          <div className="w-7 h-7 rounded-full bg-[#0082f3] flex items-center justify-center"><span className="text-white text-[10px] font-bold">{user?.first_name?.[0]}{user?.last_name?.[0]}</span></div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{user?.first_name} {user?.last_name}</span>
          <span className="ml-auto text-[10px] text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full capitalize">{(user?.role||'').replace(/_/g,' ')}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs font-medium text-gray-500 mb-1.5 block">Date</label><input type="date" value={form.date} max={today} onChange={e=>set('date',e.target.value)} className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-[#0082f3] text-gray-700 dark:text-gray-300"/></div>
          <CustomSelect label="Status *" value={form.status} onChange={v=>set('status',v)} options={ATT_STATUS_OPTS.map(o=>({value:o.value,label:o.label}))}/>
        </div>
        {['present','late','half_day'].includes(form.status)&&(
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-gray-500 mb-1.5 block">Check In *</label><div className="relative"><input type="time" value={form.check_in_time} onChange={e=>set('check_in_time',e.target.value)} className="w-full px-3 py-2.5 pl-9 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-[#0082f3] text-gray-700 dark:text-gray-300"/><LogIn size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none"/></div></div>
            <div><label className="text-xs font-medium text-gray-500 mb-1.5 block">Check Out</label><div className="relative"><input type="time" value={form.check_out_time} onChange={e=>set('check_out_time',e.target.value)} className="w-full px-3 py-2.5 pl-9 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-[#0082f3] text-gray-700 dark:text-gray-300"/><LogOut size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-500 pointer-events-none"/></div></div>
          </div>
        )}
        <div><label className="text-xs font-medium text-gray-500 mb-1.5 block">Reason <span className="font-normal text-gray-400">(optional)</span></label><input type="text" value={form.reason} onChange={e=>set('reason',e.target.value)} placeholder="e.g. WFH…" className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-[#0082f3] text-gray-700 dark:text-gray-300 placeholder-gray-400"/></div>
      </div>
    </Modal>
  )
}

function AttendanceModal({ onClose }) {
  const dispatch=useDispatch()
  const {user}=useSelector(s=>s.auth)
  const {today:td,loading}=useSelector(s=>s.attendance)
  const isAdmin=['super_admin','admin'].includes(user?.role)
  const [mode,setMode]=useState(null)
  useEffect(()=>{dispatch(fetchAttendanceToday())},[dispatch])
  if(mode==='checkin'||mode==='checkout')return<SelfieModal dispatch={dispatch} type={mode} onClose={()=>setMode(null)}/>
  if(mode==='manual')return<ManualModal dispatch={dispatch} onClose={()=>setMode(null)}/>
  const status=td?.status||'absent'
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={onClose}>
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden" style={{width:'80%',maxWidth:460}} onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#0082f3] to-blue-600">
          <div><h3 className="font-semibold text-white text-base">Today's Attendance</h3><p className="text-blue-200 text-xs mt-0.5">{new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</p></div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:bg-white/20"><X size={16}/></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#0082f3] flex items-center justify-center shadow-lg shadow-blue-500/30"><span className="text-white text-sm font-bold">{user?.first_name?.[0]}{user?.last_name?.[0]}</span></div>
            <div className="flex-1"><p className="font-semibold text-gray-900 dark:text-white text-sm">{user?.first_name} {user?.last_name}</p><p className="text-xs text-gray-400 capitalize">{(user?.role||'').replace(/_/g,' ')}</p></div>
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize ${ATT_COLOR[status]||'bg-gray-50 text-gray-500'}`}>{status.replace(/_/g,' ')}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-3.5">
              <div className="flex items-center gap-1.5 mb-1"><LogIn size={13} className="text-emerald-500"/><span className="text-xs text-gray-500">Check In</span></div>
              <p className="text-lg font-bold text-gray-900 dark:text-white font-mono">{td?.is_checked_in?fmtTime(td.check_in_time):'--:--'}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-3.5">
              <div className="flex items-center gap-1.5 mb-1"><LogOut size={13} className="text-rose-500"/><span className="text-xs text-gray-500">Check Out</span></div>
              <p className="text-lg font-bold text-gray-900 dark:text-white font-mono">{td?.is_checked_out?fmtTime(td.check_out_time):'--:--'}</p>
            </div>
          </div>
          {isAdmin?(
            <button onClick={()=>setMode('manual')} className="w-full py-3 rounded-2xl bg-[#0082f3] hover:bg-[#0070d4] text-white font-semibold text-sm flex items-center justify-center gap-2"><Pencil size={15}/> Log My Attendance</button>
          ):(
            <div className="grid grid-cols-2 gap-3">
              <button onClick={()=>setMode('checkin')} disabled={td?.is_checked_in} className={`py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${td?.is_checked_in?'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed':'bg-emerald-500 hover:bg-emerald-600 text-white'}`}><LogIn size={15}/>{td?.is_checked_in?'Checked In ✓':'Check In'}</button>
              <button onClick={()=>setMode('checkout')} disabled={!td?.is_checked_in||td?.is_checked_out} className={`py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${(!td?.is_checked_in||td?.is_checked_out)?'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed':'bg-rose-500 hover:bg-rose-600 text-white'}`}><LogOut size={15}/>{td?.is_checked_out?'Checked Out ✓':'Check Out'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Export Menu (admin only) ─────────────────────────────────────────────────
function ExportMenu({ isAdmin, setShowExportModal, setExportModule, exportingKey }) {
  const [open, setOpen] = useState(false)
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
  const doExport = (key) => { setExportModule(key); setOpen(false); setShowExportModal(true) }
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${open?'border-[#0082f3] text-[#0082f3] bg-blue-50 dark:bg-blue-900/20':'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-[#0082f3] hover:text-[#0082f3]'}`}>
        {exportingKey?<Loader2 size={13} className="animate-spin"/>:<Download size={13}/>}
        Export Data
        <ChevronDown size={12} className={`transition-transform ${open?'rotate-180':''}`}/>
      </button>
      {open&&(
        <div className="absolute right-0 mt-1.5 w-52 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl shadow-black/10 z-50 overflow-hidden py-1">
          <p className="px-4 py-2 text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 mb-1">Download Excel (.xlsx)</p>
          {EXPORTS.map(({ key, label, color }) => (
            <button key={key} onClick={() => doExport(key)} disabled={!!exportingKey}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors disabled:opacity-50 disabled:cursor-wait">
              <Download size={13} className={color}/>
              <span className="text-gray-700 dark:text-gray-300 font-medium">{label}</span>
              {key==='all'&&<span className="ml-auto text-[10px] text-[#0082f3] bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-full font-semibold">All</span>}
              {exportingKey===key&&<Loader2 size={11} className="ml-auto animate-spin text-gray-400"/>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD COMPONENTS (existing, unchanged)
// ══════════════════════════════════════════════════════════════════════════════
function AdminStatCards({ stats, loading, onAttendance }) {
  const navigate = useNavigate()
  const s = stats?.stats
  const cards = [
    { label:'Total Leads', value:s?.total_leads?.value??0, sub:`${s?.total_leads?.booked??0} booked`, badge:s?.total_leads?.conversion_rate?`${s.total_leads.conversion_rate}% conv.`:null, badgeColor:'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20', icon:Users, grad:'from-blue-500 to-[#0082f3]', ring:'hover:ring-blue-100 dark:hover:ring-blue-900', path:'/leads' },
    { label:'Site Visits', value:s?.total_site_visits?.value??0, sub:`${s?.total_site_visits?.upcoming??0} upcoming`, badge:`${s?.total_site_visits?.done??0} done`, badgeColor:'text-purple-600 bg-purple-50 dark:bg-purple-900/20', icon:CalendarDays, grad:'from-purple-500 to-violet-500', ring:'hover:ring-purple-100 dark:hover:ring-purple-900', path:'/site-visits' },
    { label:'Follow-Ups', value:s?.total_follow_ups?.value??0, sub:`${s?.total_follow_ups?.pending??0} pending`, badge:s?.total_follow_ups?.overdue>0?`${s.total_follow_ups.overdue} overdue`:null, badgeColor:'text-red-600 bg-red-50 dark:bg-red-900/20', icon:Phone, grad:'from-green-500 to-teal-500', ring:'hover:ring-green-100 dark:hover:ring-green-900', path:'/follow-ups' },
    { label:'Projects', value:s?.total_projects?.value??0, sub:`${s?.total_projects?.active??0} active`, badge:`${s?.total_projects?.upcoming??0} upcoming`, badgeColor:'text-amber-600 bg-amber-50 dark:bg-amber-900/20', icon:Building2, grad:'from-amber-400 to-orange-500', ring:'hover:ring-amber-100 dark:hover:ring-amber-900', path:'/projects' },
    { label:'Attendance', value:null, isAttendance:true, sub:"Today's status", icon:Clock, grad:'from-rose-400 to-pink-500', ring:'hover:ring-rose-100 dark:hover:ring-rose-900', onClick:onAttendance },
  ]
  if (loading) return <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{[1,2,3,4,5].map(i=><div key={i} className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-gray-100 dark:border-gray-800 animate-pulse h-[108px]"/>)}</div>
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {cards.map((c,i)=>(
        <div key={i} onClick={c.onClick||(()=>navigate(c.path))}
          className={`relative bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-gray-100 dark:border-gray-800 cursor-pointer group transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ring-2 ring-transparent ${c.ring} overflow-hidden`}>
          <div className={`absolute top-0 right-0 w-20 h-20 rounded-full bg-gradient-to-br ${c.grad} opacity-[0.07] -translate-y-4 translate-x-4`}/>
          <div className="flex items-start justify-between mb-2.5">
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${c.grad} flex items-center justify-center shadow-sm`}><c.icon size={15} className="text-white"/></div>
            {c.badge&&<span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${c.badgeColor}`}>{c.badge}</span>}
          </div>
          <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 mb-0.5">{c.label}</p>
          {c.isAttendance?<p className="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-rose-500 transition-colors">Tap to log</p>:<p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{(c.value||0).toLocaleString('en-IN')}</p>}
          {c.sub&&<p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1">{c.sub}</p>}
        </div>
      ))}
    </div>
  )
}

function AdminQuickActions({ navigate }) {
  const actions = [
    { label:'Leads',         icon:Users,         grad:'from-blue-400 to-blue-600',     path:'/leads'         },
    { label:'Site Visits',   icon:CalendarDays,  grad:'from-purple-400 to-violet-600', path:'/site-visits'   },
    { label:'Follow-Ups',    icon:Phone,         grad:'from-green-400 to-teal-500',    path:'/follow-ups'    },
    { label:'Projects',      icon:Building2,     grad:'from-amber-400 to-orange-500',  path:'/projects'      },
    { label:'Team',          icon:UserCheck,     grad:'from-pink-400 to-rose-500',     path:'/team'          },
    { label:'Attendance',    icon:ClipboardList, grad:'from-rose-400 to-red-500',      path:'/attendance'    },
    { label:'Notifications', icon:Bell,          grad:'from-teal-400 to-cyan-500',     path:'/notifications' },
    { label:'Reports',       icon:BarChart3,     grad:'from-indigo-400 to-blue-600',   path:'/attendance'    },
  ]
  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 p-4 h-full flex flex-col">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Quick Access</p>
      <div className="grid grid-cols-2 gap-2 flex-1">
        {actions.map((a,i)=>(
          <button key={i} onClick={()=>navigate(a.path)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 active:scale-[0.98] transition-all group">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${a.grad} flex items-center justify-center shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform duration-150`}><a.icon size={18} className="text-white"/></div>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-left leading-tight">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function UpcomingVisitsCard({ navigate }) {
  const {upcomingSiteVisits,loading}=useSelector(s=>s.dashboard)
  const fmt=t=>{if(!t)return'';const[h,m]=t.split(':');const hr=parseInt(h);return`${hr%12||12}:${m} ${hr>=12?'PM':'AM'}`}
  const STATUS_DOT={scheduled:'bg-gray-400',confirmed:'bg-emerald-500',rescheduled:'bg-amber-500',done:'bg-blue-500',cancelled:'bg-red-500'}
  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Upcoming Visits</p>
        <button onClick={()=>navigate('/site-visits')} className="text-[11px] text-[#0082f3] hover:underline flex items-center gap-0.5">View all<ChevronRight size={11}/></button>
      </div>
      {loading.siteVisits?<div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-11 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"/>)}</div>
      :upcomingSiteVisits.length===0?<div className="flex-1 flex flex-col items-center justify-center gap-2 py-4"><MapPin size={20} className="text-gray-200 dark:text-gray-700"/><p className="text-xs text-gray-400">No upcoming visits</p></div>
      :(
        <div className="space-y-2 flex-1">
          {upcomingSiteVisits.slice(0,5).map((v,i)=>(
            <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <div className="flex-shrink-0"><div className={`w-2 h-2 rounded-full ${STATUS_DOT[v.status]||'bg-gray-400'}`}/></div>
              <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{v.lead_name}</p><p className="text-[10px] text-gray-400 truncate">{v.project_name}</p></div>
              <p className="text-[11px] font-bold text-gray-600 dark:text-gray-400 flex-shrink-0">{fmt(v.visit_time)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AdminRecentActivity({ navigate }) {
  const {recentActivity,loading}=useSelector(s=>s.dashboard)
  const getIcon=(t)=>{
    if(t==='call')return{icon:Phone,col:'text-green-500',bg:'bg-green-50 dark:bg-green-900/20'}
    if(t==='status_change')return{icon:RefreshCw,col:'text-blue-500',bg:'bg-blue-50 dark:bg-blue-900/20'}
    if(t==='done'||t==='booked')return{icon:CheckCircle2,col:'text-emerald-500',bg:'bg-emerald-50 dark:bg-emerald-900/20'}
    if(t==='site_visit'||t==='scheduled')return{icon:CalendarDays,col:'text-purple-500',bg:'bg-purple-50 dark:bg-purple-900/20'}
    return{icon:Activity,col:'text-gray-400',bg:'bg-gray-100 dark:bg-gray-800'}
  }
  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Recent Activity</p>
        <button onClick={()=>navigate('/notifications')} className="text-[11px] text-[#0082f3] hover:underline flex items-center gap-0.5">View all<ChevronRight size={11}/></button>
      </div>
      {loading.activity?<div className="space-y-2">{[1,2,3,4].map(i=><div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"/>)}</div>
      :recentActivity.length===0?<div className="flex-1 flex flex-col items-center justify-center gap-2 py-4"><Activity size={20} className="text-gray-200 dark:text-gray-700"/><p className="text-xs text-gray-400">No recent activity</p></div>
      :(
        <div className="space-y-1.5 flex-1 overflow-hidden">
          {recentActivity.slice(0,7).map((a,i)=>{
            const {icon:Icon,col,bg}=getIcon(a.sub_type)
            return(
              <div key={i} className="flex items-start gap-2.5 px-2 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                <div className={`w-6 h-6 rounded-lg ${bg} flex items-center justify-center flex-shrink-0 mt-0.5`}><Icon size={11} className={col}/></div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-gray-700 dark:text-gray-300 line-clamp-1">{a.message}</p>
                  <p className="text-[10px] text-gray-400">{a.lead_name?`${a.lead_name} · `:''}{timeAgo(a.created_at)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PipelineCard() {
  const {leadPipeline,loading}=useSelector(s=>s.dashboard)
  const stages=leadPipeline?.stages||[]
  const total=Math.max(leadPipeline?.total||1, 1)
  const STAGE_CFG=[
    {label:'Qualified',  color:'#3b82f6', bg:'bg-blue-50 dark:bg-blue-900/20 text-blue-600'},
    {label:'Site Visit', color:'#8b5cf6', bg:'bg-purple-50 dark:bg-purple-900/20 text-purple-600'},
    {label:'Negotiation',color:'#f59e0b', bg:'bg-amber-50 dark:bg-amber-900/20 text-amber-600'},
    {label:'Booking',    color:'#10b981', bg:'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600'},
    {label:'Closed Won', color:'#06b6d4', bg:'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600'},
    {label:'Closed Lost',color:'#ef4444', bg:'bg-red-50 dark:bg-red-900/20 text-red-600'},
  ]
  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <div><p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Lead Pipeline</p><p className="text-[11px] text-gray-400 mt-0.5">Current distribution across stages</p></div>
        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center"><Target size={15} className="text-[#0082f3]"/></div>
      </div>
      {loading.pipeline?<div className="space-y-3">{[1,2,3,4,5,6].map(i=><div key={i} className="h-8 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"/>)}</div>
      :stages.length===0?<div className="flex flex-col items-center justify-center py-8 gap-2"><Target size={28} className="text-gray-200 dark:text-gray-700"/><p className="text-xs text-gray-400">No pipeline data yet</p></div>
      :(
        <div className="space-y-2.5">
          {STAGE_CFG.map((cfg,i)=>{
            const stage=stages.find(s=>s.label===cfg.label)||{value:0}
            const pct=Math.min(100,Math.round((stage.value/total)*100))
            return(
              <div key={i} className="flex items-center gap-3">
                <span className={`text-[11px] font-medium px-2 py-1 rounded-lg min-w-[88px] text-center flex-shrink-0 ${cfg.bg}`}>{cfg.label}</span>
                <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{width:`${pct||0}%`,backgroundColor:cfg.color}}/></div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 min-w-[24px] text-right">{stage.value}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function LeadSourcesCard() {
  const {leadSources,loading}=useSelector(s=>s.dashboard)
  const all=leadSources?.sources||[]
  const chart=all.filter(s=>s.count>0)
  const total=leadSources?.total||0
  const CustomTooltip=({active,payload})=>{
    if(active&&payload?.length){const d=payload[0].payload;return(<div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 shadow-xl text-xs"><p className="font-semibold text-gray-800 dark:text-gray-200">{d.source}</p><p className="text-gray-500">{d.count} leads · {d.percentage}%</p></div>)}
    return null
  }
  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <div><p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Lead Sources</p><p className="text-[11px] text-gray-400 mt-0.5">{total>0?`${total} total leads · distribution`:' Distribution by source'}</p></div>
        <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center"><Zap size={15} className="text-purple-600"/></div>
      </div>
      {loading.leadSources?<div className="h-44 flex items-center justify-center"><Loader2 size={20} className="animate-spin text-[#0082f3]"/></div>
      :chart.length===0?<div className="flex flex-col items-center justify-center py-6 gap-2"><Zap size={28} className="text-gray-200 dark:text-gray-700"/><p className="text-xs text-gray-400">No source data yet</p></div>
      :(
        <div className="flex items-center gap-4">
          <div className="w-36 h-36 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={chart} cx="50%" cy="50%" innerRadius={36} outerRadius={58} paddingAngle={2} dataKey="count" nameKey="source">{chart.map((e,i)=><Cell key={i} fill={e.color||'#cbd5e1'} stroke="none"/>)}</Pie><Tooltip content={<CustomTooltip/>}/></PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1.5">
            {all.filter(s=>s.count>0).slice(0,8).map((s,i)=>(
              <div key={i} className="flex items-center gap-1.5 min-w-0">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:s.color||'#cbd5e1'}}/>
                <span className="text-[10px] text-gray-600 dark:text-gray-400 truncate">{s.source}</span>
                <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 ml-auto flex-shrink-0">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RevenueCard() {
  const dispatch=useDispatch()
  const [tf,setTf]=useState('Month')
  const {revenueTrend,loading}=useSelector(s=>s.dashboard)
  useEffect(()=>{dispatch(fetchRevenueTrend({range:tf.toLowerCase()}))},[dispatch,tf])
  const data=(revenueTrend?.data||[]).map(d=>({name:d.label,leads:d.total_leads,booked:d.booked||0}))
  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <div><p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Lead Trend</p><p className="text-[11px] text-gray-400 mt-0.5">{tf==='Week'?'Daily (last 7 days)':tf==='Year'?'Monthly this year':'Daily this month'}</p></div>
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 gap-0.5">
          {['Week','Month','Year'].map(t=><button key={t} onClick={()=>setTf(t)} className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${tf===t?'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm':'text-gray-500 dark:text-gray-400'}`}>{t}</button>)}
        </div>
      </div>
      <div className="h-44">
        {loading.revenue?<div className="h-full flex items-center justify-center"><Loader2 size={18} className="animate-spin text-[#0082f3]"/></div>
        :data.length===0?<div className="h-full flex flex-col items-center justify-center gap-2"><TrendingUp size={28} className="text-gray-200 dark:text-gray-700"/><p className="text-xs text-gray-400">No data for this period</p></div>
        :(
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{top:2,right:4,left:-24,bottom:0}} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false}/>
              <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false}/>
              <Tooltip contentStyle={{backgroundColor:'#fff',border:'1px solid #f1f5f9',borderRadius:'10px',fontSize:'11px',boxShadow:'0 4px 24px rgba(0,0,0,0.08)'}} cursor={{fill:'rgba(0,130,243,0.04)'}}/>
              <Bar dataKey="leads" name="Total Leads" fill="#0082f3" radius={[4,4,0,0]} maxBarSize={32}/>
              <Bar dataKey="booked" name="Booked" fill="#10b981" radius={[4,4,0,0]} maxBarSize={32}/>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#0082f3]"/><span className="text-[10px] text-gray-500">Total Leads</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-500"/><span className="text-[10px] text-gray-500">Booked</span></div>
      </div>
    </div>
  )
}

function CommissionCard() {
  const s=useSelector(x=>x.dashboard)?.stats?.stats
  const metrics=[
    {label:'Booked Leads',    value:s?.total_leads?.booked??'—',     icon:'🏆',color:'text-emerald-600'},
    {label:'Conversion Rate', value:s?.total_leads?.conversion_rate?`${s.total_leads.conversion_rate}%`:'—', icon:'📈',color:'text-blue-600'},
    {label:'Active Projects', value:s?.total_projects?.active??'—',  icon:'🏗️', color:'text-amber-600'},
    {label:'Visits Done',     value:s?.total_site_visits?.done??'—', icon:'✅', color:'text-purple-600'},
  ]
  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div><p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Performance</p><p className="text-[11px] text-gray-400 mt-0.5">Key metrics snapshot</p></div>
        <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center"><TrendingUp size={15} className="text-emerald-600"/></div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 flex-1">
        {metrics.map((m,i)=>(
          <div key={i} className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3">
            <p className="text-lg mb-0.5">{m.icon}</p>
            <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PERSONAL DASHBOARD (sales_manager / sales_executive / external_caller)
// ══════════════════════════════════════════════════════════════════════════════
function PersonalDashboard({ user, onAttendance }) {
  const navigate  = useNavigate()
  const dispatch  = useDispatch()
  const [summary, setSummary]  = useState(null)
  const [activities, setActivities] = useState([])
  const [mySiteVisits, setMySiteVisits] = useState([])
  const [loading, setLoading]  = useState(true)

  const isSalesManager = user?.role === 'sales_manager'

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const [sumRes, actRes, svRes] = await Promise.all([
          api.get('/me/summary'),
          api.get('/me/activities', { params: { limit: 8 } }),
          api.get('/me/site-visits', { params: { per_page: 5, page: 1 } }),
        ])
        setSummary(sumRes.data.data)
        setActivities(actRes.data.data || [])
        setMySiteVisits(svRes.data.data || [])
      } catch (e) {
        console.error('Personal dashboard load failed', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const L  = summary?.leads        || {}
  const V  = summary?.site_visits  || {}
  const T  = summary?.tasks        || {}
  const AT = summary?.attendance_this_month || {}

  // ── Stat cards ──────────────────────────────────────────────────────────────
  const statCards = [
    {
      label: 'My Leads', value: L.total ?? 0,
      sub: `${L.booked ?? 0} booked`,
      badge: L.conversion_rate ? `${L.conversion_rate}% conv.` : null,
      badgeColor: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
      icon: Users, grad: 'from-blue-500 to-[#0082f3]',
      ring: 'hover:ring-blue-100 dark:hover:ring-blue-900', path: '/leads',
    },
    {
      label: 'Site Visits', value: V.total ?? 0,
      sub: `${V.upcoming ?? 0} upcoming`,
      badge: `${V.done ?? 0} done`,
      badgeColor: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
      icon: CalendarDays, grad: 'from-purple-500 to-violet-500',
      ring: 'hover:ring-purple-100 dark:hover:ring-purple-900', path: '/site-visits',
    },
    {
      label: 'Follow-Ups', value: T.total ?? 0,
      sub: `${T.pending ?? 0} pending`,
      badge: T.overdue > 0 ? `${T.overdue} overdue` : null,
      badgeColor: 'text-red-600 bg-red-50 dark:bg-red-900/20',
      icon: PhoneCall, grad: 'from-green-500 to-teal-500',
      ring: 'hover:ring-green-100 dark:hover:ring-green-900', path: '/follow-ups',
    },
    {
      label: 'Attendance', value: null, isAttendance: true,
      sub: `${AT.present ?? 0} days present`,
      icon: Clock, grad: 'from-rose-400 to-pink-500',
      ring: 'hover:ring-rose-100 dark:hover:ring-rose-900', onClick: onAttendance,
    },
    {
      label: 'Notifications', value: summary?.notifications?.unread ?? 0,
      sub: 'unread',
      icon: Bell, grad: 'from-amber-400 to-orange-500',
      ring: 'hover:ring-amber-100 dark:hover:ring-amber-900', path: '/notifications',
    },
  ]

  // ── Quick actions (role-scoped) ─────────────────────────────────────────────
  const quickActions = [
    { label: 'Leads',         icon: Users,         grad: 'from-blue-400 to-blue-600',     path: '/leads'         },
    { label: 'Follow-Ups',    icon: PhoneCall,      grad: 'from-green-400 to-teal-500',    path: '/follow-ups'    },
    { label: 'Site Visits',   icon: CalendarDays,   grad: 'from-purple-400 to-violet-600', path: '/site-visits'   },
    { label: 'Attendance',    icon: ClipboardList,  grad: 'from-rose-400 to-red-500',      path: '/attendance'    },
    { label: 'Notifications', icon: Bell,           grad: 'from-teal-400 to-cyan-500',     path: '/notifications' },
    ...(isSalesManager ? [
      { label: 'Team',        icon: UserCheck,      grad: 'from-pink-400 to-rose-500',     path: '/team'          },
    ] : []),
  ]

  // ── Pipeline bars from personal summary ─────────────────────────────────────
  const pipelineStages = [
    { label: 'New',                  value: L.new ?? 0,                  color: '#6366f1' },
    { label: 'Contacted',            value: L.contacted ?? 0,            color: '#3b82f6' },
    { label: 'Interested',           value: L.interested ?? 0,           color: '#8b5cf6' },
    { label: 'Follow-up',            value: L.follow_up ?? 0,            color: '#f59e0b' },
    { label: 'Site Visit Scheduled', value: L.site_visit_scheduled ?? 0, color: '#06b6d4' },
    { label: 'Site Visit Done',      value: L.site_visit_done ?? 0,      color: '#10b981' },
    { label: 'Negotiation',          value: L.negotiation ?? 0,          color: '#f97316' },
    { label: 'Booked',               value: L.booked ?? 0,               color: '#22c55e' },
    { label: 'Lost',                 value: L.lost ?? 0,                 color: '#ef4444' },
  ]
  const totalLeads = Math.max(L.total || 1, 1)

  const getActivityIcon = (type) => {
    if (type === 'call')          return { icon: PhoneCall,    col: 'text-green-500',   bg: 'bg-green-50 dark:bg-green-900/20' }
    if (type === 'status_change') return { icon: RefreshCw,    col: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-900/20' }
    if (type === 'note')          return { icon: BookOpen,     col: 'text-gray-500',    bg: 'bg-gray-100 dark:bg-gray-800' }
    if (type === 'email')         return { icon: Bell,         col: 'text-purple-500',  bg: 'bg-purple-50 dark:bg-purple-900/20' }
    return { icon: Activity, col: 'text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' }
  }

  const fmt = t => { if(!t)return''; const[h,m]=t.split(':'); const hr=parseInt(h); return`${hr%12||12}:${m} ${hr>=12?'PM':'AM'}` }
  const STATUS_DOT = { scheduled:'bg-gray-400', confirmed:'bg-emerald-500', rescheduled:'bg-amber-500', done:'bg-blue-500', cancelled:'bg-red-500' }

  if (loading) return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{[1,2,3,4,5].map(i=><div key={i} className="h-[108px] bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 animate-pulse"/>)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">{[1,2,3].map(i=><div key={i} className="h-64 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 animate-pulse"/>)}</div>
    </div>
  )

  return (
    <div className="space-y-3">

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {statCards.map((c, i) => (
          <div key={i} onClick={c.onClick || (() => navigate(c.path))}
            className={`relative bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-gray-100 dark:border-gray-800 cursor-pointer group transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ring-2 ring-transparent ${c.ring} overflow-hidden`}>
            <div className={`absolute top-0 right-0 w-20 h-20 rounded-full bg-gradient-to-br ${c.grad} opacity-[0.07] -translate-y-4 translate-x-4`}/>
            <div className="flex items-start justify-between mb-2.5">
              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${c.grad} flex items-center justify-center shadow-sm`}><c.icon size={15} className="text-white"/></div>
              {c.badge && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${c.badgeColor}`}>{c.badge}</span>}
            </div>
            <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 mb-0.5">{c.label}</p>
            {c.isAttendance
              ? <p className="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-rose-500 transition-colors">Tap to log</p>
              : <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{(c.value || 0).toLocaleString('en-IN')}</p>}
            {c.sub && <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1">{c.sub}</p>}
          </div>
        ))}
      </div>

      {/* Row 2: Quick Actions + Upcoming Visits + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Quick Actions */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex flex-col">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Quick Access</p>
          <div className="grid grid-cols-2 gap-2 flex-1">
            {quickActions.map((a, i) => (
              <button key={i} onClick={() => navigate(a.path)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 active:scale-[0.98] transition-all group">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${a.grad} flex items-center justify-center shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform duration-150`}><a.icon size={18} className="text-white"/></div>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-left leading-tight">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* My Upcoming Site Visits */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">My Upcoming Visits</p>
            <button onClick={() => navigate('/site-visits')} className="text-[11px] text-[#0082f3] hover:underline flex items-center gap-0.5">View all<ChevronRight size={11}/></button>
          </div>
          {mySiteVisits.length === 0
            ? <div className="flex-1 flex flex-col items-center justify-center gap-2 py-4"><MapPin size={20} className="text-gray-200 dark:text-gray-700"/><p className="text-xs text-gray-400">No upcoming visits</p></div>
            : (
              <div className="space-y-2 flex-1">
                {mySiteVisits.slice(0, 5).map((v, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex-shrink-0"><div className={`w-2 h-2 rounded-full ${STATUS_DOT[v.status] || 'bg-gray-400'}`}/></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{v.lead_name || 'Lead'}</p>
                      <p className="text-[10px] text-gray-400 truncate">{v.project_name || '—'}</p>
                    </div>
                    <p className="text-[11px] font-bold text-gray-600 dark:text-gray-400 flex-shrink-0">{v.visit_date ? new Date(v.visit_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : '—'}</p>
                  </div>
                ))}
              </div>
            )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">My Recent Activity</p>
            <button onClick={() => navigate('/notifications')} className="text-[11px] text-[#0082f3] hover:underline flex items-center gap-0.5">View all<ChevronRight size={11}/></button>
          </div>
          {activities.length === 0
            ? <div className="flex-1 flex flex-col items-center justify-center gap-2 py-4"><Activity size={20} className="text-gray-200 dark:text-gray-700"/><p className="text-xs text-gray-400">No recent activity</p></div>
            : (
              <div className="space-y-1.5 flex-1 overflow-hidden">
                {activities.slice(0, 7).map((a, i) => {
                  const { icon: Icon, col, bg } = getActivityIcon(a.type)
                  return (
                    <div key={i} className="flex items-start gap-2.5 px-2 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <div className={`w-6 h-6 rounded-lg ${bg} flex items-center justify-center flex-shrink-0 mt-0.5`}><Icon size={11} className={col}/></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-gray-700 dark:text-gray-300 line-clamp-1">{a.note || a.message || 'Activity'}</p>
                        <p className="text-[10px] text-gray-400">{timeAgo(a.created_at)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
        </div>
      </div>

      {/* Row 3: Personal Pipeline + Performance snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* My Pipeline */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <div><p className="text-sm font-semibold text-gray-800 dark:text-gray-200">My Lead Pipeline</p><p className="text-[11px] text-gray-400 mt-0.5">{L.total ?? 0} total leads assigned to me</p></div>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center"><Target size={15} className="text-[#0082f3]"/></div>
          </div>
          {(L.total ?? 0) === 0
            ? <div className="flex flex-col items-center justify-center py-8 gap-2"><Target size={28} className="text-gray-200 dark:text-gray-700"/><p className="text-xs text-gray-400">No leads assigned yet</p></div>
            : (
              <div className="space-y-2.5">
                {pipelineStages.filter(s => s.value > 0).map((stage, i) => {
                  const pct = Math.min(100, Math.round((stage.value / totalLeads) * 100))
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400 min-w-[140px]">{stage.label}</span>
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: stage.color }}/></div>
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300 min-w-[24px] text-right">{stage.value}</span>
                    </div>
                  )
                })}
              </div>
            )}
        </div>

        {/* Personal performance snapshot */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div><p className="text-sm font-semibold text-gray-800 dark:text-gray-200">My Performance</p><p className="text-[11px] text-gray-400 mt-0.5">This month's snapshot</p></div>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center"><Star size={15} className="text-emerald-600"/></div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 flex-1">
            {[
              { icon: '🏆', label: 'Booked',         value: L.booked ?? 0,            color: 'text-emerald-600' },
              { icon: '📈', label: 'Conversion',      value: `${L.conversion_rate ?? 0}%`, color: 'text-blue-600' },
              { icon: '✅', label: 'Visits Done',     value: V.done ?? 0,              color: 'text-purple-600' },
              { icon: '📞', label: 'Tasks Done',      value: T.completed ?? 0,         color: 'text-teal-600' },
              { icon: '⏰', label: 'Pending Tasks',   value: T.pending ?? 0,           color: 'text-amber-600' },
              { icon: '🗓️', label: 'Days Present',    value: AT.present ?? 0,          color: 'text-indigo-600' },
            ].map((m, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3">
                <p className="text-base mb-0.5">{m.icon}</p>
                <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const dispatch  = useDispatch()
  const navigate  = useNavigate()
  const { loading } = useSelector(s => s.dashboard)
  const { user }    = useSelector(s => s.auth)
  const { stats }   = useSelector(s => s.dashboard)

  const [showAtt,        setShowAtt]        = useState(false)
  const [showExportModal,setShowExportModal] = useState(false)
  const [exportModule,   setExportModule]   = useState('all')
  const [exportingKey,   setExportingKey]   = useState(null)

  const isAdmin = ['super_admin', 'admin'].includes(user?.role)

  useEffect(() => {
    if (isAdmin) {
      dispatch(fetchDashboardStats())
      dispatch(fetchLeadSources())
      dispatch(fetchLeadPipeline())
      dispatch(fetchRecentActivity({ limit: 10 }))
      dispatch(fetchUpcomingSiteVisits({ limit: 5 }))
      dispatch(fetchRevenueTrend({ range: 'month' }))
    }
  }, [dispatch, isAdmin])

  const handleExportSubmit = async (dateRange) => {
    try {
      setExportingKey(exportModule)
      const params = { ...dateRange }
      const res = await api.get(`/export/${exportModule}`, { params, responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url; a.download = `${exportModule.replace('-','_')}_${dateRange.from}_to_${dateRange.to}.xlsx`
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
      setShowExportModal(false)
    } catch (err) { console.error(`Export ${exportModule} failed:`, err) }
    finally { setExportingKey(null) }
  }

  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' })()

  return (
    <div className="space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">{greeting}, {user?.first_name} 👋</h1>
          <p className="text-xs text-gray-400 mt-0.5">{new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
        </div>
        {isAdmin && (
          <ExportMenu isAdmin={isAdmin} setShowExportModal={setShowExportModal} setExportModule={setExportModule} exportingKey={exportingKey}/>
        )}
      </div>

      {/* Role-split content */}
      {isAdmin ? (
        <>
          <AdminStatCards stats={stats} loading={loading.stats} onAttendance={() => setShowAtt(true)}/>
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
            <div className="lg:col-span-2"><AdminQuickActions navigate={navigate}/></div>
            <div className="lg:col-span-2"><UpcomingVisitsCard navigate={navigate}/></div>
            <div className="lg:col-span-2"><AdminRecentActivity navigate={navigate}/></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <PipelineCard/><LeadSourcesCard/>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2"><RevenueCard/></div>
            <CommissionCard/>
          </div>
        </>
      ) : (
        <PersonalDashboard user={user} onAttendance={() => setShowAtt(true)}/>
      )}

      {showAtt && <AttendanceModal onClose={() => setShowAtt(false)}/>}

      <ExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)}
        onExport={handleExportSubmit} loading={!!exportingKey}
        title={`Export ${exportModule.replace('-',' ')}`}/>
    </div>
  )
}