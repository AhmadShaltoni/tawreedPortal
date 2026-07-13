'use server'

import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { createAndSendNotification } from '@/lib/push-notifications'
import { getActiveCampaignsForUser } from '@/lib/loyalty-queries'
import type { ActionResponse } from '@/types'
import { revalidatePath } from 'next/cache'

/**
 * Get campaigns with optional filters
 */
export async function getCampaigns(filters?: {
  status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED'
  includeInactive?: boolean
}) {
  const now = new Date()

  const campaigns = await db.loyaltyCampaign.findMany({
    where: {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(!filters?.includeInactive
        ? {
            status: 'ACTIVE',
            startDate: { lte: now },
            endDate: { gte: now },
          }
        : {}),
    },
    include: {
      _count: {
        select: { userProgress: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return campaigns
}

/**
 * Get campaign by ID
 */
export async function getCampaignById(id: string) {
  const campaign = await db.loyaltyCampaign.findUnique({
    where: { id },
    include: {
      _count: {
        select: { userProgress: true },
      },
    },
  })

  return campaign
}

/**
 * Admin: Create campaign
 */
export async function createCampaign(formData: FormData): Promise<ActionResponse> {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return { success: false, error: 'غير مصرح' }
  }

  const name = formData.get('name') as string
  const nameEn = formData.get('nameEn') as string
  const description = formData.get('description') as string
  const descriptionEn = formData.get('descriptionEn') as string
  const goalType = formData.get('goalType') as 'SPEND_AMOUNT' | 'ORDER_COUNT'
  const targetValue = parseFloat(formData.get('targetValue') as string || formData.get('goalValue') as string)
  const rewardValue = parseFloat(formData.get('rewardValue') as string || formData.get('rewardPoints') as string)
  const startDate = new Date(formData.get('startDate') as string)
  const endDateValue = formData.get('endDate') as string
  const endDate = endDateValue ? new Date(endDateValue) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000) // Default 30 days
  const status = (formData.get('status') as 'DRAFT' | 'ACTIVE' | 'PAUSED') || 'ACTIVE'

  if (!name || !goalType || !targetValue || !rewardValue || !startDate) {
    return { success: false, error: 'يرجى ملء جميع الحقول المطلوبة' }
  }

  try {
    await db.loyaltyCampaign.create({
      data: {
        name,
        nameEn: nameEn || name,
        description,
        descriptionEn: descriptionEn || description,
        goalType,
        targetValue,
        rewardType: 'FIXED_DISCOUNT',
        rewardValue,
        startDate,
        endDate,
        status,
      },
    })

    revalidatePath('/admin/loyalty/campaigns')
    return { success: true }
  } catch (error) {
    console.error('[loyalty-campaigns.createCampaign] Error:', error)
    return { success: false, error: 'فشل في إنشاء الحملة' }
  }
}

/**
 * Admin: Update campaign
 */
export async function updateCampaign(formData: FormData): Promise<ActionResponse> {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return { success: false, error: 'غير مصرح' }
  }

  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const nameEn = formData.get('nameEn') as string
  const description = formData.get('description') as string
  const descriptionEn = formData.get('descriptionEn') as string
  const goalType = formData.get('goalType') as 'SPEND_AMOUNT' | 'ORDER_COUNT'
  const targetValue = parseFloat(formData.get('targetValue') as string || formData.get('goalValue') as string)
  const rewardValue = parseFloat(formData.get('rewardValue') as string || formData.get('rewardPoints') as string)
  const startDate = new Date(formData.get('startDate') as string)
  const endDate = formData.get('endDate') ? new Date(formData.get('endDate') as string) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)
  const status = formData.get('status') as 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED'

  if (!id || !name || !goalType || !targetValue || !rewardValue || !startDate) {
    return { success: false, error: 'يرجى ملء جميع الحقول المطلوبة' }
  }

  try {
    await db.loyaltyCampaign.update({
      where: { id },
      data: {
        name,
        nameEn: nameEn || name,
        description,
        descriptionEn: descriptionEn || description,
        goalType,
        targetValue,
        rewardValue,
        startDate,
        endDate,
        status,
      },
    })

    revalidatePath('/admin/loyalty/campaigns')
    revalidatePath(`/admin/loyalty/campaigns/${id}`)
    return { success: true }
  } catch (error) {
    console.error('[loyalty-campaigns.updateCampaign] Error:', error)
    return { success: false, error: 'فشل في تحديث الحملة' }
  }
}

/**
 * Admin: Delete campaign
 */
export async function deleteCampaign(id: string): Promise<ActionResponse> {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return { success: false, error: 'غير مصرح' }
  }

  try {
    await db.loyaltyCampaign.delete({
      where: { id },
    })

    revalidatePath('/admin/loyalty/campaigns')
    return { success: true }
  } catch (error) {
    console.error('[loyalty-campaigns.deleteCampaign] Error:', error)
    return { success: false, error: 'فشل في حذف الحملة' }
  }
}

/**
 * Update user campaign progress (called when order is DELIVERED)
 */
export async function updateUserCampaignProgress(userId: string, orderId: string): Promise<void> {
  try {
    // Get order details
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { totalPrice: true, deliveryFee: true },
    })

    if (!order) return

    const orderAmount = order.totalPrice - (order.deliveryFee || 0)

    // Get active campaigns
    const now = new Date()
    const activeCampaigns = await db.loyaltyCampaign.findMany({
      where: {
        status: 'ACTIVE',
        startDate: { lte: now },
        endDate: { gte: now },
      },
    })

    for (const campaign of activeCampaigns) {
      // Get or create user progress
      const existingProgress = await db.userCampaignProgress.findUnique({
        where: {
          userId_campaignId: {
            userId,
            campaignId: campaign.id,
          },
        },
      })

      if (existingProgress?.isCompleted) continue // Skip if already completed

      let newCurrentValue = existingProgress?.currentValue || 0

      // Update based on goal type
      if (campaign.goalType === 'SPEND_AMOUNT') {
        newCurrentValue += orderAmount
      } else if (campaign.goalType === 'ORDER_COUNT') {
        newCurrentValue += 1
      }

      const isCompleted = newCurrentValue >= campaign.targetValue

      if (existingProgress) {
        await db.userCampaignProgress.update({
          where: { id: existingProgress.id },
          data: {
            currentValue: newCurrentValue,
            isCompleted,
            completedAt: isCompleted ? new Date() : null,
          },
        })
      } else {
        await db.userCampaignProgress.create({
          data: {
            userId,
            campaignId: campaign.id,
            currentValue: newCurrentValue,
            isCompleted,
            completedAt: isCompleted ? new Date() : null,
          },
        })
      }

      // If completed, award points and send notification
      if (isCompleted && !existingProgress?.isCompleted) {
        // Award points
        await db.loyaltyBalance.update({
          where: { userId },
          data: {
            currentBalance: { increment: campaign.rewardValue },
            totalEarned: { increment: campaign.rewardValue },
          },
        })

        // Create transaction
        await db.loyaltyTransaction.create({
          data: {
            userId,
            type: 'EARN_CAMPAIGN',
            points: Math.round(campaign.rewardValue),
            description: `مكافأة حملة: ${campaign.name}`,
            descriptionEn: `Campaign reward: ${campaign.nameEn || campaign.name}`,
            metadata: {
              campaignId: campaign.id,
            },
          },
        })

        // Send notification
        await createAndSendNotification(userId, {
          type: 'LOYALTY_CAMPAIGN_COMPLETE',
          title: 'إنجاز حملة',
          message: `تهانينا! لقد أكملت حملة "${campaign.name}" وربحت ${campaign.rewardValue} نقطة`,
          data: {
            campaignId: campaign.id,
            points: String(campaign.rewardValue),
          },
        })
      }
    }
  } catch (error) {
    console.error('[loyalty-campaigns.updateUserCampaignProgress] Error:', error)
  }
}

/**
 * Get user's campaign progress
 */
export async function getUserCampaignProgress(userId?: string) {
  const user = await getCurrentUser()
  const targetUserId = userId || user?.id

  if (!targetUserId) {
    return []
  }

  // If not admin, can only view own progress
  if (userId && (!user || (user.role !== 'ADMIN' && user.id !== userId))) {
    return []
  }

  const progress = await db.userCampaignProgress.findMany({
    where: { userId: targetUserId },
    include: {
      campaign: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return progress
}

/**
 * Get active campaigns with user progress
 */
export async function getActiveCampaignsWithProgress() {
  const user = await getCurrentUser()
  if (!user) {
    return []
  }

  return getActiveCampaignsForUser(user.id)
}
