import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { createOrderFromCartSchema } from '@/lib/validations'

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
    orders: orders.map(order => ({
      ...order,
      buyerNotes: order.buyerNotes,
      statusHistory: order.statusHistory,
    })),
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
    include: { product: true, productUnit: true },
  })

  if (cartItems.length === 0) {
    return apiError('Cart is empty', 400)
  }

  // Verify stock for all items
  for (const item of cartItems) {
    if (!item.product.isActive) {
      return apiError(`Product "${item.product.name}" is no longer available`, 400)
    }
    if (item.product.stock < item.quantity) {
      return apiError(`Insufficient stock for "${item.product.name}". Available: ${item.product.stock}`, 400)
    }
  }

  // Calculate total (using selected unit price if available)
  const totalPrice = cartItems.reduce((sum, item) => {
    const unitPrice = item.productUnit?.price ?? item.product.price
    return sum + unitPrice * item.quantity
  }, 0)

  // Validate coupon code if provided
  let discountCode: any = null
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

  // Create order in transaction
  const order = await db.$transaction(async (tx) => {
    // Create order
    const newOrder = await tx.order.create({
      data: {
        totalPrice: finalPrice,
        deliveryAddress: validated.data.deliveryAddress,
        deliveryCity: validated.data.deliveryCity,
        buyerNotes: validated.data.buyerNotes,
        buyerId: user.id,
        status: 'PENDING',
        statusHistory: [
          { status: 'PENDING', timestamp: new Date().toISOString(), note: null },
        ],
        items: {
          create: cartItems.map((item) => {
            const unitPrice = item.productUnit?.price ?? item.product.price
            const unit = item.productUnit?.unit ?? item.product.unit
            const piecesPerUnit = item.productUnit?.piecesPerUnit ?? 1
            const unitLabel = item.productUnit?.label ?? null
            const unitLabelEn = item.productUnit?.labelEn ?? null
            return {
              productId: item.product.id,
              productName: item.product.name,
              productNameEn: item.product.nameEn,
              productImage: item.product.image,
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

    // Decrease stock
    for (const item of cartItems) {
      await tx.product.update({
        where: { id: item.product.id },
        data: { stock: { decrement: item.quantity } },
      })
    }

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

  return apiResponse({
    order,
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
