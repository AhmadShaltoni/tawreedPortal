import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { createOrderFromCartSchema } from '@/lib/validations'
import { sendPushToRole } from '@/lib/push-notifications'
import { calculateDeliveryFee } from '@/actions/delivery'
import type { DiscountCode } from '@prisma/client'

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
          product: true,
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

  // Calculate total (using option priceOverride if set, otherwise unit price)
  const totalPrice = cartItems.reduce((sum, item) => {
    const unitPrice = item.variantOption?.priceOverride ?? item.productUnit?.price ?? 0
    return sum + unitPrice * item.quantity
  }, 0)

  // Validate coupon code if provided
  let discountCode: (DiscountCode & { _count: { usages: number } }) | null = null
  let discountAmount = 0
  let finalPrice = totalPrice

  if (validated.data.couponCode) {
    const couponCodeStr = validated.data.couponCode.toUpperCase()

    discountCode = await db.discountCode.findFirst({
      where: { code: { equals: couponCodeStr, mode: 'insensitive' } },
      include: { _count: { select: { usages: true } } },
    })

    if (!discountCode) {
      return apiError('كود الخصم غير موجود', 400)
    }
    if (!discountCode.isActive) {
      return apiError('كود الخصم غير مفعل', 400)
    }

    const now = new Date()
    if (discountCode.startDate && now < discountCode.startDate) {
      return apiError('كود الخصم لم يبدأ بعد', 400)
    }
    if (discountCode.endDate && now > discountCode.endDate) {
      return apiError('كود الخصم منتهي الصلاحية', 400)
    }
    if (discountCode.maxUsage !== null && discountCode._count.usages >= discountCode.maxUsage) {
      return apiError('تم الوصول للحد الأقصى لاستخدام هذا الكود', 400)
    }
    if (discountCode.isSingleUse) {
      const existingUsage = await db.discountCodeUsage.findFirst({
        where: { discountCodeId: discountCode.id, userId: user.id },
      })
      if (existingUsage) {
        return apiError('لقد استخدمت هذا الكود من قبل', 400)
      }
    }
    if (discountCode.minOrderAmount !== null && totalPrice < discountCode.minOrderAmount) {
      return apiError(`قيمة الطلب أقل من الحد الأدنى المطلوب (${discountCode.minOrderAmount} د.أ)`, 400)
    }

    discountAmount = Math.round((totalPrice * discountCode.discountPercent / 100) * 100) / 100
    finalPrice = Math.round((totalPrice - discountAmount) * 100) / 100
  }

  // Calculate delivery fee if cityId provided
  let deliveryFee = 0
  let deliveryPromotionId: string | null = null
  const deliveryCityId = validated.data.deliveryCityId || null

  if (deliveryCityId) {
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

      // Create order
      const newOrder = await tx.order.create({
        data: {
          totalPrice: finalPrice,
          deliveryFee,
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
            create: cartItems.map((item) => {
              const unitPrice = item.variantOption?.priceOverride ?? item.productUnit?.price ?? 0
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
                pricePerUnit: unitPrice,
                totalPrice: unitPrice * item.quantity,
                piecesPerUnit,
                unitLabel,
                unitLabelEn,
              }
            }),
          },
        },
        include: { items: true },
      })

      // Clear cart
      await tx.cartItem.deleteMany({ where: { buyerId: user.id } })

      // Record coupon usage if coupon was applied
      if (discountCode) {
        await tx.discountCodeUsage.create({
          data: {
            discountCodeId: discountCode.id,
            userId: user.id,
            orderId: newOrder.id,
            discountAmount,
            orderTotal: totalPrice,
          },
        })
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
    ...(discountCode ? {
      coupon: {
        code: discountCode.code,
        discountPercent: discountCode.discountPercent,
        discountAmount,
        originalTotal: totalPrice,
        finalTotal: finalPrice,
      },
    } : {}),
  }, 201)
}
