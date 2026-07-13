import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { mapTransaction } from '@/lib/loyalty-dto'

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
    const [transactions, total] = await Promise.all([
      db.loyaltyTransaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.loyaltyTransaction.count({ where: { userId: user.id } }),
    ])

    return apiResponse({
      transactions: transactions.map(mapTransaction),
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    })
  } catch (err) {
    console.error('[API] /api/v1/loyalty/transactions error:', err)
    return apiError('فشل في جلب السجل', 500)
  }
}
