'use server'

import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * Get loyalty dashboard stats for admin
 */
export async function getLoyaltyDashboardStats() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return null
  }

  try {
    // Total points distributed
    const earnTransactions = await db.loyaltyTransaction.aggregate({
      where: {
        points: { gt: 0 },
      },
      _sum: {
        points: true,
      },
    })

    // Total points redeemed
    const redeemTransactions = await db.loyaltyTransaction.aggregate({
      where: {
        type: 'REDEEM',
      },
      _sum: {
        points: true,
      },
    })

    // Active users (users with balance > 0)
    const activeUsers = await db.loyaltyBalance.count({
      where: {
        currentBalance: { gt: 0 },
      },
    })

    // Total users in loyalty program
    const totalUsers = await db.loyaltyBalance.count()

    // Rewards redeemed count
    const rewardsRedeemed = await db.redeemedReward.count()

    // Active campaigns
    const now = new Date()
    const activeCampaigns = await db.loyaltyCampaign.count({
      where: {
        status: 'ACTIVE',
        startDate: { lte: now },
        endDate: { gte: now },
      },
    })

    // Referral stats (simplified)
    const totalReferrals = 0
    const successfulReferrals = 0

    // Recent transactions (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recentTransactions = await db.loyaltyTransaction.count({
      where: {
        createdAt: { gte: sevenDaysAgo },
      },
    })

    return {
      totalPointsDistributed: earnTransactions._sum.points || 0,
      totalPointsRedeemed: Math.abs(redeemTransactions._sum.points || 0),
      activeUsers,
      totalUsers,
      rewardsRedeemed,
      activeCampaigns,
      totalReferrals,
      successfulReferrals,
      recentTransactions,
    }
  } catch (error) {
    console.error('[loyalty-analytics.getLoyaltyDashboardStats] Error:', error)
    return null
  }
}

/**
 * Get top loyal customers by total points earned
 */
export async function getTopLoyalCustomers(limit: number = 10) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return []
  }

  const topCustomers = await db.loyaltyBalance.findMany({
    where: {
      totalEarned: { gt: 0 },
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          storeName: true,
          city: true,
        },
      },
    },
    orderBy: {
      totalEarned: 'desc',
    },
    take: limit,
  })

  return topCustomers
}

/**
 * Get points distribution over time (last 30 days)
 */
export async function getPointsDistribution(days: number = 30) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return []
  }

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const transactions = await db.loyaltyTransaction.groupBy({
    by: ['type'],
    where: {
      createdAt: { gte: startDate },
    },
    _sum: {
      points: true,
    },
    _count: {
      id: true,
    },
  })

  return transactions.map((t) => ({
    type: t.type,
    totalPoints: t._sum.points || 0,
    transactionCount: t._count.id,
  }))
}

/**
 * Get campaign performance metrics
 */
export async function getCampaignPerformance(campaignId?: string) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return null
  }

  if (campaignId) {
    // Single campaign stats
    const campaign = await db.loyaltyCampaign.findUnique({
      where: { id: campaignId },
      include: {
        userProgress: {
          select: {
            completedAt: true,
            currentValue: true,
          },
        },
      },
    })

    if (!campaign) return null

    const totalParticipants = campaign.userProgress.length
    const completedCount = campaign.userProgress.filter((p) => p.completedAt).length
    const completionRate = totalParticipants > 0 ? (completedCount / totalParticipants) * 100 : 0

    return {
      campaign,
      totalParticipants,
      completedCount,
      completionRate,
    }
  } else {
    // All campaigns summary
    const campaigns = await db.loyaltyCampaign.findMany({
      include: {
        _count: {
          select: {
            userProgress: true,
          },
        },
        userProgress: {
          where: { completedAt: { not: null } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return campaigns.map((c) => ({
      id: c.id,
      title: c.name,
      status: c.status,
      totalParticipants: c._count.userProgress,
      completedCount: c.userProgress.length,
      completionRate:
        c._count.userProgress > 0 ? (c.userProgress.length / c._count.userProgress) * 100 : 0,
    }))
  }
}

/**
 * Get reward cost estimation (potential liability)
 */
export async function getRewardCostEstimation() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return null
  }

  // Total unredeemed points in circulation
  const totalUnredeemedPoints = await db.loyaltyBalance.aggregate({
    _sum: {
      currentBalance: true,
    },
  })

  // Get loyalty config for conversion rate
  const config = await db.loyaltyConfig.findFirst()
  const pointsPerJod = config?.pointsPerJod || 10

  // Estimate potential cost (if all points were redeemed at face value)
  const estimatedCost = (totalUnredeemedPoints._sum.currentBalance || 0) / pointsPerJod

  // Active rewards and their redemption counts
  const rewards = await db.loyaltyReward.findMany({
    where: { isActive: true },
    include: {
      _count: {
        select: { redemptions: true },
      },
    },
  })

  const rewardBreakdown = rewards.map((r) => ({
    id: r.id,
    title: r.name,
    pointsCost: r.pointsCost,
    redemptionCount: r._count.redemptions,
    estimatedValue: r.discountValue || 0,
  }))

  return {
    totalUnredeemedPoints: totalUnredeemedPoints._sum.currentBalance || 0,
    estimatedCostInJOD: estimatedCost,
    rewardBreakdown,
  }
}

/**
 * Get transaction history for admin (all users)
 */
export async function getAllTransactions(page: number = 1, limit: number = 50, filters?: {
  userId?: string
  type?: string
  startDate?: Date
  endDate?: Date
}) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return { transactions: [], total: 0, page, totalPages: 0 }
  }

  const skip = (page - 1) * limit

  const where: any = {}
  if (filters?.userId) where.userId = filters.userId
  if (filters?.type) where.type = filters.type
  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {}
    if (filters.startDate) where.createdAt.gte = filters.startDate
    if (filters.endDate) where.createdAt.lte = filters.endDate
  }

  const [transactions, total] = await Promise.all([
    db.loyaltyTransaction.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            storeName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    db.loyaltyTransaction.count({ where }),
  ])

  const totalPages = Math.ceil(total / limit)

  return {
    transactions,
    total,
    page,
    totalPages,
  }
}
