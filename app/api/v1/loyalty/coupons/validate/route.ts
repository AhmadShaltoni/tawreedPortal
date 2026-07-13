import { NextRequest } from 'next/server'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { validateCoupon } from '@/actions/loyalty-rewards'

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

// POST /api/v1/loyalty/coupons/validate - Validate coupon at checkout
export async function POST(request: NextRequest) {
  const { user, error } = await authenticateApiRequest(request)
  if (!user) return apiError(error ?? 'Unauthorized', 401)

  try {
    const body = await request.json()
    const { couponCode, orderTotal } = body

    if (!couponCode || orderTotal === undefined) {
      return apiError('رمز الكوبون ومبلغ الطلب مطلوبان', 400)
    }

    const result = await validateCoupon(couponCode, orderTotal)

    if (!result.success) {
      return apiError(result.error ?? 'كوبون غير صالح', 400)
    }

    return apiResponse({
      valid: true,
      discountAmount: result.data?.discountAmount,
      finalTotal: result.data?.finalTotal,
      couponId: result.data?.couponId,
      rewardType: result.data?.rewardType,
      rewardName: result.data?.rewardName,
      rewardNameEn: result.data?.rewardNameEn,
      freeDelivery: result.data?.freeDelivery ?? false,
      freeProduct: result.data?.freeProduct ?? null,
    })
  } catch (err) {
    console.error('[API] /api/v1/loyalty/coupons/validate error:', err)
    return apiError('فشل في التحقق من الكوبون', 500)
  }
}
