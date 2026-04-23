import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, Eye, Edit2, UserCheck, ChevronDown } from 'lucide-react'
import ListSkeleton from '../components/loaders/ListSkeleton'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'
import Modal from '../components/ui/Modal'
import { mockLeads, mockTeam, leadStages, leadSources } from '../mockData'

export default function Leads() {
  const [loading, setLoading] = useState(false)
  const [leads, setLeads] = useState(mockLeads)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [filterAssigned, setFilterAssigned] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedLeads, setSelectedLeads] = useState([])
  const navigate = useNavigate()

  const [newLead, setNewLead] = useState({ name: '', phone: '', email: '', source: 'Website', assignedTo: '', project: '', status: 'New' })

  useEffect(() => {
    // No artificial delays
  }, [])

  const filtered = leads.filter(l => {
    const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search)
    const matchStatus = !filterStatus || l.status === filterStatus
    const matchSource = !filterSource || l.source === filterSource
    const matchAssigned = !filterAssigned || l.assignedTo === filterAssigned
    return matchSearch && matchStatus && matchSource && matchAssigned
  })

  const handleAddLead = () => {
    const id = leads.length + 1
    setLeads([{ ...newLead, id, createdAt: new Date().toISOString().split('T')[0], lastActivity: new Date().toISOString().split('T')[0], notes: '' }, ...leads])
    setShowModal(false)
    setNewLead({ name: '', phone: '', email: '', source: 'Website', assignedTo: '', project: '', status: 'New' })
  }

  const toggleSelect = (id) => setSelectedLeads(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  const toggleAll = () => setSelectedLeads(selectedLeads.length === filtered.length ? [] : filtered.map(l => l.id))

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search leads..."
              className="pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#1a1a1a] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand w-52 text-gray-900 dark:text-gray-100 placeholder-gray-400"
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm bg-white dark:bg-[#1a1a1a] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-700 dark:text-gray-300"
            >
              <option value="">All Status</option>
              {leadStages.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Source filter */}
          <div className="relative">
            <select
              value={filterSource}
              onChange={e => setFilterSource(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm bg-white dark:bg-[#1a1a1a] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-700 dark:text-gray-300"
            >
              <option value="">All Sources</option>
              {leadSources.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Assigned filter */}
          <div className="relative">
            <select
              value={filterAssigned}
              onChange={e => setFilterAssigned(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm bg-white dark:bg-[#1a1a1a] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-700 dark:text-gray-300"
            >
              <option value="">All Team</option>
              {mockTeam.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <Button icon={Plus} onClick={() => setShowModal(true)}>Add Lead</Button>
      </div>

      {/* Summary */}
      {!loading && (
        <div className="text-sm text-gray-500 dark:text-[#888]">
          Showing <span className="font-semibold text-gray-900 dark:text-white">{filtered.length}</span> of {leads.length} leads
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-[#1a1a1a] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-4"><ListSkeleton rows={8} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e0d8ce] dark:border-[#2a2a2a] bg-[#f5f2ee] dark:bg-[#0f0f0f]">
                  <th className="py-3 pl-4 pr-2 w-8">
                    <input type="checkbox" checked={selectedLeads.length === filtered.length && filtered.length > 0} onChange={toggleAll} className="rounded" />
                  </th>
                  <th className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-[#888] uppercase tracking-wide">Lead</th>
                  <th className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-[#888] uppercase tracking-wide hidden md:table-cell">Phone</th>
                  <th className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-[#888] uppercase tracking-wide hidden lg:table-cell">Source</th>
                  <th className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-[#888] uppercase tracking-wide hidden lg:table-cell">Assigned To</th>
                  <th className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-[#888] uppercase tracking-wide">Status</th>
                  <th className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-[#888] uppercase tracking-wide hidden xl:table-cell">Last Activity</th>
                  <th className="py-3 px-3 text-right text-xs font-medium text-gray-500 dark:text-[#888] uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0d8ce] dark:divide-[#2a2a2a]">
                {filtered.map(lead => (
                  <tr key={lead.id} className="hover:bg-[#f5f2ee] dark:hover:bg-[#0f0f0f] transition-colors">
                    <td className="py-3 pl-4 pr-2">
                      <input type="checkbox" checked={selectedLeads.includes(lead.id)} onChange={() => toggleSelect(lead.id)} className="rounded" />
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={lead.name} size="sm" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{lead.name}</div>
                          <div className="text-xs text-gray-400 dark:text-[#888]">{lead.project}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">{lead.phone}</td>
                    <td className="py-3 px-3 hidden lg:table-cell">
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400">{lead.source}</span>
                    </td>
                    <td className="py-3 px-3 hidden lg:table-cell">
                      <div className="flex items-center gap-1.5">
                        <Avatar name={lead.assignedTo} size="xs" />
                        <span className="text-xs text-gray-600 dark:text-gray-400">{lead.assignedTo}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3"><Badge label={lead.status} /></td>
                    <td className="py-3 px-3 text-xs text-gray-400 dark:text-[#888] hidden xl:table-cell">{lead.lastActivity}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/leads/${lead.id}`)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand hover:bg-brand/10 transition-colors"
                          title="View"
                        >
                          <Eye size={14} />
                        </button>
                        <button className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors" title="Reassign">
                          <UserCheck size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-16 text-center text-gray-400 dark:text-[#888]">
                <Users size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">No leads found</p>
                <p className="text-sm">Try adjusting your filters</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Lead Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add New Lead"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleAddLead}>Add Lead</Button>
          </>
        }
      >
        <div className="space-y-4">
          {[
            { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Arjun Sharma' },
            { label: 'Phone Number', key: 'phone', type: 'tel', placeholder: '+91 98765 43210' },
            { label: 'Email Address', key: 'email', type: 'email', placeholder: 'arjun@email.com' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{f.label}</label>
              <input
                type={f.type}
                value={newLead[f.key]}
                onChange={e => setNewLead({ ...newLead, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                className="w-full px-3 py-2 text-sm bg-[#f5f2ee] dark:bg-[#0f0f0f] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100"
              />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Source</label>
              <select value={newLead.source} onChange={e => setNewLead({ ...newLead, source: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#f5f2ee] dark:bg-[#0f0f0f] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100"
              >
                {leadSources.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign To</label>
              <select value={newLead.assignedTo} onChange={e => setNewLead({ ...newLead, assignedTo: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#f5f2ee] dark:bg-[#0f0f0f] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100"
              >
                <option value="">Select...</option>
                {mockTeam.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project Interest</label>
            <input
              value={newLead.project}
              onChange={e => setNewLead({ ...newLead, project: e.target.value })}
              placeholder="Skyline Heights"
              className="w-full px-3 py-2 text-sm bg-[#f5f2ee] dark:bg-[#0f0f0f] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
