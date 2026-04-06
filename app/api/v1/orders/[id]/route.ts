import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

// GET /api/v1/orders/[id] - Get order details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await authenticateApiRequest(request)
  if (!user) return apiError(error ?? 'Unauthorized', 401)

  const { id } = await params

  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: {
        include: { product: { select: { id: true, name: true, nameEn: true, image: true } } },
      },
    },
  })

  if (!order) return apiError('Order not found', 404)

  // Only the buyer or admin can view the order
  if (order.buyerId !== user.id && user.role !== 'ADMIN') {
    return apiError('Not authorized', 403)
  }

  return apiResponse({ order })
}
