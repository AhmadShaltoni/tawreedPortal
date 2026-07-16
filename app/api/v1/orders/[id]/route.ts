import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { updateBuyerOrderSchema } from '@/lib/validations'
import { isStaffRole } from '@/lib/permissions'

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
      redeemedReward: {
        include: { reward: { select: { id: true, name: true, nameEn: true } } },
      },
      editRequests: {
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!order) return apiError('Order not found', 404)

  // Only the buyer or a staff member can view the order
  if (order.buyerId !== user.id && !isStaffRole(user.role)) {
    return apiError('Not authorized', 403)
  }

  // Format order items with all selection details that were saved at order time
  const formattedItems = order.items.map((item) => ({
    id: item.id,
    product: item.product,
    // Size (variant) selected at order time
    selectedSize: {
      size: item.variantSize,
      sizeEn: item.variantSizeEn,
    },
    // Flavor (option) selected at order time - if any
    selectedFlavor: item.variantOptionName ? {
      name: item.variantOptionName,
      nameEn: item.variantOptionNameEn,
    } : null,
    // Selling unit selected at order time (e.g., piece, dozen, carton)
    selectedUnit: {
      label: item.unitLabel,
      labelEn: item.unitLabelEn,
      piecesPerUnit: item.piecesPerUnit,
    },
    quantity: item.quantity,
    unit: item.unit,
    pricing: {
      pricePerUnit: item.pricePerUnit,
      originalPricePerUnit: item.originalPricePerUnit,
      discountPercent: item.discountPercent,
      subtotal: item.totalPrice,
    },
    note: item.note || null,
    isReward: item.isReward,
    // Live selection references so the buyer-edit editor can preload lines
    // (null on legacy/RFQ orders and reward prize items — those aren't editable)
    variantId: item.variantId,
    variantOptionId: item.variantOptionId,
    productUnitId: item.productUnitId,
  }))

  // Loyalty reward applied to this order (for "reward used" banner)
  const redeemedReward = order.redeemedReward
    ? {
        rewardName: order.redeemedReward.reward?.name ?? null,
        rewardNameEn: order.redeemedReward.reward?.nameEn ?? null,
        rewardType: order.redeemedReward.rewardType,
        couponCode: order.redeemedReward.couponCode,
        productName: order.redeemedReward.productName,
        productNameEn: order.redeemedReward.productNameEn,
      }
    : null

  // Pending buyer edit request (if any) — surfaced so the app can show a
  // "pending review" banner and block further edits until it's resolved.
  const pending = order.editRequests[0]
  const pendingEditRequest = pending
    ? {
        id: pending.id,
        status: pending.status,
        diff: pending.diff,
        estimatedTotal: pending.estimatedTotal,
        estimatedDeliveryFee: pending.estimatedDeliveryFee,
        buyerMessage: pending.buyerMessage,
        createdAt: pending.createdAt,
      }
    : null

  return apiResponse({
    order: {
      ...order,
      editRequests: undefined,
      items: formattedItems,
      deliveryAddressDetails: order.deliveryAddressDetails,
      buyerNotes: order.buyerNotes,
      notes: order.buyerNotes,
      statusHistory: order.statusHistory,
      redeemedReward,
      pendingEditRequest,
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
  const updateData: Prisma.OrderUpdateInput = {}
  if (validated.data.deliveryAddress) updateData.deliveryAddress = validated.data.deliveryAddress
  if (validated.data.deliveryCity) updateData.deliveryCity = validated.data.deliveryCity
  if (validated.data.deliveryAddressDetails !== undefined) {
    updateData.deliveryAddressDetails = validated.data.deliveryAddressDetails?.trim() || null
  }
  if (validated.data.buyerNotes !== undefined || validated.data.notes !== undefined) {
    const resolvedNotes = validated.data.buyerNotes ?? validated.data.notes
    updateData.buyerNotes = resolvedNotes?.trim() || null
  }

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
