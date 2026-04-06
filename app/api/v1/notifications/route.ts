import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

// GET /api/v1/notifications - Get user's notifications
export async function GET(request: NextRequest) {
  const { user, error } = await authenticateApiRequest(request)
  if (!user) return apiError(error ?? 'Unauthorized', 401)

  const { searchParams } = new URL(request.url)
  const unreadOnly = searchParams.get('unread') === 'true'
  const page = Number(searchParams.get('page')) || 1
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 100)

  const where: Record<string, unknown> = { userId: user.id }
  if (unreadOnly) where.isRead = false

  const [notifications, total, unreadCount] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.notification.count({ where }),
    db.notification.count({ where: { userId: user.id, isRead: false } }),
  ])

  return apiResponse({
    notifications,
    unreadCount,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
}

// PATCH /api/v1/notifications - Mark notifications as read
export async function PATCH(request: NextRequest) {
  const { user, error } = await authenticateApiRequest(request)
  if (!user) return apiError(error ?? 'Unauthorized', 401)

  const body = await request.json()
  const { ids } = body as { ids?: string[] }

  if (ids && Array.isArray(ids)) {
    // Mark specific notifications as read
    await db.notification.updateMany({
      where: { id: { in: ids }, userId: user.id },
      data: { isRead: true },
    })
  } else {
    // Mark all as read
    await db.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    })
  }

  return apiResponse({ message: 'Notifications marked as read' })
}
