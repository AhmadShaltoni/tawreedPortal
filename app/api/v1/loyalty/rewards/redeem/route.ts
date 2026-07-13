import { NextRequest } from 'next/server'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { redeemRewardForUser } from '@/lib/loyalty-redemption'

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

// POST /api/v1/loyalty/rewards/redeem - Redeem a reward
export async function POST(request: NextRequest) {
  const { user, error } = await authenticateApiRequest(request)
  if (!user) return apiError(error ?? 'Unauthorized', 401)

  try {
    const body = await request.json()
    const { rewardId } = body

    if (!rewardId) {
      return apiError('معرف المكافأة مطلوب', 400)
    }

    const result = await redeemRewardForUser(user.id, rewardId)

    if (!result.success) {
      return apiError(result.error ?? 'فشل في استرداد المكافأة', 400)
    }

    return apiResponse({
      success: true,
      couponCode: result.data?.couponCode,
    })
  } catch (err) {
    console.error('[API] /api/v1/loyalty/rewards/redeem error:', err)
    return apiError('فشل في استرداد المكافأة', 500)
  }
}
