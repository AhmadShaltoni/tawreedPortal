'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Search,
  X,
  Phone,
  MapPin,
  StickyNote,
  Star,
  Package,
  PackageSearch,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useLanguage } from '@/lib/LanguageContext'
import { interpolate } from '@/lib/i18n'
import { formatCurrency, formatDate } from '@/lib/utils'

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const

const STATUS_STYLES: Record<string, { dot: string; badge: string }> = {
  PENDING: { dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  CONFIRMED: { dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
  PROCESSING: { dot: 'bg-indigo-500', badge: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20' },
  SHIPPED: { dot: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700 ring-violet-600/20' },
  DELIVERED: { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  CANCELLED: { dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 ring-red-600/20' },
}

interface Props {
  orders: Array<{
    id: string
    orderNumber: string
    totalPrice: number
    deliveryFee: number
    status: string
    createdAt: Date
    deliveryCity: string
    deliveryAddressDetails: string | null
    buyerNotes: string | null
    loyaltyPointsEarned: number | null
    buyer: { id: string; username: string; storeName: string | null; phone: string | null; city: string | null }
    items: Array<{
      id: string
      productName: string
      productImage: string | null
      quantity: number
      product: { id: string; name: string; image: string | null } | null
    }>
    _count?: { editRequests: number }
  }>
  total: number
  pages: number
  currentPage: number
  currentStatus?: string
  currentSearch?: string
  statusCounts: Record<string, number>
}

function StatusPill({ status, label }: { status: string; label: string }) {
  const style = STATUS_STYLES[status] ?? { dot: 'bg-gray-400', badge: 'bg-gray-50 text-gray-700 ring-gray-500/20' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset whitespace-nowrap ${style.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {label}
    </span>
  )
}

function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(
    typeof date === 'string' ? new Date(date) : date
  )
}

function getPageNumbers(current: number, total: number): Array<number | '...'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: Array<number | '...'> = [1]
  if (current > 3) pages.push('...')
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}

export function OrderListClient({ orders, total, pages, currentPage, currentStatus, currentSearch, statusCounts }: Props) {
  const { t, dir } = useLanguage()
  const router = useRouter()
  const [search, setSearch] = useState(currentSearch || '')

  const allCount = Object.values(statusCounts).reduce((sum, n) => sum + n, 0)

  function buildUrl(params: { page?: number; status?: string; search?: string }) {
    const query = new URLSearchParams()
    const searchValue = params.search ?? currentSearch
    const statusValue = 'status' in params ? params.status : currentStatus
    if (searchValue) query.set('search', searchValue)
    if (statusValue) query.set('status', statusValue)
    if (params.page && params.page > 1) query.set('page', String(params.page))
    const qs = query.toString()
    return `/admin/orders${qs ? `?${qs}` : ''}`
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    router.push(buildUrl({ search }))
  }

  function clearSearch() {
    setSearch('')
    router.push(buildUrl({ search: '' }))
  }

  const showingFrom = total === 0 ? 0 : (currentPage - 1) * 20 + 1
  const showingTo = Math.min(currentPage * 20, total)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.orderManagement.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{t.orderManagement.subtitle}</p>
        </div>

        <form onSubmit={handleSearch} className="w-full sm:max-w-sm">
          <div className="relative">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.orderManagement.searchPlaceholder}
              className="w-full bg-white border border-gray-200 rounded-xl py-2.5 ps-10 pe-9 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {search && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute top-1/2 -translate-y-1/2 end-2.5 p-0.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1">
        <Link
          href={buildUrl({ status: '' })}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap transition-colors ${
            !currentStatus
              ? 'bg-blue-900 text-white border-blue-900'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          {t.orderManagement.all}
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${!currentStatus ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>
            {allCount}
          </span>
        </Link>
        {ORDER_STATUSES.map((s) => {
          const active = currentStatus === s
          const count = statusCounts[s] ?? 0
          return (
            <Link
              key={s}
              href={buildUrl({ status: s })}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap transition-colors ${
                active
                  ? 'bg-blue-900 text-white border-blue-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${STATUS_STYLES[s]?.dot ?? 'bg-gray-400'}`} />
              {t.orderStatus[s]}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>
                {count}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Orders */}
      <Card className="overflow-hidden">
        {orders.length === 0 ? (
          <div className="py-20 px-6 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <PackageSearch className="w-7 h-7 text-gray-400" />
            </div>
            <p className="font-medium text-gray-900">{t.orderManagement.noOrders}</p>
            <p className="text-sm text-gray-500 mt-1">{t.orderManagement.noOrdersDesc}</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-6 py-3.5 font-semibold text-start">{t.orderManagement.orderNumber}</th>
                    <th className="px-4 py-3.5 font-semibold text-start">{t.orderManagement.customer}</th>
                    <th className="px-4 py-3.5 font-semibold text-start">{t.orderManagement.items}</th>
                    <th className="px-4 py-3.5 font-semibold text-start">{t.orderManagement.total}</th>
                    <th className="px-4 py-3.5 font-semibold text-start">{t.orderManagement.status}</th>
                    <th className="px-4 py-3.5 font-semibold text-start">{t.orderManagement.date}</th>
                    <th className="px-4 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((order) => {
                    const customerName = order.buyer.storeName || order.buyer.username
                    return (
                      <tr
                        key={order.id}
                        onClick={() => router.push(`/admin/orders/${order.id}`)}
                        className="group hover:bg-blue-50/40 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 align-top">
                          <span className="font-mono text-xs font-semibold text-blue-900">
                            #{order.orderNumber.slice(-8)}
                          </span>
                          {!!order._count?.editRequests && (
                            <span className="ms-2 inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 text-[11px] font-semibold px-2 py-0.5 align-middle" title={t.orderManagement.pendingEdit}>
                              <Pencil className="w-3 h-3" />
                              {t.orderManagement.pendingEdit}
                            </span>
                          )}
                          {(order.deliveryAddressDetails || order.buyerNotes) && (
                            <div className="flex items-center gap-2 mt-1.5 text-gray-400">
                              {order.deliveryAddressDetails && (
                                <span className="inline-flex items-center gap-1 text-[11px]" title={t.orderManagement.hasAddressDetails}>
                                  <MapPin className="w-3 h-3" />
                                  {t.orderManagement.hasAddressDetails}
                                </span>
                              )}
                              {order.buyerNotes && (
                                <span className="inline-flex items-center gap-1 text-[11px]" title={t.orderManagement.hasNotes}>
                                  <StickyNote className="w-3 h-3" />
                                  {t.orderManagement.hasNotes}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-sm shrink-0">
                              {customerName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">{customerName}</p>
                              <div className="flex flex-wrap items-center gap-x-3 mt-0.5 text-xs text-gray-500">
                                {order.buyer.phone && (
                                  <span className="inline-flex items-center gap-1" dir="ltr">
                                    <Phone className="w-3 h-3" />
                                    {order.buyer.phone}
                                  </span>
                                )}
                                {(order.deliveryCity || order.buyer.city) && (
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {order.deliveryCity || order.buyer.city}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex items-center gap-2.5">
                            <div className="flex -space-x-2">
                              {order.items.slice(0, 3).map((item) => {
                                const img = item.productImage || item.product?.image
                                return img ? (
                                  <Image
                                    key={item.id}
                                    src={img}
                                    alt={item.productName}
                                    width={32}
                                    height={32}
                                    className="w-8 h-8 rounded-lg object-cover ring-2 ring-white bg-gray-100"
                                  />
                                ) : (
                                  <div key={item.id} className="w-8 h-8 rounded-lg bg-gray-100 ring-2 ring-white flex items-center justify-center">
                                    <Package className="w-4 h-4 text-gray-400" />
                                  </div>
                                )
                              })}
                              {order.items.length > 3 && (
                                <div className="w-8 h-8 rounded-lg bg-gray-200 ring-2 ring-white flex items-center justify-center text-[10px] font-semibold text-gray-600">
                                  +{order.items.length - 3}
                                </div>
                              )}
                            </div>
                            <span className="text-gray-600 whitespace-nowrap">
                              {order.items.length} {t.orderManagement.itemsUnit}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <p className="font-semibold text-gray-900 whitespace-nowrap">{formatCurrency(order.totalPrice)}</p>
                          {order.deliveryFee > 0 && (
                            <p className="text-[11px] text-gray-500 mt-0.5 whitespace-nowrap">
                              {interpolate(t.orderManagement.includesDelivery, { fee: formatCurrency(order.deliveryFee) })}
                            </p>
                          )}
                          {order.loyaltyPointsEarned != null && order.loyaltyPointsEarned > 0 && (
                            <p className="inline-flex items-center gap-1 text-[11px] text-amber-600 mt-0.5 whitespace-nowrap">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              {order.loyaltyPointsEarned} {t.orderManagement.pointsEarned}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <StatusPill status={order.status} label={t.orderStatus[order.status as keyof typeof t.orderStatus] ?? order.status} />
                        </td>
                        <td className="px-4 py-4 align-top">
                          <p className="text-gray-700 whitespace-nowrap">{formatDate(order.createdAt)}</p>
                          <p className="text-xs text-gray-400 mt-0.5" dir="ltr">{formatTime(order.createdAt)}</p>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          {dir === 'rtl' ? (
                            <ChevronLeft className="w-4 h-4 text-gray-300 group-hover:text-blue-900 transition-colors" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-900 transition-colors" />
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {orders.map((order) => {
                const customerName = order.buyer.storeName || order.buyer.username
                return (
                  <Link key={order.id} href={`/admin/orders/${order.id}`} className="block p-4 active:bg-blue-50/40">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-xs font-semibold text-blue-900 inline-flex items-center gap-2">
                        #{order.orderNumber.slice(-8)}
                        {!!order._count?.editRequests && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold px-1.5 py-0.5">
                            <Pencil className="w-2.5 h-2.5" />
                            {t.orderManagement.pendingEdit}
                          </span>
                        )}
                      </span>
                      <StatusPill status={order.status} label={t.orderStatus[order.status as keyof typeof t.orderStatus] ?? order.status} />
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-sm shrink-0">
                        {customerName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{customerName}</p>
                        <div className="flex flex-wrap items-center gap-x-3 text-xs text-gray-500">
                          {order.buyer.phone && (
                            <span className="inline-flex items-center gap-1" dir="ltr">
                              <Phone className="w-3 h-3" />
                              {order.buyer.phone}
                            </span>
                          )}
                          {(order.deliveryCity || order.buyer.city) && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {order.deliveryCity || order.buyer.city}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 text-sm">
                      <span className="text-gray-500">
                        {order.items.length} {t.orderManagement.itemsUnit} · {formatDate(order.createdAt)}
                      </span>
                      <span className="font-semibold text-gray-900">{formatCurrency(order.totalPrice)}</span>
                    </div>
                    {(order.deliveryAddressDetails || order.buyerNotes) && (
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                        {order.deliveryAddressDetails && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {t.orderManagement.hasAddressDetails}
                          </span>
                        )}
                        {order.buyerNotes && (
                          <span className="inline-flex items-center gap-1">
                            <StickyNote className="w-3 h-3" />
                            {t.orderManagement.hasNotes}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>

            {/* Footer: result count + pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-500">
                {interpolate(t.orderManagement.showingResults, { from: showingFrom, to: showingTo, total })}
              </p>

              {pages > 1 && (
                <nav className="flex items-center gap-1">
                  <Link
                    href={buildUrl({ page: Math.max(1, currentPage - 1) })}
                    aria-disabled={currentPage === 1}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                      currentPage === 1
                        ? 'text-gray-300 pointer-events-none'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {t.orderManagement.previous}
                  </Link>
                  {getPageNumbers(currentPage, pages).map((p, i) =>
                    p === '...' ? (
                      <span key={`ellipsis-${i}`} className="px-2 text-gray-400 text-xs">…</span>
                    ) : (
                      <Link
                        key={p}
                        href={buildUrl({ page: p })}
                        className={`min-w-8 text-center px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                          p === currentPage
                            ? 'bg-blue-900 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {p}
                      </Link>
                    )
                  )}
                  <Link
                    href={buildUrl({ page: Math.min(pages, currentPage + 1) })}
                    aria-disabled={currentPage === pages}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                      currentPage === pages
                        ? 'text-gray-300 pointer-events-none'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {t.orderManagement.next}
                  </Link>
                </nav>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
