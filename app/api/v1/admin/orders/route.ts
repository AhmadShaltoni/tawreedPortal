import { NextRequest } from 'next/server'
import { authenticateStaffApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { getAdminOrders } from '@/actions/admin-orders'

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

/**
 * GET /api/v1/admin/orders — staff only (ADMIN with 'orders' permission / SUPER_ADMIN)
 * All platform orders for the mobile admin section, newest first.
 * Query: status, search, page, limit
 */
export async function GET(request: NextRequest) {
  const { user, error, status } = await authenticateStaffApiRequest(request, 'orders')
  if (!user) return apiError(error ?? 'Unauthorized', status)

  const { searchParams } = new URL(request.url)
  const statusFilter = searchParams.get('status') || undefined
  const search = searchParams.get('search') || undefined
  const page = Number(searchParams.get('page')) || 1
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 100)

  const { orders, total, pages, statusCounts } = await getAdminOrders({
    status: statusFilter,
    search,
    page,
    limit,
  })

  return apiResponse({
    orders: orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalPrice: order.totalPrice,
      deliveryFee: order.deliveryFee,
      createdAt: order.createdAt,
      itemCount: order.items.length,
      pendingEditCount: order._count.editRequests,
      buyer: {
        id: order.buyer.id,
        username: order.buyer.username,
        storeName: order.buyer.storeName,
        phone: order.buyer.phone,
        city: order.buyer.city,
      },
      items: order.items.map((item) => ({
        id: item.id,
        productName: item.productName,
        productImage: item.productImage ?? item.product?.image ?? null,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
        isReward: item.isReward,
      })),
    })),
    total,
    pages,
    page,
    statusCounts,
  })
}
