'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight, Calendar, Loader2, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { useLanguage } from '@/lib/LanguageContext'
import { formatCurrency } from '@/lib/utils'
import { getProductProfitReport } from '@/actions/admin-orders'
import type { ProductProfitRow } from '@/types'

type DateFilter = 'all-time' | 'current-month' | 'last-7-days' | 'custom'
type ProfitFilter = 'all' | 'top-profit' | 'low-profit' | 'loss'

function getDateRange(filter: DateFilter, customFrom?: string, customTo?: string): { from?: string; to?: string } {
  const now = new Date()
  if (filter === 'all-time') return {}
  if (filter === 'current-month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: from.toISOString(), to: now.toISOString() }
  }
  if (filter === 'last-7-days') {
    const from = new Date(now)
    from.setDate(from.getDate() - 7)
    return { from: from.toISOString(), to: now.toISOString() }
  }
  return {
    from: customFrom ? new Date(customFrom).toISOString() : undefined,
    to: customTo ? new Date(customTo).toISOString() : undefined,
  }
}

export function ProductProfitReportClient() {
  const { t, dir } = useLanguage()
  const tr = (t.revenueReport || {}) as Record<string, string>

  const [dateFilter, setDateFilter] = useState<DateFilter>('all-time')
  const [profitFilter, setProfitFilter] = useState<ProfitFilter>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [rows, setRows] = useState<ProductProfitRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const range = getDateRange(dateFilter, customFrom, customTo)
      const result = await getProductProfitReport(range)
      setRows(result)
    } catch {
      // Error handled silently
    } finally {
      setLoading(false)
    }
  }, [dateFilter, customFrom, customTo])

  useEffect(() => {
    if (dateFilter !== 'custom') {
      fetchData()
    }
  }, [dateFilter, fetchData])

  function handleCustomApply() {
    if (customFrom && customTo) fetchData()
  }

  const filteredRows = useMemo(() => {
    const sorted = [...rows]
    switch (profitFilter) {
      case 'top-profit':
        return sorted.sort((a, b) => b.profit - a.profit)
      case 'low-profit':
        return sorted.filter((r) => r.profit >= 0).sort((a, b) => a.profit - b.profit)
      case 'loss':
        return sorted.filter((r) => r.profit < 0).sort((a, b) => a.profit - b.profit)
      default:
        return sorted.sort((a, b) => b.profit - a.profit)
    }
  }, [rows, profitFilter])

  const totals = useMemo(() => {
    const revenue = rows.reduce((s, r) => s + r.revenue, 0)
    const profit = rows.reduce((s, r) => s + r.profit, 0)
    const lossCount = rows.filter((r) => r.profit < 0).length
    return { revenue, profit, lossCount, products: rows.length }
  }, [rows])

  const dateButtons: { key: DateFilter; label: string }[] = [
    { key: 'all-time', label: tr.filterAll || 'الكل' },
    { key: 'current-month', label: tr.currentMonth || 'الشهر الحالي' },
    { key: 'last-7-days', label: tr.last7Days || 'آخر ٧ أيام' },
    { key: 'custom', label: tr.custom || 'محدد' },
  ]

  const profitButtons: { key: ProfitFilter; label: string }[] = [
    { key: 'all', label: tr.filterAll || 'الكل' },
    { key: 'top-profit', label: tr.filterTopProfit || 'الأعلى ربحاً' },
    { key: 'low-profit', label: tr.filterLowProfit || 'الأقل ربحاً' },
    { key: 'loss', label: tr.filterLoss || 'الخسائر' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex items-center gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <Link href="/admin/revenue" className="text-gray-500 hover:text-gray-700">
          <ArrowRight className={`w-5 h-5 ${dir === 'rtl' ? '' : 'rotate-180'}`} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{tr.productProfitTitle || 'الأرباح والخسائر حسب المنتج'}</h1>
      </div>

      {/* Date Filter */}
      <Card>
        <CardContent className="p-4">
          <div className={`flex flex-wrap items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <Calendar className="w-5 h-5 text-gray-400" />
            {dateButtons.map((b) => (
              <button
                key={b.key}
                type="button"
                onClick={() => setDateFilter(b.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateFilter === b.key ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {b.label}
              </button>
            ))}
            {dateFilter === 'custom' && (
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

      {/* Summary cards */}
      {!loading && rows.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">{tr.totalRevenueForPeriod || 'إجمالي الإيرادات'}</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totals.revenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">{tr.totalProfitForPeriod || 'إجمالي الربح'}</p>
              <p className={`text-xl font-bold ${totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totals.profit)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">{tr.totalProducts || 'عدد المنتجات'}</p>
              <p className="text-xl font-bold text-gray-900">{totals.products}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">{tr.filterLoss || 'الخسائر'}</p>
              <p className={`text-xl font-bold ${totals.lossCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {totals.lossCount}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Profit Filter Tabs */}
      <div className={`flex flex-wrap items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        {profitButtons.map((b) => (
          <button
            key={b.key}
            type="button"
            onClick={() => setProfitFilter(b.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              profitFilter === b.key ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">{tr.productProfitTitle || 'الأرباح حسب المنتج'}</h2>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : filteredRows.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{tr.noProducts || 'لا توجد منتجات مباعة في هذه الفترة'}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{tr.product || 'المنتج'}</th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{tr.quantitySold || 'الكمية المباعة'}</th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{tr.revenue || 'الإيراد'}</th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{tr.cost || 'التكلفة'}</th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{tr.profit || 'الربح'}</th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{tr.margin || 'نسبة الربح'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const isLoss = row.profit < 0
                    return (
                      <tr key={row.productId} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3">
                          <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                            {row.productImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={row.productImage}
                                alt={row.productName}
                                className="rounded-md object-cover w-9 h-9"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-md bg-gray-100" />
                            )}
                            <div className={dir === 'rtl' ? 'text-right' : ''}>
                              <span className="text-gray-900 font-medium">{row.productName}</span>
                              {row.missingCostData && (
                                <span
                                  className={`flex items-center gap-1 text-xs text-amber-600 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
                                  title={tr.noCostData || ''}
                                >
                                  <AlertTriangle className="w-3 h-3" />
                                  {tr.noCostData || 'بيانات تكلفة ناقصة'}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-gray-900">{row.quantitySold.toLocaleString('ar-JO')}</td>
                        <td className="py-3 text-gray-900">{formatCurrency(row.revenue)}</td>
                        <td className="py-3 text-gray-500">{formatCurrency(row.cost)}</td>
                        <td className="py-3 font-semibold">
                          <span className={`inline-flex items-center gap-1 ${isLoss ? 'text-red-600' : 'text-green-600'}`}>
                            {isLoss ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                            {formatCurrency(row.profit)}
                          </span>
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              isLoss ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {row.margin.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
