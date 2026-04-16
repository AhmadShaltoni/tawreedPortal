import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'

export async function OPTIONS() {
  return corsOptions()
}

/**
 * POST /api/v1/coupons/confirm
 * Confirm usage of a discount code after order placement
 * Body: { code: string, orderId: string, orderTotal: number }
 * 
 * Re-validates all checks, then creates a DiscountCodeUsage record
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await authenticateApiRequest(request)
    if (!user) {
      return apiError(authError || 'Authentication required', 401)
    }

    const body = await request.json()
    const { code, orderId, orderTotal } = body

    if (!code || typeof code !== 'string') {
      return apiError('كود الخصم مطلوب', 400)
    }
    if (!orderId || typeof orderId !== 'string') {
      return apiError('رقم الطلب مطلوب', 400)
    }
    if (!orderTotal || typeof orderTotal !== 'number' || orderTotal <= 0) {
      return apiError('مبلغ الطلب يجب أن يكون موجب', 400)
    }

    // Re-validate the code (all checks again for safety)
    const discountCode = await db.discountCode.findFirst({
      where: { code: { equals: code.toUpperCase(), mode: 'insensitive' } },
      include: { _count: { select: { usages: true } } },
    })

    if (!discountCode) {
      return apiError('كود الخصم غير موجود', 404)
    }

    if (!discountCode.isActive) {
      return apiError('كود الخصم غير مفعل', 400)
    }

    const now = new Date()
    if (discountCode.startDate && now < discountCode.startDate) {
      return apiError('كود الخصم لم يبدأ بعد', 400)
    }
    if (discountCode.endDate && now > discountCode.endDate) {
      return apiError('كود الخصم منتهي الصلاحية', 400)
    }

    if (discountCode.maxUsage !== null && discountCode._count.usages >= discountCode.maxUsage) {
      return apiError('تم الوصول للحد الأقصى لاستخدام هذا الكود', 400)
    }

    if (discountCode.isSingleUse) {
      const existingUsage = await db.discountCodeUsage.findFirst({
        where: {
          discountCodeId: discountCode.id,
          userId: user.id,
        },
      })
      if (existingUsage) {
        return apiError('لقد استخدمت هذا الكود من قبل', 400)
      }
    }

    if (discountCode.minOrderAmount !== null && orderTotal < discountCode.minOrderAmount) {
      return apiError(`قيمة الطلب أقل من الحد الأدنى المطلوب (${discountCode.minOrderAmount} د.أ)`, 400)
    }

    // Verify order exists and belongs to user
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { id: true, buyerId: true },
    })
    if (!order || order.buyerId !== user.id) {
      return apiError('الطلب غير موجود', 404)
    }

    // Calculate discount
    const discountAmount = Math.round((orderTotal * discountCode.discountPercent / 100) * 100) / 100

    // Create usage record
    const usage = await db.discountCodeUsage.create({
      data: {
        discountCodeId: discountCode.id,
        userId: user.id,
        orderId,
        discountAmount,
        orderTotal,
      },
    })

    return apiResponse({
      success: true,
      discountAmount,
      usageId: usage.id,
    }, 201)
  } catch (error) {
    console.error('[api/v1/coupons/confirm] POST error:', error)
    return apiError('فشل في تأكيد استخدام كود الخصم', 500)
  }
}
