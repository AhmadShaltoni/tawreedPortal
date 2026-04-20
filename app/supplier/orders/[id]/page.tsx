import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Calendar, Package, DollarSign, Store, CheckCircle } from 'lucide-react'
import { Card, CardHeader, CardContent, StatusBadge } from '@/components/ui'
import { getOrderById } from '@/actions/orders'
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils'
import { UNIT_LABELS, type Unit } from '@/types'
import { UpdateOrderStatusForm } from './UpdateOrderStatusForm'

export default async function SupplierOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const order = await getOrderById(id)

  if (!order) {
    notFound()
  }

  const statusHistory = order.statusHistory as Array<{ status: string; timestamp: string; note?: string }>
  const canUpdateStatus = ['CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(order.status)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Link */}
      <Link href="/supplier/orders" className="inline-flex items-center text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to orders
      </Link>

      {/* Order Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">Order #{order.orderNumber.slice(-8)}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-gray-600">
            Created on {formatDateTime(order.createdAt)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Order Value</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(order.totalPrice)}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Info */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Order Details</h2>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {order.items && order.items[0] && (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-blue-900" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Product</p>
                        <p className="font-medium">{order.items[0].productName}</p>
                      </div>
                    </div>
                    {order.items[0].variantSize && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <span className="text-indigo-600 font-bold">📦</span>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Size</p>
                          <p className="font-medium">{order.items[0].variantSize}</p>
                        </div>
                      </div>
                    )}
                    {order.items[0].unitLabel && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                          <span className="text-orange-600 font-bold">📏</span>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Unit</p>
                          <p className="font-medium">{order.items[0].unitLabel}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <span className="text-green-600 font-bold">#</span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Quantity</p>
                        <p className="font-medium">{order.items[0].quantity} {UNIT_LABELS[order.items[0].unit as Unit]}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Price per Unit</p>
                        <p className="font-medium">{formatCurrency(order.items[0].pricePerUnit)}</p>
                      </div>
                    </div>
                  </>
                )}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Price</p>
                    <p className="font-medium text-lg">{formatCurrency(order.totalPrice)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Info */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Delivery Details</h2>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">City</p>
                    <p className="font-medium">{order.deliveryCity}</p>
                  </div>
                </div>
                {order.deliveryAddress && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Full Address</p>
                      <p className="font-medium">{order.deliveryAddress}</p>
                    </div>
                  </div>
                )}
                {order.expectedDelivery && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Due By</p>
                      <p className="font-medium">{formatDate(order.expectedDelivery)}</p>
                    </div>
                  </div>
                )}
                {order.actualDelivery && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Delivered On</p>
                      <p className="font-medium">{formatDate(order.actualDelivery)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Status History */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Order Timeline</h2>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {statusHistory.map((entry, index) => (
                  <div key={index} className="flex gap-4 pb-6 last:pb-0">
                    <div className="relative">
                      <div className={`w-3 h-3 rounded-full ${
                        index === statusHistory.length - 1 
                          ? 'bg-orange-500' 
                          : 'bg-gray-300'
                      }`} />
                      {index < statusHistory.length - 1 && (
                        <div className="absolute top-3 left-1.5 w-px h-full -translate-x-1/2 bg-gray-200" />
                      )}
                    </div>
                    <div className="-mt-0.5">
                      <p className="font-medium text-gray-900">{entry.status}</p>
                      <p className="text-sm text-gray-500">{formatDateTime(entry.timestamp)}</p>
                      {entry.note && (
                        <p className="text-sm text-gray-600 mt-1">{entry.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Update Status */}
          {canUpdateStatus && (
            <UpdateOrderStatusForm orderId={order.id} currentStatus={order.status} />
          )}

          {/* Buyer Info */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Buyer</h3>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                  <Store className="w-7 h-7 text-blue-900" />
                </div>
                <div>
                  <p className="font-semibold">{order.buyer.storeName || order.buyer.username}</p>
                  <p className="text-sm text-gray-600">{order.buyer.city}</p>
                  {order.buyer.phone && (
                    <p className="text-sm text-gray-500">{order.buyer.phone}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Info */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Order Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Order Number</span>
                  <span className="font-mono">{order.orderNumber.slice(-8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <StatusBadge status={order.status} />
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Created</span>
                  <span>{formatDate(order.createdAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
