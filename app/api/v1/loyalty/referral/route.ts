import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { getUserReferralInfo } from '@/actions/loyalty-referrals'

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

// GET /api/v1/loyalty/referral - Get user's referral code, link, and stats
export async function GET(request: NextRequest) {
  const { user, error } = await authenticateApiRequest(request)
  if (!user) return apiError(error ?? 'Unauthorized', 401)

  try {
    const result = await getUserReferralInfo(user.id)

    if (!result || !result.success || !result.data) {
      return apiError('معلومات الإحالة غير متاحة', 404)
    }

    const referralInfo = result.data

    // Generate referral link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || 'https://tawreed.jo'
    const referralLink = `${baseUrl}/register?ref=${referralInfo.referralCode}`

    // Stats for the mobile referral tab
    const [totalInvited, earnedAgg] = await Promise.all([
      db.userReferral.count({ where: { referredByUserId: user.id } }),
      db.loyaltyTransaction.aggregate({
        _sum: { points: true },
        where: { userId: user.id, type: 'EARN_REFERRAL_INVITER' },
      }),
    ])

    return apiResponse({
      referralCode: referralInfo.referralCode,
      referralLink,
      totalInvited,
      totalEarned: earnedAgg._sum.points ?? 0,
      invitees: [],
      // Backwards compatibility
      totalReferrals: referralInfo.referralCount,
    })
  } catch (err) {
    console.error('[API] /api/v1/loyalty/referral error:', err)
    return apiError('فشل في جلب معلومات الإحالة', 500)
  }
}
