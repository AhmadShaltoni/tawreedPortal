import { NextRequest } from 'next/server'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { getUserBalance } from '@/actions/loyalty-points'

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

// GET /api/v1/loyalty/balance - Get user's loyalty balance and recent transactions
export async function GET(request: NextRequest) {
  const { user, error } = await authenticateApiRequest(request)
  if (!user) return apiError(error ?? 'Unauthorized', 401)

  try {
    const balanceData = await getUserBalance(user.id)
    return apiResponse(balanceData)
  } catch (err) {
    console.error('[API] /api/v1/loyalty/balance error:', err)
    return apiError('فشل في جلب الرصيد', 500)
  }
}
