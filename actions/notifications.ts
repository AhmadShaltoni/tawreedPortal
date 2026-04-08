'use server'

import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import type { UserRole } from '@prisma/client'

export interface ActionResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
  error?: string
  errors?: Record<string, string[]>
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
 * Get notification statistics
 */
export async function getNotificationStats(): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    const [total, sent, unread, byType] = await Promise.all([
      db.notification.count(),
      db.notification.count({ where: { isSent: true } }),
      db.notification.count({ where: { isRead: false } }),
      db.notification.groupBy({
        by: ['type'],
        _count: true,
      }),
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

    // Try to send push if Firebase is configured
    // (This will be done asynchronously in production)
    console.log(
      `Created ${notifications.count} notifications for ${recipientType}`
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
