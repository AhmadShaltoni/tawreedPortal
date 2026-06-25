'use server'

import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { createAndSendNotification } from '@/lib/push-notifications'
import { hashPhone } from '@/lib/account/phone-hash'
import type { ActionResponse } from '@/types'

/**
 * Get or create loyalty config (singleton)
 */
async function getLoyaltyConfig() {
  let config = await db.loyaltyConfig.findFirst()
  
  if (!config) {
    // Create default config if doesn't exist
    config = await db.loyaltyConfig.create({
      data: {
        isEnabled: true,
        pointsPerJod: 10,
        calculationBase: 1,
        excludeDeliveryFees: true,
        roundingMode: 'FLOOR',
      },
    })
  }
  
  return config
}

/**
 * Calculate points for an order (called when order status = DELIVERED)
 */
export async function calculateOrderPoints(orderId: string): Promise<ActionResponse<any>> {
  try {
    const config = await getLoyaltyConfig()
    
    if (!config.isEnabled) {
      return { success: true, message: 'Loyalty system disabled' }
    }
    
    // Get order details
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { buyer: true },
    })
    
    if (!order) {
      return { success: false, error: 'Order not found' }
    }
    
    if (order.status !== 'DELIVERED') {
      return { success: false, error: 'Order must be delivered to earn points' }
    }
    
    if (order.loyaltyPointsEarned) {
      return { success: false, error: 'Points already awarded for this order' }
    }
    
    // Calculate base amount (exclude delivery if configured)
    let baseAmount = order.totalPrice
    if (config.excludeDeliveryFees) {
      baseAmount -= order.deliveryFee
    }
    
    // Check min order value
    if (config.minOrderValue && baseAmount < config.minOrderValue) {
      return { success: true, message: 'Order below minimum value for points' }
    }
    
    // Calculate points
    const pointsRaw = (baseAmount / config.calculationBase) * config.pointsPerJod
    
    // Apply rounding
    let points = 0
    switch (config.roundingMode) {
      case 'FLOOR':
        points = Math.floor(pointsRaw)
        break
      case 'CEIL':
        points = Math.ceil(pointsRaw)
        break
      case 'ROUND':
        points = Math.round(pointsRaw)
        break
      default:
        points = Math.floor(pointsRaw)
    }
    
    if (points <= 0) {
      return { success: true, message: 'No points earned' }
    }
    
    // Update or create user loyalty balance
    const balance = await db.loyaltyBalance.upsert({
      where: { userId: order.buyerId },
      update: {
        totalEarned: { increment: points },
        currentBalance: { increment: points },
      },
      create: {
        userId: order.buyerId,
        totalEarned: points,
        currentBalance: points,
      },
    })
    
    // Create transaction record
    await db.loyaltyTransaction.create({
      data: {
        userId: order.buyerId,
        type: 'EARN_ORDER',
        points,
        description: `نقاط من طلب رقم ${order.orderNumber}`,
        referenceId: orderId,
        referenceType: 'ORDER',
        metadata: {
          orderNumber: order.orderNumber,
          orderAmount: order.totalPrice,
          baseAmount,
          deliveryFee: order.deliveryFee,
        },
      },
    })
    
    // Update order with earned points
    await db.order.update({
      where: { id: orderId },
      data: { loyaltyPointsEarned: points },
    })
    
    // Send notification
    await createAndSendNotification(order.buyerId, {
      type: 'LOYALTY_POINTS_EARNED',
      title: 'حصلت على نقاط!',
      message: `تم إضافة ${points} نقطة إلى رصيدك من طلبك رقم ${order.orderNumber}`,
      linkUrl: `/loyalty`,
      data: {
        points: points.toString(),
        orderId,
        orderNumber: order.orderNumber,
      },
    })
    
    return {
      success: true,
      data: {
        points,
        newBalance: balance.currentBalance,
        orderId,
      },
    }
  } catch (error) {
    console.error('[loyalty-points.calculateOrderPoints]', error)
    return { success: false, error: 'Failed to calculate points' }
  }
}

/**
 * Award welcome bonus to new user
 */
export async function awardWelcomeBonus(userId: string, trigger: 'SIGNUP' | 'FIRST_DELIVERED_ORDER'): Promise<ActionResponse<any>> {
  try {
    const config = await db.welcomeBonusConfig.findFirst()
    
    if (!config || !config.isEnabled) {
      return { success: true, message: 'Welcome bonus disabled' }
    }
    
    if (config.trigger !== trigger) {
      return { success: true, message: 'Wrong trigger' }
    }
    
    // Check if already received
    const existingBonus = await db.loyaltyTransaction.findFirst({
      where: {
        userId,
        type: 'EARN_WELCOME',
      },
    })
    
    if (existingBonus) {
      return { success: false, error: 'Welcome bonus already received' }
    }

    // Block re-claim by a previously deleted account with the same phone
    const bonusUser = await db.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    })
    const bonusPhoneHash = bonusUser ? hashPhone(bonusUser.phone) : null
    if (bonusPhoneHash) {
      const deletedRecord = await db.deletedAccountRecord.findUnique({
        where: { phoneNumberHash: bonusPhoneHash },
        select: { welcomeBonusReceived: true },
      })
      if (deletedRecord?.welcomeBonusReceived) {
        return { success: false, error: 'Welcome bonus already received' }
      }
    }
    
    // Award points
    const balance = await db.loyaltyBalance.upsert({
      where: { userId },
      update: {
        totalEarned: { increment: config.points },
        currentBalance: { increment: config.points },
      },
      create: {
        userId,
        totalEarned: config.points,
        currentBalance: config.points,
      },
    })
    
    // Create transaction
    await db.loyaltyTransaction.create({
      data: {
        userId,
        type: 'EARN_WELCOME',
        points: config.points,
        description: 'مكافأة الانضمام',
        referenceType: 'WELCOME_BONUS',
      },
    })
    
    // Send notification
    await createAndSendNotification(userId, {
      type: 'LOYALTY_POINTS_EARNED',
      title: 'مرحباً بك!',
      message: `حصلت على ${config.points} نقطة كمكافأة انضمام`,
      linkUrl: `/loyalty`,
      data: {
        points: config.points.toString(),
        type: 'welcome_bonus',
      },
    })
    
    return {
      success: true,
      data: {
        points: config.points,
        newBalance: balance.currentBalance,
      },
    }
  } catch (error) {
    console.error('[loyalty-points.awardWelcomeBonus]', error)
    return { success: false, error: 'Failed to award welcome bonus' }
  }
}

/**
 * Process referral rewards (for both inviter and invitee)
 */
export async function processReferralRewards(inviteeUserId: string, trigger: 'SIGNUP' | 'FIRST_DELIVERED_ORDER'): Promise<ActionResponse<any>> {
  try {
    const config = await db.referralConfig.findFirst()
    
    if (!config || !config.isEnabled) {
      return { success: true, message: 'Referral system disabled' }
    }
    
    if (config.trigger !== trigger) {
      return { success: true, message: 'Wrong trigger' }
    }
    
    // Get user referral info
    const referral = await db.userReferral.findUnique({
      where: { userId: inviteeUserId },
      include: { referredBy: true },
    })
    
    if (!referral || !referral.referredByUserId) {
      return { success: true, message: 'User not referred by anyone' }
    }
    
    // Block re-claim of the invitee reward by a previously deleted account
    // with the same phone number.
    const inviteeUser = await db.user.findUnique({
      where: { id: inviteeUserId },
      select: { phone: true },
    })
    const inviteePhoneHash = inviteeUser ? hashPhone(inviteeUser.phone) : null
    let inviteeRewardBlocked = false
    if (inviteePhoneHash) {
      const deletedRecord = await db.deletedAccountRecord.findUnique({
        where: { phoneNumberHash: inviteePhoneHash },
        select: { referralInviteeUsed: true },
      })
      inviteeRewardBlocked = Boolean(deletedRecord?.referralInviteeUsed)
    }
    
    // Award invitee points (if not already claimed)
    if (!referral.referralRewardClaimed && !inviteeRewardBlocked) {
      const inviteeBalance = await db.loyaltyBalance.upsert({
        where: { userId: inviteeUserId },
        update: {
          totalEarned: { increment: config.inviteePoints },
          currentBalance: { increment: config.inviteePoints },
        },
        create: {
          userId: inviteeUserId,
          totalEarned: config.inviteePoints,
          currentBalance: config.inviteePoints,
        },
      })
      
      await db.loyaltyTransaction.create({
        data: {
          userId: inviteeUserId,
          type: 'EARN_REFERRAL_INVITEE',
          points: config.inviteePoints,
          description: 'نقاط الدعوة',
          referenceId: referral.referredByUserId,
          referenceType: 'REFERRAL',
        },
      })
      
      await db.userReferral.update({
        where: { userId: inviteeUserId },
        data: { referralRewardClaimed: true },
      })
      
      await createAndSendNotification(inviteeUserId, {
        type: 'LOYALTY_REFERRAL_SUCCESS',
        title: 'حصلت على نقاط دعوة!',
        message: `حصلت على ${config.inviteePoints} نقطة من دعوة صديقك`,
        linkUrl: `/loyalty`,
        data: {
          points: config.inviteePoints.toString(),
          type: 'referral_invitee',
        },
      })
    }
    
    // Award inviter points (if not already claimed)
    if (!referral.inviterRewardClaimed) {
      const inviterBalance = await db.loyaltyBalance.upsert({
        where: { userId: referral.referredByUserId },
        update: {
          totalEarned: { increment: config.inviterPoints },
          currentBalance: { increment: config.inviterPoints },
        },
        create: {
          userId: referral.referredByUserId,
          totalEarned: config.inviterPoints,
          currentBalance: config.inviterPoints,
        },
      })
      
      await db.loyaltyTransaction.create({
        data: {
          userId: referral.referredByUserId,
          type: 'EARN_REFERRAL_INVITER',
          points: config.inviterPoints,
          description: 'نقاط دعوة صديق',
          referenceId: inviteeUserId,
          referenceType: 'REFERRAL',
        },
      })
      
      await db.userReferral.update({
        where: { userId: inviteeUserId },
        data: { inviterRewardClaimed: true },
      })
      
      await createAndSendNotification(referral.referredByUserId, {
        type: 'LOYALTY_REFERRAL_SUCCESS',
        title: 'نقاط من دعوة صديق!',
        message: `حصلت على ${config.inviterPoints} نقطة من دعوة صديق جديد`,
        linkUrl: `/loyalty`,
        data: {
          points: config.inviterPoints.toString(),
          type: 'referral_inviter',
        },
      })
    }
    
    return { success: true, message: 'Referral rewards processed' }
  } catch (error) {
    console.error('[loyalty-points.processReferralRewards]', error)
    return { success: false, error: 'Failed to process referral rewards' }
  }
}

/**
 * Get user's loyalty balance
 */
export async function getUserBalance(userId?: string): Promise<ActionResponse<any>> {
  try {
    const user = userId ? { id: userId } : await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }
    
    const balance = await db.loyaltyBalance.findUnique({
      where: { userId: user.id },
    })
    
    return {
      success: true,
      data: balance || {
        totalEarned: 0,
        totalRedeemed: 0,
        currentBalance: 0,
      },
    }
  } catch (error) {
    console.error('[loyalty-points.getUserBalance]', error)
    return { success: false, error: 'Failed to get balance' }
  }
}

/**
 * Get user's transaction history
 */
export async function getUserTransactions(userId?: string, page = 1, limit = 20): Promise<ActionResponse<any>> {
  try {
    const user = userId ? { id: userId } : await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }
    
    const [transactions, total] = await Promise.all([
      db.loyaltyTransaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.loyaltyTransaction.count({ where: { userId: user.id } }),
    ])
    
    return {
      success: true,
      data: {
        transactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    }
  } catch (error) {
    console.error('[loyalty-points.getUserTransactions]', error)
    return { success: false, error: 'Failed to get transactions' }
  }
}

/**
 * Admin: Manually add points to user
 */
export async function adminAddPoints(formData: FormData): Promise<ActionResponse<any>> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }
    
    const targetUserId = formData.get('userId') as string
    const points = Number(formData.get('points'))
    const reason = formData.get('reason') as string
    
    if (!targetUserId || points <= 0 || !reason) {
      return { success: false, error: 'Invalid data' }
    }
    
    // Update balance
    const balance = await db.loyaltyBalance.upsert({
      where: { userId: targetUserId },
      update: {
        totalEarned: { increment: points },
        currentBalance: { increment: points },
      },
      create: {
        userId: targetUserId,
        totalEarned: points,
        currentBalance: points,
      },
    })
    
    // Create transaction
    await db.loyaltyTransaction.create({
      data: {
        userId: targetUserId,
        type: 'MANUAL_ADD',
        points,
        description: reason,
        referenceType: 'ADMIN_ADJUSTMENT',
        metadata: { adminId: user.id },
      },
    })
    
    // Audit log
    await db.loyaltyAuditLog.create({
      data: {
        adminId: user.id,
        targetUserId,
        action: 'ADD_POINTS',
        details: { points, reason },
      },
    })
    
    // Notify user
    await createAndSendNotification(targetUserId, {
      type: 'LOYALTY_POINTS_EARNED',
      title: 'تم إضافة نقاط',
      message: `تم إضافة ${points} نقطة إلى رصيدك: ${reason}`,
      linkUrl: `/loyalty`,
      data: { points: points.toString(), type: 'manual_add' },
    })
    
    return {
      success: true,
      data: {
        points,
        newBalance: balance.currentBalance,
      },
    }
  } catch (error) {
    console.error('[loyalty-points.adminAddPoints]', error)
    return { success: false, error: 'Failed to add points' }
  }
}

/**
 * Admin: Manually remove points from user
 */
export async function adminRemovePoints(formData: FormData): Promise<ActionResponse<any>> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }
    
    const targetUserId = formData.get('userId') as string
    const points = Number(formData.get('points'))
    const reason = formData.get('reason') as string
    
    if (!targetUserId || points <= 0 || !reason) {
      return { success: false, error: 'Invalid data' }
    }
    
    // Check current balance
    const currentBalance = await db.loyaltyBalance.findUnique({
      where: { userId: targetUserId },
    })
    
    if (!currentBalance || currentBalance.currentBalance < points) {
      return { success: false, error: 'Insufficient balance' }
    }
    
    // Update balance
    const balance = await db.loyaltyBalance.update({
      where: { userId: targetUserId },
      data: {
        currentBalance: { decrement: points },
      },
    })
    
    // Create transaction
    await db.loyaltyTransaction.create({
      data: {
        userId: targetUserId,
        type: 'MANUAL_REMOVE',
        points: -points,
        description: reason,
        referenceType: 'ADMIN_ADJUSTMENT',
        metadata: { adminId: user.id },
      },
    })
    
    // Audit log
    await db.loyaltyAuditLog.create({
      data: {
        adminId: user.id,
        targetUserId,
        action: 'REMOVE_POINTS',
        details: { points, reason },
      },
    })
    
    return {
      success: true,
      data: {
        points,
        newBalance: balance.currentBalance,
      },
    }
  } catch (error) {
    console.error('[loyalty-points.adminRemovePoints]', error)
    return { success: false, error: 'Failed to remove points' }
  }
}

/**
 * Get all loyalty transactions (admin view)
 */
export async function getLoyaltyTransactions(limit: number = 100) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return []
    }

    const transactions = await db.loyaltyTransaction.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    })

    return transactions
  } catch (error) {
    console.error('[loyalty-points.getLoyaltyTransactions]', error)
    return []
  }
}
