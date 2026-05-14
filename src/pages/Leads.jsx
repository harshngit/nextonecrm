import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Eye, Edit2, UserCheck, RefreshCw, Trash2, MapPin, Download, ArrowRightCircle, CalendarPlus, PhoneCall, Loader2, AlertCircle, CheckCircle2, Upload, FileSpreadsheet, X, Users } from 'lucide-react'
import { fetchLeads, fetchMyLeads, createLead, updateLead, deleteLead, fetchLeadSources, clearLeadError } from '../store/leadSlice'
import { fetchProjects } from '../store/projectSlice'
import { fetchUsers } from '../store/userSlice'
import ListSkeleton from '../components/loaders/ListSkeleton'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import api from '../api/axios'
import Avatar from '../components/ui/Avatar'
import Modal from '../components/ui/Modal'
import ExportModal from '../components/ui/ExportModal'
import CustomSelect from '../components/ui/CustomSelect'
import ClockPicker from '../components/ui/ClockPicker'
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
const stageOptions = leadStages

const defaultSources = [
  { id: 'facebook', name: 'Facebook' },
  { id: 'instagram', name: 'Instagram' },
  { id: 'google_ads', name: 'Google Ads' },
  { id: 'youtube', name: 'YouTube' },
  { id: 'linkedin', name: 'LinkedIn' },
  { id: 'whatsapp', name: 'WhatsApp' },
  { id: 'twitter', name: 'Twitter / X' },
  { id: 'website', name: 'Website' },
  { id: 'ivr', name: 'IVR' },
  { id: 'walkin', name: 'Walk-in' },
  { id: 'referral', name: 'Referral' },
  { id: '99acres', name: '99acres' },
  { id: 'housing', name: 'Housing.com' },
  { id: 'magicbricks', name: 'MagicBricks' },
  { id: 'nobroker', name: 'NoBroker' },
]

const defaultForm = {
  name: '', phone: '', alternate_phone_number: '', email: '',
  source: '', source_id: '', project_id: '',
  assigned_to: '', budget: '', location_preference: '',
  notes: '', status: 'New',
}

// ─── LeadForm defined OUTSIDE component to prevent remount on every render ───
// This is the fix for the typing bug — defining a component inside another
// component causes React to treat it as a new component on every render,
// unmounting and remounting it, which kills input focus.
function LeadForm({ formData, setFormData, isEdit, sourceList, salesExecs }) {
  const inputClass = "w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm transition-all duration-200"
  const labelClass = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"

  const sourceOptions = sourceList.map(s => ({ value: s.id, label: s.name }))
  const execOptions = salesExecs.map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name}` }))

  return (
    <div className="space-y-4">
      {/* Name + Phone */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Full Name *</label>
          <input
            required
            value={formData.name}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Suresh Patel"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Phone *</label>
          <input
            required
            value={formData.phone}
            onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="+919876543210"
            className={inputClass}
          />
        </div>
      </div>

      {/* Alt Phone + Email */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Alternate Phone</label>
          <input
            value={formData.alternate_phone_number}
            onChange={e => setFormData(prev => ({ ...prev, alternate_phone_number: e.target.value }))}
            placeholder="+919876543211"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="suresh.patel@gmail.com"
            className={inputClass}
          />
        </div>
      </div>

      {/* Budget + Location */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Budget</label>
          <input
            value={formData.budget}
            onChange={e => setFormData(prev => ({ ...prev, budget: e.target.value }))}
            placeholder="80-100L"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Finding Location</label>
          <div className="relative">
            <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={formData.location_preference}
              onChange={e => setFormData(prev => ({ ...prev, location_preference: e.target.value }))}
              placeholder="Andheri West"
              className={inputClass + ' pl-8'}
            />
          </div>
        </div>
      </div>

      {/* Source + Status */}
      <div className={`grid gap-3 ${isEdit ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <CustomSelect
          label="Lead Source"
          value={formData.source_id || formData.source}
          onChange={val => {
            const selected = sourceList.find(s => s.id === val)
            setFormData(prev => ({
              ...prev,
              source_id: selected?.id || val,
              source: selected?.name || val,
            }))
          }}
          options={sourceOptions}
          placeholder="Select Platform"
        />
        {isEdit && (
          <CustomSelect
            label="Stage"
            value={formData.status}
            onChange={val => setFormData(prev => ({ ...prev, status: val }))}
            options={stageOptions}
          />
        )}
      </div>

      {/* Assign To */}
      <div className="grid grid-cols-1">
        <CustomSelect
          label="Assign To"
          value={formData.assigned_to}
          onChange={val => setFormData(prev => ({ ...prev, assigned_to: val }))}
          options={execOptions}
          placeholder="Select team member"
        />
      </div>

      {/* Configuration */}
      <div>
        <label className={labelClass}>Configuration</label>
        <textarea
          rows={3}
          value={formData.notes}
          onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Client is looking for 2BHK in a gated community. Ready for site visit next week."
          className={inputClass}
        />
      </div>
    </div>
  )
}


// ─── Bulk Upload Modal ────────────────────────────────────────────────────────
function BulkUploadModal({ onClose, onSuccess, salesExecs = [] }) {
  const [step,       setStep]      = useState('upload')  // upload | result
  const [file,       setFile]      = useState(null)
  const [dragging,   setDragging]  = useState(false)
  const [uploading,  setUploading] = useState(false)
  const [dlding,     setDlding]    = useState(false)
  const [error,      setError]     = useState('')
  const [result,     setResult]    = useState(null)

  // Pre-upload assignment (sent with the file to the API)
  const [assignTo,   setAssignTo]  = useState('')
  const [assignReason, setAssignReason] = useState('')

  const fileRef = useRef(null)

  const downloadTemplate = async () => {
    try {
      setDlding(true)
      const r = await api.get('/leads/bulk/template', { responseType: 'blob' })
      const u = URL.createObjectURL(r.data)
      const a = document.createElement('a'); a.href = u; a.download = 'Lead_Bulk_Upload_Template.xlsx'
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u)
    } catch { setError('Failed to download template') } finally { setDlding(false) }
  }

  const handleFile = (f) => {
    if (!f) return
    const ok = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    if (!ok.includes(f.type)) { setError('Only .xlsx or .xls files are allowed'); return }
    if (f.size > 10 * 1024 * 1024) { setError('File must be under 10 MB'); return }
    setError(''); setFile(f)
  }

  const handleUpload = async () => {
    if (!file) { setError('Please select a file first'); return }
    setError(''); setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      // Pass assign_to UUID so the API assigns every imported lead immediately
      if (assignTo) fd.append('assign_to', assignTo)

      const r = await api.post('/leads/bulk/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(r.data.data)
      setStep('result')
    } catch (e) {
      setError(e.response?.data?.message || 'Upload failed. Check your file.')
    } finally { setUploading(false) }
  }

  const downloadResult = async () => {
    if (!result?.resultFile) return
    const fname = result.resultFile.split('/').pop()
    try {
      const r = await api.get(`/leads/bulk/result/${fname}`, { responseType: 'blob' })
      const u = URL.createObjectURL(r.data)
      const a = document.createElement('a'); a.href = u; a.download = fname
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u)
    } catch { setError('Failed to download result file') }
  }

  const assignedUser = salesExecs.find(u => u.id === assignTo)

  return (
    <Modal isOpen={true} onClose={onClose} title="Bulk Upload Leads" size="md">
      {step === 'upload' ? (
        <div className="space-y-4">

          {/* Step 1 — Download template */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/40">
            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">1</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Download the template</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Template has real project names &amp; team members from your system.
                You can also fill the <span className="font-semibold">Assign To</span> column per-row in Excel.
              </p>
              <button onClick={downloadTemplate} disabled={dlding}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-60 transition-colors">
                {dlding ? <Loader2 size={12} className="animate-spin"/> : <Download size={12}/>}
                {dlding ? 'Downloading…' : 'Download Template (.xlsx)'}
              </button>
            </div>
          </div>

          {/* Step 2 — Upload file */}
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-gray-500">2</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Select your filled Excel</p>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]) }}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                  dragging ? 'border-brand bg-brand/5'
                  : file    ? 'border-green-400 bg-green-50 dark:bg-green-900/10'
                            : 'border-gray-200 dark:border-gray-700 hover:border-brand hover:bg-brand/5'
                }`}>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
                  onChange={e => handleFile(e.target.files?.[0])}/>
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <FileSpreadsheet size={18} className="text-green-600"/>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{file.name}</p>
                      <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button type="button" onClick={e => { e.stopPropagation(); setFile(null) }}
                      className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 hover:bg-red-100 hover:text-red-500 transition-colors">
                      <X size={12}/>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-11 h-11 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-2">
                      <Upload size={18} className="text-gray-400"/>
                    </div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Drag & drop your Excel file here</p>
                    <p className="text-xs text-gray-400 mt-0.5">or click to browse · .xlsx / .xls · max 10 MB</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Step 3 — Assign leads (optional, overrides Excel column) */}
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">3</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Assign all leads to <span className="font-normal text-gray-400">(optional)</span>
              </p>
              <p className="text-xs text-gray-500 mb-2">
                Overrides the Assign To column in Excel — all leads go to this person.
                Leave empty to use per-row assignment from Excel or keep unassigned.
              </p>
              <CustomSelect
                value={assignTo}
                onChange={setAssignTo}
                options={salesExecs.map(u => ({
                  value: u.id,
                  label: `${u.first_name} ${u.last_name} · ${u.role.replace(/_/g, ' ')}`,
                }))}
                placeholder="Select team member (optional)"
              />
              {assignTo && (
                <div className="mt-2 flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 rounded-xl px-3 py-2">
                  <Users size={12} className="text-indigo-500 flex-shrink-0"/>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400">
                    All imported leads will be assigned to <span className="font-semibold">{assignedUser?.first_name} {assignedUser?.last_name}</span>
                  </p>
                  <button onClick={() => setAssignTo('')} className="ml-auto text-indigo-400 hover:text-indigo-600">
                    <X size={11}/>
                  </button>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0"/>
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={handleUpload} loading={uploading}
              disabled={!file || uploading} icon={!uploading ? Upload : undefined}>
              {uploading ? 'Uploading…' : assignTo ? `Upload & Assign to ${assignedUser?.first_name}` : 'Upload & Import'}
            </Button>
          </div>
        </div>

      ) : (
        /* ── Result screen ── */
        <div className="space-y-4">

          {/* Success header */}
          <div className="flex flex-col items-center gap-2 py-2">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
              result?.errors === 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-amber-50 dark:bg-amber-900/20'
            }`}>
              <CheckCircle2 size={28} className={result?.errors === 0 ? 'text-green-500' : 'text-amber-500'}/>
            </div>
            <p className="text-base font-bold text-gray-900 dark:text-white">Upload Complete</p>
            <p className="text-xs text-gray-400">
              {result?.inserted} of {result?.total} leads imported
              {result?.summary?.insertedLeads?.filter(l => l.assigned_to).length > 0 &&
                ` · ${result.summary.insertedLeads.filter(l => l.assigned_to).length} assigned`}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Inserted', val: result?.inserted, c: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
              { label: 'Skipped',  val: result?.skipped,  c: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
              { label: 'Errors',   val: result?.errors,   c: 'text-red-600 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-900/20' },
            ].map(x => (
              <div key={x.label} className={`rounded-xl px-4 py-3 text-center ${x.bg}`}>
                <p className={`text-2xl font-bold ${x.c}`}>{x.val ?? 0}</p>
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mt-0.5">{x.label}</p>
              </div>
            ))}
          </div>

          {/* Assignment summary */}
          {result?.inserted > 0 && (() => {
            const assignedCount   = result?.summary?.insertedLeads?.filter(l => l.assigned_to).length || 0
            const unassignedCount = (result?.inserted || 0) - assignedCount
            return assignedCount > 0 ? (
              <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                  <Users size={14} className="text-indigo-600 dark:text-indigo-400"/>
                </div>
                <div>
                  <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                    {assignedCount} lead{assignedCount > 1 ? 's' : ''} assigned
                    {assignedUser ? ` to ${assignedUser.first_name} ${assignedUser.last_name}` : ''}
                  </p>
                  {unassignedCount > 0 && (
                    <p className="text-[10px] text-indigo-400">{unassignedCount} left unassigned</p>
                  )}
                </div>
              </div>
            ) : null
          })()}

          {/* Sample errors */}
          {result?.summary?.errors?.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/40 rounded-xl p-3">
              <p className="text-xs font-semibold text-red-600 mb-1.5">Sample errors:</p>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {result.summary.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-500">Row {e.row}: {e.error}</p>
                ))}
              </div>
            </div>
          )}

          {/* Skipped */}
          {result?.summary?.skipped?.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/40 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-600 mb-1.5">Skipped (duplicate phones):</p>
              <div className="space-y-1 max-h-16 overflow-y-auto">
                {result.summary.skipped.map((s, i) => (
                  <p key={i} className="text-xs text-amber-500">Row {s.row}: {s.phone}</p>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {result?.resultFile && (
              <Button variant="outline" className="flex-1" icon={Download} onClick={downloadResult}>
                Download Result
              </Button>
            )}
            <Button className="flex-1" onClick={() => { onSuccess(); onClose() }}>
              Done
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}


// ─── Single Reassign Modal (uses /leads/:id/reassign) ─────────────────────────
function ReassignModal({ lead, salesExecs, onClose, onSuccess }) {
  const [assignTo,setAssignTo]=useState(lead?.assigned_to?.id||(typeof lead?.assigned_to==='string'?lead.assigned_to:''))
  const [reason,setReason]=useState('')
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const [success,setSuccess]=useState('')
  const IC="w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm"
  const LC="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
  const curName=typeof lead?.assigned_to==='object'?lead.assigned_to?.full_name:salesExecs.find(u=>u.id===lead?.assigned_to)?`${salesExecs.find(u=>u.id===lead.assigned_to).first_name} ${salesExecs.find(u=>u.id===lead.assigned_to).last_name}`:'Unassigned'
  const submit=async(e)=>{e.preventDefault();if(!assignTo){setError('Please select a team member');return}setError('');setLoading(true)
    try{await api.patch(`/leads/${lead.id}/reassign`,{assigned_to:assignTo,reason:reason||undefined});setSuccess('Reassigned!');setTimeout(()=>{onSuccess();onClose()},700)}
    catch(e){setError(e.response?.data?.message||'Reassignment failed')}finally{setLoading(false)}}
  return (
    <Modal isOpen={true} onClose={onClose} title="Reassign Lead">
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-[#111] border border-gray-100 dark:border-gray-800">
          <Avatar name={lead?.name} size="sm"/>
          <div><p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{lead?.name}</p><p className="text-xs text-gray-400">{lead?.phone}</p></div>
          <div className="ml-auto text-right"><p className="text-[10px] text-gray-400">Currently assigned to</p><p className="text-xs font-medium text-gray-600 dark:text-gray-300">{curName}</p></div>
        </div>
        <CustomSelect label="Assign To *" value={assignTo} onChange={setAssignTo} options={salesExecs.map(u=>({value:u.id,label:`${u.first_name} ${u.last_name} · ${u.role.replace(/_/g,' ')}`}))} placeholder="Select team member"/>
        <div><label className={LC}>Reason <span className="font-normal text-gray-400">(optional)</span></label><input value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. Better territorial alignment" className={IC}/></div>
        {error&&<div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5"><AlertCircle size={13} className="text-red-500"/><p className="text-xs text-red-600">{error}</p></div>}
        {success&&<div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-2.5"><CheckCircle2 size={13} className="text-green-500"/><p className="text-xs text-green-600">{success}</p></div>}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" loading={loading} disabled={!assignTo}>Reassign</Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Bulk Reassign Modal (uses /leads/bulk-reassign) ──────────────────────────
function BulkReassignModal({ leadIds, leads, salesExecs, onClose, onSuccess }) {
  const [assignTo,setAssignTo]=useState('')
  const [reason,setReason]=useState('')
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const [result,setResult]=useState(null)
  const IC="w-full px-3 py-2 text-sm bg-background border border-[#e2e8f0] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100 shadow-sm"
  const LC="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
  const sel=leads.filter(l=>leadIds.includes(l.id))
  const submit=async(e)=>{e.preventDefault();if(!assignTo){setError('Please select a team member');return}setError('');setLoading(true)
    try{const r=await api.post('/leads/bulk-reassign',{lead_ids:leadIds,assigned_to:assignTo,reason:reason||undefined});setResult(r.data.data)}
    catch(e){setError(e.response?.data?.message||'Bulk reassignment failed')}finally{setLoading(false)}}
  if(result) return (
    <Modal isOpen={true} onClose={()=>{onSuccess();onClose()}} title="Reassignment Complete">
      <div className="space-y-4 py-2">
        <div className="flex flex-col items-center gap-2"><div className="w-14 h-14 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center"><CheckCircle2 size={28} className="text-green-500"/></div><p className="text-base font-bold text-gray-900 dark:text-white">Done!</p></div>
        <div className="grid grid-cols-3 gap-3">
          {[{label:'Reassigned',val:result.successful,c:'text-green-600 dark:text-green-400',bg:'bg-green-50 dark:bg-green-900/20'},{label:'Skipped',val:result.skipped,c:'text-amber-600 dark:text-amber-400',bg:'bg-amber-50 dark:bg-amber-900/20'},{label:'Requested',val:result.totalRequested,c:'text-brand',bg:'bg-brand/5'}].map(x=>(
            <div key={x.label} className={`rounded-xl px-3 py-3 text-center ${x.bg}`}><p className={`text-2xl font-bold ${x.c}`}>{x.val??0}</p><p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mt-0.5">{x.label}</p></div>
          ))}
        </div>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-[#111] border border-gray-100 dark:border-gray-800">
          <Avatar name={result.newAssignee?.name} size="sm"/>
          <div><p className="text-xs text-gray-400">Assigned to</p><p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{result.newAssignee?.name}</p></div>
        </div>
        <Button className="w-full" onClick={()=>{onSuccess();onClose()}}>Done</Button>
      </div>
    </Modal>
  )
  return (
    <Modal isOpen={true} onClose={onClose} title={`Reassign ${leadIds.length} Lead${leadIds.length>1?'s':''}`}>
      <form onSubmit={submit} className="space-y-4">
        <div className="bg-gray-50 dark:bg-[#111] rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3">
          <p className="text-xs font-semibold text-gray-500 mb-2">{leadIds.length} lead{leadIds.length>1?'s':''} selected</p>
          <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
            {sel.slice(0,8).map(l=><span key={l.id} className="text-[10px] font-medium px-2 py-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">{l.name}</span>)}
            {sel.length>8&&<span className="text-[10px] text-gray-400 px-2 py-1">+{sel.length-8} more</span>}
          </div>
        </div>
        <CustomSelect label="Assign To *" value={assignTo} onChange={setAssignTo} options={salesExecs.map(u=>({value:u.id,label:`${u.first_name} ${u.last_name} · ${u.role.replace(/_/g,' ')}`}))} placeholder="Select team member"/>
        <div><label className={LC}>Reason <span className="font-normal text-gray-400">(optional)</span></label><input value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. Workload balancing" className={IC}/></div>
        {error&&<div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5"><AlertCircle size={13} className="text-red-500"/><p className="text-xs text-red-600">{error}</p></div>}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" loading={loading} disabled={!assignTo}>Reassign {leadIds.length} Lead{leadIds.length>1?'s':''}</Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Bulk Convert Modal (for selected leads) ─────────────────────────────────

function BulkConvertLeadModal({ leadIds, leads, onClose, onSuccess }) {
  const [step, setStep]         = useState('choose')
  const [converting, setConverting] = useState(false)
  const [error, setError]       = useState('')
  const [results, setResults]   = useState(null)

  const { list: projectList }   = useSelector(s => s.projects)
  const { list: userList }      = useSelector(s => s.users)
  const salesExecs = userList.filter(u => ['sales_executive','sales_manager'].includes(u.role) && u.is_active)

  const [fuForm, setFuForm] = useState({ title_suffix: 'Follow-up', due_date: '', due_time: '10:00', priority: 'medium', assigned_to: '', notes: '' })
  const [svForm, setSvForm] = useState({ project_id: '', visit_date: '', visit_time: '10:00', assigned_to: '', transport_arranged: false, notes: '' })

  const inputCls = "w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-[#0082f3] text-gray-700 dark:text-gray-300 transition-colors placeholder-gray-400"
  const labelCls = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5"
  const projectOpts = projectList.map(p => ({ value: p.id, label: `${p.name}${p.city ? ` · ${p.city}` : ''}` }))
  const userOpts    = salesExecs.map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name}` }))
  const priorityOpts = [{ value:'low', label:'Low' }, { value:'medium', label:'Medium' }, { value:'high', label:'High' }]

  const selectedLeadNames = leads.filter(l => leadIds.includes(l.id))

  const handleBulkFollowUp = async () => {
    setError('')
    if (!fuForm.due_date) { setError('Due date is required'); return }
    setConverting(true)
    const due_date = new Date(`${fuForm.due_date}T${fuForm.due_time}:00`).toISOString()
    const settled = await Promise.allSettled(
      leadIds.map(id => {
        const lead = leads.find(l => l.id === id)
        return api.post(`/convert/lead/${id}/to-follow-up`, {
          title: `${fuForm.title_suffix} — ${lead?.name || ''}`.trim(),
          due_date,
          priority:    fuForm.priority,
          assigned_to: fuForm.assigned_to || undefined,
          notes:       fuForm.notes || undefined,
        })
      })
    )
    setConverting(false)
    const ok  = settled.filter(r => r.status === 'fulfilled').length
    const err = settled.filter(r => r.status === 'rejected').length
    setResults({ ok, err, type: 'follow_up' })
  }

  const handleBulkSiteVisit = async () => {
    setError('')
    if (!svForm.project_id)  { setError('Project is required'); return }
    if (!svForm.visit_date)  { setError('Visit date is required'); return }
    if (!svForm.visit_time)  { setError('Visit time is required'); return }
    setConverting(true)
    const settled = await Promise.allSettled(
      leadIds.map(id =>
        api.post(`/convert/lead/${id}/to-site-visit`, {
          project_id:        svForm.project_id,
          visit_date:        svForm.visit_date,
          visit_time:        svForm.visit_time,
          assigned_to:       svForm.assigned_to || undefined,
          transport_arranged: Boolean(svForm.transport_arranged),
          notes:             svForm.notes || undefined,
        })
      )
    )
    setConverting(false)
    const ok  = settled.filter(r => r.status === 'fulfilled').length
    const err = settled.filter(r => r.status === 'rejected').length
    setResults({ ok, err, type: 'site_visit' })
  }

  if (results) {
    return (
      <Modal isOpen={true} onClose={() => onSuccess(results.type)} title="Conversion Complete" size="sm">
        <div className="py-4 text-center space-y-4">
          <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${results.err === 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
            <CheckCircle2 size={28} className={results.err === 0 ? 'text-emerald-500' : 'text-amber-500'} />
          </div>
          <div>
            <p className="text-base font-bold text-gray-900 dark:text-white">
              {results.ok} of {leadIds.length} converted
            </p>
            {results.err > 0 && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{results.err} failed (already booked/lost)</p>}
          </div>
          <button onClick={() => onSuccess(results.type)}
            className="w-full py-2.5 rounded-xl bg-[#0082f3] text-white text-sm font-semibold">Done</button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={true} onClose={onClose}
      title={step === 'choose' ? `Convert ${leadIds.length} Lead${leadIds.length > 1 ? 's' : ''}` : step === 'follow_up' ? 'Bulk → Follow-Up' : 'Bulk → Site Visit'}
      size="md"
    >
      {step === 'choose' ? (
        <div className="space-y-4">
          {/* Selected leads preview */}
          <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
              {leadIds.length} lead{leadIds.length > 1 ? 's' : ''} selected
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
              {selectedLeadNames.slice(0, 8).map(l => (
                <span key={l.id} className="text-[10px] font-medium px-2 py-1 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300">{l.name}</span>
              ))}
              {selectedLeadNames.length > 8 && <span className="text-[10px] text-gray-400 px-2 py-1">+{selectedLeadNames.length - 8} more</span>}
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Choose what to convert these leads into:</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { setStep('follow_up'); setError('') }}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-gray-100 dark:border-gray-800 hover:border-[#0082f3] hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm shadow-green-500/30">
                <PhoneCall size={20} className="text-white" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Follow-Up</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Create a task for each lead</p>
              </div>
            </button>
            <button onClick={() => { setStep('site_visit'); setError('') }}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-gray-100 dark:border-gray-800 hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 to-violet-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm shadow-purple-500/30">
                <CalendarPlus size={20} className="text-white" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Site Visit</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Schedule a visit for each lead</p>
              </div>
            </button>
          </div>
        </div>
      ) : step === 'follow_up' ? (
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Follow-up Title <span className="text-gray-400 font-normal">(name will be appended)</span></label>
            <input type="text" value={fuForm.title_suffix} onChange={e => setFuForm(f => ({...f, title_suffix: e.target.value}))}
              placeholder="Follow-up" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Due Date *</label>
              <input type="date" value={fuForm.due_date} onChange={e => setFuForm(f => ({...f, due_date: e.target.value}))}
                min={new Date().toISOString().split('T')[0]} className={inputCls} />
            </div>
            <div>
              <ClockPicker label="Due Time" value={fuForm.due_time} onChange={v => setFuForm(f => ({...f, due_time: v}))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <CustomSelect label="Priority" value={fuForm.priority} onChange={v => setFuForm(f => ({...f, priority: v}))} options={priorityOpts} />
            <CustomSelect label="Assign To" value={fuForm.assigned_to} onChange={v => setFuForm(f => ({...f, assigned_to: v}))} options={userOpts} placeholder="Keep current" />
          </div>
          <div>
            <label className={labelCls}>Notes <span className="font-normal text-gray-400">(optional)</span></label>
            <textarea rows={2} value={fuForm.notes} onChange={e => setFuForm(f => ({...f, notes: e.target.value}))}
              placeholder="Any additional context…" className={inputCls + ' resize-none'} />
          </div>
          {error && <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5"><AlertCircle size={13} className="text-red-500"/><p className="text-xs text-red-600">{error}</p></div>}
          <div className="flex gap-3 pt-1">
            <button onClick={() => { setStep('choose'); setError('') }} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500">← Back</button>
            <button onClick={handleBulkFollowUp} disabled={converting}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
              {converting ? <><Loader2 size={14} className="animate-spin"/> Converting {leadIds.length}…</> : <><PhoneCall size={14}/> Create {leadIds.length} Follow-Up{leadIds.length > 1 ? 's' : ''}</>}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <CustomSelect label="Project *" value={svForm.project_id} onChange={v => setSvForm(f => ({...f, project_id: v}))} options={projectOpts} placeholder="Select project" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Visit Date *</label>
              <input type="date" value={svForm.visit_date} onChange={e => setSvForm(f => ({...f, visit_date: e.target.value}))}
                min={new Date().toISOString().split('T')[0]} className={inputCls} />
            </div>
            <div>
              <ClockPicker label="Visit Time *" value={svForm.visit_time} onChange={v => setSvForm(f => ({...f, visit_time: v}))} required />
            </div>
          </div>
          <CustomSelect label="Assign To" value={svForm.assigned_to} onChange={v => setSvForm(f => ({...f, assigned_to: v}))} options={userOpts} placeholder="Keep current" />
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800 cursor-pointer"
            onClick={() => setSvForm(f => ({...f, transport_arranged: !f.transport_arranged}))}>
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors flex-shrink-0 ${svForm.transport_arranged ? 'bg-[#0082f3] border-[#0082f3]' : 'border-gray-300 dark:border-gray-600'}`}>
              {svForm.transport_arranged && <CheckCircle2 size={12} className="text-white"/>}
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Transport Arranged</p>
          </div>
          <div>
            <label className={labelCls}>Notes <span className="font-normal text-gray-400">(optional)</span></label>
            <textarea rows={2} value={svForm.notes} onChange={e => setSvForm(f => ({...f, notes: e.target.value}))}
              placeholder="Any special instructions…" className={inputCls + ' resize-none'} />
          </div>
          {error && <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5"><AlertCircle size={13} className="text-red-500"/><p className="text-xs text-red-600">{error}</p></div>}
          <div className="flex gap-3 pt-1">
            <button onClick={() => { setStep('choose'); setError('') }} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500">← Back</button>
            <button onClick={handleBulkSiteVisit} disabled={converting}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
              {converting ? <><Loader2 size={14} className="animate-spin"/> Converting {leadIds.length}…</> : <><CalendarPlus size={14}/> Schedule {leadIds.length} Visit{leadIds.length > 1 ? 's' : ''}</>}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function Leads() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { list, loading, pagination, sources, actionLoading, actionError,
          myList, myLoading, myPagination } = useSelector(s => s.leads)
  const { list: userList } = useSelector(s => s.users)
  const { user: currentUser } = useSelector(s => s.auth)

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [filterAssigned, setFilterAssigned] = useState('')
  const [page, setPage] = useState(1)

  const isSalesManager = currentUser?.role === 'sales_manager'
  const [leadsTab, setLeadsTab] = useState('team') // 'my' | 'team'
  const [myPage,   setMyPage]   = useState(1)

  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showReassignModal,     setShowReassignModal]     = useState(false)
  const [showBulkReassignModal, setShowBulkReassignModal] = useState(false)
  const [showBulkUploadModal,   setShowBulkUploadModal]   = useState(false)
  const [showExportModal,       setShowExportModal]        = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)
  const [addForm, setAddForm] = useState(defaultForm)
  const [editForm, setEditForm] = useState(defaultForm)
  const [reassignTo, setReassignTo] = useState('')
  const [selectedLeads, setSelectedLeads] = useState([])
  const [exporting,  setExporting]  = useState(false)
  const [addSuccess, setAddSuccess] = useState('')
  const [showConvertModal,     setShowConvertModal]     = useState(false)
  const [convertLead,          setConvertLead]          = useState(null)
  const [convertSuccess,       setConvertSuccess]       = useState('')
  const [showBulkConvertModal, setShowBulkConvertModal] = useState(false)
  const [editSuccess, setEditSuccess] = useState('')

  useEffect(() => {
    const params = { page, per_page: 20 }
    if (search)         params.search      = search
    if (filterStatus)   params.status      = filterStatus
    if (filterSource)   params.source_id   = filterSource
    if (filterAssigned) params.assigned_to = filterAssigned
    dispatch(fetchLeads(params))
    // sales_manager also sees their OWN assigned leads via /me/leads
    if (isSalesManager) {
      const myParams = { page: myPage, per_page: 20 }
      if (search)       myParams.search = search
      if (filterStatus) myParams.status = filterStatus
      dispatch(fetchMyLeads(myParams))
    }
  }, [dispatch, search, filterStatus, filterSource, filterAssigned, page, myPage, isSalesManager])

  useEffect(() => {
    dispatch(fetchLeadSources())
    dispatch(fetchUsers())
    dispatch(fetchProjects())
  }, [dispatch])

  const sourceList = sources?.length > 0 ? sources : defaultSources
  const salesExecs = userList.filter(u =>
    ['sales_executive', 'sales_manager', 'external_caller'].includes(u.role) && u.is_active
  )

  const handleAddLead = async (e) => {
    e.preventDefault()
    dispatch(clearLeadError())
    const result = await dispatch(createLead(addForm))
    if (createLead.fulfilled.match(result)) {
      setAddSuccess('Lead created successfully!')
      dispatch(fetchLeads({ page, per_page: 20 }))
      setTimeout(() => { setShowAddModal(false); setAddSuccess(''); setAddForm(defaultForm) }, 800)
    }
  }

  const handleEditLead = async (e) => {
    e.preventDefault()
    dispatch(clearLeadError())
    const result = await dispatch(updateLead({ id: selectedLead.id, leadData: editForm }))
    if (updateLead.fulfilled.match(result)) {
      setEditSuccess('Lead updated!')
      dispatch(fetchLeads({ page, per_page: 20 }))
      setTimeout(() => { setShowEditModal(false); setEditSuccess('') }, 800)
    }
  }

  const handleDeleteLead = async (lead) => {
    if (window.confirm(`Delete lead "${lead.name}"?`)) {
      const result = await dispatch(deleteLead(lead.id))
      if (deleteLead.fulfilled.match(result)) dispatch(fetchLeads({ page, per_page: 20 }))
    }
  }

  const openEdit = (lead) => {
    setSelectedLead(lead)
    setEditForm({
      name: lead.name || '', 
      phone: lead.phone || '', 
      alternate_phone_number: lead.alternate_phone_number || '',
      email: lead.email || '',
      source: lead.source || '', 
      source_id: lead.source_id || '',
      project_id: lead.project_id || '', 
      assigned_to: lead.assigned_to || '',
      budget: lead.budget || '', 
      location_preference: lead.location_preference || '',
      notes: lead.notes || '', 
      status: lead.status || 'New',
    })
    setShowEditModal(true)
  }

  const handleReassign = async (e) => {
    e.preventDefault()
    // Uses new /leads/:id/reassign API for audit trail
    const result = await dispatch(updateLead({ id: selectedLead.id, leadData: { assigned_to: reassignTo } }))
    if (updateLead.fulfilled.match(result)) {
      dispatch(fetchLeads({ page, per_page: 20 }))
      setShowReassignModal(false)
    }
  }

  const toggleSelect = (id) =>
    setSelectedLeads(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  const toggleAll = () =>
    setSelectedLeads(selectedLeads.length === list.length && list.length > 0 ? [] : list.map(l => l.id))

  const canEdit      = ['super_admin', 'admin', 'sales_manager', 'sales_executive'].includes(currentUser?.role)
  const canDelete    = ['super_admin', 'admin'].includes(currentUser?.role)
  const canReassign  = ['super_admin', 'admin', 'sales_manager'].includes(currentUser?.role)
  const canBulkUpload = ['super_admin', 'admin', 'sales_manager'].includes(currentUser?.role)

  const handleExport = async (dateRange) => {
    try {
      setExporting(true)
      const params = { ...dateRange }
      if (filterStatus) params.status = filterStatus
      if (filterSource) params.source = filterSource
      const res = await api.get('/export/leads', { params, responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a'); a.href = url; a.download = `Leads_${dateRange.from}_to_${dateRange.to}.xlsx`
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
      setShowExportModal(false)
    } catch (err) { console.error('Export failed:', err) } finally { setExporting(false) }
  }

  const handleBulkConvertSuccess = (type) => {
    setShowBulkConvertModal(false)
    setSelectedLeads([])
    setConvertSuccess(type === 'follow_up' ? `${selectedLeads.length} follow-ups created!` : `${selectedLeads.length} site visits scheduled!`)
    dispatch(fetchLeads({ page, per_page: 20 }))
    setTimeout(() => setConvertSuccess(''), 3000)
  }

  const handleConvertSuccess = (type) => {
    setShowConvertModal(false)
    setConvertLead(null)
    setConvertSuccess(type === 'follow_up' ? 'Lead converted to follow-up!' : 'Site visit scheduled!')
    dispatch(fetchLeads({ page, per_page: 20 }))
    setTimeout(() => setConvertSuccess(''), 3000)
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search leads..."
              className="pl-9 pr-4 py-2 text-sm bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-blue-100/50 dark:shadow-blue-900/20 rounded-xl outline-none focus:border-brand w-52 text-gray-900 dark:text-gray-100 placeholder-gray-400"
            />
          </div>
          <div className="w-44">
            <CustomSelect
              value={filterStatus}
              onChange={val => { setFilterStatus(val); setPage(1) }}
              options={[{ value: '', label: 'All Status' }, ...stageOptions]}
              placeholder="All Status"
            />
          </div>
          <div className="w-44">
            <CustomSelect
              value={filterSource}
              onChange={val => { setFilterSource(val); setPage(1) }}
              options={[{ value: '', label: 'All Sources' }, ...sourceList.map(s => ({ value: s.id, label: s.name }))]}
              placeholder="All Sources"
            />
          </div>
          <div className="w-44">
            <CustomSelect
              value={filterAssigned}
              onChange={val => { setFilterAssigned(val); setPage(1) }}
              options={[{ value: '', label: 'All Team' }, ...salesExecs.map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name}` }))]}
              placeholder="All Team"
            />
          </div>
          <button
            onClick={() => dispatch(fetchLeads({ page, per_page: 20 }))}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 text-gray-400 hover:text-brand hover:border-brand transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canBulkUpload && (
            <Button variant="outline" size="sm" icon={Upload} onClick={() => setShowBulkUploadModal(true)}>
              Bulk Upload
            </Button>
          )}
          <Button variant="outline" size="sm" icon={Download} loading={exporting} disabled={exporting} onClick={() => setShowExportModal(true)}>
            Export
          </Button>
          {canEdit && (
            <Button icon={Plus} onClick={() => {
              const r = ['sales_executive','external_caller'].includes(currentUser?.role)
              setAddForm({ ...defaultForm, assigned_to: r ? currentUser?.id : '' })
              dispatch(clearLeadError()); setShowAddModal(true)
            }}>
              Add Lead
            </Button>
          )}
        </div>
      </div>

      {/* Sales Manager tab switcher — My Leads vs Team Leads */}
      {isSalesManager && (
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-[#111] rounded-xl w-fit">
          <button onClick={() => setLeadsTab('my')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${leadsTab === 'my' ? 'bg-white dark:bg-[#1a1a1a] text-brand shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
            My Leads
            {myPagination?.total > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand/10 text-brand">{myPagination.total}</span>}
          </button>
          <button onClick={() => setLeadsTab('team')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${leadsTab === 'team' ? 'bg-white dark:bg-[#1a1a1a] text-brand shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
            Team Leads
            {pagination?.total > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand/10 text-brand">{pagination.total}</span>}
          </button>
        </div>
      )}

      {/* Summary row + inline selection actions */}
      {!(isSalesManager ? (leadsTab === 'my' ? myLoading : loading) : loading) && (
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-gray-500 dark:text-[#888]">
            {(() => {
              const activeList = isSalesManager && leadsTab === 'my' ? myList : list
              const activePag  = isSalesManager && leadsTab === 'my' ? myPagination : pagination
              return <>Showing <span className="font-semibold text-gray-900 dark:text-white">{activeList.length}</span>
                {activePag?.total > 0 && <> of <span className="font-semibold text-gray-900 dark:text-white">{activePag.total}</span></>} leads</>
            })()}
          </div>

          {/* Inline bulk-action pills — only visible when rows are checked */}
          {selectedLeads.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {selectedLeads.length} selected
              </span>
              {canEdit && (
                <button onClick={() => setShowBulkConvertModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.97]">
                  <ArrowRightCircle size={13} /> Convert {selectedLeads.length}
                </button>
              )}
              {canReassign && (
                <button onClick={() => setShowBulkReassignModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.97]">
                  <Users size={13} /> Reassign {selectedLeads.length}
                </button>
              )}
              <button onClick={() => setSelectedLeads([])}
                className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Table — uses activeList/activePag based on role + tab */}
      {(({ activeList, activeLoading, activePag, activePage, setActivePage }) => (<>
      <div className="bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-blue-100/50 dark:shadow-blue-900/20 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-200">
        {activeLoading ? (
          <div className="p-4"><ListSkeleton rows={8} /></div>
        ) : activeList.length === 0 ? (
          <div className="py-16 text-center text-gray-400 dark:text-[#888]">
            <Search size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
            <p className="font-medium">No leads found</p>
            <p className="text-sm mt-1">Try adjusting your filters or add a new lead</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-blue-50/50 dark:bg-blue-900/10">
                  <th className="py-3 pl-4 pr-2 w-8">
                    <input type="checkbox"
                      checked={selectedLeads.length === list.length && list.length > 0}
                      onChange={toggleAll} className="rounded border-gray-300 text-[#0082f3] focus:ring-[#0082f3]" />
                  </th>
                  {['Lead', 'Phone', 'Source', ...(isSalesManager && leadsTab === 'my' ? [] : ['Assigned']), 'Status', 'Finding Location', 'Actions'].map(h => (
                    <th key={h} className={`py-3 px-3 text-left text-xs font-medium text-blue-900/70 dark:text-blue-200/70 uppercase tracking-wide whitespace-nowrap
                      ${['Phone', 'Source', 'Assigned'].includes(h) ? 'hidden md:table-cell' : ''}
                      ${['Finding Location'].includes(h) ? 'hidden xl:table-cell' : ''}
                      ${h === 'Actions' ? 'text-right' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {activeList.map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-[#0f0f0f] transition-colors">
                    <td className="py-3 pl-4 pr-2">
                      <input type="checkbox" checked={selectedLeads.includes(lead.id)}
                        onChange={() => toggleSelect(lead.id)} className="rounded border-gray-300" />
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={lead.name} size="sm" />
                        <div>
                          <div 
                            className="font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:text-brand transition-colors"
                            onClick={() => navigate(`/leads/${lead.id}`)}
                          >
                            {lead.name}
                          </div>
                          <div className="text-xs text-gray-400">{lead.budget ? `₹ ${lead.budget}` : lead.email || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">
                      <div className="flex flex-col">
                        <span>{lead.phone}</span>
                        {lead.alternate_phone_number && (
                          <span className="text-[10px] text-gray-400">Alt: {lead.alternate_phone_number}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 hidden md:table-cell">
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400">
                        {lead.source_name || lead.source || '—'}
                      </span>
                    </td>
                    {!(isSalesManager && leadsTab === 'my') && (
                      <td className="py-3 px-3 hidden md:table-cell">
                        {lead.assigned_name ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar name={lead.assigned_name} size="xs" />
                            <span className="text-xs text-gray-600 dark:text-gray-400">{lead.assigned_name}</span>
                          </div>
                        ) : <span className="text-xs text-gray-400">Unassigned</span>}
                      </td>
                    )}
                    <td className="py-3 px-3"><Badge label={lead.status || 'New'} /></td>
                    <td className="py-3 px-3 text-xs text-gray-400 hidden xl:table-cell">
                      {lead.location_preference || '—'}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`/leads/${lead.id}`)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand hover:bg-brand/10 transition-all hover:scale-110 active:scale-95" title="View Details">
                          <Eye size={16} />
                        </button>
                        {canEdit && (
                          <button onClick={() => { setConvertLead(lead); setShowConvertModal(true) }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors" title="Convert">
                            <ArrowRightCircle size={14} />
                          </button>
                        )}
                        {canEdit && (
                          <button onClick={() => openEdit(lead)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-[#0082f3] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Edit">
                            <Edit2 size={14} />
                          </button>
                        )}
                        {canEdit && (
                          <button onClick={() => { setSelectedLead(lead); setReassignTo(lead.assigned_to || ''); setShowReassignModal(true) }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors" title="Reassign">
                            <UserCheck size={14} />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => handleDeleteLead(lead)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {activePag?.total_pages > 1 && (
        <div className="flex items-center justify-between px-2 text-xs text-gray-500">
          <span>Page {activePage} of {activePag.total_pages} · {activePag.total} total</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={activePage===1} onClick={()=>setActivePage(p=>p-1)}>Prev</Button>
            <Button size="sm" variant="outline" disabled={activePage>=activePag.total_pages} onClick={()=>setActivePage(p=>p+1)}>Next</Button>
          </div>
        </div>
      )}
      </>))({
        activeList:    isSalesManager && leadsTab === 'my' ? myList     : list,
        activeLoading: isSalesManager && leadsTab === 'my' ? myLoading  : loading,
        activePag:     isSalesManager && leadsTab === 'my' ? myPagination : pagination,
        activePage:    isSalesManager && leadsTab === 'my' ? myPage     : page,
        setActivePage: isSalesManager && leadsTab === 'my' ? setMyPage  : setPage,
      })}

      {/* Add Lead Modal */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setAddSuccess('') }} title="Add New Lead" size="lg">
        <form onSubmit={handleAddLead} className="space-y-4">
          <LeadForm formData={addForm} setFormData={setAddForm} isEdit={false} sourceList={sourceList} salesExecs={salesExecs} />
          {addSuccess && <p className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 py-2 text-center rounded-xl">{addSuccess}</p>}
          {actionError && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 py-2 text-center rounded-xl">{actionError}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={actionLoading}>Add Lead</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Lead Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setEditSuccess('') }} title="Edit Lead" size="lg">
        <form onSubmit={handleEditLead} className="space-y-4">
          <LeadForm formData={editForm} setFormData={setEditForm} isEdit={true} sourceList={sourceList} salesExecs={salesExecs} />
          {editSuccess && <p className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 py-2 text-center rounded-xl">{editSuccess}</p>}
          {actionError && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 py-2 text-center rounded-xl">{actionError}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={actionLoading}>Update Lead</Button>
          </div>
        </form>
      </Modal>

      {/* Single Reassign Modal — uses /leads/:id/reassign API with reason + audit trail */}
      {showReassignModal && selectedLead && (
        <ReassignModal
          lead={selectedLead}
          salesExecs={salesExecs}
          onClose={() => { setShowReassignModal(false); setSelectedLead(null) }}
          onSuccess={() => dispatch(fetchLeads({ page, per_page: 20 }))}
        />
      )}

      {/* Bulk Reassign Modal — uses /leads/bulk-reassign API */}
      {showBulkReassignModal && (
        <BulkReassignModal
          leadIds={selectedLeads}
          leads={list}
          salesExecs={salesExecs}
          onClose={() => setShowBulkReassignModal(false)}
          onSuccess={() => { setSelectedLeads([]); dispatch(fetchLeads({ page, per_page: 20 })) }}
        />
      )}

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <BulkUploadModal
          salesExecs={salesExecs}
          onClose={() => setShowBulkUploadModal(false)}
          onSuccess={() => { dispatch(fetchLeads({ page: 1, per_page: 20 })); if (isSalesManager) dispatch(fetchMyLeads({ page: 1, per_page: 20 })); setPage(1) }}
        />
      )}

            {/* Convert Success Toast */}
      {convertSuccess && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-500 text-white px-5 py-3 rounded-2xl shadow-xl shadow-emerald-500/30 animate-in slide-in-from-bottom-2">
          <CheckCircle2 size={16}/> {convertSuccess}
        </div>
      )}

      {/* Bulk Convert Modal */}
      {showBulkConvertModal && (
        <BulkConvertLeadModal
          leadIds={selectedLeads}
          leads={list}
          onClose={() => setShowBulkConvertModal(false)}
          onSuccess={handleBulkConvertSuccess}
        />
      )}

      {/* Convert Lead Modal */}
      {showConvertModal && convertLead && (
        <ConvertLeadModal
          lead={convertLead}
          onClose={() => { setShowConvertModal(false); setConvertLead(null) }}
          onSuccess={handleConvertSuccess}
        />
      )}

      {/* Export Modal */}
      <ExportModal 
        isOpen={showExportModal} 
        onClose={() => setShowExportModal(false)} 
        onExport={handleExport} 
        loading={exporting}
        title="Export Leads"
      />
    </div>
  )
}