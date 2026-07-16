import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getLoyaltyDashboardStats, getTopLoyalCustomers } from '@/actions/loyalty-analytics'
import Link from 'next/link'
import { BarChart3, Gift, Users, TrendingUp } from 'lucide-react'
import { isAdminLike } from '@/lib/permissions'

export default async function LoyaltyDashboard() {
  const session = await auth()

  if (!session?.user || !isAdminLike(session.user.role)) {
    redirect('/login')
  }

  const stats = await getLoyaltyDashboardStats()
  const topCustomers = await getTopLoyalCustomers(10)

  if (!stats) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">نظام الولاء والنقاط</h1>
        <p className="text-red-600">خطأ في جلب البيانات</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">نظام الولاء والنقاط</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-r-4 border-blue-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">إجمالي النقاط المكتسبة</p>
              <p className="text-2xl font-bold text-blue-900">{stats.totalPointsDistributed.toLocaleString('ar-JO')}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-r-4 border-green-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">النقاط المستردة</p>
              <p className="text-2xl font-bold text-green-900">{(stats.totalPointsRedeemed || 0).toLocaleString('ar-JO')}</p>
            </div>
            <Gift className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-r-4 border-purple-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">المستخدمون النشطون</p>
              <p className="text-2xl font-bold text-purple-900">{stats.activeUsers}</p>
            </div>
            <Users className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-r-4 border-orange-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">المكافآت المستردة</p>
              <p className="text-2xl font-bold text-orange-900">{stats.rewardsRedeemed}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Link href="/admin/loyalty/config" className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg transition">
          <h3 className="font-semibold">إعدادات النظام</h3>
          <p className="text-sm text-blue-100">إدارة معدلات النقاط والإعدادات</p>
        </Link>
        <Link href="/admin/loyalty/rewards" className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg transition">
          <h3 className="font-semibold">المكافآت</h3>
          <p className="text-sm text-green-100">إدارة الهدايا والمكافآت المتاحة</p>
        </Link>
        <Link href="/admin/loyalty/campaigns" className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg transition">
          <h3 className="font-semibold">الحملات</h3>
          <p className="text-sm text-purple-100">إنشاء وإدارة الحملات الترويجية</p>
        </Link>
        <Link href="/admin/loyalty/transactions" className="bg-orange-600 hover:bg-orange-700 text-white p-4 rounded-lg transition">
          <h3 className="font-semibold">السجلات</h3>
          <p className="text-sm text-orange-100">عرض سجل جميع عمليات النقاط</p>
        </Link>
      </div>

      {/* Top Customers */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">أفضل العملاء ولاءً</h2>
        {topCustomers && topCustomers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2">الاسم</th>
                  <th className="px-4 py-2">المدينة</th>
                  <th className="px-4 py-2">النقاط</th>
                  <th className="px-4 py-2">المستوى</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">{customer.user?.username || 'غير معروف'}</td>
                    <td className="px-4 py-2 text-gray-600">{customer.user?.city || '-'}</td>
                    <td className="px-4 py-2 font-semibold text-blue-600">{customer.totalEarned.toLocaleString('ar-JO')}</td>
                    <td className="px-4 py-2">
                      {customer.totalEarned >= 1000 ? '🥇 VIP' : customer.totalEarned >= 500 ? '🥈 Gold' : '🥉 Silver'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-600">لا توجد بيانات حتى الآن</p>
        )}
      </div>
    </div>
  )
}