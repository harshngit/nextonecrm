export default function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 rounded-2xl p-5 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 animate-pulse"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700" />
            <div className="w-12 h-5 rounded-full bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="w-28 h-4 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
          <div className="w-20 h-7 rounded bg-gray-200 dark:bg-gray-700 mb-4" />
          <div className="w-24 h-3 rounded bg-gray-100 dark:bg-gray-800" />
        </div>
      ))}
    </div>
  )
}

