'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useLanguage } from '@/lib/LanguageContext'
import { formatCurrency, formatDate } from '@/lib/utils'

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const

interface Props {
  orders: Array<{
    id: string
    orderNumber: string
    totalPrice: number
    status: string
    createdAt: Date
    buyer: { id: string; username: string; storeName: string | null; phone: string | null }
    items: Array<{ id: string; productName: string; quantity: number }>
  }>
  total: number
  pages: number
  currentPage: number
  currentStatus?: string
  currentSearch?: string
}

export function OrderListClient({ orders, total, pages, currentPage, currentStatus, currentSearch }: Props) {
  const { t, dir } = useLanguage()
  const router = useRouter()
  const [search, setSearch] = useState(currentSearch || '')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (currentStatus) params.set('status', currentStatus)
    router.push(`/admin/orders?${params.toString()}`)
  }

  function handleStatusFilter(status: string) {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (currentSearch) params.set('search', currentSearch)
    router.push(`/admin/orders?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t.orderManagement.title}</h1>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className={`flex flex-col sm:flex-row gap-4 ${dir === 'rtl' ? 'sm:flex-row-reverse' : ''}`}>
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 ${dir === 'rtl' ? 'right-3' : 'left-3'}`} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.common.search}
                  className={`w-full border border-gray-300 rounded-lg py-2 ${dir === 'rtl' ? 'pr-10 pl-3' : 'pl-10 pr-3'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
              </div>
            </form>

            <select
              value={currentStatus || ''}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg py-2 px-3 min-w-[200px]"
            >
              <option value="">{t.orderManagement.allStatuses}</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>{t.orderStatus[s]}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-center text-gray-500 py-12">{t.orderManagement.noOrders}</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.orderManagement.orderNumber}</th>
                      <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.orderManagement.customer}</th>
                      <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.orderManagement.items}</th>
                      <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.orderManagement.total}</th>
                      <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.orderManagement.status}</th>
                      <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.orderManagement.date}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/admin/orders/${order.id}`)}>
                        <td className="py-3">
                          <span className="text-blue-600 font-mono text-xs">#{order.orderNumber.slice(-8)}</span>
                        </td>
                        <td className="py-3">
                          <div>
                            <p className="font-medium text-gray-900">{order.buyer.storeName || order.buyer.username}</p>
                            {order.buyer.phone && <p className="text-xs text-gray-500">{order.buyer.phone}</p>}
                          </div>
                        </td>
                        <td className="py-3 text-gray-600">
                          {order.items.length} {t.orderManagement.items}
                        </td>
                        <td className="py-3 font-medium text-gray-900">{formatCurrency(order.totalPrice)}</td>
                        <td className="py-3">
                          <Badge status={order.status}>{t.orderStatus[order.status as keyof typeof t.orderStatus]}</Badge>
                        </td>
                        <td className="py-3 text-gray-500">{formatDate(order.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-200">
                  {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                    <Link
                      key={p}
                      href={`/admin/orders?page=${p}${currentStatus ? `&status=${currentStatus}` : ''}${currentSearch ? `&search=${currentSearch}` : ''}`}
                      className={`px-3 py-1 rounded ${p === currentPage ? 'bg-blue-900 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                      {p}
                    </Link>
                  ))}
                </div>
              )}
              <p className="text-sm text-gray-500 mt-2 text-center">{total} {t.admin.orders}</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
