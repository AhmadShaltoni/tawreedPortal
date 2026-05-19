'use server'

import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { createAndSendNotification } from '@/lib/push-notifications'
import type { ActionResponse } from '@/types'
import { revalidatePath } from 'next/cache'

/**
 * Get rewards catalog with optional filters
 */
export async function getRewards(filters?: {
  type?: 'FIXED_DISCOUNT' | 'PERCENTAGE_DISCOUNT' | 'FREE_DELIVERY' | 'CUSTOM'
  isActive?: boolean
}) {
  const rewards = await db.loyaltyReward.findMany({
    where: {
      ...(filters?.type ? { rewardType: filters.type } : {}),
      ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
    },
    orderBy: [{ pointsCost: 'asc' }, { createdAt: 'desc' }],
  })

  return rewards
}

/**
 * Get single reward by ID
 */
export async function getRewardById(id: string) {
  const reward = await db.loyaltyReward.findUnique({
    where: { id },
    include: {
      _count: {
        select: { redemptions: true },
      },
    },
  })

  return reward
}

/**
 * Admin: Create new reward
 */
export async function createReward(formData: FormData): Promise<ActionResponse> {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return { success: false, error: 'غير مصرح' }
  }

  const title = formData.get('title') as string
  const titleEn = formData.get('titleEn') as string
  const description = formData.get('description') as string
  const descriptionEn = formData.get('descriptionEn') as string
  const type = formData.get('type') as 'FIXED_DISCOUNT' | 'PERCENTAGE_DISCOUNT' | 'FREE_DELIVERY' | 'CUSTOM'
  const pointsCost = parseInt(formData.get('pointsCost') as string)
  const discountValue = formData.get('discountValue') ? parseFloat(formData.get('discountValue') as string) : 0
  const usageLimit = formData.get('maxRedemptionsPerUser') ? parseInt(formData.get('maxRedemptionsPerUser') as string) : null
  const expirationDays = parseInt(formData.get('validityDays') as string) || 30
  const minOrderValue = formData.get('minOrderAmount') ? parseFloat(formData.get('minOrderAmount') as string) : null
  const isActive = formData.get('isActive') === 'true'

  if (!title || !type || !pointsCost || !expirationDays) {
    return { success: false, error: 'يرجى ملء جميع الحقول المطلوبة' }
  }

  try {
    await db.loyaltyReward.create({
      data: {
        name: title,
        nameEn: titleEn || title,
        description,
        descriptionEn: descriptionEn || description,
        rewardType: type,
        pointsCost,
        discountValue,
        usageLimit,
        expirationDays,
        minOrderValue,
        isActive,
      },
    })

    revalidatePath('/admin/loyalty/rewards')
    return { success: true }
  } catch (error) {
    console.error('[loyalty-rewards.createReward] Error:', error)
    return { success: false, error: 'فشل في إنشاء المكافأة' }
  }
}

/**
 * Admin: Update reward
 */
export async function updateReward(formData: FormData): Promise<ActionResponse> {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return { success: false, error: 'غير مصرح' }
  }

  const id = formData.get('id') as string
  const title = formData.get('title') as string
  const titleEn = formData.get('titleEn') as string
  const description = formData.get('description') as string
  const descriptionEn = formData.get('descriptionEn') as string
  const type = formData.get('type') as 'FIXED_DISCOUNT' | 'PERCENTAGE_DISCOUNT' | 'FREE_DELIVERY' | 'CUSTOM'
  const pointsCost = parseInt(formData.get('pointsCost') as string)
  const discountValue = formData.get('discountValue') ? parseFloat(formData.get('discountValue') as string) : 0
  const usageLimit = formData.get('maxRedemptionsPerUser') ? parseInt(formData.get('maxRedemptionsPerUser') as string) : null
  const expirationDays = parseInt(formData.get('validityDays') as string) || 30
  const minOrderValue = formData.get('minOrderAmount') ? parseFloat(formData.get('minOrderAmount') as string) : null
  const isActive = formData.get('isActive') === 'true'

  if (!id || !title || !type || !pointsCost || !expirationDays) {
    return { success: false, error: 'يرجى ملء جميع الحقول المطلوبة' }
  }

  try {
    await db.loyaltyReward.update({
      where: { id },
      data: {
        name: title,
        nameEn: titleEn || title,
        description,
        descriptionEn: descriptionEn || description,
        rewardType: type,
        pointsCost,
        discountValue,
        usageLimit,
        expirationDays,
        minOrderValue,
        isActive,
      },
    })

    revalidatePath('/admin/loyalty/rewards')
    revalidatePath(`/admin/loyalty/rewards/${id}`)
    return { success: true }
  } catch (error) {
    console.error('[loyalty-rewards.updateReward] Error:', error)
    return { success: false, error: 'فشل في تحديث المكافأة' }
  }
}

/**
 * Admin: Delete reward
 */
export async function deleteReward(id: string): Promise<ActionResponse> {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return { success: false, error: 'غير مصرح' }
  }

  try {
    await db.loyaltyReward.delete({
      where: { id },
    })

    revalidatePath('/admin/loyalty/rewards')
    return { success: true }
  } catch (error) {
    console.error('[loyalty-rewards.deleteReward] Error:', error)
    return { success: false, error: 'فشل في حذف المكافأة' }
  }
}

/**
 * User: Redeem a reward
 */
export async function redeemReward(rewardId: string): Promise<ActionResponse<{ couponCode: string }>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: 'غير مصرح' }
  }

  try {
    // Get reward
    const reward = await db.loyaltyReward.findUnique({
      where: { id: rewardId },
    })

    if (!reward || !reward.isActive) {
      return { success: false, error: 'المكافأة غير متاحة' }
    }

    // Get user balance
    const balance = await db.loyaltyBalance.findUnique({
      where: { userId: user.id },
    })

    if (!balance || balance.currentBalance < reward.pointsCost) {
      return { success: false, error: 'رصيد نقاط غير كافي' }
    }

    // Check redemption limit
    if (reward.usageLimit) {
      const redemptionCount = await db.redeemedReward.count({
        where: {
          userId: user.id,
          rewardId: reward.id,
        },
      })

      if (redemptionCount >= reward.usageLimit) {
        return { success: false, error: 'لقد وصلت إلى الحد الأقصى لاسترداد هذه المكافأة' }
      }
    }

    // Generate unique coupon code
    const couponCode = `LOYALTY-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + reward.expirationDays)

    // Create redeemed reward
    await db.redeemedReward.create({
      data: {
        userId: user.id,
        rewardId: reward.id,
        couponCode,
        expiresAt,
        discountValue: reward.discountValue,
        rewardType: reward.rewardType,
        minOrderValue: reward.minOrderValue,
        maxDiscountCap: reward.maxDiscountCap,
      },
    })

    // Deduct points
    await db.loyaltyBalance.update({
      where: { userId: user.id },
      data: {
        currentBalance: { decrement: reward.pointsCost },
        totalRedeemed: { increment: reward.pointsCost },
      },
    })

    // Create transaction
    await db.loyaltyTransaction.create({
      data: {
        userId: user.id,
        type: 'REDEEM',
        points: -reward.pointsCost,
        description: `استرداد مكافأة: ${reward.name}`,
        descriptionEn: `Redeemed reward: ${reward.nameEn || reward.name}`,
        metadata: {
          rewardId: reward.id,
          couponCode,
        },
      },
    })

    // Send notification
    await createAndSendNotification(user.id, {
      type: 'LOYALTY_REWARD_REDEEMED',
      title: 'تم استرداد المكافأة',
      message: `تم استرداد ${reward.name} بنجاح. رمز الكوبون: ${couponCode}`,
      data: {
        rewardId: reward.id,
        couponCode,
      },
    })

    revalidatePath('/buyer/loyalty')
    return { success: true, data: { couponCode } }
  } catch (error) {
    console.error('[loyalty-rewards.redeemReward] Error:', error)
    return { success: false, error: 'فشل في استرداد المكافأة' }
  }
}

/**
 * Get user's redeemed rewards (coupons)
 */
export async function getUserRedeemedRewards(userId?: string) {
  const user = await getCurrentUser()
  const targetUserId = userId || user?.id

  if (!targetUserId) {
    return []
  }

  // If not admin, can only view own coupons
  if (userId && (!user || (user.role !== 'ADMIN' && user.id !== userId))) {
    return []
  }

  const redeemedRewards = await db.redeemedReward.findMany({
    where: { userId: targetUserId },
    include: {
      reward: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return redeemedRewards
}

/**
 * Apply/validate coupon at checkout
 */
export async function validateCoupon(couponCode: string, orderTotal: number): Promise<ActionResponse<{
  discountAmount: number
  finalTotal: number
  couponId: string
}>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: 'غير مصرح' }
  }

  try {
    const redeemedReward = await db.redeemedReward.findUnique({
      where: { couponCode },
      include: { reward: true },
    })

    if (!redeemedReward) {
      return { success: false, error: 'رمز الكوبون غير صحيح' }
    }

    if (redeemedReward.userId !== user.id) {
      return { success: false, error: 'هذا الكوبون لا ينتمي إليك' }
    }

    if (redeemedReward.usedAt) {
      return { success: false, error: 'تم استخدام هذا الكوبون بالفعل' }
    }

    if (new Date() > redeemedReward.expiresAt) {
      return { success: false, error: 'انتهت صلاحية هذا الكوبون' }
    }

    // Check min order amount
    if (redeemedReward.reward.minOrderValue && orderTotal < redeemedReward.reward.minOrderValue) {
      return {
        success: false,
        error: `الحد الأدنى لمبلغ الطلب هو ${redeemedReward.reward.minOrderValue} JOD`,
      }
    }

    // Calculate discount
    let discountAmount = 0
    if (redeemedReward.reward.rewardType === 'FIXED_DISCOUNT') {
      discountAmount = redeemedReward.reward.discountValue || 0
    } else if (redeemedReward.reward.rewardType === 'PERCENTAGE_DISCOUNT') {
      discountAmount = (orderTotal * (redeemedReward.reward.discountValue || 0)) / 100
    } else if (redeemedReward.reward.rewardType === 'FREE_DELIVERY') {
      // Frontend should handle this (remove delivery fee)
      discountAmount = 0 // Will be calculated by frontend based on delivery fee
    }

    const finalTotal = Math.max(0, orderTotal - discountAmount)

    return {
      success: true,
      data: {
        discountAmount,
        finalTotal,
        couponId: redeemedReward.id,
      },
    }
  } catch (error) {
    console.error('[loyalty-rewards.validateCoupon] Error:', error)
    return { success: false, error: 'فشل في التحقق من الكوبون' }
  }
}

/**
 * Mark coupon as used (called when order is placed)
 */
export async function markCouponAsUsed(couponId: string, orderId: string): Promise<ActionResponse> {
  try {
    await db.redeemedReward.update({
      where: { id: couponId },
      data: {
        usedAt: new Date(),
        orderId,
      },
    })

    return { success: true }
  } catch (error) {
    console.error('[loyalty-rewards.markCouponAsUsed] Error:', error)
    return { success: false, error: 'فشل في تحديث حالة الكوبون' }
  }
}
