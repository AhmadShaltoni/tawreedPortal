import { getAdminDashboardStats, getAdminOrders } from '@/actions/admin-orders'
import { AdminDashboardClient } from './AdminDashboardClient'

export default async function AdminDashboardPage() {
  const [stats, { orders: recentOrders }] = await Promise.all([
    getAdminDashboardStats(),
    getAdminOrders({ limit: 5 }),
  ])

  return <AdminDashboardClient stats={stats} recentOrders={recentOrders} />
}
