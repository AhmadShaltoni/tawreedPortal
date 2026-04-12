import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { db } from '@/lib/db'
import { NextRequest } from 'next/server'

export async function OPTIONS() {
  return corsOptions()
}

// PATCH /api/v1/user/location
// Updates the current user's location (city/area and/or coordinates)
export async function PATCH(request: NextRequest) {
  try {
    // Authenticate
    const { user, error } = await authenticateApiRequest(request)
    if (!user) {
      return apiError(error || 'Authentication required', 401)
    }

    const body = await request.json()
    const { cityId, areaId, latitude, longitude } = body

    // Validate: at least one location field must be provided
    const hasCityData = cityId !== undefined
    const hasCoordinates = latitude !== undefined || longitude !== undefined

    if (!hasCityData && !hasCoordinates) {
      return apiError('يجب تقديم بيانات الموقع (مدينة أو إحداثيات)', 400)
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    // Validate city if provided
    if (hasCityData) {
      if (typeof cityId !== 'string' || cityId.trim() === '') {
        return apiError('معرّف المدينة غير صالح', 400)
      }

      const city = await db.city.findUnique({ where: { id: cityId } })
      if (!city) {
        return apiError('المدينة غير موجودة', 400)
      }
      updateData.cityId = cityId

      // Validate area if provided
      if (areaId !== undefined && areaId !== null) {
        if (typeof areaId !== 'string' || areaId.trim() === '') {
          return apiError('معرّف المنطقة غير صالح', 400)
        }

        const area = await db.area.findUnique({ where: { id: areaId } })
        if (!area) {
          return apiError('المنطقة غير موجودة', 400)
        }
        if (area.cityId !== cityId) {
          return apiError('المنطقة لا تتبع للمدينة المحددة', 400)
        }
        updateData.areaId = areaId
      } else {
        updateData.areaId = null
      }
    }

    // Validate coordinates if provided
    if (hasCoordinates) {
      if (latitude !== undefined) {
        if (typeof latitude !== 'number' || latitude < 29.0 || latitude > 33.5) {
          return apiError('خط العرض يجب أن يكون بين 29.0 و 33.5 (حدود الأردن)', 400)
        }
        updateData.latitude = latitude
      }

      if (longitude !== undefined) {
        if (typeof longitude !== 'number' || longitude < 34.9 || longitude > 39.3) {
          return apiError('خط الطول يجب أن يكون بين 34.9 و 39.3 (حدود الأردن)', 400)
        }
        updateData.longitude = longitude
      }

      // Both lat/lng should be provided together when using coordinates
      if ((latitude !== undefined) !== (longitude !== undefined)) {
        return apiError('يجب تقديم خط العرض وخط الطول معاً', 400)
      }
    }

    // Update user
    const updatedUser = await db.user.update({
      where: { id: user.id },
      select: {
        id: true,
        phone: true,
        username: true,
        storeName: true,
        role: true,
        cityId: true,
        areaId: true,
        latitude: true,
        longitude: true,
        cityRef: { select: { id: true, name: true, nameEn: true } },
        areaRef: { select: { id: true, name: true, nameEn: true } },
      },
      data: updateData,
    })

    return apiResponse({
      user: {
        id: updatedUser.id,
        phone: updatedUser.phone,
        username: updatedUser.username,
        storeName: updatedUser.storeName,
        role: updatedUser.role,
        cityId: updatedUser.cityId,
        areaId: updatedUser.areaId,
        latitude: updatedUser.latitude,
        longitude: updatedUser.longitude,
        city: updatedUser.cityRef,
        area: updatedUser.areaRef,
      },
    })
  } catch (error) {
    console.error('Error updating user location:', error)
    return apiError('حدث خطأ في تحديث الموقع', 500)
  }
}
