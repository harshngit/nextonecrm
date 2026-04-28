export default function ListSkeleton({ rows = 6 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 rounded-xl shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 animate-pulse"
        >
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
          {/* Text lines */}
          <div className="flex-1 space-y-2">
            <div className="w-36 h-3.5 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="w-24 h-3 rounded bg-gray-100 dark:bg-gray-800" />
          </div>
          {/* Badge placeholder */}
          <div className="w-20 h-6 rounded-full bg-gray-200 dark:bg-gray-700" />
          {/* Action placeholder */}
          <div className="w-16 h-7 rounded-lg bg-gray-100 dark:bg-gray-800" />
        </div>
      ))}
    </div>
  )
}

