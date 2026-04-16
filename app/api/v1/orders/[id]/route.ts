import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { updateBuyerOrderSchema } from '@/lib/validations'

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

// GET /api/v1/orders/[id] - Get order details with buyer notes and status history
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

  return apiResponse({ 
    order: {
      ...order,
      buyerNotes: order.buyerNotes,
      statusHistory: order.statusHistory,
    }
  })
}

// PATCH /api/v1/orders/[id] - Update order (only buyer, only if PENDING)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await authenticateApiRequest(request)
  if (!user) return apiError(error ?? 'Unauthorized', 401)

  const { id } = await params
  const body = await request.json()

  const order = await db.order.findUnique({ where: { id } })
  if (!order) return apiError('Order not found', 404)

  // Only the buyer can update their own order
  if (order.buyerId !== user.id) {
    return apiError('Not authorized', 403)
  }

  // Can only update PENDING orders
  if (order.status !== 'PENDING') {
    return apiResponse({ 
      error: 'Cannot modify order',
      message: `Order status is ${order.status}, only PENDING orders can be modified` 
    }, 400)
  }

  // Validate input
  const validated = updateBuyerOrderSchema.safeParse(body)
  if (!validated.success) {
    return apiResponse({ 
      error: 'Validation failed', 
      errors: validated.error.flatten().fieldErrors 
    }, 400)
  }

  // Update only the fields that are provided
  const updateData: any = {}
  if (validated.data.deliveryAddress) updateData.deliveryAddress = validated.data.deliveryAddress
  if (validated.data.deliveryCity) updateData.deliveryCity = validated.data.deliveryCity
  if (validated.data.buyerNotes !== undefined) updateData.buyerNotes = validated.data.buyerNotes

  if (Object.keys(updateData).length === 0) {
    return apiResponse({ error: 'No fields to update' }, 400)
  }

  const updatedOrder = await db.order.update({
    where: { id },
    data: updateData,
    include: {
      items: {
        include: { product: { select: { id: true, name: true, nameEn: true, image: true } } },
      },
    },
  })

  return apiResponse({ order: updatedOrder })
}
