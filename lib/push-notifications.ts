import { getFirebaseMessaging, isFirebaseConfigured } from './firebase'
import { db } from './db'
import type { UserRole } from '@prisma/client'

// FCM allows max 500 tokens per multicast call
const FCM_BATCH_SIZE = 500

export interface PushPayload {
  title: string
  body: string
  imageUrl?: string
  data?: Record<string, string>
}

/**
 * Send multicast in batches of FCM_BATCH_SIZE (500).
 * Returns aggregate counts and list of failed tokens.
 */
async function sendMulticastBatched(
  tokens: string[],
  payload: PushPayload
): Promise<{ successCount: number; failureCount: number; failedTokens: string[] }> {
  const messaging = getFirebaseMessaging()
  if (!messaging || tokens.length === 0) {
    return { successCount: 0, failureCount: 0, failedTokens: [] }
  }

  let totalSuccess = 0
  let totalFailure = 0
  const allFailedTokens: string[] = []

  for (let i = 0; i < tokens.length; i += FCM_BATCH_SIZE) {
    const batch = tokens.slice(i, i + FCM_BATCH_SIZE)

    try {
      const response = await messaging.sendEachForMulticast({
        notification: {
          title: payload.title,
          body: payload.body,
          ...(payload.imageUrl ? { imageUrl: payload.imageUrl } : {}),
        },
        data: payload.data || {},
        tokens: batch,
      })

      totalSuccess += response.successCount
      totalFailure += response.failureCount

      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          allFailedTokens.push(batch[idx])
        }
      })
    } catch (error) {
      console.error(`Batch send failed (batch starting at ${i}):`, error)
      totalFailure += batch.length
      allFailedTokens.push(...batch)
    }
  }

  // Deactivate all failed tokens in one query
  if (allFailedTokens.length > 0) {
    await db.deviceToken.updateMany({
      where: { token: { in: allFailedTokens } },
      data: { isActive: false },
    })
  }

  return { successCount: totalSuccess, failureCount: totalFailure, failedTokens: allFailedTokens }
}

/**
 * Send push notification to a specific user's devices
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!isFirebaseConfigured()) {
    console.warn('Firebase not configured, skipping push notification')
    return null
  }

  try {
    // Get all active device tokens linked to this user
    const deviceTokens = await db.deviceToken.findMany({
      where: { userId, isActive: true },
      select: { token: true },
    })

    if (deviceTokens.length === 0) {
      console.log(`No active device tokens for user ${userId}`)
      return null
    }

    const tokens = deviceTokens.map((dt) => dt.token)
    const result = await sendMulticastBatched(tokens, payload)

    console.log(`Push sent to user ${userId}: ${result.successCount}/${tokens.length} successful`)
    return result
  } catch (error) {
    console.error('Error sending push to user:', error)
    return null
  }
}

/**
 * Send push notification to ALL active device tokens (broadcast)
 * Includes both authenticated and anonymous (logged-out) devices.
 * Use this for general announcements, promotions, and marketing campaigns.
 */
export async function sendPushToAll(payload: PushPayload) {
  if (!isFirebaseConfigured()) {
    console.warn('Firebase not configured, skipping broadcast')
    return null
  }

  try {
    // Get ALL active device tokens — including anonymous (userId=null)
    const deviceTokens = await db.deviceToken.findMany({
      where: { isActive: true },
      select: { token: true },
    })

    if (deviceTokens.length === 0) {
      console.log('No active device tokens for broadcast')
      return null
    }

    const tokens = deviceTokens.map((dt) => dt.token)
    const result = await sendMulticastBatched(tokens, payload)

    console.log(`Broadcast complete: ${result.successCount}/${tokens.length} successful`)
    return result
  } catch (error) {
    console.error('Error sending broadcast push:', error)
    return null
  }
}

/**
 * Send push notification only to authenticated users' devices.
 * Excludes anonymous/logged-out devices.
 */
export async function sendPushToAuthenticated(payload: PushPayload) {
  if (!isFirebaseConfigured()) {
    console.warn('Firebase not configured, skipping authenticated push')
    return null
  }

  try {
    const deviceTokens = await db.deviceToken.findMany({
      where: { isActive: true, userId: { not: null } },
      select: { token: true },
    })

    if (deviceTokens.length === 0) {
      console.log('No active authenticated device tokens')
      return null
    }

    const tokens = deviceTokens.map((dt) => dt.token)
    const result = await sendMulticastBatched(tokens, payload)

    console.log(`Authenticated push complete: ${result.successCount}/${tokens.length} successful`)
    return result
  } catch (error) {
    console.error('Error sending authenticated push:', error)
    return null
  }
}

/**
 * Send push notification to all devices linked to users with a specific role.
 * Only targets tokens that have a linked user with the matching role.
 */
export async function sendPushToRole(role: UserRole, payload: PushPayload) {
  if (!isFirebaseConfigured()) {
    console.warn('Firebase not configured, skipping role-based push')
    return null
  }

  try {
    // Get active device tokens linked to users with the specific role
    // userId must not be null (anonymous tokens have no role)
    const deviceTokens = await db.deviceToken.findMany({
      where: {
        isActive: true,
        userId: { not: null },
        user: { role },
      },
      select: { token: true },
    })

    if (deviceTokens.length === 0) {
      console.log(`No active device tokens for role ${role}`)
      return null
    }

    const tokens = deviceTokens.map((dt) => dt.token)
    const result = await sendMulticastBatched(tokens, payload)

    console.log(`Push to role ${role} complete: ${result.successCount}/${tokens.length} successful`)
    return result
  } catch (error) {
    console.error(`Error sending push to role ${role}:`, error)
    return null
  }
}

/**
 * Send push notification and create notification record
 * This is the main function to use when you want both DB record and push delivery
 */
export async function createAndSendNotification(
  userId: string,
  notificationData: {
    type: any  // NotificationType enum
    title: string
    message: string
    linkUrl?: string
    imageUrl?: string
    data?: Record<string, string>
  }
) {
  try {
    // Create notification record
    const notification = await db.notification.create({
      data: {
        userId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        linkUrl: notificationData.linkUrl,
        imageUrl: notificationData.imageUrl,
        data: notificationData.data ? JSON.parse(JSON.stringify(notificationData.data)) : null,
        isSent: false,
      },
    })

    // Send push
    if (isFirebaseConfigured()) {
      const pushResponse = await sendPushToUser(userId, {
        title: notificationData.title,
        body: notificationData.message,
        imageUrl: notificationData.imageUrl,
        data: {
          ...notificationData.data,
          notificationId: notification.id,
          linkUrl: notificationData.linkUrl || '',
        },
      })

      if (pushResponse && pushResponse.successCount > 0) {
        // Mark as sent
        await db.notification.update({
          where: { id: notification.id },
          data: { isSent: true },
        })
      }
    }

    return notification
  } catch (error) {
    console.error('Error creating and sending notification:', error)
  }
}

/**
 * Send broadcast notification to all users or a specific list
 */
export async function createAndSendBroadcast(
  notificationData: {
    type: any  // NotificationType enum
    title: string
    message: string
    imageUrl?: string
    data?: Record<string, string>
  },
  userIds?: string[]
) {
  try {
    // Determine target users
    const targetUsers = userIds && userIds.length > 0
      ? userIds.map(id => ({ id }))
      : await db.user.findMany({
          select: { id: true },
          where: { isActive: true },
        })

    if (targetUsers.length === 0) return

    // Create notification records for all target users
    const batchId = new Date().toISOString() // Use timestamp as batch identifier

    await db.notification.createMany({
      data: targetUsers.map((user) => ({
        userId: user.id,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        imageUrl: notificationData.imageUrl,
        data: notificationData.data
          ? JSON.parse(JSON.stringify({ ...notificationData.data, batchId }))
          : { batchId },
        isGlobal: !userIds || userIds.length === 0,
        isSent: false,
      })),
    })

    // Send push notifications
    if (isFirebaseConfigured()) {
      const pushPayload: PushPayload = {
        title: notificationData.title,
        body: notificationData.message,
        imageUrl: notificationData.imageUrl,
        data: {
          ...notificationData.data,
          isBroadcast: 'true',
        },
      }

      let pushResult
      if (userIds && userIds.length > 0) {
        // Send to specific users one by one
        for (const userId of userIds) {
          await sendPushToUser(userId, pushPayload)
        }
        pushResult = { successCount: 1 }
      } else {
        pushResult = await sendPushToAll(pushPayload)
      }

      if (pushResult && pushResult.successCount > 0) {
        // Mark only the notifications we just created as sent (using batchId)
        await db.$executeRaw`
          UPDATE "Notification"
          SET "isSent" = true
          WHERE "isSent" = false
            AND "data"::jsonb @> ${JSON.stringify({ batchId })}::jsonb
        `
      }
    }
  } catch (error) {
    console.error('Error creating and sending broadcast:', error)
  }
}

/**
 * Clean up stale/inactive device tokens older than the given number of days.
 * Tokens that have been marked inactive (failed delivery) are deleted.
 * Tokens that haven't been updated in `staleDays` are also deactivated.
 */
export async function cleanupStaleTokens(staleDays = 90) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - staleDays)

  // Delete tokens already marked inactive
  const deletedInactive = await db.deviceToken.deleteMany({
    where: { isActive: false },
  })

  // Deactivate tokens not updated since cutoff
  const deactivatedStale = await db.deviceToken.updateMany({
    where: {
      isActive: true,
      updatedAt: { lt: cutoff },
    },
    data: { isActive: false },
  })

  console.log(
    `Token cleanup: deleted ${deletedInactive.count} inactive, deactivated ${deactivatedStale.count} stale (>${staleDays} days)`
  )

  return {
    deletedInactive: deletedInactive.count,
    deactivatedStale: deactivatedStale.count,
  }
}

/**
 * Get push notification system stats (for admin dashboard)
 */
export async function getPushStats() {
  const [totalTokens, activeTokens, ioTokens, androidTokens, linkedTokens, anonymousTokens] = await Promise.all([
    db.deviceToken.count(),
    db.deviceToken.count({ where: { isActive: true } }),
    db.deviceToken.count({ where: { isActive: true, platform: 'IOS' } }),
    db.deviceToken.count({ where: { isActive: true, platform: 'ANDROID' } }),
    db.deviceToken.count({ where: { isActive: true, userId: { not: null } } }),
    db.deviceToken.count({ where: { isActive: true, userId: null } }),
  ])

  return {
    totalTokens,
    activeTokens,
    inactiveTokens: totalTokens - activeTokens,
    ioTokens,
    androidTokens,
    linkedTokens,
    anonymousTokens,
    firebaseConfigured: isFirebaseConfigured(),
  }
}
