import { mockLeads, leadStages } from '../../mockData'

const stageColors = {
  'Qualified': '#0088FE',
  'Site Visit': '#00C49F',
  'Negotiation': '#FFBB28',
  'Booking': '#FF8042',
  'Closed Won': '#8884d8',
  'Closed Lost': '#FF0000',
}

const leadPipelineData = [
  { stage: 'Qualified', count: 150 },
  { stage: 'Site Visit', count: 145 },
  { stage: 'Negotiation', count: 80 },
  { stage: 'Booking', count: 45 },
  { stage: 'Closed Won', count: 89 },
  { stage: 'Closed Lost', count: 341 },
]

export default function LeadPipeline() {
  const totalLeads = leadPipelineData.reduce((sum, stage) => sum + stage.count, 0)

  return (
    <div className="bg-card text-card-foreground border border-gray-200 dark:border-gray-700 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 rounded-2xl p-5 shadow-md shadow-gray-300/50 dark:shadow-gray-900/50 hover:shadow-lg hover:shadow-gray-300/50 dark:hover:shadow-gray-900/50 transition-all duration-200">
      <h2 className="font-display text-base font-semibold text-gray-900 dark:text-white mb-1">Lead Pipeline</h2>
      <p className="text-sm text-gray-500 dark:text-[#888] mb-4">Current lead distribution</p>

      <div className="space-y-4">
        {leadPipelineData.map((item, i) => (
          <div key={i}>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stageColors[item.stage] }}></span>
                <span className="text-sm text-gray-700 dark:text-gray-300">{item.stage}</span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{item.count}</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full"
                style={{
                  width: `${(item.count / totalLeads) * 100}%`,
                  backgroundColor: stageColors[item.stage],
                }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

