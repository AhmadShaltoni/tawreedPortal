'use server'

import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { updateOrderStatusSchema } from '@/lib/validations'
import type { ActionResponse, AdminDashboardStats } from '@/types'
import { revalidatePath } from 'next/cache'

export async function getAdminOrders(options?: {
  status?: string
  search?: string
  page?: number
  limit?: number
}) {
  const { status, search, page = 1, limit = 20 } = options ?? {}

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { buyer: { username: { contains: search, mode: 'insensitive' } } },
      { buyer: { storeName: { contains: search, mode: 'insensitive' } } },
    ]
  }

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      include: {
        buyer: { select: { id: true, username: true, storeName: true, phone: true, city: true } },
        items: { include: { product: { select: { id: true, name: true, image: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.order.count({ where }),
  ])

  return { orders, total, pages: Math.ceil(total / limit) }
}

export async function getAdminOrderById(id: string) {
  return db.order.findUnique({
    where: { id },
    include: {
      buyer: { select: { id: true, username: true, email: true, storeName: true, phone: true, city: true, businessAddress: true } },
      items: { include: { product: { select: { id: true, name: true, nameEn: true, image: true } } } },
    },
  })
}

export async function updateAdminOrderStatus(formData: FormData): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
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

  // Notify buyer
  await db.notification.create({
    data: {
      type: 'ORDER_STATUS_CHANGE',
      title: 'تحديث حالة الطلب',
      message: `تم تحديث حالة طلبك #${order.orderNumber} إلى ${validated.data.status}`,
      linkUrl: `/orders/${order.id}`,
      userId: order.buyerId,
    },
  })

  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${validated.data.orderId}`)
  return { success: true }
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
    totalBuyers,
    totalCategories,
  ] = await Promise.all([
    db.product.count(),
    db.product.count({ where: { isActive: true } }),
    db.order.count(),
    db.order.count({ where: { status: 'PENDING' } }),
    db.order.count({ where: { status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED'] } } }),
    db.order.count({ where: { status: 'DELIVERED' } }),
    db.order.aggregate({ _sum: { totalPrice: true }, where: { status: { not: 'CANCELLED' } } }),
    db.user.count({ where: { role: 'BUYER' } }),
    db.category.count({ where: { isActive: true } }),
  ])

  return {
    totalProducts,
    activeProducts,
    totalOrders,
    pendingOrders,
    activeOrders,
    completedOrders,
    totalRevenue: revenueResult._sum.totalPrice ?? 0,
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
      status: { not: 'CANCELLED' },
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
      let wholesalePrice: number | null = null

      // Try to find the matching ProductUnit's wholesalePrice
      if (item.product?.variants) {
        for (const variant of item.product.variants) {
          for (const pu of variant.units) {
            if (pu.unit === item.unit) {
              wholesalePrice = pu.wholesalePrice
              break
            }
          }
          if (wholesalePrice !== null) break
        }
      }

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
