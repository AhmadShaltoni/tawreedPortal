import { db } from '@/lib/db'

interface CampaignDiscount {
  discountPercent: number
  scope: string
  collectionId: string | null
  categoryId: string | null
  productIdSet: Set<string>
}

let cachedCampaigns: CampaignDiscount[] | null = null
let cacheTimestamp = 0
const CACHE_TTL = 30_000 // 30 seconds cache

/**
 * Fetch active discount campaigns with a short memory cache.
 * This avoids hitting the DB on every single product request.
 */
async function getActiveCampaigns(): Promise<CampaignDiscount[]> {
  const now = Date.now()
  if (cachedCampaigns && now - cacheTimestamp < CACHE_TTL) {
    return cachedCampaigns
  }

  const currentDate = new Date()

  const campaigns = await db.discountCampaign.findMany({
    where: {
      status: 'ACTIVE',
      startDate: { lte: currentDate },
      OR: [
        { endDate: null },
        { endDate: { gt: currentDate } },
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

  cachedCampaigns = campaigns.map(c => ({
    discountPercent: c.discountPercent,
    scope: c.scope,
    collectionId: c.collectionId,
    categoryId: c.categoryId,
    productIdSet: new Set(c.products.map(p => p.productId)),
  }))
  cacheTimestamp = now

  return cachedCampaigns
}

/**
 * Calculate the best discount percentage for a given product.
 */
export async function calcProductDiscount(
  productId: string,
  categoryId: string,
  collectionIds: string[]
): Promise<number> {
  const campaigns = await getActiveCampaigns()
  if (campaigns.length === 0) return 0

  let maxDiscount = 0

  for (const campaign of campaigns) {
    let applies = false

    switch (campaign.scope) {
      case 'ALL_PRODUCTS':
        applies = true
        break
      case 'SPECIFIC_PRODUCTS':
        applies = campaign.productIdSet.has(productId)
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
 * Calculate discounts for multiple products at once (batch operation).
 * Returns Map<productId, discountPercent>
 */
export async function calcProductDiscounts(
  products: { id: string; categoryId: string; collectionIds: string[] }[]
): Promise<Map<string, number>> {
  const discountMap = new Map<string, number>()
  if (products.length === 0) return discountMap

  const campaigns = await getActiveCampaigns()
  if (campaigns.length === 0) return discountMap

  for (const product of products) {
    let maxDiscount = 0

    for (const campaign of campaigns) {
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

/**
 * Apply discount to a price value
 */
export function applyDiscount(price: number, discountPercent: number): number {
  if (discountPercent <= 0) return price
  return Math.round((price * (1 - discountPercent / 100)) * 100) / 100
}

/**
 * Invalidate the campaign cache (call after admin changes)
 */
export function invalidateDiscountCache() {
  cachedCampaigns = null
  cacheTimestamp = 0
}
