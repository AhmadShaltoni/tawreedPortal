import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { createOrderFromCartSchema } from '@/lib/validations'
import { sendPushToRole } from '@/lib/push-notifications'
import { calculateDeliveryFee } from '@/actions/delivery'
import { calcProductDiscounts, applyDiscount } from '@/lib/discount-engine'
import { awardOrderPoints } from '@/actions/loyalty-points'
import {
  findDiscountCode,
  validateDiscountCodeForUser,
  recordDiscountUsageInTx,
  type DiscountCodeWithScope,
} from '@/lib/discount-codes'
import type { RedeemedReward } from '@prisma/client'

class OrderValidationError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'OrderValidationError'
    this.status = status
  }
}

function describeCartItem(item: {
  variant: { size: string; product: { name: string } }
  variantOption?: { name: string } | null
}) {
  return item.variantOption
    ? `${item.variant.product.name} - ${item.variant.size} - ${item.variantOption.name}`
    : `${item.variant.product.name} - ${item.variant.size}`
}

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

// GET /api/v1/orders - Get buyer's orders with full details
export async function GET(request: NextRequest) {
  const { user, error } = await authenticateApiRequest(request)
  if (!user) return apiError(error ?? 'Unauthorized', 401)

  const { searchParams } = new URL(request.url)
  const page = Number(searchParams.get('page')) || 1
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 100)

  const where = { buyerId: user.id }

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      include: {
        items: {
          include: { product: { select: { id: true, name: true, nameEn: true, image: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.order.count({ where }),
  ])

  return apiResponse({
    orders: orders.map(order => {
      const formattedItems = order.items.map((item) => ({
        id: item.id,
        product: item.product,
        // Size (variant) selected at order time
        selectedSize: {
          size: item.variantSize,
          sizeEn: item.variantSizeEn,
        },
        // Flavor (option) selected at order time - if any
        selectedFlavor: item.variantOptionName ? {
          name: item.variantOptionName,
          nameEn: item.variantOptionNameEn,
        } : null,
        // Selling unit selected at order time
        selectedUnit: {
          label: item.unitLabel,
          labelEn: item.unitLabelEn,
          piecesPerUnit: item.piecesPerUnit,
        },
        quantity: item.quantity,
        note: item.note || null,
        isReward: item.isReward,
      }))
      return {
        ...order,
        items: formattedItems,
        deliveryAddressDetails: (order as { deliveryAddressDetails?: string | null }).deliveryAddressDetails ?? null,
        buyerNotes: order.buyerNotes,
        notes: order.buyerNotes,
        statusHistory: order.statusHistory,
      }
    }),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
}

// POST /api/v1/orders - Create order from cart
export async function POST(request: NextRequest) {
  const { user, error } = await authenticateApiRequest(request)
  if (!user) return apiError(error ?? 'Unauthorized', 401)

  const body = await request.json()
  const validated = createOrderFromCartSchema.safeParse(body)
  if (!validated.success) {
    return apiResponse({ error: 'Validation failed', errors: validated.error.flatten().fieldErrors }, 400)
  }

  // Get cart items
  const cartItems = await db.cartItem.findMany({
    where: { buyerId: user.id },
    include: {
      variant: {
        include: {
          product: {
            include: {
              collections: { select: { collectionId: true } },
            },
          },
          options: { where: { isActive: true }, select: { id: true } },
        },
      },
      productUnit: true,
      variantOption: true,
    },
  })

  if (cartItems.length === 0) {
    return apiError('Cart is empty', 400)
  }

  // Verify stock for all items
  for (const item of cartItems) {
    if (!item.variant.product.isActive) {
      return apiError(`Product "${item.variant.product.name}" is no longer available`, 400)
    }
    if (!item.variant.isActive) {
      return apiError(`Variant "${item.variant.size}" is no longer available`, 400)
    }
    if (item.productUnit && item.productUnit.variantId !== item.variantId) {
      return apiError(`Invalid cart item unit for "${describeCartItem(item)}"`, 400)
    }
    if (item.variantOptionId && !item.variantOption) {
      return apiError(`Selected option for "${item.variant.product.name} - ${item.variant.size}" is no longer available`, 400)
    }
    if (!item.variantOption && item.variant.options.length > 0) {
      return apiError(`Please select an option for "${item.variant.product.name} - ${item.variant.size}"`, 400)
    }
    // Check stock: option-level if option selected, otherwise variant-level
    if (item.variantOption) {
      if (item.variantOption.variantId !== item.variantId || !item.variantOption.isActive) {
        return apiError(`Option "${item.variantOption.name}" is no longer available for "${item.variant.product.name} - ${item.variant.size}"`, 400)
      }
      if (item.variantOption.stock < item.quantity) {
        return apiError(`Insufficient stock for "${describeCartItem(item)}". Available: ${item.variantOption.stock}`, 400)
      }
    } else {
      if (item.variant.stock < item.quantity) {
        return apiError(`Insufficient stock for "${describeCartItem(item)}". Available: ${item.variant.stock}`, 400)
      }
    }
  }

  // Calculate campaign discounts for all products in cart
  const campaignDiscountMap = await calcProductDiscounts(
    cartItems.map(item => ({
      id: item.variant.product.id,
      categoryId: item.variant.product.categoryId,
      collectionIds: item.variant.product.collections?.map((c: { collectionId: string }) => c.collectionId) || [],
    }))
  )

  // Calculate total (using option priceOverride if set, otherwise unit price) with campaign discounts applied
  const totalPrice = cartItems.reduce((sum, item) => {
    const originalUnitPrice = item.variantOption?.priceOverride ?? item.productUnit?.price ?? 0
    const campaignDiscount = campaignDiscountMap.get(item.variant.product.id) || 0
    const effectivePrice = campaignDiscount > 0 ? applyDiscount(originalUnitPrice, campaignDiscount) : originalUnitPrice
    return sum + effectivePrice * item.quantity
  }, 0)

  // Validate coupon code if provided (shared logic with /api/v1/coupons/validate)
  let discountCode: DiscountCodeWithScope | null = null
  let discountAmount = 0
  let finalPrice = totalPrice

  if (validated.data.couponCode) {
    discountCode = await findDiscountCode(validated.data.couponCode)
    if (!discountCode) {
      return apiError('كود الخصم غير موجود', 400)
    }

    const couponResult = await validateDiscountCodeForUser(discountCode, {
      userId: user.id,
      userPhone: user.phone,
      orderTotal: totalPrice,
      cartLines: cartItems.map((item) => {
        const originalUnitPrice = item.variantOption?.priceOverride ?? item.productUnit?.price ?? 0
        const campaignDiscount = campaignDiscountMap.get(item.variant.product.id) || 0
        const effectivePrice = campaignDiscount > 0 ? applyDiscount(originalUnitPrice, campaignDiscount) : originalUnitPrice
        return {
          productId: item.variant.product.id,
          categoryId: item.variant.product.categoryId,
          lineTotal: effectivePrice * item.quantity,
        }
      }),
      hasLoyaltyCoupon: !!validated.data.loyaltyCouponCode,
    })

    if (!couponResult.ok) {
      return apiError(couponResult.message, 400)
    }

    discountAmount = couponResult.discountAmount
    finalPrice = Math.round((totalPrice - discountAmount) * 100) / 100
  }

  // Validate loyalty reward coupon (redeemed reward) if provided
  let loyaltyCoupon: RedeemedReward | null = null
  let loyaltyDiscountAmount = 0

  if (validated.data.loyaltyCouponCode) {
    const loyaltyCode = validated.data.loyaltyCouponCode.trim().toUpperCase()

    loyaltyCoupon = await db.redeemedReward.findUnique({
      where: { couponCode: loyaltyCode },
    })

    if (!loyaltyCoupon) {
      return apiError('كوبون المكافأة غير موجود', 400)
    }
    if (loyaltyCoupon.userId !== user.id) {
      return apiError('هذا الكوبون لا ينتمي إليك', 400)
    }
    if (loyaltyCoupon.isUsed || loyaltyCoupon.usedAt) {
      return apiError('تم استخدام هذا الكوبون بالفعل', 400)
    }
    if (new Date() > loyaltyCoupon.expiresAt) {
      return apiError('انتهت صلاحية هذا الكوبون', 400)
    }
    if (loyaltyCoupon.minOrderValue && totalPrice < loyaltyCoupon.minOrderValue) {
      return apiError(`الحد الأدنى لمبلغ الطلب لاستخدام المكافأة هو ${loyaltyCoupon.minOrderValue} د.أ`, 400)
    }

    // Apply discount-type rewards on the running total (after discount code, if any)
    if (loyaltyCoupon.rewardType === 'FIXED_DISCOUNT') {
      loyaltyDiscountAmount = loyaltyCoupon.discountValue || 0
    } else if (loyaltyCoupon.rewardType === 'PERCENTAGE_DISCOUNT') {
      loyaltyDiscountAmount = (finalPrice * (loyaltyCoupon.discountValue || 0)) / 100
      if (loyaltyCoupon.maxDiscountCap && loyaltyDiscountAmount > loyaltyCoupon.maxDiscountCap) {
        loyaltyDiscountAmount = loyaltyCoupon.maxDiscountCap
      }
    }
    // FREE_DELIVERY handled below (deliveryFee = 0), FREE_PRODUCT adds a prize item at 0

    loyaltyDiscountAmount = Math.min(Math.round(loyaltyDiscountAmount * 100) / 100, finalPrice)
    finalPrice = Math.round((finalPrice - loyaltyDiscountAmount) * 100) / 100
  }

  // Calculate delivery fee if cityId provided
  let deliveryFee = 0
  let deliveryPromotionId: string | null = null
  const deliveryCityId = validated.data.deliveryCityId || null
  const freeDeliveryReward = loyaltyCoupon?.rewardType === 'FREE_DELIVERY'

  if (deliveryCityId && !freeDeliveryReward) {
    const deliveryResult = await calculateDeliveryFee(deliveryCityId, finalPrice)
    if (deliveryResult.error) {
      return apiError(deliveryResult.error, 400)
    }
    deliveryFee = deliveryResult.fee
    deliveryPromotionId = deliveryResult.promotionId

    // Increment promotion usage if applicable
    if (deliveryPromotionId) {
      await db.deliveryPromotion.update({
        where: { id: deliveryPromotionId },
        data: { usageCount: { increment: 1 } },
      })
    }
  }

  // Create order in transaction
  let order
  try {
    const normalizedNotes = (validated.data.buyerNotes ?? validated.data.notes ?? '').trim() || null
    const normalizedAddressDetails = (validated.data.deliveryAddressDetails ?? '').trim() || null

    // Build itemNotes map: cartItemId -> note (from request body or cart item)
    const itemNotesMap = new Map<string, string>()
    if (validated.data.itemNotes) {
      for (const { cartItemId, note } of validated.data.itemNotes) {
        if (note?.trim()) itemNotesMap.set(cartItemId, note.trim())
      }
    }
    // Fallback: use note stored in cart item if not overridden
    for (const item of cartItems) {
      if (!itemNotesMap.has(item.id) && item.note?.trim()) {
        itemNotesMap.set(item.id, item.note.trim())
      }
    }

    order = await db.$transaction(async (tx) => {
      // Decrease stock atomically before creating the order. This prevents
      // another checkout from consuming the same stock between verification and save.
      for (const item of cartItems) {
        if (item.variantOptionId) {
          const updated = await tx.variantOption.updateMany({
            where: {
              id: item.variantOptionId,
              variantId: item.variantId,
              isActive: true,
              stock: { gte: item.quantity },
            },
            data: { stock: { decrement: item.quantity } },
          })

          if (updated.count !== 1) {
            const current = await tx.variantOption.findUnique({
              where: { id: item.variantOptionId },
              select: { stock: true },
            })
            throw new OrderValidationError(`Insufficient stock for "${describeCartItem(item)}". Available: ${current?.stock ?? 0}`)
          }
        } else {
          const updated = await tx.productVariant.updateMany({
            where: {
              id: item.variantId,
              isActive: true,
              product: { isActive: true },
              stock: { gte: item.quantity },
            },
            data: { stock: { decrement: item.quantity } },
          })

          if (updated.count !== 1) {
            const current = await tx.productVariant.findUnique({
              where: { id: item.variantId },
              select: { stock: true },
            })
            throw new OrderValidationError(`Insufficient stock for "${describeCartItem(item)}". Available: ${current?.stock ?? 0}`)
          }
        }
      }

      // Atomically consume the loyalty coupon (guards against double-use races)
      if (loyaltyCoupon) {
        const consumed = await tx.redeemedReward.updateMany({
          where: { id: loyaltyCoupon.id, isUsed: false, usedAt: null },
          data: { isUsed: true, usedAt: new Date() },
        })
        if (consumed.count !== 1) {
          throw new OrderValidationError('تم استخدام هذا الكوبون بالفعل')
        }
      }

      // Prize item from FREE_PRODUCT reward (value 0)
      const prizeItems = loyaltyCoupon?.rewardType === 'FREE_PRODUCT'
        ? [{
            productId: loyaltyCoupon.productId,
            productName: loyaltyCoupon.productName ?? 'جائزة مكافآت توريد',
            productNameEn: loyaltyCoupon.productNameEn ?? 'Tawreed rewards prize',
            productImage: loyaltyCoupon.productImage,
            quantity: 1,
            unit: 'PIECE',
            pricePerUnit: 0,
            totalPrice: 0,
            piecesPerUnit: 1,
            unitLabel: 'جائزة 🎁',
            unitLabelEn: 'Prize 🎁',
            isReward: true,
          }]
        : []

      // Create order
      const newOrder = await tx.order.create({
        data: {
          totalPrice: finalPrice,
          deliveryFee,
          redeemedRewardId: loyaltyCoupon?.id ?? null,
          deliveryAddress: validated.data.deliveryAddress,
          deliveryAddressDetails: normalizedAddressDetails,
          deliveryCity: validated.data.deliveryCity,
          deliveryCityId: deliveryCityId,
          deliveryAreaId: validated.data.deliveryAreaId || null,
          deliveryPromotionId,
          buyerNotes: normalizedNotes,
          buyerId: user.id,
          status: 'PENDING',
          statusHistory: [
            { status: 'PENDING', timestamp: new Date().toISOString(), note: null },
          ],
          items: {
            create: [...prizeItems, ...cartItems.map((item) => {
              const originalUnitPrice = item.variantOption?.priceOverride ?? item.productUnit?.price ?? 0
              const campaignDiscount = campaignDiscountMap.get(item.variant.product.id) || 0
              const effectivePrice = campaignDiscount > 0 ? applyDiscount(originalUnitPrice, campaignDiscount) : originalUnitPrice
              const unit = item.productUnit?.unit ?? 'PIECE'
              const piecesPerUnit = item.productUnit?.piecesPerUnit ?? 1
              const unitLabel = item.productUnit?.label ?? null
              const unitLabelEn = item.productUnit?.labelEn ?? null
              return {
                productId: item.variant.product.id,
                productName: item.variant.product.name,
                productNameEn: item.variant.product.nameEn,
                productImage: item.variant.product.image,
                variantSize: item.variant.size,
                variantSizeEn: item.variant.sizeEn,
                variantOptionName: item.variantOption?.name ?? null,
                variantOptionNameEn: item.variantOption?.nameEn ?? null,
                quantity: item.quantity,
                unit,
                pricePerUnit: effectivePrice,
                totalPrice: Math.round(effectivePrice * item.quantity * 100) / 100,
                originalPricePerUnit: campaignDiscount > 0 ? originalUnitPrice : null,
                discountPercent: campaignDiscount > 0 ? campaignDiscount : null,
                piecesPerUnit,
                unitLabel,
                unitLabelEn,
                note: itemNotesMap.get(item.id) || null,
              }
            })],
          },
        },
        include: { items: true },
      })

      // Link the consumed coupon to this order
      if (loyaltyCoupon) {
        await tx.redeemedReward.update({
          where: { id: loyaltyCoupon.id },
          data: { orderId: newOrder.id },
        })
      }

      // Clear cart
      await tx.cartItem.deleteMany({ where: { buyerId: user.id } })

      // Record coupon usage if coupon was applied.
      // Locks the code row and re-verifies limits inside the transaction so
      // two concurrent checkouts can't both consume a single-use/limited code.
      if (discountCode) {
        try {
          await recordDiscountUsageInTx(tx, {
            code: discountCode,
            userId: user.id,
            orderId: newOrder.id,
            discountAmount,
            orderTotal: totalPrice,
          })
        } catch (usageErr) {
          throw new OrderValidationError(
            usageErr instanceof Error ? usageErr.message : 'فشل في تسجيل استخدام كود الخصم'
          )
        }
      }

      // Notify admins
      const admins = await tx.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { id: true } })
      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            type: 'NEW_ORDER' as const,
            title: 'طلب جديد',
            message: `طلب جديد #${newOrder.orderNumber.slice(-8)} بقيمة ${totalPrice} د.أ`,
            linkUrl: `/admin/orders/${newOrder.id}`,
            userId: admin.id,
          })),
        })
      }

      return newOrder
    })
  } catch (err) {
    if (err instanceof OrderValidationError) {
      return apiError(err.message, err.status)
    }
    throw err
  }

  // Award loyalty points + send "thank you" push to the buyer (outside transaction).
  // No-op when the loyalty system is disabled or configured to award on delivery.
  let loyaltyPointsEarned: number | null = null
  try {
    const pointsResult = await awardOrderPoints(order.id, 'ORDER_PLACED')
    if (pointsResult.success && pointsResult.data?.points) {
      loyaltyPointsEarned = pointsResult.data.points
    }
  } catch (err) {
    console.error('Failed to award loyalty points on order placement:', err)
  }

  // Send push notification to admins (outside transaction)
  sendPushToRole('ADMIN', {
    title: 'طلب جديد',
    body: `طلب جديد #${order.orderNumber.slice(-8)} بقيمة ${totalPrice} د.أ`,
    data: {
      type: 'NEW_ORDER',
      orderId: order.id,
      orderNumber: order.orderNumber,
      linkUrl: `/admin/orders/${order.id}`,
    },
  }).catch((err) => console.error('Failed to send new order push to admins:', err))

  return apiResponse({
    order,
    deliveryFee,
    loyaltyPointsEarned,
    ...(discountCode ? {
      coupon: {
        code: discountCode.code,
        discountPercent: discountCode.discountPercent,
        discountAmount,
        originalTotal: totalPrice,
        finalTotal: finalPrice,
      },
    } : {}),
    ...(loyaltyCoupon ? {
      loyaltyReward: {
        code: loyaltyCoupon.couponCode,
        rewardType: loyaltyCoupon.rewardType,
        discountAmount: loyaltyDiscountAmount,
        freeDelivery: freeDeliveryReward,
      },
    } : {}),
  }, 201)
}
