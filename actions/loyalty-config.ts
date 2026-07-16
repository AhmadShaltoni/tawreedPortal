'use server'

import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { ActionResponse } from '@/types'
import { isAdminLike } from '@/lib/permissions'

/**
 * Get loyalty system configuration
 */
export async function getLoyaltyConfig(): Promise<ActionResponse<any>> {
  try {
    const user = await getCurrentUser()
    if (!user || !isAdminLike(user.role)) {
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
    if (!user || !isAdminLike(user.role)) {
      return { success: false, error: 'Unauthorized' }
    }
    
    const isOn = (name: string) => {
      const v = formData.get(name)
      return v === 'true' || v === 'on'
    }

    const roundingMode = (formData.get('roundingMode') as string) || 'FLOOR'
    const earnTrigger = (formData.get('earnTrigger') as string) || 'ORDER_PLACED'

    const data = {
      isEnabled: isOn('isEnabled'),
      pointsPerJod: Number(formData.get('pointsPerJod')),
      calculationBase: Number(formData.get('calculationBase') || 1),
      minOrderValue: formData.get('minOrderValue') ? Number(formData.get('minOrderValue')) : null,
      excludeDeliveryFees: isOn('excludeDeliveryFees'),
      roundingMode,
      earnTrigger,
    }

    // Validate
    if (!Number.isFinite(data.pointsPerJod) || data.pointsPerJod <= 0) {
      return { success: false, error: 'قيمة النقاط لكل دينار يجب أن تكون رقماً أكبر من صفر' }
    }
    if (!Number.isFinite(data.calculationBase) || data.calculationBase <= 0) {
      return { success: false, error: 'أساس الاحتساب يجب أن يكون رقماً أكبر من صفر' }
    }
    if (!['FLOOR', 'CEIL', 'ROUND'].includes(roundingMode)) {
      return { success: false, error: 'طريقة التقريب غير صالحة' }
    }
    if (!['ORDER_PLACED', 'DELIVERED'].includes(earnTrigger)) {
      return { success: false, error: 'وقت منح النقاط غير صالح' }
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

    revalidatePath('/admin/loyalty/config')
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
    if (!user || !isAdminLike(user.role)) {
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
    if (!user || !isAdminLike(user.role)) {
      return { success: false, error: 'Unauthorized' }
    }
    
    const data = {
      isEnabled: formData.get('isEnabled') === 'true' || formData.get('isEnabled') === 'on',
      points: Number(formData.get('points')),
      trigger: formData.get('trigger') as string,
    }

    if (!Number.isFinite(data.points) || data.points < 0) {
      return { success: false, error: 'عدد النقاط غير صالح' }
    }
    if (!['SIGNUP', 'FIRST_DELIVERED_ORDER'].includes(data.trigger)) {
      return { success: false, error: 'وقت منح المكافأة غير صالح' }
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

    revalidatePath('/admin/loyalty/config')
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
    if (!user || !isAdminLike(user.role)) {
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
    if (!user || !isAdminLike(user.role)) {
      return { success: false, error: 'Unauthorized' }
    }
    
    const data = {
      isEnabled: formData.get('isEnabled') === 'true' || formData.get('isEnabled') === 'on',
      inviterPoints: Number(formData.get('inviterPoints')),
      inviteePoints: Number(formData.get('inviteePoints')),
      trigger: formData.get('trigger') as string,
    }

    if (!Number.isFinite(data.inviterPoints) || data.inviterPoints < 0 ||
        !Number.isFinite(data.inviteePoints) || data.inviteePoints < 0) {
      return { success: false, error: 'عدد النقاط غير صالح' }
    }
    if (!['SIGNUP', 'FIRST_DELIVERED_ORDER'].includes(data.trigger)) {
      return { success: false, error: 'وقت منح المكافأة غير صالح' }
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

    revalidatePath('/admin/loyalty/config')
    return { success: true, data: config }
  } catch (error) {
    console.error('[loyalty-config.updateReferralConfig]', error)
    return { success: false, error: 'Failed to update config' }
  }
}
