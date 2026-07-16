'use server'

import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { isAdminLike } from '@/lib/permissions'

// ============================================
// DELIVERY CONFIG (Singleton)
// ============================================

export async function getDeliveryConfig() {
  let config = await db.deliveryConfig.findFirst()
  if (!config) {
    config = await db.deliveryConfig.create({
      data: {
        isEnabled: true,
        defaultFee: 3.0,
        freeDeliveryEnabled: false,
        freeDeliveryThreshold: null,
        freeDeliveryScope: 'ALL_CITIES',
        minOrderAmount: null,
        estimatedDeliveryDays: 2,
      },
    })
  }
  return config
}

export async function updateDeliveryConfig(formData: FormData) {
  const user = await getCurrentUser()
  if (!isAdminLike(user?.role)) return { success: false, error: 'Unauthorized' }

  const isEnabled = formData.get('isEnabled') === 'true'
  const defaultFee = parseFloat(formData.get('defaultFee') as string) || 3.0
  const freeDeliveryEnabled = formData.get('freeDeliveryEnabled') === 'true'
  const freeDeliveryThresholdRaw = formData.get('freeDeliveryThreshold') as string
  const freeDeliveryThreshold = freeDeliveryThresholdRaw ? parseFloat(freeDeliveryThresholdRaw) : null
  const freeDeliveryScope = (formData.get('freeDeliveryScope') as string) || 'ALL_CITIES'
  const minOrderAmountRaw = formData.get('minOrderAmount') as string
  const minOrderAmount = minOrderAmountRaw ? parseFloat(minOrderAmountRaw) : null
  const estimatedDeliveryDays = parseInt(formData.get('estimatedDeliveryDays') as string) || 2

  const config = await getDeliveryConfig()

  await db.deliveryConfig.update({
    where: { id: config.id },
    data: {
      isEnabled,
      defaultFee,
      freeDeliveryEnabled,
      freeDeliveryThreshold,
      freeDeliveryScope: freeDeliveryScope as 'ALL_CITIES' | 'SPECIFIC_CITIES',
      minOrderAmount,
      estimatedDeliveryDays,
    },
  })

  revalidatePath('/admin/delivery')
  return { success: true }
}

// ============================================
// DELIVERY ZONES
// ============================================

export async function getDeliveryZones() {
  return db.deliveryZone.findMany({
    include: { city: true },
    orderBy: [{ sortOrder: 'asc' }, { city: { sortOrder: 'asc' } }],
  })
}

export async function getDeliveryZonesWithCities() {
  // Get all cities and their zones (if any)
  const cities = await db.city.findMany({
    include: { deliveryZone: true },
    orderBy: { sortOrder: 'asc' },
  })
  return cities
}

export async function updateDeliveryZone(zoneId: string, data: {
  fee?: number
  isActive?: boolean
  isVisible?: boolean
  freeDeliveryThreshold?: number | null
  freeDeliveryEnabled?: boolean | null
  estimatedDays?: number | null
  notes?: string | null
}) {
  const user = await getCurrentUser()
  if (!isAdminLike(user?.role)) return { success: false, error: 'Unauthorized' }

  await db.deliveryZone.update({
    where: { id: zoneId },
    data,
  })

  revalidatePath('/admin/delivery')
  return { success: true }
}

export async function createOrUpdateZoneForCity(cityId: string, data: {
  fee: number
  isActive?: boolean
  isVisible?: boolean
  freeDeliveryThreshold?: number | null
  freeDeliveryEnabled?: boolean | null
  estimatedDays?: number | null
  notes?: string | null
}) {
  const user = await getCurrentUser()
  if (!isAdminLike(user?.role)) return { success: false, error: 'Unauthorized' }

  await db.deliveryZone.upsert({
    where: { cityId },
    create: {
      cityId,
      fee: data.fee,
      isActive: data.isActive ?? true,
      isVisible: data.isVisible ?? true,
      freeDeliveryThreshold: data.freeDeliveryThreshold,
      freeDeliveryEnabled: data.freeDeliveryEnabled,
      estimatedDays: data.estimatedDays,
      notes: data.notes,
    },
    update: {
      fee: data.fee,
      isActive: data.isActive,
      isVisible: data.isVisible,
      freeDeliveryThreshold: data.freeDeliveryThreshold,
      freeDeliveryEnabled: data.freeDeliveryEnabled,
      estimatedDays: data.estimatedDays,
      notes: data.notes,
    },
  })

  revalidatePath('/admin/delivery')
  return { success: true }
}

export async function bulkUpdateZones(updates: Array<{
  cityId: string
  fee?: number
  isActive?: boolean
  isVisible?: boolean
}>) {
  const user = await getCurrentUser()
  if (!isAdminLike(user?.role)) return { success: false, error: 'Unauthorized' }

  for (const update of updates) {
    await db.deliveryZone.upsert({
      where: { cityId: update.cityId },
      create: {
        cityId: update.cityId,
        fee: update.fee ?? 3.0,
        isActive: update.isActive ?? true,
        isVisible: update.isVisible ?? true,
      },
      update: {
        fee: update.fee,
        isActive: update.isActive,
        isVisible: update.isVisible,
      },
    })
  }

  revalidatePath('/admin/delivery')
  return { success: true }
}

export async function initializeAllZones(defaultFee: number) {
  const user = await getCurrentUser()
  if (!isAdminLike(user?.role)) return { success: false, error: 'Unauthorized' }

  const cities = await db.city.findMany()
  
  for (const city of cities) {
    await db.deliveryZone.upsert({
      where: { cityId: city.id },
      create: {
        cityId: city.id,
        fee: defaultFee,
        isActive: true,
        isVisible: true,
      },
      update: {}, // Don't overwrite existing
    })
  }

  revalidatePath('/admin/delivery')
  return { success: true }
}

// ============================================
// DELIVERY PROMOTIONS
// ============================================

export async function getDeliveryPromotions() {
  return db.deliveryPromotion.findMany({
    orderBy: { createdAt: 'desc' },
  })
}

export async function getActiveDeliveryPromotions() {
  const now = new Date()
  const promos = await db.deliveryPromotion.findMany({
    where: {
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    orderBy: { createdAt: 'desc' },
  })
  // Filter out promotions that have exceeded their usage limit
  return promos.filter((p) => p.usageLimit === null || p.usageCount < p.usageLimit)
}

export async function createDeliveryPromotion(formData: FormData) {
  const user = await getCurrentUser()
  if (!isAdminLike(user?.role)) return { success: false, error: 'Unauthorized' }

  const name = formData.get('name') as string
  const nameEn = formData.get('nameEn') as string || null
  const type = formData.get('type') as 'FREE_DELIVERY' | 'REDUCED_FEE' | 'FLAT_RATE'
  const value = parseFloat(formData.get('value') as string) || 0
  const scope = formData.get('scope') as 'ALL_CITIES' | 'SPECIFIC_CITIES'
  const cityIdsRaw = formData.get('cityIds') as string
  const cityIds = cityIdsRaw ? JSON.parse(cityIdsRaw) : []
  const minOrderAmountRaw = formData.get('minOrderAmount') as string
  const minOrderAmount = minOrderAmountRaw ? parseFloat(minOrderAmountRaw) : null
  const startDate = new Date(formData.get('startDate') as string)
  const endDate = new Date(formData.get('endDate') as string)
  const isActive = formData.get('isActive') !== 'false'
  const usageLimitRaw = formData.get('usageLimit') as string
  const usageLimit = usageLimitRaw ? parseInt(usageLimitRaw) : null

  if (!name || !type || !formData.get('startDate') || !formData.get('endDate')) {
    return { success: false, error: 'الحقول المطلوبة غير مكتملة' }
  }

  if (endDate <= startDate) {
    return { success: false, error: 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية' }
  }

  await db.deliveryPromotion.create({
    data: {
      name,
      nameEn,
      type,
      value,
      scope,
      cityIds,
      minOrderAmount,
      startDate,
      endDate,
      isActive,
      usageLimit,
    },
  })

  revalidatePath('/admin/delivery/promotions')
  return { success: true }
}

export async function updateDeliveryPromotion(id: string, formData: FormData) {
  const user = await getCurrentUser()
  if (!isAdminLike(user?.role)) return { success: false, error: 'Unauthorized' }

  const name = formData.get('name') as string
  const nameEn = formData.get('nameEn') as string || null
  const type = formData.get('type') as 'FREE_DELIVERY' | 'REDUCED_FEE' | 'FLAT_RATE'
  const value = parseFloat(formData.get('value') as string) || 0
  const scope = formData.get('scope') as 'ALL_CITIES' | 'SPECIFIC_CITIES'
  const cityIdsRaw = formData.get('cityIds') as string
  const cityIds = cityIdsRaw ? JSON.parse(cityIdsRaw) : []
  const minOrderAmountRaw = formData.get('minOrderAmount') as string
  const minOrderAmount = minOrderAmountRaw ? parseFloat(minOrderAmountRaw) : null
  const startDate = new Date(formData.get('startDate') as string)
  const endDate = new Date(formData.get('endDate') as string)
  const isActive = formData.get('isActive') !== 'false'
  const usageLimitRaw = formData.get('usageLimit') as string
  const usageLimit = usageLimitRaw ? parseInt(usageLimitRaw) : null

  await db.deliveryPromotion.update({
    where: { id },
    data: {
      name,
      nameEn,
      type,
      value,
      scope,
      cityIds,
      minOrderAmount,
      startDate,
      endDate,
      isActive,
      usageLimit,
    },
  })

  revalidatePath('/admin/delivery/promotions')
  return { success: true }
}

export async function deleteDeliveryPromotion(id: string) {
  const user = await getCurrentUser()
  if (!isAdminLike(user?.role)) return { success: false, error: 'Unauthorized' }

  await db.deliveryPromotion.delete({ where: { id } })

  revalidatePath('/admin/delivery/promotions')
  return { success: true }
}

export async function toggleDeliveryPromotion(id: string, isActive: boolean) {
  const user = await getCurrentUser()
  if (!isAdminLike(user?.role)) return { success: false, error: 'Unauthorized' }

  await db.deliveryPromotion.update({
    where: { id },
    data: { isActive },
  })

  revalidatePath('/admin/delivery/promotions')
  return { success: true }
}

// ============================================
// DELIVERY FEE CALCULATION ENGINE
// ============================================

export interface DeliveryFeeResult {
  fee: number
  isFree: boolean
  originalFee: number
  freeThreshold: number | null
  remainingForFree: number | null
  promotionId: string | null
  promotionName: string | null
  estimatedDays: number
  error?: string
}

export async function calculateDeliveryFee(cityId: string, orderTotal: number): Promise<DeliveryFeeResult> {
  // 1. Get global config
  const config = await getDeliveryConfig()
  
  if (!config.isEnabled) {
    return {
      fee: 0,
      isFree: false,
      originalFee: 0,
      freeThreshold: null,
      remainingForFree: null,
      promotionId: null,
      promotionName: null,
      estimatedDays: config.estimatedDeliveryDays,
      error: 'خدمة التوصيل متوقفة مؤقتاً',
    }
  }

  // 2. Get zone for this city
  const zone = await db.deliveryZone.findUnique({
    where: { cityId },
    include: { city: true },
  })

  // Check if city has a zone and is active+visible
  if (zone && !zone.isActive) {
    return {
      fee: 0,
      isFree: false,
      originalFee: 0,
      freeThreshold: null,
      remainingForFree: null,
      promotionId: null,
      promotionName: null,
      estimatedDays: config.estimatedDeliveryDays,
      error: 'التوصيل غير متاح لهذه المنطقة حالياً',
    }
  }

  // Determine the base fee
  const baseFee = zone?.fee ?? config.defaultFee
  const estimatedDays = zone?.estimatedDays ?? config.estimatedDeliveryDays

  // 3. Check active promotions (best for customer wins)
  const now = new Date()
  const activePromotions = await db.deliveryPromotion.findMany({
    where: {
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
  })

  // Filter promotions that apply to this city and order
  const applicablePromotions = activePromotions.filter((promo) => {
    // Check usage limit
    if (promo.usageLimit !== null && promo.usageCount >= promo.usageLimit) return false
    // Check min order amount
    if (promo.minOrderAmount !== null && orderTotal < promo.minOrderAmount) return false
    // Check city scope
    if (promo.scope === 'SPECIFIC_CITIES' && !promo.cityIds.includes(cityId)) return false
    return true
  })

  // Find best promotion (lowest resulting fee)
  let bestPromoFee = baseFee
  let bestPromo: typeof activePromotions[0] | null = null

  for (const promo of applicablePromotions) {
    let promoFee = baseFee
    switch (promo.type) {
      case 'FREE_DELIVERY':
        promoFee = 0
        break
      case 'REDUCED_FEE':
        promoFee = Math.max(0, baseFee - promo.value)
        break
      case 'FLAT_RATE':
        promoFee = promo.value
        break
    }
    if (promoFee < bestPromoFee) {
      bestPromoFee = promoFee
      bestPromo = promo
    }
  }

  if (bestPromo && bestPromoFee < baseFee) {
    return {
      fee: bestPromoFee,
      isFree: bestPromoFee === 0,
      originalFee: baseFee,
      freeThreshold: null,
      remainingForFree: null,
      promotionId: bestPromo.id,
      promotionName: bestPromo.name,
      estimatedDays,
    }
  }

  // 4. Check zone-specific free delivery threshold
  const zoneFreeEnabled = zone?.freeDeliveryEnabled ?? config.freeDeliveryEnabled
  const zoneThreshold = zone?.freeDeliveryThreshold ?? config.freeDeliveryThreshold

  if (zoneFreeEnabled && zoneThreshold !== null) {
    if (orderTotal >= zoneThreshold) {
      return {
        fee: 0,
        isFree: true,
        originalFee: baseFee,
        freeThreshold: zoneThreshold,
        remainingForFree: 0,
        promotionId: null,
        promotionName: null,
        estimatedDays,
      }
    }
    // Return with remaining amount info
    return {
      fee: baseFee,
      isFree: false,
      originalFee: baseFee,
      freeThreshold: zoneThreshold,
      remainingForFree: Math.round((zoneThreshold - orderTotal) * 100) / 100,
      promotionId: null,
      promotionName: null,
      estimatedDays,
    }
  }

  // 5. Check global free delivery (if scope includes this city)
  if (config.freeDeliveryEnabled && config.freeDeliveryThreshold !== null) {
    const scopeApplies = config.freeDeliveryScope === 'ALL_CITIES' ||
      (zone ? true : false) // If SPECIFIC_CITIES, zone must exist
    
    if (scopeApplies && orderTotal >= config.freeDeliveryThreshold) {
      return {
        fee: 0,
        isFree: true,
        originalFee: baseFee,
        freeThreshold: config.freeDeliveryThreshold,
        remainingForFree: 0,
        promotionId: null,
        promotionName: null,
        estimatedDays,
      }
    }

    if (scopeApplies) {
      return {
        fee: baseFee,
        isFree: false,
        originalFee: baseFee,
        freeThreshold: config.freeDeliveryThreshold,
        remainingForFree: Math.round((config.freeDeliveryThreshold - orderTotal) * 100) / 100,
        promotionId: null,
        promotionName: null,
        estimatedDays,
      }
    }
  }

  // 6. Return base fee
  return {
    fee: baseFee,
    isFree: false,
    originalFee: baseFee,
    freeThreshold: null,
    remainingForFree: null,
    promotionId: null,
    promotionName: null,
    estimatedDays,
  }
}

// ============================================
// DELIVERY STATS (for admin dashboard)
// ============================================

export async function getDeliveryStats() {
  const user = await getCurrentUser()
  if (!isAdminLike(user?.role)) return null

  const [config, zones, activePromotions, ordersWithDelivery, totalOrders] = await Promise.all([
    getDeliveryConfig(),
    db.deliveryZone.findMany({ where: { isActive: true } }),
    db.deliveryPromotion.findMany({
      where: {
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
    }),
    db.order.count({ where: { deliveryFee: { gt: 0 } } }),
    db.order.count(),
  ])

  const freeDeliveryOrders = totalOrders - ordersWithDelivery
  const avgFee = zones.length > 0
    ? zones.reduce((sum, z) => sum + z.fee, 0) / zones.length
    : config.defaultFee

  return {
    isEnabled: config.isEnabled,
    activeZones: zones.length,
    totalCities: await db.city.count(),
    activePromotions: activePromotions.length,
    avgFee: Math.round(avgFee * 100) / 100,
    freeDeliveryOrders,
    totalOrders,
    freeDeliveryPercent: totalOrders > 0 ? Math.round((freeDeliveryOrders / totalOrders) * 100) : 0,
  }
}
