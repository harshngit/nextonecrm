import { useState } from 'react'
import Modal from './Modal'
import Button from './Button'
import { Calendar, Download } from 'lucide-react'
import DatePicker from './DatePicker'

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
          <DatePicker
            label="From Date"
            required
            value={dateRange.from}
            onChange={(v) => setDateRange(prev => ({ ...prev, from: v }))}
          />
          <DatePicker
            label="To Date"
            required
            value={dateRange.to}
            onChange={(v) => setDateRange(prev => ({ ...prev, to: v }))}
          />
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
