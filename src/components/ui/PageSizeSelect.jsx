import CustomSelect from './CustomSelect'

// A very large per_page value used to stand in for "show all" — pick
// something comfortably above any realistic table size for this app.
export const ALL_PAGE_SIZE = 1000

const PAGE_SIZE_OPTIONS = [
  { value: '10',  label: '10 / page' },
  { value: '20',  label: '20 / page' },
  { value: '50',  label: '50 / page' },
  { value: '100', label: '100 / page' },
  { value: 'all', label: 'Show all' },
]

// Resolves a PageSizeSelect value ('10' | '20' | ... | 'all') to the actual
// number to send as per_page in an API call.
export const resolvePerPage = value => value === 'all' ? ALL_PAGE_SIZE : parseInt(value, 10) || 10

export default function PageSizeSelect({ value, onChange, className = 'w-32' }) {
  return (
    <div className={className}>
      <CustomSelect value={String(value)} onChange={onChange} options={PAGE_SIZE_OPTIONS} placeholder="Per page" />
    </div>
  )
}
