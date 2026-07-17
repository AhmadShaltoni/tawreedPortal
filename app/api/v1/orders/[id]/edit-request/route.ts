import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { createOrderEditRequestSchema } from '@/lib/validations'
import { priceOrderItems, OrderPricingError, type DesiredItem } from '@/lib/order-pricing'
import { buildOrderEditDiff } from '@/lib/order-edits'
import { sendPushToRole } from '@/lib/push-notifications'

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

// POST /api/v1/orders/[id]/edit-request
// Buyer proposes a change to a PENDING order. Prices an estimate, stores a
// before → after diff, and notifies admins to review. Supersedes any earlier
// pending request for the same order.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await authenticateApiRequest(request)
  if (!user) return apiError(error ?? 'Unauthorized', 401)

  const { id } = await params
  const body = await request.json()

  const validated = createOrderEditRequestSchema.safeParse(body)
  if (!validated.success) {
    return apiResponse({ error: 'Validation failed', errors: validated.error.flatten().fieldErrors }, 400)
  }

  const order = await db.order.findUnique({
    where: { id },
    include: { items: true, redeemedReward: true },
  })
  if (!order) return apiError('Order not found', 404)
  if (order.buyerId !== user.id) return apiError('Not authorized', 403)
  if (order.status !== 'PENDING') {
    return apiError('لا يمكن تعديل الطلب إلا وهو قيد المراجعة', 400)
  }

  const desiredItems: DesiredItem[] = validated.data.items.map((i) => ({
    variantId: i.variantId,
    variantOptionId: i.variantOptionId ?? null,
    productUnitId: i.productUnitId ?? null,
    quantity: i.quantity,
    note: i.note ?? null,
  }))

  // Look up the discount code applied to the original order so the estimate
  // re-applies it (or fails clearly if it no longer qualifies after the edit).
  const usage = await db.discountCodeUsage.findFirst({
    where: { orderId: order.id },
    include: { discountCode: true },
  })
  const couponCode = usage?.discountCode?.code ?? null

  const proposedCityId = validated.data.deliveryCityId ?? order.deliveryCityId ?? null

  let priced
  try {
    priced = await priceOrderItems({
      items: desiredItems,
      userId: user.id,
      userPhone: user.phone,
      deliveryCityId: proposedCityId,
      couponCode,
      loyaltyCoupon: order.redeemedReward,
      // Stock is enforced authoritatively (via net deltas) when an admin
      // approves. A hard absolute check here would wrongly reject quantity
      // increases, since the order's own units are already reserved out of stock.
      checkStock: false,
    })
  } catch (err) {
    if (err instanceof OrderPricingError) return apiError(err.message, 400)
    throw err
  }

  const diff = buildOrderEditDiff({
    currentItems: order.items,
    proposedItems: priced.items,
    currentProductsTotal: order.totalPrice,
    currentDeliveryFee: order.deliveryFee,
    proposedProductsTotal: priced.productsTotal,
    proposedDeliveryFee: priced.deliveryFee,
    currentDelivery: {
      deliveryAddress: order.deliveryAddress,
      deliveryAddressDetails: order.deliveryAddressDetails,
      deliveryCity: order.deliveryCity,
      buyerNotes: order.buyerNotes,
    },
    proposedDelivery: {
      deliveryAddress: validated.data.deliveryAddress,
      deliveryAddressDetails: validated.data.deliveryAddressDetails,
      deliveryCity: validated.data.deliveryCity,
      buyerNotes: validated.data.buyerNotes,
    },
  })

  if (!diff.hasChanges) {
    return apiError('لم تقم بأي تغيير على الطلب', 400)
  }

  const editRequest = await db.$transaction(async (tx) => {
    // Supersede any earlier pending request for this order
    await tx.orderEditRequest.updateMany({
      where: { orderId: order.id, status: 'PENDING' },
      data: { status: 'CANCELLED', resolvedAt: new Date() },
    })

    const created = await tx.orderEditRequest.create({
      data: {
        orderId: order.id,
        status: 'PENDING',
        proposedItems: desiredItems as unknown as object,
        proposedDeliveryAddress: validated.data.deliveryAddress ?? null,
        proposedDeliveryAddressDetails: validated.data.deliveryAddressDetails ?? null,
        proposedDeliveryCity: validated.data.deliveryCity ?? null,
        proposedDeliveryCityId: validated.data.deliveryCityId ?? null,
        proposedDeliveryAreaId: validated.data.deliveryAreaId ?? null,
        proposedBuyerNotes: validated.data.buyerNotes ?? null,
        diff: diff as unknown as object,
        estimatedTotal: priced.productsTotal,
        estimatedDeliveryFee: priced.deliveryFee,
        buyerMessage: validated.data.buyerMessage?.trim() || null,
      },
    })

    // In-app notification for admins/staff
    const admins = await tx.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, isActive: true },
      select: { id: true },
    })
    if (admins.length > 0) {
      await tx.notification.createMany({
        data: admins.map((admin) => ({
          type: 'ORDER_UPDATE' as const,
          title: 'طلب تعديل',
          message: `طلب تعديل على الطلب #${order.orderNumber.slice(-8)}`,
          linkUrl: `/admin/orders/${order.id}`,
          userId: admin.id,
        })),
      })
    }

    return created
  })

  // Push to admins (outside transaction)
  sendPushToRole(['ADMIN', 'SUPER_ADMIN'], {
    title: 'طلب تعديل',
    body: `طلب تعديل على الطلب #${order.orderNumber.slice(-8)}`,
    data: {
      type: 'ORDER_UPDATE',
      orderId: order.id,
      orderNumber: order.orderNumber,
      linkUrl: `/admin/orders/${order.id}`,
      // Structured target so the mobile app opens the admin order screen
      targetType: 'ADMIN_ORDER',
      targetId: order.id,
    },
  }).catch((err) => console.error('Failed to send edit-request push to admins:', err))

  return apiResponse({
    editRequest: {
      id: editRequest.id,
      status: editRequest.status,
      diff,
      estimatedTotal: editRequest.estimatedTotal,
      estimatedDeliveryFee: editRequest.estimatedDeliveryFee,
      createdAt: editRequest.createdAt,
    },
  }, 201)
}

// DELETE /api/v1/orders/[id]/edit-request
// Buyer withdraws their pending edit request.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await authenticateApiRequest(request)
  if (!user) return apiError(error ?? 'Unauthorized', 401)

  const { id } = await params

  const order = await db.order.findUnique({ where: { id }, select: { id: true, buyerId: true } })
  if (!order) return apiError('Order not found', 404)
  if (order.buyerId !== user.id) return apiError('Not authorized', 403)

  const result = await db.orderEditRequest.updateMany({
    where: { orderId: order.id, status: 'PENDING' },
    data: { status: 'CANCELLED', resolvedAt: new Date() },
  })

  if (result.count === 0) {
    return apiError('لا يوجد طلب تعديل قيد المراجعة', 404)
  }

  return apiResponse({ success: true })
}
