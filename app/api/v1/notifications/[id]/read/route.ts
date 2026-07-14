import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

// PATCH /api/v1/notifications/[id]/read - Mark a single notification as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await authenticateApiRequest(request)
  if (!user) return apiError(error ?? 'Unauthorized', 401)

  const { id } = await params

  // Scope to the authenticated user so no one can mark others' notifications
  const result = await db.notification.updateMany({
    where: { id, userId: user.id },
    data: { isRead: true },
  })

  if (result.count === 0) {
    return apiError('Notification not found', 404)
  }

  return apiResponse({ message: 'Notification marked as read' })
}
