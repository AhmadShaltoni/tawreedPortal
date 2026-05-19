import { NextRequest } from 'next/server'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { getActiveCampaignsWithProgress } from '@/actions/loyalty-campaigns'

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

// GET /api/v1/loyalty/campaigns - Get active campaigns with user progress
export async function GET(request: NextRequest) {
  const { user, error } = await authenticateApiRequest(request)
  if (!user) return apiError(error ?? 'Unauthorized', 401)

  try {
    const campaigns = await getActiveCampaignsWithProgress()
    return apiResponse({ campaigns })
  } catch (err) {
    console.error('[API] /api/v1/loyalty/campaigns error:', err)
    return apiError('فشل في جلب الحملات', 500)
  }
}
