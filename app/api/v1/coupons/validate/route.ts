import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'

export async function OPTIONS() {
  return corsOptions()
}

/**
 * POST /api/v1/coupons/validate
 * Validate a discount code against order total
 * Body: { code: string, orderTotal: number }
 * 
 * Validation order:
 * 1. Code exists
 * 2. Code is active
 * 3. Current date within start/end range
 * 4. Total usage < maxUsage
 * 5. User hasn't used (if isSingleUse)
 * 6. Order total >= minOrderAmount
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await authenticateApiRequest(request)
    if (!user) {
      return apiError(authError || 'Authentication required', 401)
    }

    const body = await request.json()
    const { code, orderTotal } = body

    if (!code || typeof code !== 'string') {
      return apiError('كود الخصم مطلوب', 400)
    }
    if (!orderTotal || typeof orderTotal !== 'number' || orderTotal <= 0) {
      return apiError('مبلغ الطلب يجب أن يكون موجب', 400)
    }

    // 1. Code exists (case-insensitive)
    const discountCode = await db.discountCode.findFirst({
      where: { code: { equals: code.toUpperCase(), mode: 'insensitive' } },
      include: { _count: { select: { usages: true } } },
    })

    if (!discountCode) {
      return apiResponse({
        valid: false,
        error: 'CODE_NOT_FOUND',
        message: 'كود الخصم غير موجود',
      })
    }

    // 2. Code is active
    if (!discountCode.isActive) {
      return apiResponse({
        valid: false,
        error: 'CODE_INACTIVE',
        message: 'كود الخصم غير مفعل',
      })
    }

    // 3. Current date within start/end range
    const now = new Date()
    if (discountCode.startDate && now < discountCode.startDate) {
      return apiResponse({
        valid: false,
        error: 'CODE_NOT_STARTED',
        message: 'كود الخصم لم يبدأ بعد',
      })
    }
    if (discountCode.endDate && now > discountCode.endDate) {
      return apiResponse({
        valid: false,
        error: 'CODE_EXPIRED',
        message: 'كود الخصم منتهي الصلاحية',
      })
    }

    // 4. Total usage < maxUsage
    if (discountCode.maxUsage !== null && discountCode._count.usages >= discountCode.maxUsage) {
      return apiResponse({
        valid: false,
        error: 'CODE_USAGE_LIMIT_REACHED',
        message: 'تم الوصول للحد الأقصى لاستخدام هذا الكود',
      })
    }

    // 5. User hasn't used (if isSingleUse)
    if (discountCode.isSingleUse) {
      const existingUsage = await db.discountCodeUsage.findFirst({
        where: {
          discountCodeId: discountCode.id,
          userId: user.id,
        },
      })
      if (existingUsage) {
        return apiResponse({
          valid: false,
          error: 'CODE_ALREADY_USED',
          message: 'لقد استخدمت هذا الكود من قبل',
        })
      }
    }

    // 6. Order total >= minOrderAmount
    if (discountCode.minOrderAmount !== null && orderTotal < discountCode.minOrderAmount) {
      return apiResponse({
        valid: false,
        error: 'ORDER_BELOW_MINIMUM',
        message: `قيمة الطلب أقل من الحد الأدنى المطلوب (${discountCode.minOrderAmount} د.أ)`,
      })
    }

    // All checks passed — calculate discount
    const discountAmount = Math.round((orderTotal * discountCode.discountPercent / 100) * 100) / 100
    const finalTotal = Math.round((orderTotal - discountAmount) * 100) / 100

    return apiResponse({
      valid: true,
      discountPercent: discountCode.discountPercent,
      discountAmount,
      finalTotal,
      code: discountCode.code,
    })
  } catch (error) {
    console.error('[api/v1/coupons/validate] POST error:', error)
    return apiError('فشل في التحقق من كود الخصم', 500)
  }
}
