'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Calendar,
  Loader2,
  TrendingUp,
  Trophy,
  Tag,
  AlertTriangle,
  Package,
  Percent,
  Coins,
  ShoppingBag,
  Download,
  PlusCircle,
  PackageX,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { useLanguage } from '@/lib/LanguageContext'
import { formatCurrency } from '@/lib/utils'
import { getSalesMarketingInsights } from '@/actions/marketing-insights'
import type { ProductInsightRow, SalesMarketingInsights } from '@/types'

type DateFilter = 'all-time' | 'current-month' | 'last-30-days' | 'last-7-days' | 'custom'
type Tab = 'profit' | 'bestsellers' | 'offers' | 'lowstock' | 'nocost' | 'weak'

const LOW_STOCK_THRESHOLD = 10 // keep in sync with actions/marketing-insights.ts

function getDateRange(filter: DateFilter, customFrom?: string, customTo?: string): { from?: string; to?: string } {
  const now = new Date()
  if (filter === 'all-time') return {}
  if (filter === 'current-month') {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), to: now.toISOString() }
  }
  if (filter === 'last-30-days') {
    const from = new Date(now)
    from.setDate(from.getDate() - 30)
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

const ARF = new Intl.NumberFormat('ar-JO')
const nf = (n: number) => ARF.format(Math.round(n))
const productHref = (id: string) => `/admin/products/${id}`

// Single-hue magnitude bar (rounded ends, recessive track). Fills from the
// inline-start, so it naturally reads right-to-left inside the RTL layout.
function Bar({ value, max, className }: { value: number; max: number; className: string }) {
  const pct = max > 0 ? Math.max(3, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className="h-1.5 w-full max-w-[110px] rounded-full bg-gray-100">
      <div className={`h-full rounded-full ${className}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function MarginPill({ margin }: { margin: number | null }) {
  if (margin == null) return <span className="text-gray-300">—</span>
  const tone =
    margin < 0 ? 'bg-red-100 text-red-700'
    : margin < 10 ? 'bg-amber-100 text-amber-700'
    : margin < 25 ? 'bg-blue-100 text-blue-700'
    : 'bg-green-100 text-green-700'
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${tone}`}>{margin.toFixed(1)}%</span>
}

// Whole cell is a link to the product's edit page.
function ProductCell({ row }: { row: ProductInsightRow }) {
  return (
    <Link href={productHref(row.productId)} className="group flex items-center gap-3" title="فتح تفاصيل المنتج">
      {row.productImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={row.productImage} alt={row.productName} className="rounded-md object-cover w-9 h-9 shrink-0" />
      ) : (
        <div className="w-9 h-9 rounded-md bg-gray-100 shrink-0" />
      )}
      <div className="min-w-0">
        <div className="text-gray-900 font-medium truncate group-hover:text-blue-700 group-hover:underline">{row.productName}</div>
        <div className="text-xs text-gray-400 truncate">{row.categoryName}</div>
      </div>
    </Link>
  )
}

function csvEscape(v: string | number): string {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function SalesInsightsClient() {
  const { dir } = useLanguage()
  const [dateFilter, setDateFilter] = useState<DateFilter>('current-month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [tab, setTab] = useState<Tab>('profit')
  const [data, setData] = useState<SalesMarketingInsights | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const range = getDateRange(dateFilter, customFrom, customTo)
      setData(await getSalesMarketingInsights(range))
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [dateFilter, customFrom, customTo])

  useEffect(() => {
    if (dateFilter !== 'custom') fetchData()
  }, [dateFilter, fetchData])

  const rows = useMemo(() => data?.products ?? [], [data])
  const s = data?.summary

  const profitRows = useMemo(
    () => [...rows].sort((a, b) => b.soldProfit - a.soldProfit || (b.marginPercent ?? -1) - (a.marginPercent ?? -1)),
    [rows],
  )
  const bestSellers = useMemo(
    () => [...rows].filter((r) => r.quantitySold > 0).sort((a, b) => b.quantitySold - a.quantitySold),
    [rows],
  )
  const offerRows = useMemo(
    () =>
      [...rows]
        .filter((r) => r.hasCostData && !r.onOffer && (r.marginPercent ?? 0) >= 25 && r.stock > 0)
        .sort((a, b) => (b.marginPercent ?? 0) - (a.marginPercent ?? 0)),
    [rows],
  )
  const lowStockRows = useMemo(
    () => [...rows].filter((r) => r.lowStock).sort((a, b) => a.stock - b.stock),
    [rows],
  )
  const noCostRows = useMemo(
    () => [...rows].filter((r) => !r.hasCostData).sort((a, b) => b.quantitySold - a.quantitySold),
    [rows],
  )
  const weakRows = useMemo(
    () =>
      [...rows]
        .filter((r) => r.hasCostData && (r.marginPercent ?? 99) < 10)
        .sort((a, b) => (a.marginPercent ?? 999) - (b.marginPercent ?? 999)),
    [rows],
  )

  const tabs: { key: Tab; label: string; icon: typeof Trophy; count: number }[] = [
    { key: 'profit', label: 'الأكثر ربحاً', icon: TrendingUp, count: rows.length },
    { key: 'bestsellers', label: 'الأكثر مبيعاً', icon: Trophy, count: bestSellers.length },
    { key: 'offers', label: 'فرص العروض', icon: Tag, count: offerRows.length },
    { key: 'lowstock', label: 'مخزون منخفض', icon: PackageX, count: lowStockRows.length },
    { key: 'nocost', label: 'بدون سعر جملة', icon: AlertTriangle, count: noCostRows.length },
    { key: 'weak', label: 'هوامش ضعيفة', icon: Percent, count: weakRows.length },
  ]

  const activeRows =
    tab === 'profit' ? profitRows
    : tab === 'bestsellers' ? bestSellers
    : tab === 'offers' ? offerRows
    : tab === 'lowstock' ? lowStockRows
    : tab === 'nocost' ? noCostRows
    : weakRows

  function exportCsv() {
    const header = ['المنتج', 'التصنيف', 'سعر البيع', 'سعر الجملة', 'ربح الوحدة', 'نسبة الربح %', 'المخزون', 'الكمية المباعة', 'الإيراد', 'الربح المحقق', 'أقصى خصم %']
    const lines = activeRows.map((r) =>
      [
        r.productName, r.categoryName,
        r.sellingPrice ?? '', r.wholesalePrice ?? '', r.profitPerUnit ?? '',
        r.marginPercent != null ? r.marginPercent.toFixed(1) : '',
        r.stock, r.quantitySold, r.revenue.toFixed(2), r.soldProfit.toFixed(2),
        r.maxDiscountPercent ?? '',
      ].map(csvEscape).join(','),
    )
    const blob = new Blob(['﻿' + [header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sales-insights-${tab}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const dateButtons: { key: DateFilter; label: string }[] = [
    { key: 'current-month', label: 'الشهر الحالي' },
    { key: 'last-30-days', label: 'آخر ٣٠ يوم' },
    { key: 'last-7-days', label: 'آخر ٧ أيام' },
    { key: 'all-time', label: 'كل الوقت' },
    { key: 'custom', label: 'محدد' },
  ]

  const maxProfit = Math.max(1, ...profitRows.map((r) => r.soldProfit))
  const maxQty = Math.max(1, ...bestSellers.map((r) => r.quantitySold))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex items-center gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <Link href="/admin/revenue" className="text-gray-500 hover:text-gray-700">
          <ArrowRight className={`w-5 h-5 ${dir === 'rtl' ? '' : 'rotate-180'}`} />
        </Link>
        <div className={dir === 'rtl' ? 'text-right' : ''}>
          <h1 className="text-2xl font-bold text-gray-900">مركز المبيعات والتسويق</h1>
          <p className="text-sm text-gray-400">
            الأرباح والهوامش وفرص العروض والأكثر مبيعاً — أدوات لإدارة مبيعاتك وتسويقك
          </p>
        </div>
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
                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                <span className="text-gray-400 text-sm">إلى</span>
                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                <button type="button" onClick={fetchData} disabled={!customFrom || !customTo}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  تطبيق
                </button>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            الإيرادات والأرباح المحققة تُحتسب من الطلبات المُسلَّمة فقط ضمن الفترة. الهوامش تعكس أسعار الكتالوج الحالية.
          </p>
        </CardContent>
      </Card>

      {loading || !s ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          {/* KPI cards — some jump to the matching tab */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi icon={Coins} tone="bg-purple-500" label="إجمالي الإيرادات" value={formatCurrency(s.totalRevenue)} />
            <Kpi icon={TrendingUp} tone="bg-green-500" label="إجمالي الربح المحقق" value={formatCurrency(s.totalProfit)} valueClass="text-green-600" />
            <Kpi icon={Percent} tone="bg-blue-500" label="متوسط نسبة الربح" value={`${s.avgMarginPercent.toFixed(1)}%`} />
            <Kpi icon={ShoppingBag} tone="bg-amber-500" label="عدد الطلبات المُسلَّمة" value={nf(s.totalOrders)} />
            <Kpi icon={Tag} tone="bg-emerald-500" label="منتجات صالحة للعروض" value={nf(s.offerOpportunityCount)} onClick={() => setTab('offers')} />
            <Kpi icon={PackageX} tone="bg-orange-500" label="مخزون منخفض" value={nf(s.lowStockCount)} valueClass={s.lowStockCount > 0 ? 'text-orange-600' : ''} onClick={() => setTab('lowstock')} />
            <Kpi icon={AlertTriangle} tone="bg-red-500" label="بدون سعر جملة" value={nf(s.missingCostData)} valueClass={s.missingCostData > 0 ? 'text-red-600' : ''} onClick={() => setTab('nocost')} />
            <Kpi icon={Package} tone="bg-slate-500" label="منتجات نشطة" value={nf(s.productCount)} />
          </div>

          {/* Tabs */}
          <div className={`flex flex-wrap items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            {tabs.map((tb) => (
              <button key={tb.key} type="button" onClick={() => setTab(tb.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  tab === tb.key ? 'bg-blue-900 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                } ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <tb.icon className="w-4 h-4" />
                {tb.label}
                <span className={`text-xs rounded-full px-1.5 ${tab === tb.key ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>
                  {nf(tb.count)}
                </span>
              </button>
            ))}
            <button type="button" onClick={exportCsv}
              className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors ${dir === 'rtl' ? 'mr-auto flex-row-reverse' : 'ml-auto'}`}>
              <Download className="w-4 h-4" />
              تصدير CSV
            </button>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {tab === 'profit' && <ProfitTable rows={profitRows} maxProfit={maxProfit} dir={dir} />}
              {tab === 'bestsellers' && <BestSellersTable rows={bestSellers} maxQty={maxQty} dir={dir} />}
              {tab === 'offers' && <OffersTable rows={offerRows} dir={dir} />}
              {tab === 'lowstock' && <LowStockTable rows={lowStockRows} dir={dir} />}
              {tab === 'nocost' && <NoCostTable rows={noCostRows} dir={dir} />}
              {tab === 'weak' && <WeakMarginTable rows={weakRows} dir={dir} />}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function Kpi({ icon: Icon, tone, label, value, valueClass, onClick }: {
  icon: typeof Coins; tone: string; label: string; value: string; valueClass?: string; onClick?: () => void
}) {
  const body = (
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${tone} shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 truncate">{label}</p>
          <p className={`text-lg font-bold text-gray-900 ${valueClass ?? ''}`}>{value}</p>
        </div>
      </div>
    </CardContent>
  )
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="text-start">
        <Card className="h-full transition-shadow hover:shadow-md hover:border-blue-200 cursor-pointer">{body}</Card>
      </button>
    )
  }
  return <Card>{body}</Card>
}

const Th = ({ children, dir }: { children: React.ReactNode; dir: string }) => (
  <th className={`px-4 py-3 font-medium text-gray-500 whitespace-nowrap ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{children}</th>
)

function Rank({ i }: { i: number }) {
  const medal = i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'text-gray-400'
  return <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${medal}`}>{i + 1}</span>
}

function EmptyRow({ span, text }: { span: number; text: string }) {
  return <tr><td colSpan={span} className="px-4 py-10 text-center text-gray-400">{text}</td></tr>
}

function StockCell({ stock }: { stock: number }) {
  const tone = stock <= 0 ? 'text-red-600' : stock <= LOW_STOCK_THRESHOLD ? 'text-orange-600' : 'text-gray-700'
  return <span className={`font-semibold ${tone}`}>{nf(stock)}</span>
}

function ProfitTable({ rows, maxProfit, dir }: { rows: ProductInsightRow[]; maxProfit: number; dir: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-gray-200 bg-gray-50/50">
          <Th dir={dir}>#</Th><Th dir={dir}>المنتج</Th><Th dir={dir}>الكمية المباعة</Th>
          <Th dir={dir}>الإيراد</Th><Th dir={dir}>الربح المحقق</Th><Th dir={dir}>نسبة الربح</Th>
        </tr></thead>
        <tbody>
          {rows.length === 0 && <EmptyRow span={6} text="لا توجد بيانات" />}
          {rows.map((r, i) => (
            <tr key={r.productId} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-3"><Rank i={i} /></td>
              <td className="px-4 py-3"><ProductCell row={r} /></td>
              <td className="px-4 py-3 text-gray-700">{nf(r.quantitySold)}</td>
              <td className="px-4 py-3 text-gray-700">{formatCurrency(r.revenue)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${r.soldProfit >= 0 ? 'text-green-600' : 'text-red-600'} shrink-0`}>
                    {formatCurrency(r.soldProfit)}
                  </span>
                  <Bar value={r.soldProfit} max={maxProfit} className="bg-green-500" />
                </div>
              </td>
              <td className="px-4 py-3"><MarginPill margin={r.marginPercent} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BestSellersTable({ rows, maxQty, dir }: { rows: ProductInsightRow[]; maxQty: number; dir: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-gray-200 bg-gray-50/50">
          <Th dir={dir}>#</Th><Th dir={dir}>المنتج</Th><Th dir={dir}>الكمية المباعة</Th>
          <Th dir={dir}>عدد الطلبات</Th><Th dir={dir}>الإيراد</Th><Th dir={dir}>الربح المحقق</Th>
        </tr></thead>
        <tbody>
          {rows.length === 0 && <EmptyRow span={6} text="لا توجد مبيعات في هذه الفترة" />}
          {rows.map((r, i) => (
            <tr key={r.productId} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-3"><Rank i={i} /></td>
              <td className="px-4 py-3"><ProductCell row={r} /></td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 shrink-0">{nf(r.quantitySold)}</span>
                  <Bar value={r.quantitySold} max={maxQty} className="bg-blue-600" />
                </div>
              </td>
              <td className="px-4 py-3 text-gray-700">{nf(r.orderCount)}</td>
              <td className="px-4 py-3 text-gray-700">{formatCurrency(r.revenue)}</td>
              <td className="px-4 py-3">
                <span className={r.soldProfit >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(r.soldProfit)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function OffersTable({ rows, dir }: { rows: ProductInsightRow[]; dir: string }) {
  return (
    <div className="overflow-x-auto">
      <div className="px-4 py-3 text-xs text-gray-500 bg-emerald-50 border-b border-emerald-100">
        منتجات ذات هامش ربح جيد (٢٥٪ فأكثر) وغير مشمولة بعرض حالياً — يمكنك تقديم خصم مع بقاء الربح. «أقصى خصم» يبقي هامشاً لا يقل عن ١٠٪.
      </div>
      <table className="w-full text-sm">
        <thead><tr className="border-b border-gray-200 bg-gray-50/50">
          <Th dir={dir}>المنتج</Th><Th dir={dir}>سعر البيع</Th><Th dir={dir}>سعر الجملة</Th>
          <Th dir={dir}>نسبة الربح</Th><Th dir={dir}>أقصى خصم ممكن</Th><Th dir={dir}>المخزون</Th><Th dir={dir}>الحالة</Th>
        </tr></thead>
        <tbody>
          {rows.length === 0 && <EmptyRow span={7} text="لا توجد فرص عروض حالياً" />}
          {rows.map((r) => (
            <tr key={r.productId} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-3"><ProductCell row={r} /></td>
              <td className="px-4 py-3 text-gray-900 font-medium">{r.sellingPrice != null ? formatCurrency(r.sellingPrice) : '—'}</td>
              <td className="px-4 py-3 text-gray-500">{r.wholesalePrice != null ? formatCurrency(r.wholesalePrice) : '—'}</td>
              <td className="px-4 py-3"><MarginPill margin={r.marginPercent} /></td>
              <td className="px-4 py-3">
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                  حتى {nf(r.maxDiscountPercent ?? 0)}%
                </span>
              </td>
              <td className="px-4 py-3"><StockCell stock={r.stock} /></td>
              <td className="px-4 py-3">
                {r.quantitySold === 0
                  ? <span className="text-xs text-amber-600">بطيء الحركة — يحتاج ترويج</span>
                  : <span className="text-xs text-gray-400">يُباع بالفعل</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LowStockTable({ rows, dir }: { rows: ProductInsightRow[]; dir: string }) {
  return (
    <div className="overflow-x-auto">
      <div className="px-4 py-3 text-xs text-gray-500 bg-orange-50 border-b border-orange-100">
        منتجات مخزونها {LOW_STOCK_THRESHOLD} قطعة أو أقل — مرتبة من الأقل. اضغط المنتج لتعديل المخزون.
      </div>
      <table className="w-full text-sm">
        <thead><tr className="border-b border-gray-200 bg-gray-50/50">
          <Th dir={dir}>المنتج</Th><Th dir={dir}>المخزون الحالي</Th><Th dir={dir}>الوحدة</Th>
          <Th dir={dir}>سعر البيع</Th><Th dir={dir}>نسبة الربح</Th><Th dir={dir}>الكمية المباعة</Th>
        </tr></thead>
        <tbody>
          {rows.length === 0 && <EmptyRow span={6} text="لا توجد منتجات بمخزون منخفض 🎉" />}
          {rows.map((r) => (
            <tr key={r.productId} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-3"><ProductCell row={r} /></td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-2">
                  <StockCell stock={r.stock} />
                  {r.stock <= 0
                    ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">نفد</span>
                    : <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">منخفض</span>}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500">{r.unitLabel ?? '—'}</td>
              <td className="px-4 py-3 text-gray-900">{r.sellingPrice != null ? formatCurrency(r.sellingPrice) : '—'}</td>
              <td className="px-4 py-3"><MarginPill margin={r.marginPercent} /></td>
              <td className="px-4 py-3 text-gray-700">{nf(r.quantitySold)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function NoCostTable({ rows, dir }: { rows: ProductInsightRow[]; dir: string }) {
  return (
    <div className="overflow-x-auto">
      <div className="px-4 py-3 text-xs text-gray-500 bg-red-50 border-b border-red-100">
        منتجات بدون سعر جملة — لا يمكن حساب ربحها. اضغط «إضافة سعر الجملة» لفتح المنتج وإدخال سعر الجملة لكل وحدة.
      </div>
      <table className="w-full text-sm">
        <thead><tr className="border-b border-gray-200 bg-gray-50/50">
          <Th dir={dir}>المنتج</Th><Th dir={dir}>سعر البيع</Th><Th dir={dir}>المخزون</Th>
          <Th dir={dir}>الكمية المباعة</Th><Th dir={dir}>الإجراء</Th>
        </tr></thead>
        <tbody>
          {rows.length === 0 && <EmptyRow span={5} text="كل المنتجات لها سعر جملة 🎉" />}
          {rows.map((r) => (
            <tr key={r.productId} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-3"><ProductCell row={r} /></td>
              <td className="px-4 py-3 text-gray-900">{r.sellingPrice != null ? formatCurrency(r.sellingPrice) : '—'}</td>
              <td className="px-4 py-3"><StockCell stock={r.stock} /></td>
              <td className="px-4 py-3 text-gray-700">{nf(r.quantitySold)}</td>
              <td className="px-4 py-3">
                <Link href={productHref(r.productId)}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 px-3 py-1.5 rounded-lg transition-colors ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <PlusCircle className="w-3.5 h-3.5" />
                  إضافة سعر الجملة
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function WeakMarginTable({ rows, dir }: { rows: ProductInsightRow[]; dir: string }) {
  return (
    <div className="overflow-x-auto">
      <div className="px-4 py-3 text-xs text-gray-500 bg-amber-50 border-b border-amber-100">
        منتجات هامش ربحها أقل من ١٠٪ أو تُباع بخسارة — راجع سعر البيع أو سعر الجملة.
      </div>
      <table className="w-full text-sm">
        <thead><tr className="border-b border-gray-200 bg-gray-50/50">
          <Th dir={dir}>المنتج</Th><Th dir={dir}>سعر البيع</Th><Th dir={dir}>سعر الجملة</Th>
          <Th dir={dir}>ربح الوحدة</Th><Th dir={dir}>نسبة الربح</Th><Th dir={dir}>الملاحظة</Th>
        </tr></thead>
        <tbody>
          {rows.length === 0 && <EmptyRow span={6} text="لا توجد هوامش ضعيفة 🎉" />}
          {rows.map((r) => (
            <tr key={r.productId} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-3"><ProductCell row={r} /></td>
              <td className="px-4 py-3 text-gray-900">{r.sellingPrice != null ? formatCurrency(r.sellingPrice) : '—'}</td>
              <td className="px-4 py-3 text-gray-500">{r.wholesalePrice != null ? formatCurrency(r.wholesalePrice) : '—'}</td>
              <td className="px-4 py-3">
                <span className={(r.profitPerUnit ?? 0) < 0 ? 'text-red-600' : 'text-gray-700'}>
                  {r.profitPerUnit != null ? formatCurrency(r.profitPerUnit) : '—'}
                </span>
              </td>
              <td className="px-4 py-3"><MarginPill margin={r.marginPercent} /></td>
              <td className="px-4 py-3">
                {(r.marginPercent ?? 0) < 0
                  ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">بيع بخسارة</span>
                  : <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">هامش ضعيف</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
