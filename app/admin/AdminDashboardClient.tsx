'use client'

import Link from 'next/link'
import { Package, FolderTree, ShoppingCart, Users, DollarSign, TrendingUp } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useLanguage } from '@/lib/LanguageContext'
import type { AdminDashboardStats } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Props {
  stats: AdminDashboardStats
  recentOrders: Array<{
    id: string
    orderNumber: string
    totalPrice: number
    status: string
    createdAt: Date
    buyer: { name: string; businessName: string | null }
  }>
}

export function AdminDashboardClient({ stats, recentOrders }: Props) {
  const { t, dir } = useLanguage()

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
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className={`flex items-center gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className={dir === 'rtl' ? 'text-right' : ''}>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
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
                        {order.buyer.businessName || order.buyer.name}
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
