const statusColors = {
  'New': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'Contacted': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  'Interested': 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  'Follow-up': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  'Site Visit Scheduled': 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  'Site Visit Done': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  'Negotiation': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'Booked': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  'Lost': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  'Active': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  'Inactive': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  'Scheduled': 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  'Rescheduled': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'Completed': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  'Cancelled': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  'Residential': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'Commercial': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
}

export default function Badge({ label, className = '' }) {
  const colorClass = statusColors[label] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass} ${className}`}>
      {label}
    </span>
  )
}
