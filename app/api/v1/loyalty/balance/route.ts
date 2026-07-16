import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { mapTransaction } from '@/lib/loyalty-dto'

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

// GET /api/v1/loyalty/balance - Get user's loyalty balance and recent transactions
export async function GET(request: NextRequest) {
  const { user, error } = await authenticateApiRequest(request)
  if (!user) return apiError(error ?? 'Unauthorized', 401)

  try {
    const [balance, recentTransactions, config, pendingOrders] = await Promise.all([
      db.loyaltyBalance.findUnique({ where: { userId: user.id } }),
      db.loyaltyTransaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      db.loyaltyConfig.findFirst(),
      // Orders that are placed but haven't awarded points yet — used to show the
      // customer how many points are still on the way (added on delivery).
      db.order.findMany({
        where: {
          buyerId: user.id,
          status: { not: 'CANCELLED' },
          loyaltyPointsEarned: null,
        },
        select: { totalPrice: true, deliveryFee: true },
      }),
    ])

    // Sum the points these not-yet-awarded orders will earn, mirroring the
    // backend `awardOrderPoints` calculation so the forecast matches reality.
    let pendingPoints = 0
    if (config?.isEnabled) {
      for (const order of pendingOrders) {
        const base = config.excludeDeliveryFees
          ? order.totalPrice - order.deliveryFee
          : order.totalPrice
        if (config.minOrderValue && base < config.minOrderValue) continue
        const raw = (base / (config.calculationBase || 1)) * config.pointsPerJod
        const rounded =
          config.roundingMode === 'CEIL'
            ? Math.ceil(raw)
            : config.roundingMode === 'ROUND'
              ? Math.round(raw)
              : Math.floor(raw)
        if (rounded > 0) pendingPoints += rounded
      }
    }

    return apiResponse({
      currentBalance: balance?.currentBalance ?? 0,
      totalEarned: balance?.totalEarned ?? 0,
      totalRedeemed: balance?.totalRedeemed ?? 0,
      pendingPoints,
      recentTransactions: recentTransactions.map(mapTransaction),
      // Public earn settings so the app can forecast points before checkout
      earnConfig: {
        isEnabled: config?.isEnabled ?? false,
        pointsPerJod: config?.pointsPerJod ?? 0,
        calculationBase: config?.calculationBase ?? 1,
        minOrderValue: config?.minOrderValue ?? null,
        excludeDeliveryFees: config?.excludeDeliveryFees ?? true,
        roundingMode: config?.roundingMode ?? 'FLOOR',
        earnTrigger: config?.earnTrigger ?? 'ORDER_PLACED',
      },
    })
  } catch (err) {
    console.error('[API] /api/v1/loyalty/balance error:', err)
    return apiError('فشل في جلب الرصيد', 500)
  }
}
