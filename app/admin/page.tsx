import { getAdminDashboardStats, getAdminOrders } from '@/actions/admin-orders'
import { getZakatSummary } from '@/actions/zakat'
import { AdminDashboardClient } from './AdminDashboardClient'

export default async function AdminDashboardPage() {
  const [stats, { orders: recentOrders }, zakat] = await Promise.all([
    getAdminDashboardStats(),
    getAdminOrders({ limit: 5 }),
    getZakatSummary(),
  ])

  return <AdminDashboardClient stats={stats} recentOrders={recentOrders as any} zakat={zakat} />
}
