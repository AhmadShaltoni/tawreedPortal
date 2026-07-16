import { db } from '@/lib/db'
import { calcProductDiscounts, applyDiscount } from '@/lib/discount-engine'
import { findDiscountCode, validateDiscountCodeForUser, type DiscountCodeWithScope } from '@/lib/discount-codes'
import { calculateDeliveryFee } from '@/actions/delivery'
import type { RedeemedReward } from '@prisma/client'

/**
 * Shared order pricing engine.
 *
 * Computes item pricing (with campaign discounts), an optional discount code,
 * an optional loyalty reward coupon, and the delivery fee from an explicit list
 * of desired items (each referencing live variant / option / unit ids).
 *
 * Used by the order-edit flow: a rough estimate when the buyer submits an edit
 * request, and the authoritative recompute when an admin approves it. It mirrors
 * the calculations in `POST /api/v1/orders` so an edited order is priced exactly
 * like a freshly created one.
 */

export class OrderPricingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OrderPricingError'
  }
}

/** A single desired line — same identifiers as a CartItem. */
export interface DesiredItem {
  variantId: string
  variantOptionId?: string | null
  productUnitId?: string | null
  quantity: number
  note?: string | null
}

/** A priced line, ready to be stored as an OrderItem (plus ids kept for diffing). */
export interface PricedItem {
  // OrderItem snapshot fields
  productId: string
  productName: string
  productNameEn: string | null
  productImage: string | null
  variantSize: string
  variantSizeEn: string | null
  variantOptionName: string | null
  variantOptionNameEn: string | null
  quantity: number
  unit: string
  pricePerUnit: number
  totalPrice: number
  originalPricePerUnit: number | null
  discountPercent: number | null
  piecesPerUnit: number
  unitLabel: string | null
  unitLabelEn: string | null
  note: string | null
  // Kept for stock adjustment + diffing (not stored on OrderItem)
  variantId: string
  variantOptionId: string | null
  productUnitId: string | null
}

export interface PriceOrderResult {
  items: PricedItem[]
  /** Sum of line totals after campaign discounts, before code / loyalty. */
  itemsSubtotal: number
  discountCodeAmount: number
  discountCode: DiscountCodeWithScope | null
  loyaltyDiscountAmount: number
  freeDelivery: boolean
  deliveryFee: number
  /** Products total after all discounts — matches Order.totalPrice (delivery stored separately). */
  productsTotal: number
}

export interface PriceOrderInput {
  items: DesiredItem[]
  userId: string
  userPhone?: string | null
  deliveryCityId?: string | null
  /** Discount code string to (re)apply. */
  couponCode?: string | null
  /** Already-fetched loyalty coupon to (re)apply (kept from the original order). */
  loyaltyCoupon?: RedeemedReward | null
  /** When true, throws if any line lacks stock. */
  checkStock?: boolean
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Price a set of desired items. Throws OrderPricingError on any validation
 * failure (inactive product/variant/option, missing unit, insufficient stock,
 * or a coupon that no longer qualifies).
 */
export async function priceOrderItems(input: PriceOrderInput): Promise<PriceOrderResult> {
  const { items, userId, userPhone, deliveryCityId, couponCode, loyaltyCoupon, checkStock } = input

  if (!items || items.length === 0) {
    throw new OrderPricingError('لا يمكن أن يكون الطلب فارغاً')
  }

  const variantIds = [...new Set(items.map((i) => i.variantId))]
  const variants = await db.productVariant.findMany({
    where: { id: { in: variantIds } },
    include: {
      product: { include: { collections: { select: { collectionId: true } } } },
      units: true,
      options: true,
    },
  })
  const variantMap = new Map(variants.map((v) => [v.id, v]))

  // Campaign discounts for all involved products
  const campaignDiscountMap = await calcProductDiscounts(
    variants.map((v) => ({
      id: v.product.id,
      categoryId: v.product.categoryId,
      collectionIds: v.product.collections?.map((c) => c.collectionId) || [],
    }))
  )

  const priced: PricedItem[] = []

  for (const item of items) {
    if (!item.quantity || item.quantity < 1) {
      throw new OrderPricingError('الكمية يجب أن تكون 1 أو أكثر')
    }
    const variant = variantMap.get(item.variantId)
    if (!variant) throw new OrderPricingError('أحد المنتجات لم يعد متوفراً')
    if (!variant.product.isActive) {
      throw new OrderPricingError(`المنتج "${variant.product.name}" لم يعد متوفراً`)
    }
    if (!variant.isActive) {
      throw new OrderPricingError(`الحجم "${variant.size}" لم يعد متوفراً`)
    }

    // Resolve unit (specific or default)
    const unit = item.productUnitId
      ? variant.units.find((u) => u.id === item.productUnitId)
      : variant.units.find((u) => u.isDefault) ?? variant.units[0]
    if (item.productUnitId && !unit) {
      throw new OrderPricingError(`وحدة البيع المختارة لـ "${variant.product.name}" لم تعد متوفرة`)
    }

    // Resolve option (flavor/color) when applicable
    const option = item.variantOptionId
      ? variant.options.find((o) => o.id === item.variantOptionId)
      : null
    if (item.variantOptionId && (!option || !option.isActive)) {
      throw new OrderPricingError(`الخيار المختار لـ "${variant.product.name} - ${variant.size}" لم يعد متوفراً`)
    }
    // If the variant has active options, one must be selected
    const activeOptions = variant.options.filter((o) => o.isActive)
    if (!option && activeOptions.length > 0) {
      throw new OrderPricingError(`يرجى اختيار أحد الخيارات لـ "${variant.product.name} - ${variant.size}"`)
    }

    // Stock check (option-level if option selected, else variant-level)
    if (checkStock) {
      const available = option ? option.stock : variant.stock
      if (available < item.quantity) {
        throw new OrderPricingError(
          `الكمية غير متوفرة لـ "${variant.product.name} - ${variant.size}". المتوفر: ${available}`
        )
      }
    }

    const originalUnitPrice = option?.priceOverride ?? unit?.price ?? 0
    const campaignDiscount = campaignDiscountMap.get(variant.product.id) || 0
    const effectivePrice = campaignDiscount > 0 ? applyDiscount(originalUnitPrice, campaignDiscount) : originalUnitPrice

    priced.push({
      productId: variant.product.id,
      productName: variant.product.name,
      productNameEn: variant.product.nameEn,
      productImage: variant.product.image,
      variantSize: variant.size,
      variantSizeEn: variant.sizeEn,
      variantOptionName: option?.name ?? null,
      variantOptionNameEn: option?.nameEn ?? null,
      quantity: item.quantity,
      unit: unit?.unit ?? 'PIECE',
      pricePerUnit: effectivePrice,
      totalPrice: round2(effectivePrice * item.quantity),
      originalPricePerUnit: campaignDiscount > 0 ? originalUnitPrice : null,
      discountPercent: campaignDiscount > 0 ? campaignDiscount : null,
      piecesPerUnit: unit?.piecesPerUnit ?? 1,
      unitLabel: unit?.label ?? null,
      unitLabelEn: unit?.labelEn ?? null,
      note: item.note?.trim() || null,
      variantId: variant.id,
      variantOptionId: option?.id ?? null,
      productUnitId: unit?.id ?? null,
    })
  }

  const itemsSubtotal = round2(priced.reduce((sum, p) => sum + p.pricePerUnit * p.quantity, 0))

  // Discount code (re)validation
  let discountCode: DiscountCodeWithScope | null = null
  let discountCodeAmount = 0
  let runningTotal = itemsSubtotal

  if (couponCode) {
    discountCode = await findDiscountCode(couponCode)
    if (!discountCode) {
      throw new OrderPricingError(`كود الخصم "${couponCode}" لم يعد صالحاً`)
    }
    const result = await validateDiscountCodeForUser(discountCode, {
      userId,
      userPhone: userPhone ?? '',
      orderTotal: itemsSubtotal,
      cartLines: priced.map((p) => ({
        productId: p.productId,
        // categoryId is needed for scoped codes; look it up from the variant map
        categoryId: variantMap.get(p.variantId)?.product.categoryId ?? '',
        lineTotal: round2(p.pricePerUnit * p.quantity),
      })),
      hasLoyaltyCoupon: !!loyaltyCoupon,
    })
    if (!result.ok) {
      throw new OrderPricingError(`كود الخصم لم يعد ينطبق بعد التعديل: ${result.message}`)
    }
    discountCodeAmount = result.discountAmount
    runningTotal = round2(itemsSubtotal - discountCodeAmount)
  }

  // Loyalty reward coupon (re)application
  let loyaltyDiscountAmount = 0
  const freeDelivery = loyaltyCoupon?.rewardType === 'FREE_DELIVERY'

  if (loyaltyCoupon) {
    if (loyaltyCoupon.minOrderValue && itemsSubtotal < loyaltyCoupon.minOrderValue) {
      throw new OrderPricingError(
        `الحد الأدنى لمبلغ الطلب لاستخدام المكافأة هو ${loyaltyCoupon.minOrderValue} د.أ`
      )
    }
    if (loyaltyCoupon.rewardType === 'FIXED_DISCOUNT') {
      loyaltyDiscountAmount = loyaltyCoupon.discountValue || 0
    } else if (loyaltyCoupon.rewardType === 'PERCENTAGE_DISCOUNT') {
      loyaltyDiscountAmount = (runningTotal * (loyaltyCoupon.discountValue || 0)) / 100
      if (loyaltyCoupon.maxDiscountCap && loyaltyDiscountAmount > loyaltyCoupon.maxDiscountCap) {
        loyaltyDiscountAmount = loyaltyCoupon.maxDiscountCap
      }
    }
    loyaltyDiscountAmount = Math.min(round2(loyaltyDiscountAmount), runningTotal)
    runningTotal = round2(runningTotal - loyaltyDiscountAmount)
  }

  const productsTotal = runningTotal

  // Delivery fee
  let deliveryFee = 0
  if (deliveryCityId && !freeDelivery) {
    const deliveryResult = await calculateDeliveryFee(deliveryCityId, productsTotal)
    if (deliveryResult.error) {
      throw new OrderPricingError(deliveryResult.error)
    }
    deliveryFee = deliveryResult.fee
  }

  return {
    items: priced,
    itemsSubtotal,
    discountCodeAmount,
    discountCode,
    loyaltyDiscountAmount,
    freeDelivery,
    deliveryFee,
    productsTotal,
  }
}
