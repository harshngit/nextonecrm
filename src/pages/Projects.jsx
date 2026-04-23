import { useState, useEffect } from 'react'
import { Plus, MapPin, Building2, IndianRupee, Users } from 'lucide-react'
import CardSkeleton from '../components/loaders/CardSkeleton'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { mockProjects, mockLeads } from '../mockData'

const projectColors = ['from-amber-400/20 to-orange-400/20', 'from-green-400/20 to-teal-400/20', 'from-blue-400/20 to-purple-400/20', 'from-rose-400/20 to-pink-400/20']

export default function Projects() {
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState(mockProjects)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', location: '', type: 'Residential', config: '', priceRange: '', status: 'Active' })

  useEffect(() => {
    // No artificial delays
  }, [])

  const handleAdd = () => {
    setProjects([{ id: projects.length + 1, ...form, totalUnits: 100, soldUnits: 0 }, ...projects])
    setShowModal(false)
    setForm({ name: '', location: '', type: 'Residential', config: '', priceRange: '', status: 'Active' })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500 dark:text-[#888]">
          {!loading && <span><span className="font-semibold text-gray-900 dark:text-white">{projects.length}</span> projects</span>}
        </div>
        <Button icon={Plus} onClick={() => setShowModal(true)}>Add Project</Button>
      </div>

      {/* Grid */}
      {loading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
          {projects.map((project, i) => {
            const leadsCount = mockLeads.filter(l => l.project === project.name).length
            const soldPct = Math.round((project.soldUnits / project.totalUnits) * 100)
            return (
              <div key={project.id} className="bg-white dark:bg-[#1a1a1a] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-2xl overflow-hidden animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
                {/* Header gradient */}
                <div className={`h-24 bg-gradient-to-br ${projectColors[i % projectColors.length]} flex items-center justify-center relative`}>
                  <div className="w-12 h-12 rounded-2xl bg-white/80 dark:bg-black/30 backdrop-blur flex items-center justify-center shadow-sm">
                    <Building2 size={22} className="text-brand" />
                  </div>
                  <div className="absolute top-3 right-3">
                    <Badge label={project.status} />
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-display font-semibold text-gray-900 dark:text-white text-base mb-0.5">{project.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-[#888] mb-3">
                    <MapPin size={11} />
                    <span>{project.location}</span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                      <Badge label={project.type} />
                      <span className="text-gray-400">·</span>
                      <span>{project.config}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                      <IndianRupee size={11} className="text-brand" />
                      <span>{project.priceRange}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                      <Users size={11} className="text-blue-500" />
                      <span>{leadsCount} active leads</span>
                    </div>
                  </div>

                  {/* Sold progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500 dark:text-[#888]">Units Sold</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{project.soldUnits}/{project.totalUnits}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${soldPct}%` }} />
                    </div>
                    <div className="text-[10px] text-gray-400 dark:text-[#888] mt-0.5 text-right">{soldPct}% sold</div>
                  </div>

                  <Button variant="outline" size="sm" className="w-full">View Leads</Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add New Project"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add Project</Button>
          </>
        }
      >
        <div className="space-y-4">
          {[
            { label: 'Project Name', key: 'name', placeholder: 'Skyline Heights' },
            { label: 'Location', key: 'location', placeholder: 'Andheri West, Mumbai' },
            { label: 'Configuration', key: 'config', placeholder: '2BHK, 3BHK, 4BHK' },
            { label: 'Price Range', key: 'priceRange', placeholder: '₹85L – ₹2.4Cr' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{f.label}</label>
              <input value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder}
                className="w-full px-3 py-2 text-sm bg-[#f5f2ee] dark:bg-[#0f0f0f] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#f5f2ee] dark:bg-[#0f0f0f] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100">
                <option>Residential</option>
                <option>Commercial</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#f5f2ee] dark:bg-[#0f0f0f] border border-[#e0d8ce] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-brand text-gray-900 dark:text-gray-100">
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
