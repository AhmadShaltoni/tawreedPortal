import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { calculateDeliveryFee } from '@/actions/delivery'

export async function OPTIONS() {
  return corsOptions()
}

// GET /api/v1/delivery/fee?cityId=X&orderTotal=Y
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const cityId = searchParams.get('cityId')
  const orderTotal = parseFloat(searchParams.get('orderTotal') || '0')

  if (!cityId) {
    return apiError('cityId is required', 400)
  }

  // Verify city exists
  const city = await db.city.findUnique({ where: { id: cityId } })
  if (!city) {
    return apiError('City not found', 404)
  }

  const result = await calculateDeliveryFee(cityId, orderTotal)

  if (result.error) {
    return apiResponse({
      fee: 0,
      isFree: false,
      available: false,
      message: result.error,
      estimatedDays: result.estimatedDays,
    })
  }

  return apiResponse({
    fee: result.fee,
    isFree: result.isFree,
    available: true,
    originalFee: result.originalFee,
    freeThreshold: result.freeThreshold,
    remainingForFree: result.remainingForFree,
    promotionName: result.promotionName,
    estimatedDays: result.estimatedDays,
  })
}
