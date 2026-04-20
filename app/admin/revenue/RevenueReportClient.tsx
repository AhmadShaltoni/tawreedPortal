'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowRight, Calendar, Loader2 } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useLanguage } from '@/lib/LanguageContext'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getRevenueReportData } from '@/actions/admin-orders'

type FilterType = 'current-month' | 'last-7-days' | 'custom'

interface ReportOrder {
  id: string
  orderNumber: string
  createdAt: Date
  status: string
  totalPrice: number
  customerName: string
  profit: number
}

function getDateRange(filter: FilterType, customFrom?: string, customTo?: string): { from: string; to: string } {
  const now = new Date()
  if (filter === 'current-month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: from.toISOString(), to: now.toISOString() }
  }
  if (filter === 'last-7-days') {
    const from = new Date(now)
    from.setDate(from.getDate() - 7)
    return { from: from.toISOString(), to: now.toISOString() }
  }
  // custom
  return {
    from: customFrom ? new Date(customFrom).toISOString() : now.toISOString(),
    to: customTo ? new Date(customTo).toISOString() : now.toISOString(),
  }
}

export function RevenueReportClient() {
  const { t, dir } = useLanguage()
  const [filter, setFilter] = useState<FilterType>('current-month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [orders, setOrders] = useState<ReportOrder[]>([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalProfit, setTotalProfit] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { from, to } = getDateRange(filter, customFrom, customTo)
      const result = await getRevenueReportData({ from, to })
      setOrders(result.orders as ReportOrder[])
      setTotalRevenue(result.totalRevenue)
      setTotalProfit(result.totalProfit)
    } catch {
      // Error handled silently
    } finally {
      setLoading(false)
    }
  }, [filter, customFrom, customTo])

  useEffect(() => {
    if (filter !== 'custom') {
      fetchData()
    }
  }, [filter, fetchData])

  function handleCustomApply() {
    if (customFrom && customTo) {
      fetchData()
    }
  }

  const tr = t.revenueReport || {} as Record<string, string>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex items-center gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <Link href="/admin" className="text-gray-500 hover:text-gray-700">
          <ArrowRight className={`w-5 h-5 ${dir === 'rtl' ? '' : 'rotate-180'}`} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{tr.title || 'تقرير الإيرادات والأرباح'}</h1>
      </div>

      {/* Date Filter */}
      <Card>
        <CardContent className="p-4">
          <div className={`flex flex-wrap items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <Calendar className="w-5 h-5 text-gray-400" />
            <button
              type="button"
              onClick={() => setFilter('current-month')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'current-month'
                  ? 'bg-blue-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tr.currentMonth || 'الشهر الحالي'}
            </button>
            <button
              type="button"
              onClick={() => setFilter('last-7-days')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'last-7-days'
                  ? 'bg-blue-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tr.last7Days || 'آخر ٧ أيام'}
            </button>
            <button
              type="button"
              onClick={() => setFilter('custom')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'custom'
                  ? 'bg-blue-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tr.custom || 'محدد'}
            </button>

            {filter === 'custom' && (
              <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-gray-400 text-sm">{tr.to || 'إلى'}</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleCustomApply}
                  disabled={!customFrom || !customTo}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {tr.apply || 'تطبيق'}
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">{tr.ordersInPeriod || 'الطلبات في الفترة المحددة'}</h2>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : orders.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t.orderManagement?.noOrders || 'لا توجد طلبات'}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.orderManagement?.orderNumber || 'رقم الطلب'}</th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.orderManagement?.date || 'التاريخ'}</th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.orderManagement?.customer || 'العميل'}</th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.orderManagement?.status || 'الحالة'}</th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.orderManagement?.total || 'المجموع'}</th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{tr.orderProfit || 'إجمالي الربح للطلب'}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3">
                        <Link href={`/admin/orders/${order.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                          #{order.orderNumber.slice(-8)}
                        </Link>
                      </td>
                      <td className="py-3 text-gray-500">{formatDate(order.createdAt)}</td>
                      <td className="py-3 text-gray-900">{order.customerName}</td>
                      <td className="py-3">
                        <Badge status={order.status}>{t.orderStatus?.[order.status as keyof typeof t.orderStatus] || order.status}</Badge>
                      </td>
                      <td className="py-3 font-medium text-gray-900">{formatCurrency(order.totalPrice)}</td>
                      <td className="py-3 font-medium">
                        <span className={order.profit > 0 ? 'text-green-600' : 'text-gray-400'}>
                          {formatCurrency(order.profit)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Row */}
      {!loading && orders.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className={`flex items-center gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <div className="p-3 rounded-lg bg-purple-500">
                  <span className="text-2xl text-white">💰</span>
                </div>
                <div className={dir === 'rtl' ? 'text-right' : ''}>
                  <p className="text-sm text-gray-500">{tr.totalRevenueForPeriod || 'إجمالي الإيرادات للفترة المحددة'}</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className={`flex items-center gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <div className="p-3 rounded-lg bg-green-500">
                  <span className="text-2xl text-white">📈</span>
                </div>
                <div className={dir === 'rtl' ? 'text-right' : ''}>
                  <p className="text-sm text-gray-500">{tr.totalProfitForPeriod || 'إجمالي الربح للفترة المحددة'}</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalProfit)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
