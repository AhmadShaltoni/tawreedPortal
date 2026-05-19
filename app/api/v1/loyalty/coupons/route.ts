import { NextRequest } from 'next/server'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { getUserRedeemedRewards } from '@/actions/loyalty-rewards'

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

// GET /api/v1/loyalty/coupons - Get user's redeemed rewards (coupons)
export async function GET(request: NextRequest) {
  const { user, error } = await authenticateApiRequest(request)
  if (!user) return apiError(error ?? 'Unauthorized', 401)

  try {
    const coupons = await getUserRedeemedRewards(user.id)
    return apiResponse({ coupons })
  } catch (err) {
    console.error('[API] /api/v1/loyalty/coupons error:', err)
    return apiError('فشل في جلب الكوبونات', 500)
  }
}
