import { getFirebaseMessaging, isFirebaseConfigured } from './firebase'
import { db } from './db'
import type { NotificationType, UserRole } from '@prisma/client'

// FCM allows max 500 tokens per multicast call
const FCM_BATCH_SIZE = 500

export interface PushPayload {
  title: string
  body: string
  imageUrl?: string
  data?: Record<string, string>
}

function maskToken(token: string) {
  if (token.length <= 12) return `${token.slice(0, 3)}...${token.slice(-3)}`
  return `${token.slice(0, 6)}...${token.slice(-6)}`
}

function getPayloadDebugInfo(payload: PushPayload) {
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

function getFirebaseErrorDebugInfo(error: unknown) {
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
 * Send multicast in batches of FCM_BATCH_SIZE (500).
 * Returns aggregate counts and list of failed tokens.
 */
async function sendMulticastBatched(
  tokens: string[],
  payload: PushPayload
): Promise<{ successCount: number; failureCount: number; failedTokens: string[] }> {
  const messaging = getFirebaseMessaging()
  if (!messaging || tokens.length === 0) {
    console.warn('[Push] Skipping multicast send', {
      firebaseMessagingAvailable: Boolean(messaging),
      tokenCount: tokens.length,
      payload: getPayloadDebugInfo(payload),
    })
    return { successCount: 0, failureCount: 0, failedTokens: [] }
  }

  let totalSuccess = 0
  let totalFailure = 0
  const allFailedTokens: string[] = []

  console.log('[Push] Sending notification', {
    tokenCount: tokens.length,
    batchSize: FCM_BATCH_SIZE,
    batchCount: Math.ceil(tokens.length / FCM_BATCH_SIZE),
    payload: getPayloadDebugInfo(payload),
  })

  for (let i = 0; i < tokens.length; i += FCM_BATCH_SIZE) {
    const batch = tokens.slice(i, i + FCM_BATCH_SIZE)
    const batchNumber = Math.floor(i / FCM_BATCH_SIZE) + 1
    const failedTokensForBatch: Array<{
      token: string
      error?: unknown
    }> = []

    try {
      const response = await messaging.sendEachForMulticast({
        notification: {
          title: payload.title,
          body: payload.body,
          ...(payload.imageUrl ? { imageUrl: payload.imageUrl } : {}),
        },
        data: payload.data || {},
        // iOS (APNs) — required for reliable delivery, sound, badge and images.
        // Without an explicit aps payload, iOS often shows nothing even when FCM reports success.
        apns: {
          headers: {
            'apns-priority': '10',
            'apns-push-type': 'alert',
          },
          payload: {
            aps: {
              alert: {
                title: payload.title,
                body: payload.body,
              },
              sound: 'default',
              badge: 1,
              // Required so the app can download/show the image attachment
              ...(payload.imageUrl ? { 'mutable-content': 1 } : {}),
            },
          },
          ...(payload.imageUrl ? { fcmOptions: { imageUrl: payload.imageUrl } } : {}),
        },
        // Android — high priority so it wakes the device
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            ...(payload.imageUrl ? { imageUrl: payload.imageUrl } : {}),
          },
        },
        tokens: batch,
      })

      totalSuccess += response.successCount
      totalFailure += response.failureCount

      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          allFailedTokens.push(batch[idx])
          failedTokensForBatch.push({
            token: maskToken(batch[idx]),
            error: resp.error
              ? {
                  code: resp.error.code,
                  message: resp.error.message,
                }
              : undefined,
          })
        }
      })

      console.log('[Push] Firebase response', {
        batchNumber,
        batchTokenCount: batch.length,
        successCount: response.successCount,
        failureCount: response.failureCount,
        failedTokens: failedTokensForBatch,
      })
    } catch (error) {
      console.error('[Push] Error', {
        batchNumber,
        batchTokenCount: batch.length,
        failedTokens: batch.map(maskToken),
        error: getFirebaseErrorDebugInfo(error),
      })
      totalFailure += batch.length
      allFailedTokens.push(...batch)
    }
  }

  console.log('[Push] Firebase aggregate response', {
    tokenCount: tokens.length,
    successCount: totalSuccess,
    failureCount: totalFailure,
    failedTokens: allFailedTokens.map(maskToken),
  })

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
    console.warn('[Push] Firebase not configured, skipping push notification', {
      target: 'user',
      userId,
      payload: getPayloadDebugInfo(payload),
    })
    return null
  }

  try {
    console.log('[Push] Preparing user notification', {
      target: 'user',
      userId,
      payload: getPayloadDebugInfo(payload),
    })

    // Get all active device tokens linked to this user
    const deviceTokens = await db.deviceToken.findMany({
      where: { userId, isActive: true },
      select: { token: true },
    })

    console.log('[Push] Tokens found', {
      target: 'user',
      userId,
      tokenCount: deviceTokens.length,
      tokens: deviceTokens.map((dt) => maskToken(dt.token)),
    })

    if (deviceTokens.length === 0) {
      console.log('[Push] No active device tokens', { target: 'user', userId })
      return null
    }

    const tokens = deviceTokens.map((dt) => dt.token)
    const result = await sendMulticastBatched(tokens, payload)

    console.log('[Push] User notification complete', {
      userId,
      tokenCount: tokens.length,
      successCount: result.successCount,
      failureCount: result.failureCount,
      failedTokens: result.failedTokens.map(maskToken),
    })
    return result
  } catch (error) {
    console.error('[Push] Error', {
      target: 'user',
      userId,
      error: getFirebaseErrorDebugInfo(error),
    })
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
    console.warn('[Push] Firebase not configured, skipping broadcast', {
      target: 'all',
      payload: getPayloadDebugInfo(payload),
    })
    return null
  }

  try {
    console.log('[Push] Preparing broadcast notification', {
      target: 'all',
      payload: getPayloadDebugInfo(payload),
    })

    // Get ALL active device tokens — including anonymous (userId=null)
    const deviceTokens = await db.deviceToken.findMany({
      where: { isActive: true },
      select: { token: true },
    })

    console.log('[Push] Tokens found', {
      target: 'all',
      tokenCount: deviceTokens.length,
      tokens: deviceTokens.map((dt) => maskToken(dt.token)),
    })

    if (deviceTokens.length === 0) {
      console.log('[Push] No active device tokens', { target: 'all' })
      return null
    }

    const tokens = deviceTokens.map((dt) => dt.token)
    const result = await sendMulticastBatched(tokens, payload)

    console.log('[Push] Broadcast notification complete', {
      tokenCount: tokens.length,
      successCount: result.successCount,
      failureCount: result.failureCount,
      failedTokens: result.failedTokens.map(maskToken),
    })
    return result
  } catch (error) {
    console.error('[Push] Error', {
      target: 'all',
      error: getFirebaseErrorDebugInfo(error),
    })
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
    console.warn('[Push] Firebase not configured, skipping role-based push', {
      target: 'role',
      role,
      payload: getPayloadDebugInfo(payload),
    })
    return null
  }

  try {
    console.log('[Push] Preparing role notification', {
      target: 'role',
      role,
      payload: getPayloadDebugInfo(payload),
    })

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

    console.log('[Push] Tokens found', {
      target: 'role',
      role,
      tokenCount: deviceTokens.length,
      tokens: deviceTokens.map((dt) => maskToken(dt.token)),
    })

    if (deviceTokens.length === 0) {
      console.log('[Push] No active device tokens', { target: 'role', role })
      return null
    }

    const tokens = deviceTokens.map((dt) => dt.token)
    const result = await sendMulticastBatched(tokens, payload)

    console.log('[Push] Role notification complete', {
      role,
      tokenCount: tokens.length,
      successCount: result.successCount,
      failureCount: result.failureCount,
      failedTokens: result.failedTokens.map(maskToken),
    })
    return result
  } catch (error) {
    console.error('[Push] Error', {
      target: 'role',
      role,
      error: getFirebaseErrorDebugInfo(error),
    })
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
    type: NotificationType
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
    type: NotificationType
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
