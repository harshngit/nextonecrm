import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchDashboardStats,
  fetchRevenueTrend,
  fetchLeadSources,
  fetchLeadPipeline,
  fetchRecentActivity,
  fetchUpcomingSiteVisits,
} from '../store/dashboardSlice'
import DashboardStats from '../components/dashboard/DashboardStats'
import RevenueBookingsChart from '../components/dashboard/RevenueBookingsChart'
import LeadSourcesChart from '../components/dashboard/LeadSourcesChart'
import CommissionOverviewChart from '../components/dashboard/CommissionOverviewChart'
import LeadPipeline from '../components/dashboard/LeadPipeline'
import RecentActivity from '../components/dashboard/RecentActivity'
import QuickActions from '../components/dashboard/QuickActions'
import UpcomingSiteVisits from '../components/dashboard/UpcomingSiteVisits'

export default function Dashboard() {
  const dispatch = useDispatch()
  const { loading } = useSelector((s) => s.dashboard)

  useEffect(() => {
    dispatch(fetchDashboardStats())
    dispatch(fetchRevenueTrend({ range: 'month' }))
    dispatch(fetchLeadSources())
    dispatch(fetchLeadPipeline())
    dispatch(fetchRecentActivity({ limit: 10 }))
    dispatch(fetchUpcomingSiteVisits({ limit: 5 }))
  }, [dispatch])

  const isInitialLoading = loading.stats && loading.revenue && loading.leadSources && loading.pipeline

  if (isInitialLoading) {
    return (
      <div className="space-y-6">
        <DashboardStats loading={true} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 h-80 rounded-2xl animate-pulse shadow-md shadow-blue-100/50 dark:shadow-blue-900/20" />
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 h-80 rounded-2xl animate-pulse shadow-md shadow-blue-100/50 dark:shadow-blue-900/20" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 h-[400px] rounded-2xl animate-pulse shadow-md shadow-blue-100/50 dark:shadow-blue-900/20" />
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 h-[400px] rounded-2xl animate-pulse shadow-md shadow-blue-100/50 dark:shadow-blue-900/20" />
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 h-[400px] rounded-2xl animate-pulse shadow-md shadow-blue-100/50 dark:shadow-blue-900/20" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top KPI Cards */}
      <DashboardStats loading={loading.stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <RevenueBookingsChart />
        {/* Lead Sources Donut */}
        <LeadSourcesChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Commission (coming soon) */}
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