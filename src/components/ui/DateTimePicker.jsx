import DatePicker from './DatePicker'
import ClockPicker from './ClockPicker'

// Splits an ISO datetime string into local 'YYYY-MM-DD' / 'HH:MM' parts.
const splitISO = (iso) => {
  if (!iso) return { date: '', time: '' }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { date: '', time: '' }
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return { date: `${y}-${m}-${day}`, time: `${hh}:${mm}` }
}

export default function DateTimePicker({ value, onChange, label, required = false, min, max }) {
  const { date, time } = splitISO(value)

  const emit = (nextDate, nextTime) => {
    if (!nextDate) { onChange(''); return }
    onChange(new Date(`${nextDate}T${nextTime || '00:00'}`).toISOString())
  }

  return (
    <div>
      {label && (
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
          {label}{required && ' *'}
        </label>
      )}
      <div className="grid grid-cols-2 gap-2">
        <DatePicker
          value={date}
          onChange={(v) => emit(v, time)}
          required={required}
          min={min}
          max={max}
          placeholder="Date"
        />
        <ClockPicker
          value={time}
          onChange={(v) => emit(date, v)}
        />
      </div>
    </div>
  )
}
