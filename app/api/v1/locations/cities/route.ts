import { apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { db } from '@/lib/db'

export async function OPTIONS() {
  return corsOptions()
}

// GET /api/v1/locations/cities
// Returns all cities with their areas (public endpoint, no auth required)
export async function GET() {
  try {
    const cities = await db.city.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        nameEn: true,
        areas: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            nameEn: true,
          },
        },
      },
    })

    return apiResponse(cities)
  } catch (error) {
    console.error('Error fetching cities:', error)
    return apiError('حدث خطأ في جلب المدن', 500)
  }
}
