'use server'

import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { redeemRewardForUser, validateCouponForUser } from '@/lib/loyalty-redemption'
import type { ActionResponse } from '@/types'
import { revalidatePath } from 'next/cache'
import { isAdminLike } from '@/lib/permissions'

/**
 * Get rewards catalog with optional filters
 */
export async function getRewards(filters?: {
  type?: 'FIXED_DISCOUNT' | 'PERCENTAGE_DISCOUNT' | 'FREE_DELIVERY' | 'FREE_PRODUCT' | 'CUSTOM'
  isActive?: boolean
}) {
  const rewards = await db.loyaltyReward.findMany({
    where: {
      ...(filters?.type ? { rewardType: filters.type } : {}),
      ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
    },
    include: {
      product: { select: { id: true, name: true, nameEn: true, image: true, isActive: true } },
    },
    orderBy: [{ sortOrder: 'asc' }, { pointsCost: 'asc' }, { createdAt: 'desc' }],
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

type RewardTypeInput = 'FIXED_DISCOUNT' | 'PERCENTAGE_DISCOUNT' | 'FREE_DELIVERY' | 'FREE_PRODUCT' | 'CUSTOM'

const REWARD_TYPES: RewardTypeInput[] = ['FIXED_DISCOUNT', 'PERCENTAGE_DISCOUNT', 'FREE_DELIVERY', 'FREE_PRODUCT', 'CUSTOM']

async function parseRewardForm(formData: FormData): Promise<
  { success: true; data: Record<string, unknown> } | { success: false; error: string }
> {
  const title = (formData.get('title') as string)?.trim()
  const titleEn = (formData.get('titleEn') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const descriptionEn = (formData.get('descriptionEn') as string)?.trim() || null
  const type = formData.get('type') as RewardTypeInput
  const pointsCost = parseInt(formData.get('pointsCost') as string)
  const discountValue = formData.get('discountValue') ? parseFloat(formData.get('discountValue') as string) : 0
  const maxDiscountCap = formData.get('maxDiscountCap') ? parseFloat(formData.get('maxDiscountCap') as string) : null
  const usageLimit = formData.get('maxRedemptionsPerUser') ? parseInt(formData.get('maxRedemptionsPerUser') as string) : null
  const expirationDays = parseInt(formData.get('validityDays') as string) || 30
  const minOrderValue = formData.get('minOrderAmount') ? parseFloat(formData.get('minOrderAmount') as string) : null
  const productId = (formData.get('productId') as string)?.trim() || null
  const isActive = formData.get('isActive') === 'true' || formData.get('isActive') === 'on'

  if (!title || !type || !pointsCost || pointsCost <= 0 || !expirationDays) {
    return { success: false, error: 'يرجى ملء جميع الحقول المطلوبة' }
  }
  if (!REWARD_TYPES.includes(type)) {
    return { success: false, error: 'نوع المكافأة غير صالح' }
  }
  if ((type === 'FIXED_DISCOUNT' || type === 'PERCENTAGE_DISCOUNT') && discountValue <= 0) {
    return { success: false, error: 'قيمة الخصم مطلوبة لهذا النوع من المكافآت' }
  }
  if (type === 'PERCENTAGE_DISCOUNT' && discountValue > 100) {
    return { success: false, error: 'نسبة الخصم لا يمكن أن تتجاوز 100%' }
  }
  if (type === 'FREE_PRODUCT') {
    if (!productId) {
      return { success: false, error: 'يرجى اختيار المنتج المقدم كجائزة' }
    }
    const product = await db.product.findUnique({ where: { id: productId }, select: { id: true } })
    if (!product) {
      return { success: false, error: 'المنتج المحدد غير موجود' }
    }
  }

  return {
    success: true,
    data: {
      name: title,
      nameEn: titleEn || title,
      description,
      descriptionEn: descriptionEn || description,
      rewardType: type,
      pointsCost,
      discountValue: type === 'FREE_DELIVERY' || type === 'FREE_PRODUCT' ? 0 : discountValue,
      maxDiscountCap: type === 'PERCENTAGE_DISCOUNT' ? maxDiscountCap : null,
      usageLimit,
      expirationDays,
      minOrderValue,
      productId: type === 'FREE_PRODUCT' ? productId : null,
      isActive,
    },
  }
}

/**
 * Admin: Create new reward
 */
export async function createReward(formData: FormData): Promise<ActionResponse> {
  const user = await getCurrentUser()
  if (!user || !isAdminLike(user.role)) {
    return { success: false, error: 'غير مصرح' }
  }

  const parsed = await parseRewardForm(formData)
  if (!parsed.success) return { success: false, error: parsed.error }

  try {
    await db.loyaltyReward.create({ data: parsed.data as never })

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
  if (!user || !isAdminLike(user.role)) {
    return { success: false, error: 'غير مصرح' }
  }

  const id = formData.get('id') as string
  if (!id) return { success: false, error: 'معرف المكافأة مطلوب' }

  const parsed = await parseRewardForm(formData)
  if (!parsed.success) return { success: false, error: parsed.error }

  try {
    await db.loyaltyReward.update({
      where: { id },
      data: parsed.data as never,
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
 * Admin: Toggle reward active state
 */
export async function toggleRewardActive(id: string): Promise<ActionResponse> {
  const user = await getCurrentUser()
  if (!user || !isAdminLike(user.role)) {
    return { success: false, error: 'غير مصرح' }
  }

  try {
    const reward = await db.loyaltyReward.findUnique({ where: { id }, select: { isActive: true } })
    if (!reward) return { success: false, error: 'المكافأة غير موجودة' }

    await db.loyaltyReward.update({
      where: { id },
      data: { isActive: !reward.isActive },
    })

    revalidatePath('/admin/loyalty/rewards')
    return { success: true }
  } catch (error) {
    console.error('[loyalty-rewards.toggleRewardActive] Error:', error)
    return { success: false, error: 'فشل في تحديث حالة المكافأة' }
  }
}

/**
 * Admin: Delete reward
 */
export async function deleteReward(id: string): Promise<ActionResponse> {
  const user = await getCurrentUser()
  if (!user || !isAdminLike(user.role)) {
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

  const result = await redeemRewardForUser(user.id, rewardId)

  if (result.success) {
    revalidatePath('/buyer/loyalty')
  }

  return result
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
  if (userId && (!user || (!isAdminLike(user.role) && user.id !== userId))) {
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
  rewardType: string
  rewardName: string
  rewardNameEn: string | null
  freeDelivery: boolean
  freeProduct: { productId: string | null; name: string | null; nameEn: string | null; image: string | null } | null
}>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: 'غير مصرح' }
  }

  return validateCouponForUser(user.id, couponCode, orderTotal)
}

/**
 * Mark coupon as used (called when order is placed)
 */
export async function markCouponAsUsed(couponId: string, orderId: string): Promise<ActionResponse> {
  try {
    await db.redeemedReward.update({
      where: { id: couponId },
      data: {
        isUsed: true,
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
