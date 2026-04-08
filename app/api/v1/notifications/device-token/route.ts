import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { z } from 'zod'

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

// POST /api/v1/notifications/device-token - Register or update device token
export async function POST(request: NextRequest) {
  const { user, error } = await authenticateApiRequest(request)
  if (!user) return apiError(error ?? 'Unauthorized', 401)

  try {
    const body = await request.json()

    // Validate request body
    const schema = z.object({
      token: z.string().min(1, 'Device token is required'),
      platform: z.enum(['IOS', 'ANDROID']),
    })

    const validated = schema.safeParse(body)
    if (!validated.success) {
      return apiError('Invalid request data', 400)
    }

    const { token, platform } = validated.data

    // Check if token already exists for another user (shouldn't happen but safety check)
    const existingToken = await db.deviceToken.findUnique({
      where: { token },
    })

    if (existingToken && existingToken.userId !== user.id) {
      // Token is registered to another user, remove from old user
      await db.deviceToken.delete({
        where: { id: existingToken.id },
      })
    }

    // Upsert device token (update if exists, create if not)
    const deviceToken = await db.deviceToken.upsert({
      where: { token },
      update: {
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        token,
        platform: platform as 'IOS' | 'ANDROID',
        userId: user.id,
        isActive: true,
      },
    })

    return apiResponse(
      {
        message: 'Device token registered successfully',
        deviceToken: {
          id: deviceToken.id,
          platform: deviceToken.platform,
          isActive: deviceToken.isActive,
        },
      },
      201
    )
  } catch (error) {
    console.error('Device token registration error:', error)
    return apiError('Internal server error', 500)
  }
}

// DELETE /api/v1/notifications/device-token - Unregister device token
export async function DELETE(request: NextRequest) {
  const { user, error } = await authenticateApiRequest(request)
  if (!user) return apiError(error ?? 'Unauthorized', 401)

  try {
    const body = await request.json()

    // Validate request body
    const schema = z.object({
      token: z.string().min(1, 'Device token is required'),
    })

    const validated = schema.safeParse(body)
    if (!validated.success) {
      return apiError('Invalid request data', 400)
    }

    const { token } = validated.data

    // Find and delete the token (but only if it belongs to current user)
    const deviceToken = await db.deviceToken.findUnique({
      where: { token },
    })

    if (!deviceToken) {
      return apiError('Device token not found', 404)
    }

    if (deviceToken.userId !== user.id) {
      return apiError('Unauthorized', 403)
    }

    await db.deviceToken.delete({
      where: { token },
    })

    return apiResponse({
      message: 'Device token unregistered successfully',
    })
  } catch (error) {
    console.error('Device token deletion error:', error)
    return apiError('Internal server error', 500)
  }
}

// GET /api/v1/notifications/device-token - List all device tokens for current user
export async function GET(request: NextRequest) {
  const { user, error } = await authenticateApiRequest(request)
  if (!user) return apiError(error ?? 'Unauthorized', 401)

  try {
    const deviceTokens = await db.deviceToken.findMany({
      where: { userId: user.id, isActive: true },
      select: {
        id: true,
        platform: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return apiResponse({
      deviceTokens,
      count: deviceTokens.length,
    })
  } catch (error) {
    console.error('Device token fetch error:', error)
    return apiError('Internal server error', 500)
  }
}
