'use server'

import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import type { ActionResponse } from '@/types'

/**
 * Get loyalty system configuration
 */
export async function getLoyaltyConfig(): Promise<ActionResponse<any>> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }
    
    let config = await db.loyaltyConfig.findFirst()
    
    if (!config) {
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
    
    return { success: true, data: config }
  } catch (error) {
    console.error('[loyalty-config.getLoyaltyConfig]', error)
    return { success: false, error: 'Failed to get config' }
  }
}

/**
 * Update loyalty system configuration
 */
export async function updateLoyaltyConfig(formData: FormData): Promise<ActionResponse<any>> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }
    
    const data = {
      isEnabled: formData.get('isEnabled') === 'true',
      pointsPerJod: Number(formData.get('pointsPerJod')),
      calculationBase: Number(formData.get('calculationBase')),
      minOrderValue: formData.get('minOrderValue') ? Number(formData.get('minOrderValue')) : null,
      excludeDeliveryFees: formData.get('excludeDeliveryFees') === 'true',
      roundingMode: formData.get('roundingMode') as string,
    }
    
    // Validate
    if (data.pointsPerJod <= 0 || data.calculationBase <= 0) {
      return { success: false, error: 'Invalid configuration' }
    }
    
    // Get or create config
    let config = await db.loyaltyConfig.findFirst()
    
    if (config) {
      config = await db.loyaltyConfig.update({
        where: { id: config.id },
        data,
      })
    } else {
      config = await db.loyaltyConfig.create({ data })
    }
    
    return { success: true, data: config }
  } catch (error) {
    console.error('[loyalty-config.updateLoyaltyConfig]', error)
    return { success: false, error: 'Failed to update config' }
  }
}

/**
 * Get welcome bonus configuration
 */
export async function getWelcomeBonusConfig(): Promise<ActionResponse<any>> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }
    
    let config = await db.welcomeBonusConfig.findFirst()
    
    if (!config) {
      config = await db.welcomeBonusConfig.create({
        data: {
          isEnabled: true,
          points: 100,
          trigger: 'SIGNUP',
        },
      })
    }
    
    return { success: true, data: config }
  } catch (error) {
    console.error('[loyalty-config.getWelcomeBonusConfig]', error)
    return { success: false, error: 'Failed to get config' }
  }
}

/**
 * Update welcome bonus configuration
 */
export async function updateWelcomeBonusConfig(formData: FormData): Promise<ActionResponse<any>> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }
    
    const data = {
      isEnabled: formData.get('isEnabled') === 'true',
      points: Number(formData.get('points')),
      trigger: formData.get('trigger') as string,
    }
    
    if (data.points < 0) {
      return { success: false, error: 'Invalid points' }
    }
    
    let config = await db.welcomeBonusConfig.findFirst()
    
    if (config) {
      config = await db.welcomeBonusConfig.update({
        where: { id: config.id },
        data,
      })
    } else {
      config = await db.welcomeBonusConfig.create({ data })
    }
    
    return { success: true, data: config }
  } catch (error) {
    console.error('[loyalty-config.updateWelcomeBonusConfig]', error)
    return { success: false, error: 'Failed to update config' }
  }
}

/**
 * Get referral system configuration
 */
export async function getReferralConfig(): Promise<ActionResponse<any>> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }
    
    let config = await db.referralConfig.findFirst()
    
    if (!config) {
      config = await db.referralConfig.create({
        data: {
          isEnabled: true,
          inviterPoints: 50,
          inviteePoints: 50,
          trigger: 'FIRST_DELIVERED_ORDER',
        },
      })
    }
    
    return { success: true, data: config }
  } catch (error) {
    console.error('[loyalty-config.getReferralConfig]', error)
    return { success: false, error: 'Failed to get config' }
  }
}

/**
 * Update referral system configuration
 */
export async function updateReferralConfig(formData: FormData): Promise<ActionResponse<any>> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }
    
    const data = {
      isEnabled: formData.get('isEnabled') === 'true',
      inviterPoints: Number(formData.get('inviterPoints')),
      inviteePoints: Number(formData.get('inviteePoints')),
      trigger: formData.get('trigger') as string,
    }
    
    if (data.inviterPoints < 0 || data.inviteePoints < 0) {
      return { success: false, error: 'Invalid points' }
    }
    
    let config = await db.referralConfig.findFirst()
    
    if (config) {
      config = await db.referralConfig.update({
        where: { id: config.id },
        data,
      })
    } else {
      config = await db.referralConfig.create({ data })
    }
    
    return { success: true, data: config }
  } catch (error) {
    console.error('[loyalty-config.updateReferralConfig]', error)
    return { success: false, error: 'Failed to update config' }
  }
}
