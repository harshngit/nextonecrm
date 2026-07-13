import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Info, Palette, Plus, ArrowUp, ArrowDown, Check, X, Edit2, Trash2 } from 'lucide-react'
import { fetchLeadStatuses, addLeadStatus, updateLeadStatusConfig, deleteLeadStatus, reorderLeadStatuses } from '../../store/leadSlice'
import Button from '../ui/Button'
import Modal from '../ui/Modal'

const slugify = str => str.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')

// ─── Lead Status Management Modal ────────────────────────────────────────────
export default function LeadStatusManagementModal({ isOpen, onClose }) {
  const dispatch = useDispatch()
  const { statuses, actionLoading } = useSelector(s => s.leads)
  const [error, setError] = useState('')

  // Form for new status
  const [newStatus, setNewStatus] = useState({ label: '', color: '#6b7280' })
  const newStatusKey = slugify(newStatus.label)

  // Inline editing
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ key: '', label: '', color: '', is_active: true, sort_order: 0 })

  useEffect(() => {
    if (isOpen) dispatch(fetchLeadStatuses(true))
  }, [isOpen, dispatch])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newStatus.label.trim() || !newStatusKey) return
    setError('')
    const res = await dispatch(addLeadStatus({
      key: newStatusKey,
      label: newStatus.label.trim(),
      color: newStatus.color,
      sort_order: (statuses[statuses.length - 1]?.sort_order || 0) + 1
    }))
    if (addLeadStatus.fulfilled.match(res)) {
      setNewStatus({ label: '', color: '#6b7280' })
    } else {
      setError(res.payload || 'Failed to add status')
    }
  }

  const handleUpdate = async (id) => {
    if (!editForm.label.trim() || !editForm.key) return
    setError('')
    const res = await dispatch(updateLeadStatusConfig({
      id,
      statusData: {
        key:        editForm.key,
        label:      editForm.label.trim(),
        color:      editForm.color,
        is_active:  editForm.is_active,
        sort_order: editForm.sort_order,
      }
    }))
    if (updateLeadStatusConfig.fulfilled.match(res)) {
      setEditingId(null)
    } else {
      setError(res.payload || 'Failed to update status')
    }
  }

  const handleDelete = async (id, isSystem) => {
    if (isSystem) {
      alert('System statuses cannot be deleted. You can deactivate them instead.')
      return
    }
    if (!window.confirm('Delete this status? This will fail if leads are currently using it.')) return
    setError('')
    const res = await dispatch(deleteLeadStatus(id))
    if (!deleteLeadStatus.fulfilled.match(res)) {
      setError(res.payload || 'Delete failed. It might be in use.')
    }
  }

  const handleMove = async (index, direction) => {
    const newOrder = [...statuses]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newOrder.length) return

    // Swap
    const temp = newOrder[index]
    newOrder[index] = newOrder[targetIndex]
    newOrder[targetIndex] = temp

    // Update sort_order based on new array positions
    const payload = newOrder.map((s, i) => ({ id: s.id, sort_order: i + 1 }))
    const res = await dispatch(reorderLeadStatuses(payload))
    if (!reorderLeadStatuses.fulfilled.match(res)) {
      setError('Failed to reorder')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Pipeline Statuses" size="lg">
      <div className="space-y-6">

        {/* Add New Status */}
        <div className="bg-gray-50 dark:bg-gray-800/40 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Add Custom Status</p>
          <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-start">
            <div className="flex-1 min-w-[200px]">
              <input
                value={newStatus.label}
                onChange={e => setNewStatus(s => ({ ...s, label: e.target.value }))}
                placeholder="e.g. Warm Lead"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-brand"
              />
              {newStatusKey && (
                <p className="text-[10px] text-gray-400 mt-1 pl-0.5">Key: <span className="font-mono text-gray-500 dark:text-gray-400">{newStatusKey}</span></p>
              )}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
              <Palette size={14} className="text-gray-400" />
              <input
                type="color"
                value={newStatus.color}
                onChange={e => setNewStatus(s => ({ ...s, color: e.target.value }))}
                className="w-6 h-6 rounded cursor-pointer bg-transparent border-none"
              />
            </div>
            <Button type="submit" loading={actionLoading} disabled={!newStatus.label.trim() || !newStatusKey} icon={Plus}>Add Status</Button>
          </form>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5">
            <Info size={14} className="text-red-500" />
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Status List */}
        <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-[#1a1a1a]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-10">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status Label</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Badge Preview</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Visibility</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {statuses.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => handleMove(idx, 'up')}
                          disabled={idx === 0 || actionLoading}
                          className="p-0.5 text-gray-400 hover:text-brand disabled:opacity-20"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <span className="text-[10px] font-bold text-gray-400">{s.sort_order}</span>
                        <button
                          onClick={() => handleMove(idx, 'down')}
                          disabled={idx === statuses.length - 1 || actionLoading}
                          className="p-0.5 text-gray-400 hover:text-brand disabled:opacity-20"
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {editingId === s.id ? (
                        <div>
                          <input
                            autoFocus
                            value={editForm.label}
                            onChange={e => setEditForm(f => ({ ...f, label: e.target.value, key: slugify(e.target.value) }))}
                            className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-800 border border-brand rounded-lg outline-none"
                          />
                          {editForm.key && (
                            <p className="text-[10px] text-gray-400 mt-1 pl-0.5">Key: <span className="font-mono text-gray-500 dark:text-gray-400">{editForm.key}</span></p>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span className={`font-semibold ${s.is_active ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}>
                            {s.label}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">{s.key}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-3">
                        {editingId === s.id ? (
                          <input
                            type="color"
                            value={editForm.color}
                            onChange={e => setEditForm(f => ({ ...f, color: e.target.value }))}
                            className="w-6 h-6 rounded cursor-pointer bg-transparent border-none"
                          />
                        ) : null}
                        <span
                          className="px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-sm"
                          style={{ backgroundColor: editingId === s.id ? editForm.color : (s.color || '#6b7280') }}
                        >
                          {editingId === s.id ? editForm.label : s.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          if (editingId === s.id) {
                            setEditForm(f => ({ ...f, is_active: !f.is_active }))
                          } else {
                            dispatch(updateLeadStatusConfig({
                              id: s.id,
                              statusData: { key: s.key, label: s.label, color: s.color || '#6b7280', sort_order: s.sort_order, is_active: !s.is_active }
                            }))
                          }
                        }}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                          (editingId === s.id ? editForm.is_active : s.is_active)
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500'
                        }`}
                      >
                        {(editingId === s.id ? editForm.is_active : s.is_active) ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {editingId === s.id ? (
                          <>
                            <button onClick={() => handleUpdate(s.id)} className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl transition-colors"><Check size={16}/></button>
                            <button onClick={() => setEditingId(null)} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"><X size={16}/></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => { setEditingId(s.id); setEditForm({ key: s.key, label: s.label, color: s.color || '#6b7280', is_active: s.is_active, sort_order: s.sort_order }) }} className="p-2 text-gray-400 hover:text-brand hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"><Edit2 size={16}/></button>
                            <button onClick={() => handleDelete(s.id, s.is_system)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"><Trash2 size={16}/></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800/30">
          <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
            <span className="font-bold">System statuses</span> cannot be deleted but can be deactivated to hide them from the pipeline.
            Reordering statuses changes their sequence in the pipeline progress bar and selection dropdowns.
          </p>
        </div>
      </div>
    </Modal>
  )
}
