import { NextRequest } from 'next/server'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { getUserTransactions } from '@/actions/loyalty-points'

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

// GET /api/v1/loyalty/transactions - Get user's loyalty transaction history
export async function GET(request: NextRequest) {
  const { user, error } = await authenticateApiRequest(request)
  if (!user) return apiError(error ?? 'Unauthorized', 401)

  const { searchParams } = new URL(request.url)
  const page = Number(searchParams.get('page')) || 1
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 100)

  try {
    const transactionsData = await getUserTransactions(user.id, page, limit)
    return apiResponse(transactionsData)
  } catch (err) {
    console.error('[API] /api/v1/loyalty/transactions error:', err)
    return apiError('فشل في جلب السجل', 500)
  }
}
