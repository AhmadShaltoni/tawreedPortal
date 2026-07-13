import { db } from '@/lib/db'
import { createAndSendNotification } from '@/lib/push-notifications'
import type { ActionResponse } from '@/types'

/** Thrown inside the redemption transaction to roll back with a user-facing message. */
class RedeemError extends Error {}

/**
 * Core reward redemption for an already-authenticated user.
 * Callers (server action / mobile API route) are responsible for auth —
 * this module must never be exposed directly to clients.
 */
export async function redeemRewardForUser(
  userId: string,
  rewardId: string
): Promise<ActionResponse<{ couponCode: string }>> {
  try {
    // Get reward
    const reward = await db.loyaltyReward.findUnique({
      where: { id: rewardId },
      include: {
        product: { select: { id: true, name: true, nameEn: true, image: true, isActive: true } },
      },
    })

    if (!reward || !reward.isActive) {
      return { success: false, error: 'المكافأة غير متاحة' }
    }

    if (reward.rewardType === 'FREE_PRODUCT' && (!reward.product || !reward.product.isActive)) {
      return { success: false, error: 'منتج الجائزة غير متوفر حالياً' }
    }

    // Generate unique coupon code
    const couponCode = `LOYALTY-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + reward.expirationDays)

    // Everything below runs atomically so points can never go negative and a
    // coupon can never be issued without the points being deducted (and vice-versa).
    try {
      await db.$transaction(async (tx) => {
        // 1) Enforce per-user usage limit inside the transaction
        if (reward.usageLimit) {
          const redemptionCount = await tx.redeemedReward.count({
            where: { userId, rewardId: reward.id },
          })
          if (redemptionCount >= reward.usageLimit) {
            throw new RedeemError('لقد وصلت إلى الحد الأقصى لاسترداد هذه المكافأة')
          }
        }

        // 2) Atomically deduct points — only succeeds if the balance is still
        //    sufficient, which blocks double-spend from concurrent requests.
        const deducted = await tx.loyaltyBalance.updateMany({
          where: { userId, currentBalance: { gte: reward.pointsCost } },
          data: {
            currentBalance: { decrement: reward.pointsCost },
            totalRedeemed: { increment: reward.pointsCost },
          },
        })
        if (deducted.count !== 1) {
          throw new RedeemError('رصيد نقاط غير كافي')
        }

        // 3) Issue the coupon
        await tx.redeemedReward.create({
          data: {
            userId,
            rewardId: reward.id,
            couponCode,
            expiresAt,
            discountValue: reward.discountValue,
            rewardType: reward.rewardType,
            minOrderValue: reward.minOrderValue,
            maxDiscountCap: reward.maxDiscountCap,
            // Snapshot free product data at redemption time
            productId: reward.product?.id ?? null,
            productName: reward.product?.name ?? null,
            productNameEn: reward.product?.nameEn ?? null,
            productImage: reward.imageUrl ?? reward.product?.image ?? null,
          },
        })

        // 4) Immutable transaction record (negative points)
        await tx.loyaltyTransaction.create({
          data: {
            userId,
            type: 'REDEEM',
            points: -reward.pointsCost,
            description: `استرداد مكافأة: ${reward.name}`,
            descriptionEn: `Redeemed reward: ${reward.nameEn || reward.name}`,
            referenceId: reward.id,
            referenceType: 'REWARD',
            metadata: { rewardId: reward.id, couponCode },
          },
        })

        // 5) Bump the reward's global redemption counter
        await tx.loyaltyReward.update({
          where: { id: reward.id },
          data: { totalRedeemed: { increment: 1 } },
        })
      })
    } catch (txErr) {
      if (txErr instanceof RedeemError) {
        return { success: false, error: txErr.message }
      }
      throw txErr
    }

    // Send notification (outside the transaction)
    await createAndSendNotification(userId, {
      type: 'LOYALTY_REWARD_REDEEMED',
      title: 'تم استبدال المكافأة 🎉',
      message: `تم استبدال "${reward.name}" مقابل ${reward.pointsCost} نقطة. رمز الكوبون: ${couponCode}`,
      linkUrl: '/loyalty',
      data: {
        rewardId: reward.id,
        couponCode,
        pointsSpent: reward.pointsCost.toString(),
      },
    })

    return { success: true, data: { couponCode } }
  } catch (error) {
    console.error('[loyalty-redemption.redeemRewardForUser] Error:', error)
    return { success: false, error: 'فشل في استرداد المكافأة' }
  }
}

/**
 * Validate a loyalty coupon at checkout for an already-authenticated user.
 */
export async function validateCouponForUser(
  userId: string,
  couponCode: string,
  orderTotal: number
): Promise<ActionResponse<{
  discountAmount: number
  finalTotal: number
  couponId: string
  rewardType: string
  rewardName: string
  rewardNameEn: string | null
  freeDelivery: boolean
  freeProduct: { productId: string | null; name: string | null; nameEn: string | null; image: string | null } | null
}>> {
  try {
    const redeemedReward = await db.redeemedReward.findUnique({
      where: { couponCode },
      include: { reward: true },
    })

    if (!redeemedReward) {
      return { success: false, error: 'رمز الكوبون غير صحيح' }
    }

    if (redeemedReward.userId !== userId) {
      return { success: false, error: 'هذا الكوبون لا ينتمي إليك' }
    }

    if (redeemedReward.isUsed || redeemedReward.usedAt) {
      return { success: false, error: 'تم استخدام هذا الكوبون بالفعل' }
    }

    if (new Date() > redeemedReward.expiresAt) {
      return { success: false, error: 'انتهت صلاحية هذا الكوبون' }
    }

    // Check min order amount (snapshot first, fallback to reward)
    const minOrderValue = redeemedReward.minOrderValue ?? redeemedReward.reward.minOrderValue
    if (minOrderValue && orderTotal < minOrderValue) {
      return {
        success: false,
        error: `الحد الأدنى لمبلغ الطلب هو ${minOrderValue} د.أ`,
      }
    }

    // Calculate discount from the redemption snapshot
    let discountAmount = 0
    if (redeemedReward.rewardType === 'FIXED_DISCOUNT') {
      discountAmount = redeemedReward.discountValue || 0
    } else if (redeemedReward.rewardType === 'PERCENTAGE_DISCOUNT') {
      discountAmount = (orderTotal * (redeemedReward.discountValue || 0)) / 100
      if (redeemedReward.maxDiscountCap && discountAmount > redeemedReward.maxDiscountCap) {
        discountAmount = redeemedReward.maxDiscountCap
      }
    }
    // FREE_DELIVERY: delivery fee is zeroed at checkout, FREE_PRODUCT: prize item added at 0

    discountAmount = Math.round(discountAmount * 100) / 100
    const finalTotal = Math.max(0, Math.round((orderTotal - discountAmount) * 100) / 100)

    return {
      success: true,
      data: {
        discountAmount,
        finalTotal,
        couponId: redeemedReward.id,
        rewardType: redeemedReward.rewardType,
        rewardName: redeemedReward.reward.name,
        rewardNameEn: redeemedReward.reward.nameEn,
        freeDelivery: redeemedReward.rewardType === 'FREE_DELIVERY',
        freeProduct: redeemedReward.rewardType === 'FREE_PRODUCT'
          ? {
              productId: redeemedReward.productId,
              name: redeemedReward.productName,
              nameEn: redeemedReward.productNameEn,
              image: redeemedReward.productImage,
            }
          : null,
      },
    }
  } catch (error) {
    console.error('[loyalty-redemption.validateCouponForUser] Error:', error)
    return { success: false, error: 'فشل في التحقق من الكوبون' }
  }
}
