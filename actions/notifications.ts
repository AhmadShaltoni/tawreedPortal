'use server'

import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { sendPushToUser, sendPushToAll, sendPushToRole, getPushStats, cleanupStaleTokens } from '@/lib/push-notifications'
import type { UserRole } from '@prisma/client'

export interface ActionResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
  error?: string
  errors?: Record<string, string[]>
}

function getPushPayloadDebugInfo(payload: {
  title: string
  body: string
  imageUrl?: string
  data?: Record<string, string>
}) {
  return {
    notification: {
      title: payload.title,
      body: payload.body,
      ...(payload.imageUrl ? { imageUrl: payload.imageUrl } : {}),
    },
    data: payload.data || {},
    hasNotificationTitle: Boolean(payload.title?.trim()),
    hasNotificationBody: Boolean(payload.body?.trim()),
    hasNotificationTitleAndBody: Boolean(payload.title?.trim() && payload.body?.trim()),
    hasDataPayload: Boolean(payload.data && Object.keys(payload.data).length > 0),
  }
}

function getPushErrorDebugInfo(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      code: 'code' in error ? (error as { code?: unknown }).code : undefined,
    }
  }

  return error
}

/**
 * Get all notifications with filters
 */
export async function getNotifications(
  page = 1,
  limit = 20,
  filters: {
    type?: string
    unread?: boolean
    isSent?: boolean
    startDate?: Date
    endDate?: Date
  } = {}
): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    const where: Record<string, unknown> = {}

    if (filters.type) where.type = filters.type
    if (filters.unread !== undefined) where.isRead = !filters.unread
    if (filters.isSent !== undefined) where.isSent = filters.isSent
    if (filters.startDate || filters.endDate) {
      where.createdAt = {}
      if (filters.startDate) (where.createdAt as { gte?: Date }).gte = filters.startDate
      if (filters.endDate) (where.createdAt as { lte?: Date }).lte = filters.endDate
    }

    const [notifications, total] = await Promise.all([
      db.notification.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              phone: true,
              username: true,
              storeName: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: Math.min(limit, 100),
      }),
      db.notification.count({ where }),
    ])

    return {
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit: Math.min(limit, 100),
          total,
          pages: Math.ceil(total / Math.min(limit, 100)),
        },
      },
    }
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return { success: false, error: 'Failed to fetch notifications' }
  }
}

/**
 * Get notification statistics (includes push delivery stats)
 */
export async function getNotificationStats(): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    const [total, sent, unread, byType, pushStats] = await Promise.all([
      db.notification.count(),
      db.notification.count({ where: { isSent: true } }),
      db.notification.count({ where: { isRead: false } }),
      db.notification.groupBy({
        by: ['type'],
        _count: true,
      }),
      getPushStats(),
    ])

    return {
      success: true,
      data: {
        total,
        sent,
        unread,
        byType: Object.fromEntries(
          byType.map((item) => [item.type, item._count])
        ),
        push: pushStats,
      },
    }
  } catch (error) {
    console.error('Error fetching notification stats:', error)
    return { success: false, error: 'Failed to fetch statistics' }
  }
}

/**
 * Send notification to specific user(s) or all users
 */
export async function sendNotification(formData: FormData): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    const title = formData.get('title') as string
    const message = formData.get('message') as string
    const linkUrl = formData.get('linkUrl') as string | null
    const imageUrl = formData.get('imageUrl') as string | null
    const recipientType = formData.get('recipientType') as string // 'all' | 'buyers' | 'suppliers' | 'specific'
    const specificUserId = formData.get('specificUserId') as string | null

    console.log('[Push] sendNotification requested', {
      adminUserId: user.id,
      recipientType,
      specificUserId: specificUserId || undefined,
      hasLinkUrl: Boolean(linkUrl),
      hasImageUrl: Boolean(imageUrl),
      titleLength: title?.length || 0,
      messageLength: message?.length || 0,
    })

    // Validate
    if (!title?.trim() || !message?.trim()) {
      return {
        success: false,
        errors: {
          title: !title?.trim() ? ['Title is required'] : [],
          message: !message?.trim() ? ['Message is required'] : [],
        },
      }
    }

    // Determine recipient IDs
    let recipientIds: string[] = []

    if (recipientType === 'specific' && specificUserId) {
      const recipient = await db.user.findUnique({
        where: { id: specificUserId },
      })
      if (!recipient) {
        return { success: false, error: 'Recipient user not found' }
      }
      recipientIds = [specificUserId]
    } else if (recipientType === 'buyers') {
      const buyers = await db.user.findMany({
        where: { role: 'BUYER', isActive: true },
        select: { id: true },
      })
      recipientIds = buyers.map((b) => b.id)
    } else if (recipientType === 'suppliers') {
      const suppliers = await db.user.findMany({
        where: { role: 'SUPPLIER', isActive: true },
        select: { id: true },
      })
      recipientIds = suppliers.map((s) => s.id)
    } else if (recipientType === 'all') {
      const allUsers = await db.user.findMany({
        where: { isActive: true },
        select: { id: true },
      })
      recipientIds = allUsers.map((u) => u.id)
    }

    console.log('[Push] sendNotification recipients resolved', {
      recipientType,
      recipientCount: recipientIds.length,
    })

    if (recipientIds.length === 0) {
      return { success: false, error: 'No recipients found' }
    }

    // Create notifications
    const notifications = await db.notification.createMany({
      data: recipientIds.map((recipientId) => ({
        userId: recipientId,
        type: 'SYSTEM',
        title,
        message,
        linkUrl: linkUrl || null,
        imageUrl: imageUrl || null,
        isGlobal: recipientType === 'all',
        isSent: false,
      })),
    })

    console.log('[Push] sendNotification DB records created', {
      recipientType,
      notificationRecordCount: notifications.count,
    })

    // Send actual push notifications via Firebase
    const pushPayload = {
      title,
      body: message,
      imageUrl: imageUrl || undefined,
      data: {
        type: 'SYSTEM',
        ...(linkUrl ? { linkUrl } : {}),
      },
    }

    let pushSuccess = false
    let pushResult:
      | {
          successCount: number
          failureCount: number
          failedTokens: string[]
        }
      | null = null

    console.log('[Push] Sending notification', {
      source: 'sendNotification',
      recipientType,
      payload: getPushPayloadDebugInfo(pushPayload),
    })

    try {
      if (recipientType === 'all') {
        pushResult = await sendPushToAll(pushPayload)
        pushSuccess = !!(pushResult && pushResult.successCount > 0)
      } else if (recipientType === 'buyers') {
        pushResult = await sendPushToRole('BUYER', pushPayload)
        pushSuccess = !!(pushResult && pushResult.successCount > 0)
      } else if (recipientType === 'suppliers') {
        pushResult = await sendPushToRole('SUPPLIER', pushPayload)
        pushSuccess = !!(pushResult && pushResult.successCount > 0)
      } else if (recipientType === 'specific' && specificUserId) {
        pushResult = await sendPushToUser(specificUserId, pushPayload)
        pushSuccess = !!(pushResult && pushResult.successCount > 0)
      }

      console.log('[Push] sendNotification Firebase result', {
        recipientType,
        successCount: pushResult?.successCount || 0,
        failureCount: pushResult?.failureCount || 0,
        failedTokenCount: pushResult?.failedTokens.length || 0,
        pushSuccess,
      })
    } catch (pushError) {
      console.error('[Push] Error', {
        source: 'sendNotification',
        recipientType,
        error: getPushErrorDebugInfo(pushError),
      })
    }

    // Mark notifications as sent if push was successful
    if (pushSuccess) {
      await db.notification.updateMany({
        where: {
          userId: { in: recipientIds },
          type: 'SYSTEM',
          title,
          isSent: false,
        },
        data: { isSent: true },
      })
    }

    console.log(
      `Created ${notifications.count} notifications for ${recipientType}, push sent: ${pushSuccess}`
    )

    return {
      success: true,
      message: `Notification sent to ${recipientIds.length} recipient(s)`,
      data: {
        count: notifications.count,
        recipientCount: recipientIds.length,
      },
    }
  } catch (error) {
    console.error('Error sending notification:', error)
    return { success: false, error: 'Failed to send notification' }
  }
}

/**
 * Search for users (for recipient selection)
 */
export async function searchUsers(
  query: string,
  role?: UserRole
): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    const users = await db.user.findMany({
      where: {
        ...(role && { role }),
        OR: [
          { phone: { contains: query, mode: 'insensitive' } },
          { username: { contains: query, mode: 'insensitive' } },
          { storeName: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        phone: true,
        username: true,
        storeName: true,
        role: true,
      },
      take: 20,
    })

    return {
      success: true,
      data: { users },
    }
  } catch (error) {
    console.error('Error searching users:', error)
    return { success: false, error: 'Failed to search users' }
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  notificationId: string
): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    await db.notification.delete({
      where: { id: notificationId },
    })

    return {
      success: true,
      message: 'Notification deleted successfully',
    }
  } catch (error) {
    console.error('Error deleting notification:', error)
    return { success: false, error: 'Failed to delete notification' }
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    await db.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    })

    return {
      success: true,
      message: 'Notification marked as read',
    }
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return { success: false, error: 'Failed to mark notification as read' }
  }
}

/**
 * Cleanup stale/inactive device tokens (admin only)
 */
export async function cleanupDeviceTokens(staleDays = 90): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    const result = await cleanupStaleTokens(staleDays)

    return {
      success: true,
      message: `Cleaned up ${result.deletedInactive} inactive and ${result.deactivatedStale} stale tokens`,
      data: result,
    }
  } catch (error) {
    console.error('Error cleaning up device tokens:', error)
    return { success: false, error: 'Failed to cleanup tokens' }
  }
}
