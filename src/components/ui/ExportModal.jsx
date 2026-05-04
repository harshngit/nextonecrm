import { useState } from 'react'
import Modal from './Modal'
import Button from './Button'
import { Calendar, Download } from 'lucide-react'

export default function ExportModal({ isOpen, onClose, onExport, title = "Export Data", loading = false }) {
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const today = now.toISOString().split('T')[0]

  const [dateRange, setDateRange] = useState({
    from: firstDayOfMonth,
    to: today
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onExport(dateRange)
  }

  const inputClass = "w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-brand text-gray-700 dark:text-gray-200 placeholder-gray-400 transition-all"
  const labelClass = "block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5"

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl p-4 border border-blue-100/50 dark:border-blue-900/20 mb-2">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Calendar size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Select Date Range</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Choose the period for your export</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>From Date</label>
            <input
              type="date"
              required
              value={dateRange.from}
              onChange={e => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>To Date</label>
            <input
              type="date"
              required
              value={dateRange.to}
              onChange={e => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button 
            type="button" 
            variant="outline" 
            className="flex-1 rounded-xl py-2.5" 
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            className="flex-1 rounded-xl py-2.5 font-bold" 
            icon={Download}
            loading={loading}
          >
            Download
          </Button>
        </div>
      </form>
    </Modal>
  )
}
