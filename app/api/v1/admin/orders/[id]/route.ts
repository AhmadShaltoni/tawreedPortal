import { NextRequest } from 'next/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { authenticateStaffApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { getAdminOrderById } from '@/actions/admin-orders'
import { applyOrderStatusUpdate } from '@/lib/order-status'
import { buildWhatsAppMessage, type DispatchOrder } from '@/lib/order-dispatch'

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

/**
 * GET /api/v1/admin/orders/[id] — staff only
 * Full order detail for the mobile admin section, including buyer contact,
 * items with resolved images, the pending edit request (if any), and a
 * ready-to-send WhatsApp dispatch message (?lang=ar|en, default ar).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error, status } = await authenticateStaffApiRequest(request, 'orders')
  if (!user) return apiError(error ?? 'Unauthorized', status)

  const { id } = await params
  const order = await getAdminOrderById(id)
  if (!order) return apiError('الطلب غير موجود', 404)

  const { searchParams } = new URL(request.url)
  const lang = searchParams.get('lang') === 'en' ? 'en' : 'ar'
  const whatsappMessage = buildWhatsAppMessage(order as unknown as DispatchOrder, lang)

  return apiResponse({
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      statusHistory: order.statusHistory,
      totalPrice: order.totalPrice,
      deliveryFee: order.deliveryFee,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      deliveryCity: order.deliveryCity,
      deliveryAddress: order.deliveryAddress,
      deliveryAddressDetails: order.deliveryAddressDetails,
      buyerNotes: order.buyerNotes,
      buyer: {
        id: order.buyer.id,
        username: order.buyer.username,
        storeName: order.buyer.storeName,
        phone: order.buyer.phone,
        email: order.buyer.email,
        city: order.buyer.city,
      },
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        productNameEn: item.productNameEn,
        productImage: item.displayImage,
        variantSize: item.variantSize,
        variantSizeEn: item.variantSizeEn,
        variantOptionName: item.variantOptionName,
        variantOptionNameEn: item.variantOptionNameEn,
        unitLabel: item.unitLabel,
        unitLabelEn: item.unitLabelEn,
        quantity: item.quantity,
        pricePerUnit: item.pricePerUnit,
        totalPrice: item.totalPrice,
        note: item.note,
        isReward: item.isReward,
      })),
      pendingEditRequest: order.pendingEditRequest
        ? {
            id: order.pendingEditRequest.id,
            status: order.pendingEditRequest.status,
            diff: order.pendingEditRequest.diff,
            estimatedTotal: order.pendingEditRequest.estimatedTotal,
            estimatedDeliveryFee: order.pendingEditRequest.estimatedDeliveryFee,
            buyerMessage: order.pendingEditRequest.buyerMessage,
            createdAt: order.pendingEditRequest.createdAt,
          }
        : null,
    },
    whatsappMessage,
  })
}

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
  note: z.string().max(500).optional(),
})

/**
 * PATCH /api/v1/admin/orders/[id] — staff only
 * Update the order status (same transition logic as the dashboard: history,
 * buyer notification, loyalty hooks).
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error, status } = await authenticateStaffApiRequest(request, 'orders')
  if (!user) return apiError(error ?? 'Unauthorized', status)

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('بيانات غير صحيحة', 400)
  }
  const validated = updateStatusSchema.safeParse(body)
  if (!validated.success) return apiError('بيانات غير صحيحة', 400)

  const result = await applyOrderStatusUpdate({
    orderId: id,
    status: validated.data.status,
    note: validated.data.note,
  })
  if (!result.success) return apiError(result.error ?? 'فشل تحديث حالة الطلب', 400)

  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${id}`)

  return apiResponse({ success: true, status: validated.data.status })
}
