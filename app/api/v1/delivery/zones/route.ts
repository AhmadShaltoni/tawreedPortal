import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiResponse, corsOptions } from '@/lib/api-auth'
import { getDeliveryConfig } from '@/actions/delivery'

export async function OPTIONS() {
  return corsOptions()
}

// GET /api/v1/delivery/zones - List available delivery cities with fees
export async function GET(request: NextRequest) {
  const config = await getDeliveryConfig()

  if (!config.isEnabled) {
    return apiResponse({
      available: false,
      message: 'خدمة التوصيل متوقفة مؤقتاً',
      zones: [],
    })
  }

  // Get cities with their delivery zones (only active + visible)
  const zones = await db.deliveryZone.findMany({
    where: {
      isActive: true,
      isVisible: true,
    },
    include: {
      city: {
        include: {
          areas: {
            orderBy: { sortOrder: 'asc' },
            select: { id: true, name: true, nameEn: true },
          },
        },
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { city: { sortOrder: 'asc' } }],
  })

  const { searchParams } = new URL(request.url)
  const includeAreas = searchParams.get('includeAreas') === 'true'

  return apiResponse({
    available: true,
    minOrderAmount: config.minOrderAmount,
    freeDeliveryEnabled: config.freeDeliveryEnabled,
    globalFreeThreshold: config.freeDeliveryEnabled ? config.freeDeliveryThreshold : null,
    zones: zones.map((zone) => ({
      cityId: zone.cityId,
      cityName: zone.city.name,
      cityNameEn: zone.city.nameEn,
      fee: zone.fee,
      freeDeliveryThreshold: zone.freeDeliveryThreshold ?? (config.freeDeliveryEnabled ? config.freeDeliveryThreshold : null),
      estimatedDays: zone.estimatedDays ?? config.estimatedDeliveryDays,
      ...(includeAreas ? { areas: zone.city.areas } : {}),
    })),
  })
}
