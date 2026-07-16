'use server'

import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { sendPushToUser, sendPushToAll, sendPushToRole, getPushStats, cleanupStaleTokens } from '@/lib/push-notifications'
import { saveNotificationImage } from '@/lib/upload'
import type { UserRole } from '@prisma/client'
import { isAdminLike } from '@/lib/permissions'

export type NotificationTargetType =
  | 'PRODUCT'
  | 'CATEGORY'
  | 'BRAND'
  | 'COLLECTION'
  | 'ORDER'
  | 'URL'
  | 'NONE'

/**
 * Builds the app-navigable path for a given target. `targetId` holds the
 * collection's slug (not its id) for COLLECTION targets, matching the
 * mobile route param at /marketing-section/[slug].
 */
function buildLinkUrl(
  targetType: string | null,
  targetId: string | null,
  rawUrl: string | null
): string | null {
  if (!targetType || targetType === 'NONE') return null
  if (targetType === 'URL') return rawUrl?.trim() || null
  if (!targetId) return null

  switch (targetType) {
    case 'PRODUCT':
      return `/products/${targetId}`
    case 'ORDER':
      return `/orders/${targetId}`
    case 'CATEGORY':
      return `/categories/${targetId}`
    case 'BRAND':
      return `/brands/${targetId}`
    case 'COLLECTION':
      return `/marketing-section/${targetId}`
    default:
      return null
  }
}

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
    if (!user || !isAdminLike(user.role)) {
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
    if (!user || !isAdminLike(user.role)) {
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
    if (!user || !isAdminLike(user.role)) {
      return { success: false, error: 'Unauthorized' }
    }

    const title = formData.get('title') as string
    const message = formData.get('message') as string
    const rawUrlInput = formData.get('linkUrl') as string | null
    const imageUrl = formData.get('imageUrl') as string | null
    const recipientType = formData.get('recipientType') as string // 'all' | 'buyers' | 'suppliers' | 'specific'
    const specificUserId = formData.get('specificUserId') as string | null
    const targetType = (formData.get('targetType') as string | null) || 'NONE'
    const targetId = formData.get('targetId') as string | null
    const targetLabel = formData.get('targetLabel') as string | null

    const linkUrl = buildLinkUrl(targetType, targetId, rawUrlInput)
    const notificationData =
      targetType && targetType !== 'NONE'
        ? {
            targetType,
            ...(targetId ? { targetId } : {}),
            ...(targetLabel ? { targetLabel } : {}),
          }
        : undefined

    console.log('[Push] sendNotification requested', {
      adminUserId: user.id,
      recipientType,
      specificUserId: specificUserId || undefined,
      targetType,
      targetId: targetId || undefined,
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
        data: notificationData,
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
        ...(targetType && targetType !== 'NONE' ? { targetType } : {}),
        ...(targetId ? { targetId } : {}),
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
    if (!user || !isAdminLike(user.role)) {
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

export interface NotificationTargetOption {
  id: string
  label: string
  subLabel?: string
  image?: string
  meta?: string
}

/**
 * Search for notification destination targets (products/categories/brands/collections)
 * used by the "target picker" in the compose form.
 */
export async function searchNotificationTargets(
  targetType: 'PRODUCT' | 'CATEGORY' | 'BRAND' | 'COLLECTION',
  query: string
): Promise<ActionResponse<{ items: NotificationTargetOption[] }>> {
  try {
    const user = await getCurrentUser()
    if (!user || !isAdminLike(user.role)) {
      return { success: false, error: 'Unauthorized' }
    }

    const q = query.trim()
    const textFilter = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { nameEn: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}

    if (targetType === 'PRODUCT') {
      // Return the whole active catalog (newest first) — the client filters
      // locally with Arabic normalization, so search stays instant and robust.
      const products = await db.product.findMany({
        where: { isActive: true, ...textFilter },
        select: { id: true, name: true, nameEn: true, image: true },
        orderBy: { createdAt: 'desc' },
        take: 2000,
      })
      return {
        success: true,
        data: {
          items: products.map((p) => ({
            id: p.id,
            label: p.name,
            subLabel: p.nameEn || undefined,
            image: p.image || undefined,
          })),
        },
      }
    }

    if (targetType === 'CATEGORY') {
      const categories = await db.category.findMany({
        where: { isActive: true, ...textFilter },
        select: { id: true, name: true, nameEn: true, depth: true },
        orderBy: { sortOrder: 'asc' },
        take: 200,
      })
      return {
        success: true,
        data: {
          items: categories.map((c) => ({
            id: c.id,
            label: `${'— '.repeat(c.depth)}${c.name}`,
            subLabel: c.nameEn || undefined,
          })),
        },
      }
    }

    if (targetType === 'BRAND') {
      const brands = await db.brand.findMany({
        where: { isActive: true, ...textFilter },
        select: { id: true, name: true, nameEn: true, logo: true },
        orderBy: { sortOrder: 'asc' },
        take: 200,
      })
      return {
        success: true,
        data: {
          items: brands.map((b) => ({
            id: b.id,
            label: b.name,
            subLabel: b.nameEn || undefined,
            image: b.logo || undefined,
          })),
        },
      }
    }

    if (targetType === 'COLLECTION') {
      const collections = await db.collection.findMany({
        where: { isActive: true, ...textFilter },
        select: {
          name: true,
          nameEn: true,
          slug: true,
          type: true,
          image: true,
        },
        orderBy: { sortOrder: 'asc' },
        take: 200,
      })
      return {
        success: true,
        data: {
          // `id` here is the collection SLUG (not its cuid) — it's what gets
          // stored as targetId and matches the mobile /marketing-section/[slug] route.
          items: collections.map((c) => ({
            id: c.slug,
            label: c.name,
            subLabel: c.nameEn || undefined,
            image: c.image || undefined,
            meta: c.type,
          })),
        },
      }
    }

    return { success: false, error: 'Invalid target type' }
  } catch (error) {
    console.error('Error searching notification targets:', error)
    return { success: false, error: 'Failed to search targets' }
  }
}

/**
 * Upload an image for a notification (Cloudinary), used by the compose form.
 */
export async function uploadNotificationImage(
  formData: FormData
): Promise<ActionResponse<{ url: string }>> {
  try {
    const user = await getCurrentUser()
    if (!user || !isAdminLike(user.role)) {
      return { success: false, error: 'Unauthorized' }
    }

    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return { success: false, error: 'No file provided' }
    }

    const url = await saveNotificationImage(file)
    return { success: true, data: { url } }
  } catch (error) {
    console.error('Error uploading notification image:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload image',
    }
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
    if (!user || !isAdminLike(user.role)) {
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
    if (!user || !isAdminLike(user.role)) {
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
    if (!user || !isAdminLike(user.role)) {
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
