import { useState, useEffect } from 'react'
import DashboardStats from '../components/dashboard/DashboardStats'
import RevenueBookingsChart from '../components/dashboard/RevenueBookingsChart'
import LeadSourcesChart from '../components/dashboard/LeadSourcesChart'
import CommissionOverviewChart from '../components/dashboard/CommissionOverviewChart'
import LeadPipeline from '../components/dashboard/LeadPipeline'
import RecentActivity from '../components/dashboard/RecentActivity'
import QuickActions from '../components/dashboard/QuickActions'
import UpcomingSiteVisits from '../components/dashboard/UpcomingSiteVisits'

export default function Dashboard() {
  const [loading, setLoading] = useState(true) // You can manage loading states as needed

  useEffect(() => {
    // Fetch data for dashboard components here
    // For now, we'll just simulate a loading state
    setLoading(true)
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <DashboardStats loading={true} />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 h-80 rounded-2xl animate-pulse shadow-md shadow-gray-300/50 dark:shadow-gray-900/50"></div>
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 h-80 rounded-2xl animate-pulse shadow-md shadow-gray-300/50 dark:shadow-gray-900/50"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 h-[400px] rounded-2xl animate-pulse shadow-md shadow-gray-300/50 dark:shadow-gray-900/50"></div>
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 h-[400px] rounded-2xl animate-pulse shadow-md shadow-gray-300/50 dark:shadow-gray-900/50"></div>
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 h-[400px] rounded-2xl animate-pulse shadow-md shadow-gray-300/50 dark:shadow-gray-900/50"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Cards */}
      <DashboardStats loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue */}
        <RevenueBookingsChart />

        {/* Lead Sources */}
        <LeadSourcesChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Commission Overview */}
        <CommissionOverviewChart />

        {/* Lead Pipeline */}
        <LeadPipeline />

        {/* Recent Activity */}
        <RecentActivity />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <QuickActions />

        {/* Upcoming Site Visits */}
        <UpcomingSiteVisits />
      </div>
    </div>
  )
}
