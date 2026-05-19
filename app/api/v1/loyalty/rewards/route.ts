import { NextRequest } from 'next/server'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { getRewards } from '@/actions/loyalty-rewards'

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

// GET /api/v1/loyalty/rewards - Get available rewards catalog
export async function GET(request: NextRequest) {
  const { user, error } = await authenticateApiRequest(request)
  if (!user) return apiError(error ?? 'Unauthorized', 401)

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') as any

  try {
    const rewards = await getRewards({
      isActive: true,
      ...(type ? { type } : {}),
    })

    return apiResponse({ rewards })
  } catch (err) {
    console.error('[API] /api/v1/loyalty/rewards error:', err)
    return apiError('فشل في جلب المكافآت', 500)
  }
}
