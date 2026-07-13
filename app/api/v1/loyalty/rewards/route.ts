import { NextRequest } from 'next/server'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { getRewards } from '@/actions/loyalty-rewards'
import { mapReward } from '@/lib/loyalty-dto'

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

// GET /api/v1/loyalty/rewards - Get available rewards catalog
export async function GET(request: NextRequest) {
  const { user, error } = await authenticateApiRequest(request)
  if (!user) return apiError(error ?? 'Unauthorized', 401)

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') as
    | 'FIXED_DISCOUNT' | 'PERCENTAGE_DISCOUNT' | 'FREE_DELIVERY' | 'FREE_PRODUCT' | 'CUSTOM'
    | null

  try {
    const rewards = await getRewards({
      isActive: true,
      ...(type ? { type } : {}),
    })

    // Hide FREE_PRODUCT rewards whose product was deactivated/removed
    const visible = rewards.filter(
      (r) => r.rewardType !== 'FREE_PRODUCT' || (r.product && r.product.isActive)
    )

    return apiResponse({ rewards: visible.map(mapReward) })
  } catch (err) {
    console.error('[API] /api/v1/loyalty/rewards error:', err)
    return apiError('فشل في جلب المكافآت', 500)
  }
}
