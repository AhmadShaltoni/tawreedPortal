import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { mapCoupon } from '@/lib/loyalty-dto'

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

// GET /api/v1/loyalty/coupons - Get user's redeemed rewards (coupons)
export async function GET(request: NextRequest) {
  const { user, error } = await authenticateApiRequest(request)
  if (!user) return apiError(error ?? 'Unauthorized', 401)

  try {
    const redeemedRewards = await db.redeemedReward.findMany({
      where: { userId: user.id },
      include: {
        reward: { select: { id: true, name: true, nameEn: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return apiResponse({ coupons: redeemedRewards.map(mapCoupon) })
  } catch (err) {
    console.error('[API] /api/v1/loyalty/coupons error:', err)
    return apiError('فشل في جلب الكوبونات', 500)
  }
}
