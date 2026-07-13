import type { LoyaltyTransaction, LoyaltyReward, RedeemedReward, LoyaltyCampaign, UserCampaignProgress } from '@prisma/client'

/**
 * DTO mappers for the mobile loyalty API (/api/v1/loyalty/*).
 * The mobile app types (tawreedApp/src/types/loyalty.ts) are the contract —
 * keep these shapes in sync with them.
 */

export function mapTransaction(tx: LoyaltyTransaction) {
  return {
    id: tx.id,
    type: tx.type,
    amount: tx.points,
    description: tx.description,
    descriptionAr: tx.description,
    descriptionEn: tx.descriptionEn,
    createdAt: tx.createdAt,
    relatedOrderId: tx.referenceType === 'ORDER' ? tx.referenceId : undefined,
  }
}

type RewardWithProduct = LoyaltyReward & {
  product?: { id: string; name: string; nameEn: string | null; image: string | null; isActive: boolean } | null
}

export function mapReward(reward: RewardWithProduct) {
  return {
    id: reward.id,
    name: reward.name,
    nameAr: reward.name,
    nameEn: reward.nameEn,
    description: reward.description ?? '',
    descriptionAr: reward.description ?? '',
    descriptionEn: reward.descriptionEn,
    type: reward.rewardType,
    pointsCost: reward.pointsCost,
    discountValue: reward.rewardType === 'FIXED_DISCOUNT' ? reward.discountValue : undefined,
    discountPercentage: reward.rewardType === 'PERCENTAGE_DISCOUNT' ? reward.discountValue : undefined,
    maxDiscountAmount: reward.maxDiscountCap ?? undefined,
    minOrderAmount: reward.minOrderValue ?? undefined,
    expiryDays: reward.expirationDays,
    image: reward.imageUrl ?? reward.product?.image ?? undefined,
    product: reward.product
      ? {
          id: reward.product.id,
          name: reward.product.name,
          nameEn: reward.product.nameEn,
          image: reward.product.image,
        }
      : null,
    isActive: reward.isActive,
  }
}

type RedeemedWithReward = RedeemedReward & {
  reward: { id: string; name: string; nameEn: string | null }
}

export function mapCoupon(redeemed: RedeemedWithReward) {
  const now = new Date()
  const status = redeemed.isUsed || redeemed.usedAt
    ? 'USED'
    : now > redeemed.expiresAt
      ? 'EXPIRED'
      : 'ACTIVE'

  return {
    id: redeemed.id,
    code: redeemed.couponCode,
    rewardId: redeemed.rewardId,
    rewardName: redeemed.reward.name,
    rewardNameAr: redeemed.reward.name,
    rewardNameEn: redeemed.reward.nameEn,
    rewardType: redeemed.rewardType,
    status,
    discountValue: redeemed.rewardType === 'FIXED_DISCOUNT' ? redeemed.discountValue : undefined,
    discountPercentage: redeemed.rewardType === 'PERCENTAGE_DISCOUNT' ? redeemed.discountValue : undefined,
    maxDiscountAmount: redeemed.maxDiscountCap ?? undefined,
    minOrderAmount: redeemed.minOrderValue ?? undefined,
    redeemedAt: redeemed.createdAt,
    expiresAt: redeemed.expiresAt,
    usedAt: redeemed.usedAt ?? undefined,
    usedInOrderId: redeemed.orderId ?? undefined,
    freeProduct: redeemed.rewardType === 'FREE_PRODUCT'
      ? {
          productId: redeemed.productId,
          name: redeemed.productName,
          nameEn: redeemed.productNameEn,
          image: redeemed.productImage,
        }
      : null,
  }
}

type CampaignWithProgress = LoyaltyCampaign & {
  userProgress: UserCampaignProgress | null
}

export function mapCampaign(campaign: CampaignWithProgress) {
  return {
    id: campaign.id,
    name: campaign.name,
    nameAr: campaign.name,
    nameEn: campaign.nameEn,
    description: campaign.description ?? '',
    descriptionAr: campaign.description ?? '',
    descriptionEn: campaign.descriptionEn,
    type: campaign.goalType === 'SPEND_AMOUNT' ? 'TOTAL_SPENT' : 'ORDER_COUNT',
    status: 'ACTIVE',
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    targetValue: campaign.targetValue,
    rewardPoints: campaign.rewardValue,
    progress: campaign.userProgress
      ? {
          campaignId: campaign.id,
          currentValue: campaign.userProgress.currentValue,
          isCompleted: campaign.userProgress.isCompleted,
          completedAt: campaign.userProgress.completedAt ?? undefined,
        }
      : undefined,
  }
}
