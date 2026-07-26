import { db } from '@/lib/db'
import { hashPhone } from '@/lib/account/phone-hash'
import { calcProductDiscounts, applyDiscount } from '@/lib/discount-engine'
import type { Prisma } from '@prisma/client'

/**
 * Shared discount-code (coupon) validation used by both
 * POST /api/v1/coupons/validate and POST /api/v1/orders.
 * Keeping one implementation prevents the two paths from drifting apart.
 */

export const discountCodeInclude = {
  _count: { select: { usages: true } },
  categories: { select: { id: true } },
  products: { select: { id: true } },
} satisfies Prisma.DiscountCodeInclude

export type DiscountCodeWithScope = Prisma.DiscountCodeGetPayload<{
  include: typeof discountCodeInclude
}>

/** One cart line reduced to what discount scoping needs. */
export interface DiscountCartLine {
  productId: string
  categoryId: string
  /** Line total after campaign discounts (effective unit price × quantity). */
  lineTotal: number
}

export interface DiscountValidationInput {
  userId: string
  userPhone: string
  /** Order total after campaign discounts, before any coupon. */
  orderTotal: number
  cartLines: DiscountCartLine[]
  /** True when a loyalty reward coupon is also being applied to this order. */
  hasLoyaltyCoupon: boolean
}

export type DiscountValidationFailure = {
  ok: false
  errorCode:
    | 'CODE_NOT_FOUND'
    | 'CODE_INACTIVE'
    | 'CODE_NOT_STARTED'
    | 'CODE_EXPIRED'
    | 'CODE_USAGE_LIMIT_REACHED'
    | 'CODE_ALREADY_USED'
    | 'CODE_USER_LIMIT_REACHED'
    | 'FIRST_ORDER_ONLY'
    | 'STACKING_NOT_ALLOWED'
    | 'ORDER_BELOW_MINIMUM'
    | 'CODE_NOT_APPLICABLE'
  message: string
}

export type DiscountValidationResult =
  | {
      ok: true
      code: DiscountCodeWithScope
      /** Discount in JOD after scoping and maxDiscountCap. */
      discountAmount: number
      /** The subtotal the percentage was applied to (whole order unless scoped). */
      eligibleTotal: number
    }
  | DiscountValidationFailure

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/** Effective per-user usage limit (legacy isSingleUse flag folded in). */
export function perUserLimit(code: {
  isSingleUse: boolean
  maxUsagePerUser: number | null
}): number | null {
  if (code.isSingleUse) return 1
  return code.maxUsagePerUser
}

export async function findDiscountCode(
  rawCode: string
): Promise<DiscountCodeWithScope | null> {
  return db.discountCode.findFirst({
    where: { code: { equals: rawCode.toUpperCase(), mode: 'insensitive' } },
    include: discountCodeInclude,
  })
}

/**
 * Loads the user's cart and reduces it to discount-relevant lines,
 * applying campaign discounts so coupon math matches order creation.
 */
export async function getCartLinesForDiscount(
  userId: string
): Promise<DiscountCartLine[]> {
  const cartItems = await db.cartItem.findMany({
    where: { buyerId: userId },
    include: {
      variant: {
        include: {
          product: {
            select: {
              id: true,
              categoryId: true,
              collections: { select: { collectionId: true } },
            },
          },
        },
      },
      productUnit: { select: { price: true } },
      variantOption: { select: { priceOverride: true } },
    },
  })

  const campaignDiscountMap = await calcProductDiscounts(
    cartItems.map((item) => ({
      id: item.variant.product.id,
      categoryId: item.variant.product.categoryId,
      collectionIds: item.variant.product.collections.map((c) => c.collectionId),
    }))
  )

  return cartItems.map((item) => {
    const originalUnitPrice =
      item.variantOption?.priceOverride ?? item.productUnit?.price ?? 0
    const campaignDiscount = campaignDiscountMap.get(item.variant.product.id) || 0
    const effectivePrice =
      campaignDiscount > 0
        ? applyDiscount(originalUnitPrice, campaignDiscount)
        : originalUnitPrice
    return {
      productId: item.variant.product.id,
      categoryId: item.variant.product.categoryId,
      lineTotal: effectivePrice * item.quantity,
    }
  })
}

/**
 * Runs every business rule for a discount code. Pure checks only —
 * the caller decides how to consume the result (API response vs order error).
 */
export async function validateDiscountCodeForUser(
  code: DiscountCodeWithScope,
  input: DiscountValidationInput
): Promise<DiscountValidationResult> {
  // Restricted to a specific user: hide the code's existence from everyone else
  if (code.allowedUserId && code.allowedUserId !== input.userId) {
    return {
      ok: false,
      errorCode: 'CODE_NOT_FOUND',
      message: 'كود الخصم غير موجود',
    }
  }

  if (!code.isActive) {
    return {
      ok: false,
      errorCode: 'CODE_INACTIVE',
      message: 'كود الخصم غير مفعل',
    }
  }

  const now = new Date()
  if (code.startDate && now < code.startDate) {
    return {
      ok: false,
      errorCode: 'CODE_NOT_STARTED',
      message: 'كود الخصم لم يبدأ بعد',
    }
  }
  if (code.endDate && now > code.endDate) {
    return {
      ok: false,
      errorCode: 'CODE_EXPIRED',
      message: 'كود الخصم منتهي الصلاحية',
    }
  }

  if (code.maxUsage !== null && code._count.usages >= code.maxUsage) {
    return {
      ok: false,
      errorCode: 'CODE_USAGE_LIMIT_REACHED',
      message: 'تم الوصول للحد الأقصى لاستخدام هذا الكود',
    }
  }

  const userLimit = perUserLimit(code)
  if (userLimit !== null) {
    const usedCount = await db.discountCodeUsage.count({
      where: { discountCodeId: code.id, userId: input.userId },
    })
    if (usedCount >= userLimit) {
      return userLimit === 1
        ? {
            ok: false,
            errorCode: 'CODE_ALREADY_USED',
            message: 'لقد استخدمت هذا الكود من قبل',
          }
        : {
            ok: false,
            errorCode: 'CODE_USER_LIMIT_REACHED',
            message: `لقد استخدمت هذا الكود الحد الأقصى المسموح (${userLimit} مرات)`,
          }
    }

    // Single-use codes: also block reuse via delete + re-register with the same phone
    if (userLimit === 1) {
      const phoneHash = hashPhone(input.userPhone)
      if (phoneHash) {
        const deletedUsage = await db.deletedUserCouponUsage.findUnique({
          where: {
            phoneNumberHash_discountCodeId: {
              phoneNumberHash: phoneHash,
              discountCodeId: code.id,
            },
          },
        })
        if (deletedUsage) {
          return {
            ok: false,
            errorCode: 'CODE_ALREADY_USED',
            message: 'لقد قمت باستخدام هذا الكوبون مسبقاً.',
          }
        }
      }
    }
  }

  if (code.firstOrderOnly) {
    const previousOrders = await db.order.count({
      where: { buyerId: input.userId, status: { not: 'CANCELLED' } },
    })
    if (previousOrders > 0) {
      return {
        ok: false,
        errorCode: 'FIRST_ORDER_ONLY',
        message: 'هذا الكود صالح للطلب الأول فقط',
      }
    }
  }

  if (input.hasLoyaltyCoupon && !code.allowStacking) {
    return {
      ok: false,
      errorCode: 'STACKING_NOT_ALLOWED',
      message: 'لا يمكن دمج هذا الكود مع كوبون المكافآت',
    }
  }

  if (code.minOrderAmount !== null && input.orderTotal < code.minOrderAmount) {
    return {
      ok: false,
      errorCode: 'ORDER_BELOW_MINIMUM',
      message: `قيمة الطلب أقل من الحد الأدنى المطلوب (${code.minOrderAmount} د.أ)`,
    }
  }

  // Category/product scoping: discount applies only to eligible lines
  let eligibleTotal = input.orderTotal
  const scopedCategoryIds = new Set(code.categories.map((c) => c.id))
  const scopedProductIds = new Set(code.products.map((p) => p.id))
  if (scopedCategoryIds.size > 0 || scopedProductIds.size > 0) {
    eligibleTotal = round2(
      input.cartLines
        .filter(
          (line) =>
            scopedProductIds.has(line.productId) ||
            scopedCategoryIds.has(line.categoryId)
        )
        .reduce((sum, line) => sum + line.lineTotal, 0)
    )
    if (eligibleTotal <= 0) {
      return {
        ok: false,
        errorCode: 'CODE_NOT_APPLICABLE',
        message: 'هذا الكود لا ينطبق على منتجات سلتك الحالية',
      }
    }
  }

  let discountAmount = round2((eligibleTotal * code.discountPercent) / 100)
  if (code.maxDiscountCap !== null && discountAmount > code.maxDiscountCap) {
    discountAmount = round2(code.maxDiscountCap)
  }
  discountAmount = Math.min(discountAmount, input.orderTotal)

  return { ok: true, code, discountAmount, eligibleTotal }
}

/**
 * Serializes usage recording for a code and re-verifies limits inside the
 * order transaction, closing the race where two concurrent checkouts both
 * pass the pre-transaction checks. Throws Error with an Arabic message on
 * violation (caller maps it to a 400).
 */
export async function recordDiscountUsageInTx(
  tx: Prisma.TransactionClient,
  params: {
    code: Pick<
      DiscountCodeWithScope,
      'id' | 'isSingleUse' | 'maxUsagePerUser' | 'maxUsage' | 'firstOrderOnly'
    >
    userId: string
    orderId: string
    discountAmount: number
    orderTotal: number
  }
): Promise<void> {
  const { code, userId, orderId, discountAmount, orderTotal } = params

  // Row lock on the code: concurrent orders using the same code queue up here,
  // so the counts below are race-free.
  await tx.$queryRaw`SELECT id FROM "DiscountCode" WHERE id = ${code.id} FOR UPDATE`

  // Re-verify first-order-only under the lock (excluding the order we just
  // created) so two concurrent "first" orders can't both consume the code.
  if (code.firstOrderOnly) {
    const priorOrders = await tx.order.count({
      where: { buyerId: userId, status: { not: 'CANCELLED' }, id: { not: orderId } },
    })
    if (priorOrders > 0) {
      throw new Error('هذا الكود صالح للطلب الأول فقط')
    }
  }

  if (code.maxUsage !== null) {
    const totalUsages = await tx.discountCodeUsage.count({
      where: { discountCodeId: code.id },
    })
    if (totalUsages >= code.maxUsage) {
      throw new Error('تم الوصول للحد الأقصى لاستخدام هذا الكود')
    }
  }

  const userLimit = perUserLimit(code)
  if (userLimit !== null) {
    const userUsages = await tx.discountCodeUsage.count({
      where: { discountCodeId: code.id, userId },
    })
    if (userUsages >= userLimit) {
      throw new Error(
        userLimit === 1
          ? 'لقد استخدمت هذا الكود من قبل'
          : `لقد استخدمت هذا الكود الحد الأقصى المسموح (${userLimit} مرات)`
      )
    }
  }

  await tx.discountCodeUsage.create({
    data: {
      discountCodeId: code.id,
      userId,
      orderId,
      discountAmount,
      orderTotal,
    },
  })
}
