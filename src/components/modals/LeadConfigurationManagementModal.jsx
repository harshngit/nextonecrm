import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Plus, AlertCircle, Check, X, Edit2, Trash2 } from 'lucide-react'
import { fetchLeadConfigurations, addLeadConfiguration, updateLeadConfiguration, deleteLeadConfiguration } from '../../store/leadSlice'
import Button from '../ui/Button'
import Modal from '../ui/Modal'

// ─── Lead Configuration Management Modal ─────────────────────────────────────
export default function LeadConfigurationManagementModal({ isOpen, onClose }) {
  const dispatch = useDispatch()
  const { configurations, actionLoading } = useSelector(s => s.leads)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) dispatch(fetchLeadConfigurations())
  }, [isOpen, dispatch])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setError('')
    const res = await dispatch(addLeadConfiguration(newName.trim()))
    if (addLeadConfiguration.fulfilled.match(res)) {
      setNewName('')
    } else {
      setError(res.payload || 'Failed to add configuration')
    }
  }

  const handleUpdate = async (id) => {
    if (!editName.trim()) return
    setError('')
    const res = await dispatch(updateLeadConfiguration({ id, name: editName.trim() }))
    if (updateLeadConfiguration.fulfilled.match(res)) {
      setEditingId(null)
    } else {
      setError(res.payload || 'Failed to update configuration')
    }
  }

  const toggleStatus = async (config) => {
    setError('')
    const res = await dispatch(updateLeadConfiguration({ id: config.id, is_active: !config.is_active }))
    if (!updateLeadConfiguration.fulfilled.match(res)) {
      setError(res.payload || 'Failed to update status')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure? This may fail if the configuration is in use.')) return
    setError('')
    const res = await dispatch(deleteLeadConfiguration(id))
    if (!deleteLeadConfiguration.fulfilled.match(res)) {
      setError(res.payload || 'Failed to delete. Try deactivating instead.')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Configurations" size="md">
      <div className="space-y-6">
        {/* Add New */}
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="New configuration (e.g. 5BHK)"
            className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-[#0082f3]"
          />
          <Button type="submit" loading={actionLoading} disabled={!newName.trim()} icon={Plus}>Add</Button>
        </form>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2">
            <AlertCircle size={13} className="text-red-500 flex-shrink-0"/>
            <p className="text-[11px] text-red-600">{error}</p>
          </div>
        )}

        {/* List */}
        <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden bg-gray-50/30 dark:bg-gray-900/20">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Configuration</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500">Status</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {configurations.map(c => (
                <tr key={c.id} className="hover:bg-white/50 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3">
                    {editingId === c.id ? (
                      <input
                        autoFocus
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleUpdate(c.id)}
                        className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-[#0082f3] rounded-lg outline-none"
                      />
                    ) : (
                      <span className={`font-medium ${c.is_active ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 italic'}`}>
                        {c.name} {!c.is_active && '(Inactive)'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleStatus(c)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
                        c.is_active
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {c.is_active ? 'Active' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {editingId === c.id ? (
                        <>
                          <button onClick={() => handleUpdate(c.id)} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"><Check size={14}/></button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><X size={14}/></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditingId(c.id); setEditName(c.name) }} className="p-1.5 text-gray-400 hover:text-[#0082f3] hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Edit2 size={14}/></button>
                          <button onClick={() => handleDelete(c.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={14}/></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {configurations.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-400 text-xs italic">No configurations defined yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-gray-400 text-center italic">
          Inactive configurations are hidden from the lead form's Configuration picker but remain on existing leads.
        </p>
      </div>
    </Modal>
  )
}
