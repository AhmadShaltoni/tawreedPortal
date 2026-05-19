import { NextRequest } from 'next/server'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { validateReferralCode } from '@/actions/loyalty-referrals'

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

// POST /api/v1/loyalty/referral/apply - Validate referral code (used during registration)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { referralCode } = body

    if (!referralCode) {
      return apiError('رمز الإحالة مطلوب', 400)
    }

    const result = await validateReferralCode(referralCode)

    if (!result.success) {
      return apiError(result.error ?? 'رمز إحالة غير صالح', 400)
    }

    return apiResponse({
      valid: true,
      referralCode,
    })
  } catch (err) {
    console.error('[API] /api/v1/loyalty/referral/apply error:', err)
    return apiError('فشل في التحقق من رمز الإحالة', 500)
  }
}
