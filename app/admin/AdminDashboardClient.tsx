'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Package, FolderTree, ShoppingCart, Users, DollarSign, TrendingUp, Loader2 } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useLanguage } from '@/lib/LanguageContext'
import type { AdminDashboardStats, ZakatSummary } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { resetZakatCounter } from '@/actions/zakat'

interface Props {
  stats: AdminDashboardStats
  zakat: ZakatSummary
  recentOrders: Array<{
    id: string
    orderNumber: string
    totalPrice: number
    status: string
    createdAt: Date
    buyer: { username: string; storeName: string | null }
  }>
}

export function AdminDashboardClient({ stats, zakat, recentOrders }: Props) {
  const { t, dir } = useLanguage()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmingZakat, setConfirmingZakat] = useState(false)
  const tz = t.zakat || ({} as Record<string, string>)

  function handleZakatPaid() {
    startTransition(async () => {
      await resetZakatCounter()
      setConfirmingZakat(false)
      router.refresh()
    })
  }

  const statCards = [
    { label: t.adminStats.totalProducts, value: stats.totalProducts, icon: Package, color: 'bg-blue-500' },
    { label: t.adminStats.pendingOrders, value: stats.pendingOrders, icon: ShoppingCart, color: 'bg-orange-500' },
    { label: t.adminStats.activeOrders, value: stats.activeOrders, icon: TrendingUp, color: 'bg-green-500' },
    { label: t.adminStats.totalRevenue, value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: 'bg-purple-500' },
    { label: t.adminStats.totalBuyers, value: stats.totalBuyers, icon: Users, color: 'bg-indigo-500' },
    { label: t.adminStats.totalCategories, value: stats.totalCategories, icon: FolderTree, color: 'bg-teal-500' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t.admin.welcome}</h1>
        <p className="text-gray-600 mt-1">{t.admin.subtitle}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => {
          const isRevenue = stat.label === t.adminStats.totalRevenue
          const cardElement = (
            <Card key={stat.label} className={isRevenue ? 'cursor-pointer hover:shadow-md hover:ring-2 hover:ring-purple-200 transition-all' : ''}>
              <CardContent className="p-4">
                <div className={`flex items-center gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className={dir === 'rtl' ? 'text-right' : ''}>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    {isRevenue && (
                      <p className="text-sm font-medium text-green-600 mt-0.5">
                        {tz.ofWhichProfit || 'منها ربح'}: {formatCurrency(stats.totalProfit)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
          return isRevenue ? (
            <Link key={stat.label} href="/admin/revenue" className="block">
              {cardElement}
            </Link>
          ) : (
            cardElement
          )
        })}

        {/* Zakat Fund Card */}
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardContent className="p-4">
            <div className={`flex items-center gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <div className="p-3 rounded-lg bg-emerald-600 flex items-center justify-center">
                <span className="text-2xl">🤲</span>
              </div>
              <div className={`flex-1 ${dir === 'rtl' ? 'text-right' : ''}`}>
                <p className="text-sm text-gray-500">{tz.totalZakat || 'إجمالي الزكاة'}</p>
                <p className="text-2xl font-bold text-emerald-700">{formatCurrency(zakat.zakatAmount)}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {(tz.itemsSold || 'أصناف مباعة')}: {zakat.itemsSold.toLocaleString('ar-JO')}
                  {' · '}
                  {(tz.perItem || 'قرش/صنف')}: {zakat.piastresPerItem}
                </p>
              </div>
            </div>
            <div className={`mt-3 flex items-center justify-between gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <span className="text-xs text-gray-400">
                {(tz.lastReset || 'آخر تصفير')}: {formatDate(zakat.lastResetAt)}
              </span>
              {confirmingZakat ? (
                <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <button
                    type="button"
                    onClick={handleZakatPaid}
                    disabled={isPending}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                    {tz.confirmReset || 'تأكيد التصفير'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingZakat(false)}
                    disabled={isPending}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                  >
                    {t.common?.cancel || 'إلغاء'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingZakat(true)}
                  disabled={zakat.zakatAmount <= 0}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {tz.markPaid || 'تم الدفع'}
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/admin/products/new" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <Package className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="font-medium text-gray-900">{t.productManagement.addProduct}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/orders" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <ShoppingCart className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <p className="font-medium text-gray-900">{t.orderManagement.title}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/users/new" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="font-medium text-gray-900">{t.userManagement.addUser}</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <h2 className="text-lg font-semibold text-gray-900">{t.orderManagement.title}</h2>
            <Link href="/admin/orders" className="text-sm text-blue-600 hover:underline">
              {t.common.view} →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t.orderManagement.noOrders}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.orderManagement.orderNumber}</th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.orderManagement.customer}</th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.orderManagement.total}</th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.orderManagement.status}</th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.orderManagement.date}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3">
                        <Link href={`/admin/orders/${order.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                          #{order.orderNumber.slice(-8)}
                        </Link>
                      </td>
                      <td className="py-3 text-gray-900">
                        {order.buyer.storeName || order.buyer.username}
                      </td>
                      <td className="py-3 font-medium text-gray-900">
                        {formatCurrency(order.totalPrice)}
                      </td>
                      <td className="py-3">
                        <Badge status={order.status}>{t.orderStatus[order.status as keyof typeof t.orderStatus]}</Badge>
                      </td>
                      <td className="py-3 text-gray-500">
                        {formatDate(order.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
