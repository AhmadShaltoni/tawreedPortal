'use server'

import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import type { BuyerDashboardStats, SupplierDashboardStats } from '@/types'

export async function getBuyerDashboardStats(): Promise<BuyerDashboardStats | null> {
  const user = await getCurrentUser()
  
  if (!user || user.role !== 'BUYER') {
    return null
  }

  const [totalRequests, activeRequests, totalOffers, completedOrders, pendingOrders] = await Promise.all([
    db.request.count({ where: { buyerId: user.id } }),
    db.request.count({ 
      where: { 
        buyerId: user.id, 
        status: { in: ['OPEN', 'IN_PROGRESS'] } 
      } 
    }),
    db.offer.count({
      where: {
        request: { buyerId: user.id },
      },
    }),
    db.order.count({
      where: { buyerId: user.id, status: 'DELIVERED' },
    }),
    db.order.count({
      where: { 
        buyerId: user.id, 
        status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED'] } 
      },
    }),
  ])

  return {
    totalRequests,
    activeRequests,
    totalOffers,
    completedOrders,
    pendingOrders,
  }
}

export async function getSupplierDashboardStats(): Promise<SupplierDashboardStats | null> {
  const user = await getCurrentUser()
  
  if (!user || user.role !== 'SUPPLIER') {
    return null
  }

  const [availableRequests, submittedOffers, acceptedOffers, activeOrders, completedOrders] = await Promise.all([
    db.request.count({
      where: {
        status: 'OPEN',
        expiresAt: { gt: new Date() },
      },
    }),
    db.offer.count({ where: { supplierId: user.id } }),
    db.offer.count({ where: { supplierId: user.id, status: 'ACCEPTED' } }),
    db.order.count({
      where: {
        supplierId: user.id,
        status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED'] },
      },
    }),
    db.order.count({
      where: { supplierId: user.id, status: 'DELIVERED' },
    }),
  ])

  return {
    availableRequests,
    submittedOffers,
    acceptedOffers,
    activeOrders,
    completedOrders,
  }
}

export async function getRecentNotifications(limit = 5) {
  const user = await getCurrentUser()
  
  if (!user) {
    return []
  }

  return db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export async function markNotificationAsRead(notificationId: string) {
  const user = await getCurrentUser()
  
  if (!user) {
    return { success: false }
  }

  await db.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  })

  return { success: true }
}

export async function markAllNotificationsAsRead() {
  const user = await getCurrentUser()
  
  if (!user) {
    return { success: false }
  }

  await db.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  })

  return { success: true }
}
