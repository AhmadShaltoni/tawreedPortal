'use server'

import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { updateOrderStatusSchema } from '@/lib/validations'
import type { ActionResponse, OrderWithRelations, OrderStatus } from '@/types'
import { revalidatePath } from 'next/cache'

export async function getBuyerOrders(): Promise<OrderWithRelations[]> {
  const user = await getCurrentUser()
  
  if (!user || user.role !== 'BUYER') {
    return []
  }

  return db.order.findMany({
    where: { buyerId: user.id },
    include: {
      buyer: true,
      supplier: true,
      request: true,
      offer: true,
      items: {
        include: { product: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getSupplierOrders(): Promise<OrderWithRelations[]> {
  const user = await getCurrentUser()
  
  if (!user || user.role !== 'SUPPLIER') {
    return []
  }

  return db.order.findMany({
    where: { supplierId: user.id },
    include: {
      buyer: true,
      supplier: true,
      request: true,
      offer: true,
      items: {
        include: { product: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getOrderById(id: string): Promise<OrderWithRelations | null> {
  const user = await getCurrentUser()
  
  if (!user) {
    return null
  }

  const order = await db.order.findUnique({
    where: { id },
    include: {
      buyer: true,
      supplier: true,
      request: true,
      offer: true,
      items: {
        include: { product: true },
      },
    },
  })

  if (!order) return null

  // Check authorization
  if (order.buyerId !== user.id && order.supplierId !== user.id) {
    return null
  }

  return order
}

export async function updateOrderStatus(formData: FormData): Promise<ActionResponse> {
  const user = await getCurrentUser()
  
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const rawData = {
    orderId: formData.get('orderId'),
    status: formData.get('status'),
    note: formData.get('note') || undefined,
  }

  const validated = updateOrderStatusSchema.safeParse(rawData)

  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
    }
  }

  const order = await db.order.findUnique({
    where: { id: validated.data.orderId },
  })

  if (!order) {
    return { success: false, error: 'Order not found' }
  }

  // Only supplier can update status (except for cancellation)
  if (validated.data.status !== 'CANCELLED' && order.supplierId !== user.id) {
    return { success: false, error: 'Not authorized to update order status' }
  }

  // For cancellation, both buyer and supplier can cancel
  if (validated.data.status === 'CANCELLED') {
    if (order.buyerId !== user.id && order.supplierId !== user.id) {
      return { success: false, error: 'Not authorized' }
    }
  }

  // Update status history
  const currentHistory = order.statusHistory as Array<{ status: string; timestamp: string; note?: string }>
  const newHistory = [
    ...currentHistory,
    {
      status: validated.data.status,
      timestamp: new Date().toISOString(),
      note: validated.data.note,
    },
  ]

  const updateData: { status: OrderStatus; statusHistory: string; actualDelivery?: Date } = {
    status: validated.data.status,
    statusHistory: JSON.stringify(newHistory),
  }

  // Set actual delivery date if delivered
  if (validated.data.status === 'DELIVERED') {
    updateData.actualDelivery = new Date()
  }

  await db.order.update({
    where: { id: validated.data.orderId },
    data: updateData,
  })

  // Notify the other party
  let notifyUserId: string | undefined
  if (user.id === order.supplierId) {
    notifyUserId = order.buyerId
  } else if (user.id === order.buyerId && order.supplierId) {
    notifyUserId = order.supplierId
  }

  if (notifyUserId) {
    await db.notification.create({
      data: {
        userId: notifyUserId,
        type: 'ORDER_UPDATE',
        title: 'Order Status Updated',
        message: `Order #${order.orderNumber.slice(-8)} is now ${validated.data.status.toLowerCase()}`,
        linkUrl: user.role === 'SUPPLIER' 
          ? `/buyer/orders/${order.id}` 
          : `/supplier/orders/${order.id}`,
      },
    })
  }

  revalidatePath('/buyer/orders')
  revalidatePath('/supplier/orders')
  revalidatePath(`/buyer/orders/${validated.data.orderId}`)
  revalidatePath(`/supplier/orders/${validated.data.orderId}`)

  return { success: true }
}
