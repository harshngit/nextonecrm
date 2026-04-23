import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Shield } from 'lucide-react'
import ListSkeleton from '../components/loaders/ListSkeleton'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'
import Modal from '../components/ui/Modal'
import { mockTeam, roles } from '../mockData'

export default function Team() {
  const [loading, setLoading] = useState(false)
  const [team, setTeam] = useState(mockTeam)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'Sales Executive', status: 'Active' })

  useEffect(() => {
    // No artificial delays
  }, [])

  const handleAdd = () => {
    const initials = form.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    setTeam([...team, { id: team.length + 1, ...form, leadsAssigned: 0, visitsDone: 0, bookings: 0, avatar: initials }])
    setShowModal(false)
    setForm({ name: '', email: '', phone: '', role: 'Sales Executive', status: 'Active' })
  }

  const handleDelete = (id) => setTeam(team.filter(m => m.id !== id))

  const roleColor = {
    'Super Admin': 'text-purple-600 dark:text-purple-400',
    'Admin': 'text-blue-600 dark:text-blue-400',
    'Sales Manager': 'text-brand',
    'Sales Executive': 'text-green-600 dark:text-green-400',
    'External Caller': 'text-orange-600 dark:text-orange-400',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500 dark:text-[#888]">
          {!loading && <span><span className="font-semibold text-gray-900 dark:text-white">{team.length}</span> members</span>}
        </div>
        <Button icon={Plus} onClick={() => setShowModal(true)}>Add Member</Button>
      </div>

      <div className="bg-white dark:bg-[#1a1a1a] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-4"><ListSkeleton rows={5} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e0d8ce] dark:border-[#2a2a2a] bg-[#f5f2ee] dark:bg-[#0f0f0f]">
                  {['Member', 'Email', 'Role', 'Leads', 'Visits', 'Bookings', 'Status', 'Actions'].map(h => (
                    <th key={h} className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-[#888] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0d8ce] dark:divide-[#2a2a2a]">
                {team.map(member => (
                  <tr key={member.id} className="hover:bg-[#f5f2ee] dark:hover:bg-[#0f0f0f] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={member.name} size="sm" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1">
                            {member.name}
                            {member.role === 'Super Admin' && <Shield size={12} className="text-purple-500" />}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-[#888]">{member.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-xs">{member.email}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-medium ${roleColor[member.role] || 'text-gray-500'}`}>{member.role}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-gray-800 dark:text-gray-200">{member.leadsAssigned}</td>
                    <td className="py-3 px-4 text-center font-semibold text-gray-800 dark:text-gray-200">{member.visitsDone}</td>
                    <td className="py-3 px-4 text-center font-semibold text-gray-800 dark:text-gray-200">{member.bookings}</td>
                    <td className="py-3 px-4"><Badge label={member.status} /></td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(member.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add Team Member"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add Member</Button>
          </>
        }
      >
        <div className="space-y-4">
          {[
            { label: 'Full Name', key: 'name', type: 'text', placeholder: 'John Doe' },
            { label: 'Email', key: 'email', type: 'email', placeholder: 'john@n1r.com' },
            { label: 'Phone', key: 'phone', type: 'tel', placeholder: '+91 98765 43210' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{f.label}</label>
              <input type={f.type} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder}
                className="w-full px-3 py-2 text-sm bg-[#f5f2ee] dark:bg-[#0f0f0f] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#f5f2ee] dark:bg-[#0f0f0f] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100">
                {roles.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <input type="password" placeholder="Set password"
                className="w-full px-3 py-2 text-sm bg-[#f5f2ee] dark:bg-[#0f0f0f] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100" />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
