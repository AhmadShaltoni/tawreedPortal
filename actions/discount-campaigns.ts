'use server'

import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { invalidateDiscountCache } from '@/lib/discount-engine'
import type { ActionResponse } from '@/types'

// Types
export interface DiscountCampaignData {
  id: string
  name: string
  nameEn: string | null
  discountPercent: number
  startDate: Date
  endDate: Date | null
  scope: string
  collectionId: string | null
  categoryId: string | null
  status: string
  createdAt: Date
  updatedAt: Date
  _count?: { products: number }
  collection?: { id: string; name: string; nameEn: string | null } | null
  category?: { id: string; name: string; nameEn: string | null } | null
}

/**
 * Create a new discount campaign
 */
export async function createDiscountCampaign(data: {
  name: string
  nameEn?: string
  discountPercent: number
  startDate: string
  endDate?: string | null
  scope: 'ALL_PRODUCTS' | 'SPECIFIC_PRODUCTS' | 'COLLECTION' | 'CATEGORY'
  collectionId?: string | null
  categoryId?: string | null
  productIds?: string[]
  status?: 'ACTIVE' | 'PAUSED' | 'SCHEDULED'
}): Promise<ActionResponse<DiscountCampaignData>> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'غير مصرح بالدخول' }
    }

    // Validate
    if (!data.name || data.name.length < 2) {
      return { success: false, error: 'اسم الحملة مطلوب (حرفين على الأقل)' }
    }
    if (!data.discountPercent || data.discountPercent < 0.1 || data.discountPercent > 100) {
      return { success: false, error: 'نسبة الخصم يجب أن تكون بين 0.1% و 100%' }
    }
    if (!data.startDate) {
      return { success: false, error: 'تاريخ البداية مطلوب' }
    }
    if (data.scope === 'COLLECTION' && !data.collectionId) {
      return { success: false, error: 'يجب اختيار قسم تسويقي' }
    }
    if (data.scope === 'CATEGORY' && !data.categoryId) {
      return { success: false, error: 'يجب اختيار فئة' }
    }
    if (data.scope === 'SPECIFIC_PRODUCTS' && (!data.productIds || data.productIds.length === 0)) {
      return { success: false, error: 'يجب اختيار منتج واحد على الأقل' }
    }

    const startDate = new Date(data.startDate)
    const endDate = data.endDate ? new Date(data.endDate) : null

    if (endDate && endDate <= startDate) {
      return { success: false, error: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية' }
    }

    // Determine status
    let status = data.status || 'ACTIVE'
    if (status === 'ACTIVE' && startDate > new Date()) {
      status = 'SCHEDULED'
    }

    const campaign = await db.discountCampaign.create({
      data: {
        name: data.name,
        nameEn: data.nameEn || null,
        discountPercent: data.discountPercent,
        startDate,
        endDate,
        scope: data.scope,
        collectionId: data.scope === 'COLLECTION' ? data.collectionId : null,
        categoryId: data.scope === 'CATEGORY' ? data.categoryId : null,
        status,
        products: data.scope === 'SPECIFIC_PRODUCTS' && data.productIds
          ? { createMany: { data: data.productIds.map(productId => ({ productId })) } }
          : undefined,
      },
      include: {
        _count: { select: { products: true } },
        collection: { select: { id: true, name: true, nameEn: true } },
        category: { select: { id: true, name: true, nameEn: true } },
      },
    })

    invalidateDiscountCache()
    return { success: true, data: campaign }
  } catch (error) {
    console.error('createDiscountCampaign error:', error)
    return { success: false, error: 'حدث خطأ أثناء إنشاء حملة الخصم' }
  }
}

/**
 * Update an existing discount campaign
 */
export async function updateDiscountCampaign(
  id: string,
  data: {
    name?: string
    nameEn?: string | null
    discountPercent?: number
    startDate?: string
    endDate?: string | null
    scope?: 'ALL_PRODUCTS' | 'SPECIFIC_PRODUCTS' | 'COLLECTION' | 'CATEGORY'
    collectionId?: string | null
    categoryId?: string | null
    productIds?: string[]
    status?: 'ACTIVE' | 'PAUSED' | 'SCHEDULED'
  }
): Promise<ActionResponse<DiscountCampaignData>> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'غير مصرح بالدخول' }
    }

    const existing = await db.discountCampaign.findUnique({ where: { id } })
    if (!existing) {
      return { success: false, error: 'حملة الخصم غير موجودة' }
    }

    if (data.discountPercent !== undefined && (data.discountPercent < 0.1 || data.discountPercent > 100)) {
      return { success: false, error: 'نسبة الخصم يجب أن تكون بين 0.1% و 100%' }
    }

    const startDate = data.startDate ? new Date(data.startDate) : undefined
    const endDate = data.endDate === null ? null : data.endDate ? new Date(data.endDate) : undefined

    // If products need to be updated
    if (data.productIds !== undefined && (data.scope || existing.scope) === 'SPECIFIC_PRODUCTS') {
      await db.discountCampaignProduct.deleteMany({ where: { campaignId: id } })
      if (data.productIds.length > 0) {
        await db.discountCampaignProduct.createMany({
          data: data.productIds.map(productId => ({ campaignId: id, productId })),
        })
      }
    }

    // If scope changed away from SPECIFIC_PRODUCTS, clear product associations
    if (data.scope && data.scope !== 'SPECIFIC_PRODUCTS' && existing.scope === 'SPECIFIC_PRODUCTS') {
      await db.discountCampaignProduct.deleteMany({ where: { campaignId: id } })
    }

    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.nameEn !== undefined) updateData.nameEn = data.nameEn
    if (data.discountPercent !== undefined) updateData.discountPercent = data.discountPercent
    if (startDate !== undefined) updateData.startDate = startDate
    if (endDate !== undefined) updateData.endDate = endDate
    if (data.scope !== undefined) {
      updateData.scope = data.scope
      updateData.collectionId = data.scope === 'COLLECTION' ? data.collectionId : null
      updateData.categoryId = data.scope === 'CATEGORY' ? data.categoryId : null
    }
    if (data.status !== undefined) updateData.status = data.status

    const campaign = await db.discountCampaign.update({
      where: { id },
      data: updateData,
      include: {
        _count: { select: { products: true } },
        collection: { select: { id: true, name: true, nameEn: true } },
        category: { select: { id: true, name: true, nameEn: true } },
      },
    })

    invalidateDiscountCache()
    return { success: true, data: campaign }
  } catch (error) {
    console.error('updateDiscountCampaign error:', error)
    return { success: false, error: 'حدث خطأ أثناء تحديث حملة الخصم' }
  }
}

/**
 * Toggle campaign status (activate/pause)
 */
export async function toggleDiscountCampaignStatus(id: string): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'غير مصرح بالدخول' }
    }

    const campaign = await db.discountCampaign.findUnique({ where: { id } })
    if (!campaign) {
      return { success: false, error: 'حملة الخصم غير موجودة' }
    }

    const newStatus = campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'

    await db.discountCampaign.update({
      where: { id },
      data: { status: newStatus },
    })

    invalidateDiscountCache()
    return { success: true }
  } catch (error) {
    console.error('toggleDiscountCampaignStatus error:', error)
    return { success: false, error: 'حدث خطأ' }
  }
}

/**
 * Delete a discount campaign
 */
export async function deleteDiscountCampaign(id: string): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'غير مصرح بالدخول' }
    }

    await db.discountCampaign.delete({ where: { id } })
    invalidateDiscountCache()
    return { success: true }
  } catch (error) {
    console.error('deleteDiscountCampaign error:', error)
    return { success: false, error: 'حدث خطأ أثناء حذف حملة الخصم' }
  }
}

/**
 * Get all discount campaigns with stats
 */
export async function getAllDiscountCampaigns(): Promise<ActionResponse<DiscountCampaignData[]>> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'غير مصرح بالدخول' }
    }

    // Auto-expire campaigns whose endDate has passed
    await db.discountCampaign.updateMany({
      where: {
        status: { in: ['ACTIVE', 'SCHEDULED'] },
        endDate: { not: null, lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    })

    // Auto-activate scheduled campaigns whose startDate has passed
    await db.discountCampaign.updateMany({
      where: {
        status: 'SCHEDULED',
        startDate: { lte: new Date() },
        OR: [
          { endDate: null },
          { endDate: { gt: new Date() } },
        ],
      },
      data: { status: 'ACTIVE' },
    })

    const campaigns = await db.discountCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { products: true } },
        collection: { select: { id: true, name: true, nameEn: true } },
        category: { select: { id: true, name: true, nameEn: true } },
      },
    })

    return { success: true, data: campaigns }
  } catch (error) {
    console.error('getAllDiscountCampaigns error:', error)
    return { success: false, error: 'حدث خطأ' }
  }
}

/**
 * Get a single discount campaign by ID with its products
 */
export async function getDiscountCampaign(id: string): Promise<ActionResponse<DiscountCampaignData & { products: { productId: string; product: { id: string; name: string; nameEn: string | null; image: string | null } }[] }>> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'غير مصرح بالدخول' }
    }

    const campaign = await db.discountCampaign.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true } },
        collection: { select: { id: true, name: true, nameEn: true } },
        category: { select: { id: true, name: true, nameEn: true } },
        products: {
          include: {
            product: {
              select: { id: true, name: true, nameEn: true, image: true },
            },
          },
        },
      },
    })

    if (!campaign) {
      return { success: false, error: 'حملة الخصم غير موجودة' }
    }

    return { success: true, data: campaign }
  } catch (error) {
    console.error('getDiscountCampaign error:', error)
    return { success: false, error: 'حدث خطأ' }
  }
}

/**
 * Get active discount for a specific product (used by API)
 * Returns the highest discount percentage applicable to this product
 */
export async function getActiveDiscountForProduct(productId: string, categoryId: string, collectionIds: string[]): Promise<number> {
  const now = new Date()

  const campaigns = await db.discountCampaign.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { endDate: null },
        { endDate: { gt: now } },
      ],
    },
    select: {
      discountPercent: true,
      scope: true,
      collectionId: true,
      categoryId: true,
      products: {
        where: { productId },
        select: { productId: true },
      },
    },
  })

  let maxDiscount = 0

  for (const campaign of campaigns) {
    let applies = false

    switch (campaign.scope) {
      case 'ALL_PRODUCTS':
        applies = true
        break
      case 'SPECIFIC_PRODUCTS':
        applies = campaign.products.length > 0
        break
      case 'COLLECTION':
        applies = campaign.collectionId ? collectionIds.includes(campaign.collectionId) : false
        break
      case 'CATEGORY':
        applies = campaign.categoryId === categoryId
        break
    }

    if (applies && campaign.discountPercent > maxDiscount) {
      maxDiscount = campaign.discountPercent
    }
  }

  return maxDiscount
}

/**
 * Get active discounts for multiple products at once (batch - for API performance)
 * Returns a map of productId -> discountPercent
 */
export async function getActiveDiscountsForProducts(
  products: { id: string; categoryId: string; collectionIds: string[] }[]
): Promise<Map<string, number>> {
  const now = new Date()
  const discountMap = new Map<string, number>()

  if (products.length === 0) return discountMap

  const campaigns = await db.discountCampaign.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { endDate: null },
        { endDate: { gt: now } },
      ],
    },
    select: {
      discountPercent: true,
      scope: true,
      collectionId: true,
      categoryId: true,
      products: {
        select: { productId: true },
      },
    },
  })

  if (campaigns.length === 0) return discountMap

  // Pre-process campaign product sets for efficient lookup
  const campaignProductSets = campaigns.map(c => ({
    ...c,
    productIdSet: new Set(c.products.map(p => p.productId)),
  }))

  for (const product of products) {
    let maxDiscount = 0

    for (const campaign of campaignProductSets) {
      let applies = false

      switch (campaign.scope) {
        case 'ALL_PRODUCTS':
          applies = true
          break
        case 'SPECIFIC_PRODUCTS':
          applies = campaign.productIdSet.has(product.id)
          break
        case 'COLLECTION':
          applies = campaign.collectionId ? product.collectionIds.includes(campaign.collectionId) : false
          break
        case 'CATEGORY':
          applies = campaign.categoryId === product.categoryId
          break
      }

      if (applies && campaign.discountPercent > maxDiscount) {
        maxDiscount = campaign.discountPercent
      }
    }

    if (maxDiscount > 0) {
      discountMap.set(product.id, maxDiscount)
    }
  }

  return discountMap
}
