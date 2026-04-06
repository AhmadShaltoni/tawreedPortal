import { NextRequest } from 'next/server'
import { authenticateApiRequest, apiResponse, apiError } from '@/lib/api-auth'

// GET /api/v1/auth/me
export async function GET(request: NextRequest) {
  const { user, error } = await authenticateApiRequest(request)
  if (!user) return apiError(error ?? 'Unauthorized', 401)

  return apiResponse({ user })
}
