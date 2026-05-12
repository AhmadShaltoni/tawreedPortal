import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { z } from 'zod'

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

// POST /api/v1/notifications/device-token - Register or link device token
// If authenticated: links token to user (upsert)
// If not authenticated: registers anonymous token (for broadcast/marketing push)
export async function POST(request: NextRequest) {
  // Try to authenticate, but don't fail if no auth — allow anonymous registration
  const { user } = await authenticateApiRequest(request).catch(() => ({ user: null, error: null }))

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

    if (user) {
      // Authenticated: link token to this user
      // If token exists for another user, reassign it (device changed user)
      const deviceToken = await db.deviceToken.upsert({
        where: { token },
        update: {
          userId: user.id,
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
            linked: true,
          },
        },
        201
      )
    } else {
      // Anonymous: register token without user linkage (for broadcast/marketing)
      const deviceToken = await db.deviceToken.upsert({
        where: { token },
        update: {
          isActive: true,
          updatedAt: new Date(),
          // Do NOT change userId — preserve existing link if any
        },
        create: {
          token,
          platform: platform as 'IOS' | 'ANDROID',
          // userId is null — anonymous device
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
            linked: !!deviceToken.userId,
          },
        },
        201
      )
    }
  } catch (error) {
    console.error('Device token registration error:', error)
    return apiError('Internal server error', 500)
  }
}

// DELETE /api/v1/notifications/device-token - Unlink token from user (on logout)
// Does NOT delete the token — keeps it active for broadcast/marketing push.
// Sets userId to null so the device remains reachable for announcements.
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

    // Find the token
    const deviceToken = await db.deviceToken.findUnique({
      where: { token },
    })

    if (!deviceToken) {
      return apiError('Device token not found', 404)
    }

    if (deviceToken.userId !== user.id) {
      return apiError('Unauthorized', 403)
    }

    // Unlink from user instead of deleting — token stays active for broadcasts
    await db.deviceToken.update({
      where: { token },
      data: { userId: null },
    })

    return apiResponse({
      message: 'Device token unlinked successfully',
    })
  } catch (error) {
    console.error('Device token unlink error:', error)
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
