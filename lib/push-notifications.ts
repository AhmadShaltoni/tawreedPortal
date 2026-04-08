import { getFirebaseMessaging, isFirebaseConfigured } from './firebase'
import { db } from './db'
import type { UserRole } from '@prisma/client'

export interface PushPayload {
  title: string
  body: string
  imageUrl?: string
  data?: Record<string, string>
}

/**
 * Send push notification to a specific user
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!isFirebaseConfigured()) {
    console.warn('Firebase not configured, skipping push notification')
    return
  }

  try {
    const messaging = getFirebaseMessaging()
    if (!messaging) return

    // Get all active device tokens for user
    const deviceTokens = await db.deviceToken.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: { id: true, token: true },
    })

    if (deviceTokens.length === 0) {
      console.log(`No active device tokens for user ${userId}`)
      return
    }

    const tokens = deviceTokens.map((dt) => dt.token)

    // Send to all device tokens
    const response = await messaging.sendEachForMulticast({
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl,
      },
      data: payload.data || {},
      tokens,
    })

    // Handle failures - deactivate invalid tokens
    if (response.failureCount > 0) {
      const failedTokens: string[] = []

      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx])
          console.error(`Failed to send to token ${tokens[idx]}:`, resp.error?.message)
        }
      })

      // Deactivate invalid tokens
      if (failedTokens.length > 0) {
        await db.deviceToken.updateMany({
          where: {
            token: { in: failedTokens },
          },
          data: { isActive: false },
        })
      }
    }

    console.log(`Push sent to user ${userId}: ${response.successCount}/${tokens.length} successful`)
    return response
  } catch (error) {
    console.error('Error sending push to user:', error)
  }
}

/**
 * Send push notification to all active users (broadcast)
 */
export async function sendPushToAll(payload: PushPayload) {
  if (!isFirebaseConfigured()) {
    console.warn('Firebase not configured, skipping broadcast')
    return
  }

  try {
    const messaging = getFirebaseMessaging()
    if (!messaging) return

    // Get all active device tokens
    const deviceTokens = await db.deviceToken.findMany({
      where: { isActive: true },
      select: { token: true },
    })

    if (deviceTokens.length === 0) {
      console.log('No active device tokens for broadcast')
      return
    }

    const tokens = deviceTokens.map((dt) => dt.token)

    // Send to all tokens
    const response = await messaging.sendEachForMulticast({
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl,
      },
      data: payload.data || {},
      tokens,
    })

    // Handle failures
    if (response.failureCount > 0) {
      const failedTokens: string[] = []

      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx])
        }
      })

      if (failedTokens.length > 0) {
        await db.deviceToken.updateMany({
          where: { token: { in: failedTokens } },
          data: { isActive: false },
        })
      }
    }

    console.log(
      `Broadcast complete: ${response.successCount}/${tokens.length} successful`
    )
    return response
  } catch (error) {
    console.error('Error sending broadcast push:', error)
  }
}

/**
 * Send push notification to all users with a specific role
 */
export async function sendPushToRole(role: UserRole, payload: PushPayload) {
  if (!isFirebaseConfigured()) {
    console.warn('Firebase not configured, skipping role-based push')
    return
  }

  try {
    const messaging = getFirebaseMessaging()
    if (!messaging) return

    // Get all active device tokens for users with specific role
    const deviceTokens = await db.deviceToken.findMany({
      where: {
        isActive: true,
        user: {
          role,
        },
      },
      select: { token: true },
    })

    if (deviceTokens.length === 0) {
      console.log(`No active device tokens for role ${role}`)
      return
    }

    const tokens = deviceTokens.map((dt) => dt.token)

    // Send to all tokens
    const response = await messaging.sendEachForMulticast({
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl,
      },
      data: payload.data || {},
      tokens,
    })

    // Handle failures
    if (response.failureCount > 0) {
      const failedTokens: string[] = []

      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx])
        }
      })

      if (failedTokens.length > 0) {
        await db.deviceToken.updateMany({
          where: { token: { in: failedTokens } },
          data: { isActive: false },
        })
      }
    }

    console.log(
      `Push to role ${role} complete: ${response.successCount}/${tokens.length} successful`
    )
    return response
  } catch (error) {
    console.error(`Error sending push to role ${role}:`, error)
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
 * Send broadcast notification to all users
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
    // If specific users provided, send to each
    if (userIds && userIds.length > 0) {
      for (const userId of userIds) {
        await createAndSendNotification(userId, {
          ...notificationData,
          data: { ...notificationData.data, isBroadcast: 'true' },
        })
      }
      return
    }

    // Otherwise, send to all users
    const allUsers = await db.user.findMany({
      select: { id: true },
      where: { isActive: true },
    })

    // Create notifications for all users
    await db.notification.createMany({
      data: allUsers.map((user) => ({
        userId: user.id,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        imageUrl: notificationData.imageUrl,
        data: notificationData.data ? JSON.parse(JSON.stringify(notificationData.data)) : null,
        isGlobal: true,
        isSent: false,
      })),
    })

    // Send push to all
    if (isFirebaseConfigured()) {
      const pushResponse = await sendPushToAll({
        title: notificationData.title,
        body: notificationData.message,
        imageUrl: notificationData.imageUrl,
        data: {
          ...notificationData.data,
          isBroadcast: 'true',
        },
      })

      if (pushResponse && pushResponse.successCount > 0) {
        // Mark notifications as sent
        await db.notification.updateMany({
          where: { isGlobal: true, isSent: false },
          data: { isSent: true },
        })
      }
    }
  } catch (error) {
    console.error('Error creating and sending broadcast:', error)
  }
}
