import { NextRequest } from 'next/server'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import {
  findDiscountCode,
  getCartLinesForDiscount,
  validateDiscountCodeForUser,
} from '@/lib/discount-codes'

export async function OPTIONS() {
  return corsOptions()
}

/**
 * POST /api/v1/coupons/validate
 * Validate a discount code against the user's current cart.
 * Body: { code: string, orderTotal?: number, hasLoyaltyCoupon?: boolean }
 *
 * The order total is computed server-side from the cart (with campaign
 * discounts applied) so it always matches order creation. The client's
 * orderTotal is only a fallback for older app versions with an empty-cart
 * edge case.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await authenticateApiRequest(request)
    if (!user) {
      return apiError(authError || 'Authentication required', 401)
    }

    const body = await request.json()
    const { code, orderTotal, hasLoyaltyCoupon } = body

    if (!code || typeof code !== 'string') {
      return apiError('كود الخصم مطلوب', 400)
    }

    const discountCode = await findDiscountCode(code)
    if (!discountCode) {
      return apiResponse({
        valid: false,
        error: 'CODE_NOT_FOUND',
        message: 'كود الخصم غير موجود',
      })
    }

    const cartLines = await getCartLinesForDiscount(user.id)
    let serverTotal = Math.round(cartLines.reduce((sum, line) => sum + line.lineTotal, 0) * 100) / 100
    if (serverTotal <= 0) {
      serverTotal = typeof orderTotal === 'number' && orderTotal > 0 ? orderTotal : 0
    }
    if (serverTotal <= 0) {
      return apiError('السلة فارغة', 400)
    }

    const result = await validateDiscountCodeForUser(discountCode, {
      userId: user.id,
      userPhone: user.phone,
      orderTotal: serverTotal,
      cartLines,
      hasLoyaltyCoupon: hasLoyaltyCoupon === true,
    })

    if (!result.ok) {
      return apiResponse({
        valid: false,
        error: result.errorCode,
        message: result.message,
      })
    }

    const finalTotal = Math.round((serverTotal - result.discountAmount) * 100) / 100

    return apiResponse({
      valid: true,
      discountPercent: discountCode.discountPercent,
      discountAmount: result.discountAmount,
      finalTotal,
      code: discountCode.code,
      allowStacking: discountCode.allowStacking,
    })
  } catch (error) {
    console.error('[api/v1/coupons/validate] POST error:', error)
    return apiError('فشل في التحقق من كود الخصم', 500)
  }
}
