'use server'

import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import type { ProductInsightRow, SalesMarketingInsights } from '@/types'

// Tuning knobs for the insights heuristics (JOD / percentages).
const LOW_STOCK_THRESHOLD = 10        // stock at or below this is flagged "low"
const MARGIN_FLOOR_AFTER_OFFER = 10   // discount headroom keeps at least this margin %
// Offer Score weights (must sum to 1). The absolute dinar profit is weighted
// higher than the margin %: a big spread on a modest % beats a tiny spread on a
// high % — but both still count (geometric mean, so either at 0 ⇒ score 0).
const OFFER_SCORE_PROFIT_WEIGHT = 0.6
const OFFER_SCORE_MARGIN_WEIGHT = 0.4

// Largest discount % we can apply to `price` while keeping the resulting margin
// at/above `floor` %, given `cost`. Returns 0 when there is no room.
// newMargin = (price(1−d) − cost) / (price(1−d)) ≥ floor  ⇒  d ≤ 1 − cost/((1−floor)·price)
function maxDiscountKeepingMargin(price: number, cost: number, floorPercent: number): number {
  if (price <= 0) return 0
  const floor = floorPercent / 100
  const d = 1 - cost / ((1 - floor) * price)
  return Math.max(0, Math.round(d * 100))
}

type CatalogUnit = { unit: string; label: string; price: number; wholesalePrice: number | null; compareAtPrice: number | null; isDefault: boolean; sortOrder: number }
type CatalogVariant = { isDefault: boolean; isActive: boolean; stock: number; sortOrder: number; options: { stock: number; isActive: boolean }[]; units: CatalogUnit[] }

// Pick the unit whose price best represents the product card: the default unit of
// the default (or first active) variant, falling back to lowest sortOrder.
function pickRepresentativeUnit(variants: CatalogVariant[]): CatalogUnit | null {
  const activeVariants = variants.filter((v) => v.isActive)
  const variant =
    activeVariants.find((v) => v.isDefault) ?? activeVariants[0] ?? variants[0]
  if (!variant || variant.units.length === 0) return null
  const units = [...variant.units].sort((a, b) => a.sortOrder - b.sortOrder)
  return units.find((u) => u.isDefault) ?? units[0]
}

// Total sellable stock across active variants (sum option stock when a variant
// tracks stock per option, otherwise the variant's own stock).
function totalStock(variants: CatalogVariant[]): number {
  let stock = 0
  for (const v of variants) {
    if (!v.isActive) continue
    const activeOptions = v.options.filter((o) => o.isActive)
    stock += activeOptions.length > 0
      ? activeOptions.reduce((s, o) => s + o.stock, 0)
      : v.stock
  }
  return stock
}

/**
 * Aggregates catalog pricing and delivered-sales performance into a single
 * per-product dataset that powers the Sales & Marketing insights hub:
 * most-profitable / best-selling products, margins, and offer opportunities.
 * Read-only. Sales metrics are scoped to `from`/`to` (DELIVERED orders only);
 * catalog margins reflect current prices.
 */
export async function getSalesMarketingInsights(options?: {
  from?: string
  to?: string
}): Promise<SalesMarketingInsights> {
  const { authorized, error } = await requirePermission('revenue')
  if (!authorized) throw new Error(error ?? 'Not authorized')

  const now = new Date()

  const orderWhere: Record<string, unknown> = { status: 'DELIVERED' }
  if (options?.from || options?.to) {
    const createdAt: Record<string, Date> = {}
    if (options.from) createdAt.gte = new Date(options.from)
    if (options.to) {
      const to = new Date(options.to)
      to.setHours(23, 59, 59, 999)
      createdAt.lte = to
    }
    orderWhere.createdAt = createdAt
  }

  const [products, soldItems, activeCampaigns] = await Promise.all([
    // 1. Active catalog with pricing + inventory
    db.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        image: true,
        categoryId: true,
        category: { select: { name: true } },
        variants: {
          select: {
            isDefault: true,
            isActive: true,
            stock: true,
            sortOrder: true,
            options: { select: { stock: true, isActive: true } },
            units: {
              select: {
                unit: true,
                label: true,
                price: true,
                wholesalePrice: true,
                compareAtPrice: true,
                isDefault: true,
                sortOrder: true,
              },
            },
          },
        },
      },
    }),
    // 2. Delivered sale lines in range (with per-line wholesale for realized profit)
    db.orderItem.findMany({
      where: { isReward: false, productId: { not: null }, order: orderWhere },
      select: {
        productId: true,
        orderId: true,
        unit: true,
        quantity: true,
        pricePerUnit: true,
        totalPrice: true,
        product: {
          select: {
            variants: { select: { units: { select: { unit: true, wholesalePrice: true } } } },
          },
        },
      },
    }),
    // 3. Currently-active discount campaigns (to flag products already on offer)
    db.discountCampaign.findMany({
      where: {
        status: 'ACTIVE',
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      select: { scope: true, categoryId: true, products: { select: { productId: true } } },
    }),
  ])

  // Which products are already discounted by an active campaign?
  let allProductsOnOffer = false
  const offerProductIds = new Set<string>()
  const offerCategoryIds = new Set<string>()
  for (const c of activeCampaigns) {
    if (c.scope === 'ALL_PRODUCTS') allProductsOnOffer = true
    else if (c.scope === 'CATEGORY' && c.categoryId) offerCategoryIds.add(c.categoryId)
    else for (const p of c.products) offerProductIds.add(p.productId)
  }

  // Aggregate delivered sales per product
  type SalesAgg = { quantity: number; revenue: number; profit: number; orders: Set<string> }
  const salesByProduct = new Map<string, SalesAgg>()
  const allOrderIds = new Set<string>()
  for (const item of soldItems) {
    if (!item.productId) continue
    allOrderIds.add(item.orderId)
    // realized profit: (price − wholesale) × qty, only when cost is known
    let wholesale: number | null = null
    for (const v of item.product?.variants ?? []) {
      for (const pu of v.units) if (pu.unit === item.unit) wholesale = pu.wholesalePrice
    }
    const revenue = item.totalPrice ?? item.pricePerUnit * item.quantity
    const profit = wholesale != null && wholesale > 0 ? (item.pricePerUnit - wholesale) * item.quantity : 0
    const agg = salesByProduct.get(item.productId)
    if (agg) {
      agg.quantity += item.quantity
      agg.revenue += revenue
      agg.profit += profit
      agg.orders.add(item.orderId)
    } else {
      salesByProduct.set(item.productId, {
        quantity: item.quantity,
        revenue,
        profit,
        orders: new Set([item.orderId]),
      })
    }
  }

  const rows: ProductInsightRow[] = []
  let marginSum = 0
  let marginCount = 0

  for (const p of products) {
    const unit = pickRepresentativeUnit(p.variants as CatalogVariant[])
    const sellingPrice = unit?.price ?? null
    const wholesalePrice = unit?.wholesalePrice ?? null
    const hasCostData = wholesalePrice != null && wholesalePrice > 0 && sellingPrice != null && sellingPrice > 0

    const marginPercent = hasCostData ? ((sellingPrice! - wholesalePrice!) / sellingPrice!) * 100 : null
    const profitPerUnit = hasCostData ? sellingPrice! - wholesalePrice! : null
    const maxDiscountPercent = hasCostData
      ? maxDiscountKeepingMargin(sellingPrice!, wholesalePrice!, MARGIN_FLOOR_AFTER_OFFER)
      : null

    if (marginPercent != null) {
      marginSum += marginPercent
      marginCount += 1
    }

    const stock = totalStock(p.variants as CatalogVariant[])
    const onOffer =
      allProductsOnOffer ||
      offerProductIds.has(p.id) ||
      (p.categoryId ? offerCategoryIds.has(p.categoryId) : false) ||
      (unit?.compareAtPrice != null && unit.compareAtPrice > (unit.price ?? 0))

    const sales = salesByProduct.get(p.id)

    rows.push({
      productId: p.id,
      productName: p.name,
      productImage: p.image ?? null,
      categoryName: p.category?.name ?? '',
      unitLabel: unit?.label ?? null,
      sellingPrice,
      wholesalePrice,
      hasCostData,
      marginPercent,
      profitPerUnit,
      offerScore: null, // filled in a second pass below (needs catalog-wide normalization)
      maxDiscountPercent,
      stock,
      lowStock: stock <= LOW_STOCK_THRESHOLD,
      onOffer,
      quantitySold: sales?.quantity ?? 0,
      revenue: sales?.revenue ?? 0,
      soldProfit: sales?.profit ?? 0,
      orderCount: sales?.orders.size ?? 0,
    })
  }

  // Offer Score (0–100): combine BOTH the margin percentage and the absolute
  // per-unit profit (JOD) so we never rank on percentage alone. Each axis is
  // normalized against the catalog's best value, then combined with a WEIGHTED
  // geometric mean (dinar profit weighted higher). The score is high only when a
  // product is strong on BOTH axes; if either is 0, the score is 0.
  const scored = rows.filter((r) => r.hasCostData && (r.profitPerUnit ?? 0) > 0)
  const maxMargin = Math.max(1, ...scored.map((r) => r.marginPercent ?? 0))
  const maxUnitProfit = Math.max(0.0001, ...scored.map((r) => r.profitPerUnit ?? 0))
  for (const r of rows) {
    if (r.hasCostData && (r.profitPerUnit ?? 0) > 0) {
      const mNorm = Math.min((r.marginPercent ?? 0) / maxMargin, 1)
      const pNorm = Math.min((r.profitPerUnit ?? 0) / maxUnitProfit, 1)
      r.offerScore = Math.round(
        100 * Math.pow(pNorm, OFFER_SCORE_PROFIT_WEIGHT) * Math.pow(mNorm, OFFER_SCORE_MARGIN_WEIGHT),
      )
    }
  }

  // Eligible offer pool: has cost data, positive spread, in stock, not already
  // discounted. Ranking by offerScore (not a % gate) surfaces the best ones.
  const offerOpportunityCount = rows.filter(
    (r) => r.hasCostData && !r.onOffer && r.stock > 0 && (r.profitPerUnit ?? 0) > 0,
  ).length

  const summary = {
    productCount: rows.length,
    withCostData: marginCount,
    missingCostData: rows.length - marginCount,
    avgMarginPercent: marginCount > 0 ? marginSum / marginCount : 0,
    totalQuantitySold: rows.reduce((s, r) => s + r.quantitySold, 0),
    totalRevenue: rows.reduce((s, r) => s + r.revenue, 0),
    totalProfit: rows.reduce((s, r) => s + r.soldProfit, 0),
    totalOrders: allOrderIds.size,
    lowStockCount: rows.filter((r) => r.lowStock).length,
    offerOpportunityCount,
    onOfferCount: rows.filter((r) => r.onOffer).length,
  }

  return { products: rows, summary }
}
