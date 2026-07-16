'use server'

import { db } from '@/lib/db'
import { requireRole, requirePermission } from '@/lib/auth'
import { updateOrderStatusSchema } from '@/lib/validations'
import { createAndSendNotification } from '@/lib/push-notifications'
import { awardOrderPoints, reverseOrderPoints, awardWelcomeBonus, processReferralRewards } from './loyalty-points'
import { updateUserCampaignProgress } from './loyalty-campaigns'
import type { ActionResponse, AdminDashboardStats, ProductProfitRow } from '@/types'
import { revalidatePath } from 'next/cache'

export async function getAdminOrders(options?: {
  status?: string
  search?: string
  page?: number
  limit?: number
}) {
  const { status, search, page = 1, limit = 20 } = options ?? {}

  const searchWhere: Record<string, unknown> = {}
  if (search) {
    searchWhere.OR = [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { buyer: { username: { contains: search, mode: 'insensitive' } } },
      { buyer: { storeName: { contains: search, mode: 'insensitive' } } },
    ]
  }
  const where: Record<string, unknown> = { ...searchWhere }
  if (status) where.status = status

  const [orders, total, statusGroups] = await Promise.all([
    db.order.findMany({
      where,
      include: {
        buyer: { select: { id: true, username: true, storeName: true, phone: true, city: true } },
        items: { include: { product: { select: { id: true, name: true, image: true } } } },
        _count: { select: { editRequests: { where: { status: 'PENDING' } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.order.count({ where }),
    db.order.groupBy({
      by: ['status'],
      _count: { _all: true },
      where: searchWhere,
    }),
  ])

  const statusCounts: Record<string, number> = {}
  for (const group of statusGroups) {
    statusCounts[group.status] = group._count._all
  }

  return { orders, total, pages: Math.ceil(total / limit), statusCounts }
}

// Order items only snapshot productName/productImage (no flavor/variant image
// and no option id). Resolve the most specific image for display by matching
// the snapshot names against the live product's variants/options:
// flavor (option) image → size (variant) image → product snapshot image.
type ItemImageSource = {
  variantSize: string | null
  variantSizeEn: string | null
  variantOptionName: string | null
  variantOptionNameEn: string | null
  productImage: string | null
  product: {
    image: string | null
    variants?: Array<{
      size: string | null
      sizeEn: string | null
      image: string | null
      options: Array<{ name: string; nameEn: string | null; image: string | null }>
    }>
  } | null
}

function resolveItemImage(item: ItemImageSource): string | null {
  const variants = item.product?.variants ?? []
  if (variants.length > 0) {
    const matchedVariant = variants.find(
      (v) =>
        (item.variantSize && v.size === item.variantSize) ||
        (item.variantSizeEn && v.sizeEn === item.variantSizeEn)
    )
    // Prefer an option match inside the matched variant, else across all variants
    if (item.variantOptionName || item.variantOptionNameEn) {
      for (const v of matchedVariant ? [matchedVariant] : variants) {
        const opt = v.options.find(
          (o) =>
            (item.variantOptionName && o.name === item.variantOptionName) ||
            (item.variantOptionNameEn && o.nameEn === item.variantOptionNameEn)
        )
        if (opt?.image) return opt.image
      }
    }
    if (matchedVariant?.image) return matchedVariant.image
  }
  return item.productImage || item.product?.image || null
}

export async function getAdminOrderById(id: string) {
  const order = await db.order.findUnique({
    where: { id },
    include: {
      buyer: { select: { id: true, username: true, email: true, storeName: true, phone: true, city: true, businessAddress: true } },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              nameEn: true,
              image: true,
              variants: {
                select: {
                  size: true,
                  sizeEn: true,
                  image: true,
                  options: { select: { name: true, nameEn: true, image: true } },
                },
              },
            },
          },
        },
      },
      redeemedReward: {
        include: { reward: { select: { id: true, name: true, nameEn: true } } },
      },
      editRequests: {
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })
  if (!order) return null

  return {
    ...order,
    items: order.items.map((item) => ({
      ...item,
      displayImage: resolveItemImage(item),
    })),
    pendingEditRequest: order.editRequests[0] ?? null,
  }
}

export async function updateAdminOrderStatus(formData: FormData): Promise<ActionResponse> {
  // Delivery reps (DELIVERY) manage order status too — gate on the orders permission.
  const { authorized, error } = await requirePermission('orders')
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  const rawData = {
    orderId: formData.get('orderId'),
    status: formData.get('status'),
    note: formData.get('note') || undefined,
  }

  const validated = updateOrderStatusSchema.safeParse(rawData)
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors }
  }

  const order = await db.order.findUnique({ where: { id: validated.data.orderId } })
  if (!order) return { success: false, error: 'Order not found' }

  const statusHistory = ((order.statusHistory as Array<Record<string, unknown>>) || [])
  const statusEntry = {
    status: validated.data.status,
    timestamp: new Date().toISOString(),
    note: validated.data.note ?? null,
  }
  statusHistory.push(statusEntry)

  await db.order.update({
    where: { id: validated.data.orderId },
    data: {
      status: validated.data.status,
      statusHistory: statusHistory as any,
      ...(validated.data.status === 'DELIVERED' ? { actualDelivery: new Date() } : {}),
    },
  })

  // Notify buyer with push notification — friendly copy, no raw IDs or
  // English status enums (the notification already deep-links to the order)
  const statusCopy: Record<string, { title: string; message: string }> = {
    PENDING: {
      title: 'تم استلام طلبك',
      message: 'طلبك قيد المراجعة وسنؤكده قريبًا',
    },
    CONFIRMED: {
      title: 'تم تأكيد طلبك ✅',
      message: 'تم تأكيد طلبك وسنبدأ بتجهيزه قريبًا',
    },
    PROCESSING: {
      title: 'جاري تجهيز طلبك 📦',
      message: 'فريقنا يجهّز طلبك الآن',
    },
    SHIPPED: {
      title: 'طلبك في الطريق إليك 🚚',
      message: 'انطلق مندوبنا بطلبك، سيصلك قريبًا',
    },
    DELIVERED: {
      title: 'تم توصيل طلبك 🎉',
      message: 'نتمنى أن تنال منتجاتك إعجابك، شكرًا لتسوقك من توريد',
    },
    CANCELLED: {
      title: 'تم إلغاء طلبك',
      message: 'تم إلغاء طلبك. لأي استفسار تواصل معنا',
    },
  }
  const copy = statusCopy[validated.data.status] ?? {
    title: 'تحديث حالة الطلب',
    message: 'تم تحديث حالة طلبك، اضغط لعرض التفاصيل',
  }

  await createAndSendNotification(order.buyerId, {
    type: 'ORDER_STATUS_CHANGE',
    title: copy.title,
    message: copy.message,
    linkUrl: `/orders/${order.id}`,
    data: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: validated.data.status,
    },
  })

  // Loyalty system hooks - when order is cancelled, reverse any earned points
  if (validated.data.status === 'CANCELLED') {
    await reverseOrderPoints(validated.data.orderId)
  }

  // Loyalty system hooks - when order is delivered
  if (validated.data.status === 'DELIVERED') {
    // Calculate and award loyalty points (no-op if already awarded on placement)
    await awardOrderPoints(validated.data.orderId, 'DELIVERED')
    
    // Update campaign progress
    await updateUserCampaignProgress(order.buyerId, validated.data.orderId)
    
    // Check if this is the first delivered order for welcome bonus & referral
    const deliveredOrdersCount = await db.order.count({
      where: {
        buyerId: order.buyerId,
        status: 'DELIVERED',
      },
    })
    
    if (deliveredOrdersCount === 1) {
      // First delivered order - check welcome bonus trigger
      await awardWelcomeBonus(order.buyerId, 'FIRST_DELIVERED_ORDER')
      
      // Process referral rewards (if applicable)
      await processReferralRewards(order.buyerId, 'FIRST_DELIVERED_ORDER')
    }
  }

  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${validated.data.orderId}`)
  return { success: true }
}

// Locate the wholesale (cost) price for a sold order item by matching the
// snapshot unit code against the product's units across its variants.
// Returns null when no cost data is available for that item.
function findItemWholesalePrice(item: {
  unit: string
  product: { variants: { units: { unit: string; wholesalePrice: number | null }[] }[] } | null
}): number | null {
  if (!item.product?.variants) return null
  for (const variant of item.product.variants) {
    for (const pu of variant.units) {
      if (pu.unit === item.unit) return pu.wholesalePrice
    }
  }
  return null
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const [
    totalProducts,
    activeProducts,
    totalOrders,
    pendingOrders,
    activeOrders,
    completedOrders,
    revenueResult,
    deliveredItems,
    totalBuyers,
    totalCategories,
  ] = await Promise.all([
    db.product.count(),
    db.product.count({ where: { isActive: true } }),
    db.order.count(),
    db.order.count({ where: { status: 'PENDING' } }),
    db.order.count({ where: { status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED'] } } }),
    db.order.count({ where: { status: 'DELIVERED' } }),
    // Revenue counts DELIVERED orders only
    db.order.aggregate({ _sum: { totalPrice: true }, where: { status: 'DELIVERED' } }),
    // Delivered items with their product cost data for profit calculation
    db.orderItem.findMany({
      where: { isReward: false, order: { status: 'DELIVERED' } },
      select: {
        unit: true,
        quantity: true,
        pricePerUnit: true,
        product: {
          select: {
            variants: { select: { units: { select: { unit: true, wholesalePrice: true } } } },
          },
        },
      },
    }),
    db.user.count({ where: { role: 'BUYER' } }),
    db.category.count({ where: { isActive: true } }),
  ])

  const totalRevenue = revenueResult._sum.totalPrice ?? 0

  let totalProfit = 0
  for (const item of deliveredItems) {
    const wholesale = findItemWholesalePrice(item)
    if (wholesale != null && wholesale > 0) {
      totalProfit += (item.pricePerUnit - wholesale) * item.quantity
    }
  }

  return {
    totalProducts,
    activeProducts,
    totalOrders,
    pendingOrders,
    activeOrders,
    completedOrders,
    totalRevenue,
    totalProfit,
    totalBuyers,
    totalCategories,
  }
}

export async function getRevenueReportData(options: {
  from: string // ISO date string
  to: string   // ISO date string
}) {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) throw new Error(error ?? 'Not authorized')

  const from = new Date(options.from)
  const to = new Date(options.to)
  // Set end of day for the "to" date
  to.setHours(23, 59, 59, 999)

  const orders = await db.order.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      status: 'DELIVERED',
    },
    include: {
      buyer: { select: { username: true, storeName: true } },
      items: {
        include: {
          product: {
            include: {
              variants: {
                include: { units: true },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Calculate profit per order
  const ordersWithProfit = orders.map((order) => {
    let orderProfit = 0

    for (const item of order.items) {
      if (item.isReward) continue
      const wholesalePrice = findItemWholesalePrice(item)
      if (wholesalePrice != null && wholesalePrice > 0) {
        orderProfit += (item.pricePerUnit - wholesalePrice) * item.quantity
      }
      // If wholesalePrice is null/missing, profit is 0 for this item
    }

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      status: order.status,
      totalPrice: order.totalPrice,
      customerName: order.buyer.storeName || order.buyer.username,
      profit: orderProfit,
    }
  })

  const totalRevenue = ordersWithProfit.reduce((sum, o) => sum + o.totalPrice, 0)
  const totalProfit = ordersWithProfit.reduce((sum, o) => sum + o.profit, 0)

  return { orders: ordersWithProfit, totalRevenue, totalProfit }
}

// Per-product profit / loss breakdown across DELIVERED orders. Optionally
// scoped to a date range. Powers the "الأرباح حسب المنتج" report page.
export async function getProductProfitReport(options?: {
  from?: string
  to?: string
}): Promise<ProductProfitRow[]> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) throw new Error(error ?? 'Not authorized')

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

  const items = await db.orderItem.findMany({
    where: { isReward: false, order: orderWhere },
    select: {
      productId: true,
      productName: true,
      productImage: true,
      unit: true,
      quantity: true,
      pricePerUnit: true,
      totalPrice: true,
      product: {
        select: {
          image: true,
          variants: { select: { units: { select: { unit: true, wholesalePrice: true } } } },
        },
      },
    },
  })

  const map = new Map<string, ProductProfitRow>()

  for (const item of items) {
    const key = item.productId ?? `name:${item.productName}`
    const revenue = item.totalPrice ?? item.pricePerUnit * item.quantity
    const wholesale = findItemWholesalePrice(item)
    const hasCost = wholesale != null && wholesale > 0
    const cost = hasCost ? wholesale * item.quantity : 0
    const profit = hasCost ? (item.pricePerUnit - wholesale) * item.quantity : 0

    const existing = map.get(key)
    if (existing) {
      existing.quantitySold += item.quantity
      existing.revenue += revenue
      existing.cost += cost
      existing.profit += profit
      if (!hasCost) existing.missingCostData = true
    } else {
      map.set(key, {
        productId: item.productId ?? key,
        productName: item.productName,
        productImage: item.product?.image ?? item.productImage ?? null,
        quantitySold: item.quantity,
        revenue,
        cost,
        profit,
        margin: 0,
        missingCostData: !hasCost,
      })
    }
  }

  const rows = Array.from(map.values())
  for (const row of rows) {
    row.margin = row.revenue > 0 ? (row.profit / row.revenue) * 100 : 0
  }

  // Default sort: highest profit first
  rows.sort((a, b) => b.profit - a.profit)
  return rows
}
