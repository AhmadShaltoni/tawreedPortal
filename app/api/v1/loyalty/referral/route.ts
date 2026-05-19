import { NextRequest } from 'next/server'
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

    return apiResponse({
      referralCode: referralInfo.referralCode,
      referralLink,
      totalReferrals: referralInfo.referralCount,
    })
  } catch (err) {
    console.error('[API] /api/v1/loyalty/referral error:', err)
    return apiError('فشل في جلب معلومات الإحالة', 500)
  }
}
