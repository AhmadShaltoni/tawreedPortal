import Link from 'next/link'
import { ShoppingCart, Package, CheckCircle, DollarSign } from 'lucide-react'
import { Card, CardContent, Button, StatusBadge } from '@/components/ui'
import { getSupplierOrders } from '@/actions/orders'
import { formatDate, formatCurrency } from '@/lib/utils'
import { UNIT_LABELS, type Unit } from '@/types'

export default async function SupplierOrdersPage() {
  const orders = await getSupplierOrders()

  const activeOrders = orders.filter((o) => ['CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(o.status))
  const completedOrders = orders.filter((o) => o.status === 'DELIVERED')
  const cancelledOrders = orders.filter((o) => o.status === 'CANCELLED')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
        <p className="text-gray-600">Manage and fulfill your orders</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeOrders.length}</p>
              <p className="text-sm text-gray-600">To Fulfill</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedOrders.length}</p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {formatCurrency(completedOrders.reduce((sum, o) => sum + o.totalPrice, 0))}
              </p>
              <p className="text-sm text-gray-600">Revenue</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{orders.length}</p>
              <p className="text-sm text-gray-600">Total Orders</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No orders yet</h3>
            <p className="text-gray-600 mb-4">
              Your accepted offers will appear here as orders
            </p>
            <Link href="/supplier/requests">
              <Button variant="secondary">Browse Requests</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Active Orders */}
          {activeOrders.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Orders to Fulfill</h2>
              <div className="space-y-3">
                {activeOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </div>
          )}

          {/* Completed Orders */}
          {completedOrders.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-green-600">Completed</h2>
              <div className="space-y-3">
                {completedOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </div>
          )}

          {/* Cancelled Orders */}
          {cancelledOrders.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-gray-500">Cancelled</h2>
              <div className="space-y-3">
                {cancelledOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function OrderCard({ order }: { order: Awaited<ReturnType<typeof getSupplierOrders>>[0] }) {
  return (
    <Link href={`/supplier/orders/${order.id}`}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-medium text-gray-900">#{order.orderNumber.slice(-8)}</h3>
                <StatusBadge status={order.status} />
              </div>
              {order.items && order.items[0] && (
                <p className="text-sm text-gray-600 mb-1">
                  {order.items[0].productName} • {order.items[0].quantity} {UNIT_LABELS[order.items[0].unit as Unit]}
                </p>
              )}
              <p className="text-sm text-gray-500">
                To: {order.buyer.storeName || order.buyer.username} • {order.deliveryCity}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Created {formatDate(order.createdAt)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(order.totalPrice)}
              </p>
              {order.expectedDelivery && (
                <p className="text-sm text-gray-500">
                  Due: {formatDate(order.expectedDelivery)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
