'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useLanguage } from '@/lib/LanguageContext'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { updateAdminOrderStatus } from '@/actions/admin-orders'

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const

interface Props {
  order: {
    id: string
    orderNumber: string
    totalPrice: number
    status: string
    statusHistory: unknown
    deliveryAddress: string
    deliveryCity: string
    buyerNotes: string | null
    adminNotes: string | null
    createdAt: Date
    buyer: {
      id: string
      username: string
      email: string | null
      storeName: string | null
      phone: string | null
      city: string | null
      businessAddress: string | null
    }
    items: Array<{
      id: string
      productName: string
      productNameEn: string | null
      productImage: string | null
      variantSize: string | null
      variantSizeEn: string | null
      unitLabel: string | null
      unitLabelEn: string | null
      quantity: number
      unit: string
      pricePerUnit: number
      totalPrice: number
      product: { id: string; name: string; image: string | null }
    }>
  }
}

export function OrderDetailClient({ order }: Props) {
  const { t, dir, lang } = useLanguage()
  const [isUpdating, setIsUpdating] = useState(false)
  const [statusNote, setStatusNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const history = (order.statusHistory as Array<{ status: string; timestamp: string; note?: string }>) || []

  async function handleStatusUpdate(newStatus: string) {
    setIsUpdating(true)
    setError(null)

    const formData = new FormData()
    formData.set('orderId', order.id)
    formData.set('status', newStatus)
    if (statusNote) formData.set('note', statusNote)

    const result = await updateAdminOrderStatus(formData)

    if (!result.success) {
      setError(result.error || 'Failed to update status')
    }
    setStatusNote('')
    setIsUpdating(false)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className={`flex items-center gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <Link href="/admin/orders" className="text-gray-500 hover:text-gray-700">
          <ArrowRight className={`w-5 h-5 ${dir === 'rtl' ? '' : 'rotate-180'}`} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.orderManagement.orderDetails}</h1>
          <p className="text-sm text-gray-500 font-mono">#{order.orderNumber.slice(-8)}</p>
        </div>
        <div className={dir === 'rtl' ? 'mr-auto' : 'ml-auto'}>
          <Badge status={order.status}>{t.orderStatus[order.status as keyof typeof t.orderStatus]}</Badge>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Order Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">{t.orderManagement.items}</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className={`flex items-center gap-4 p-3 bg-gray-50 rounded-lg ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      {item.productImage || item.product.image ? (
                        <Image src={item.productImage || item.product.image || ''} alt={item.productName} width={64} height={64} className="object-cover w-full h-full" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg">📦</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {lang === 'ar' ? item.productName : (item.productNameEn || item.productName)}
                      </p>
                      <div className="text-sm text-gray-600 space-y-0.5">
                        {item.variantSize && (
                          <p>{lang === 'ar' ? item.variantSize : (item.variantSizeEn || item.variantSize)}</p>
                        )}
                        {item.unitLabel && (
                          <p>{lang === 'ar' ? item.unitLabel : (item.unitLabelEn || item.unitLabel)}</p>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {item.quantity} × {formatCurrency(item.pricePerUnit)}
                      </p>
                    </div>
                    <p className="font-semibold text-gray-900">{formatCurrency(item.totalPrice)}</p>
                  </div>
                ))}
              </div>
              <div className={`border-t border-gray-200 mt-4 pt-4 flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <span className="text-lg font-semibold text-gray-900">{t.orderManagement.total}</span>
                <span className="text-xl font-bold text-blue-900">{formatCurrency(order.totalPrice)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Status History */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">{t.orderManagement.statusHistory}</h2>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-gray-500 text-sm">{t.common.noResults}</p>
              ) : (
                <div className="space-y-3">
                  {history.map((h, i) => (
                    <div key={i} className={`flex items-start gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      <div className="w-3 h-3 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                      <div>
                        <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                          <Badge status={h.status}>{t.orderStatus[h.status as keyof typeof t.orderStatus]}</Badge>
                          <span className="text-xs text-gray-500">{formatDateTime(h.timestamp)}</span>
                        </div>
                        {h.note && <p className="text-sm text-gray-600 mt-1">{h.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right - Customer Info & Status Update */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">{t.orderManagement.customerInfo}</h2>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500">{t.userManagement.name}</p>
                <p className="font-medium text-gray-900">{order.buyer.username}</p>
              </div>
              {order.buyer.storeName && (
                <div>
                  <p className="text-gray-500">{t.userManagement.businessName}</p>
                  <p className="font-medium text-gray-900">{order.buyer.storeName}</p>
                </div>
              )}
              {order.buyer.phone && (
                <div>
                  <p className="text-gray-500">{t.userManagement.phone}</p>
                  <p className="font-medium text-gray-900" dir="ltr">{order.buyer.phone}</p>
                </div>
              )}
              <div>
                <p className="text-gray-500">{t.orderManagement.deliveryCity}</p>
                <p className="font-medium text-gray-900">{order.deliveryCity}</p>
              </div>
              <div>
                <p className="text-gray-500">{t.orderManagement.deliveryAddress}</p>
                <p className="font-medium text-gray-900">{order.deliveryAddress}</p>
              </div>
              {order.buyerNotes && (
                <div>
                  <p className="text-gray-500">{t.orderManagement.buyerNotes}</p>
                  <p className="font-medium text-gray-900">{order.buyerNotes}</p>
                </div>
              )}
              <div>
                <p className="text-gray-500">{t.orderManagement.date}</p>
                <p className="font-medium text-gray-900">{formatDate(order.createdAt)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Update Status */}
          {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">{t.orderManagement.updateStatus}</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                <textarea
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder={t.orderManagement.statusNote}
                  className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm"
                  rows={2}
                />
                <div className="space-y-2">
                  {ORDER_STATUSES.filter((s) => s !== order.status).map((s) => (
                    <Button
                      key={s}
                      variant={s === 'CANCELLED' ? 'danger' : 'outline'}
                      size="sm"
                      className="w-full"
                      onClick={() => handleStatusUpdate(s)}
                      isLoading={isUpdating}
                    >
                      {t.orderStatus[s]}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
