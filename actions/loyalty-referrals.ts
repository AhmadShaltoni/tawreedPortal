'use server'

import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import type { ActionResponse } from '@/types'

/**
 * Generate a unique referral code
 */
function generateReferralCode(userId: string): string {
  // Generate format: TAWREED-XXXXX (5 alphanumeric characters)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Excluding similar chars
  let code = 'TAWREED-'
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Create referral code for new user (called during registration)
 */
export async function createUserReferral(userId: string, referredByCode?: string): Promise<ActionResponse<any>> {
  try {
    // Check if referral already exists
    const existing = await db.userReferral.findUnique({
      where: { userId },
    })
    
    if (existing) {
      return { success: true, data: existing }
    }
    
    // Generate unique code
    let referralCode = generateReferralCode(userId)
    let attempts = 0
    
    while (attempts < 10) {
      const codeExists = await db.userReferral.findUnique({
        where: { referralCode },
      })
      
      if (!codeExists) break
      
      referralCode = generateReferralCode(userId)
      attempts++
    }
    
    // Find referrer if code provided
    let referredByUserId: string | null = null
    
    if (referredByCode) {
      const referrer = await db.userReferral.findUnique({
        where: { referralCode: referredByCode.toUpperCase() },
      })
      
      if (referrer && referrer.userId !== userId) {
        referredByUserId = referrer.userId
      }
    }
    
    // Create user referral
    const userReferral = await db.userReferral.create({
      data: {
        userId,
        referralCode,
        referredByUserId,
        referralRewardClaimed: false,
        inviterRewardClaimed: false,
      },
    })
    
    return { success: true, data: userReferral }
  } catch (error) {
    console.error('[loyalty-referrals.createUserReferral]', error)
    return { success: false, error: 'Failed to create referral' }
  }
}

/**
 * Get user's referral info
 */
export async function getUserReferralInfo(userId?: string): Promise<ActionResponse<any>> {
  try {
    const user = userId ? { id: userId } : await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }
    
    const referral = await db.userReferral.findUnique({
      where: { userId: user.id },
      include: {
        referredBy: {
          select: {
            id: true,
            username: true,
            storeName: true,
          },
        },
      },
    })
    
    if (!referral) {
      return { success: false, error: 'Referral not found' }
    }
    
    // Count successful referrals
    const referralCount = await db.userReferral.count({
      where: {
        referredByUserId: user.id,
        inviterRewardClaimed: true,
      },
    })
    
    return {
      success: true,
      data: {
        ...referral,
        referralCount,
        referralLink: `https://tawreed.app/register?ref=${referral.referralCode}`,
      },
    }
  } catch (error) {
    console.error('[loyalty-referrals.getUserReferralInfo]', error)
    return { success: false, error: 'Failed to get referral info' }
  }
}

/**
 * Validate referral code
 */
export async function validateReferralCode(code: string): Promise<ActionResponse<any>> {
  try {
    const referral = await db.userReferral.findUnique({
      where: { referralCode: code.toUpperCase() },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            storeName: true,
          },
        },
      },
    })
    
    if (!referral) {
      return { success: false, error: 'Invalid referral code' }
    }
    
    return {
      success: true,
      data: {
        isValid: true,
        referrerName: referral.user.storeName || referral.user.username,
      },
    }
  } catch (error) {
    console.error('[loyalty-referrals.validateReferralCode]', error)
    return { success: false, error: 'Failed to validate code' }
  }
}

/**
 * Admin: Get referral statistics
 */
export async function getReferralStats(): Promise<ActionResponse<any>> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }
    
    const [totalReferrals, claimedReferrals, topReferrers] = await Promise.all([
      db.userReferral.count({
        where: { referredByUserId: { not: null } },
      }),
      db.userReferral.count({
        where: {
          referredByUserId: { not: null },
          inviterRewardClaimed: true,
        },
      }),
      db.userReferral.groupBy({
        by: ['referredByUserId'],
        where: {
          referredByUserId: { not: null },
          inviterRewardClaimed: true,
        },
        _count: true,
        orderBy: {
          _count: {
            referredByUserId: 'desc',
          },
        },
        take: 10,
      }),
    ])
    
    // Get user details for top referrers
    const topReferrersWithDetails = await Promise.all(
      topReferrers.map(async (ref) => {
        if (!ref.referredByUserId) return null
        
        const user = await db.user.findUnique({
          where: { id: ref.referredByUserId },
          select: {
            id: true,
            username: true,
            storeName: true,
            phone: true,
          },
        })
        
        return {
          user,
          referralCount: ref._count,
        }
      })
    )
    
    return {
      success: true,
      data: {
        totalReferrals,
        claimedReferrals,
        pendingReferrals: totalReferrals - claimedReferrals,
        topReferrers: topReferrersWithDetails.filter(Boolean),
      },
    }
  } catch (error) {
    console.error('[loyalty-referrals.getReferralStats]', error)
    return { success: false, error: 'Failed to get referral stats' }
  }
}
