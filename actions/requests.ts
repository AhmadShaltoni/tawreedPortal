'use server'

import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { createRequestSchema } from '@/lib/validations'
import type { ActionResponse, RequestWithRelations } from '@/types'
import { revalidatePath } from 'next/cache'

export async function createRequest(formData: FormData): Promise<ActionResponse<{ id: string }>> {
  const user = await getCurrentUser()
  
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }
  
  if (user.role !== 'BUYER') {
    return { success: false, error: 'Only buyers can create requests' }
  }

  const rawData = {
    title: formData.get('title'),
    description: formData.get('description') || undefined,
    category: formData.get('category'),
    productName: formData.get('productName'),
    quantity: formData.get('quantity'),
    unit: formData.get('unit'),
    brand: formData.get('brand') || undefined,
    specifications: formData.get('specifications') || undefined,
    deliveryCity: formData.get('deliveryCity'),
    deliveryAddress: formData.get('deliveryAddress') || undefined,
    deliveryDeadline: formData.get('deliveryDeadline') || undefined,
    maxBudget: formData.get('maxBudget') || undefined,
    expiresAt: formData.get('expiresAt'),
  }

  const validated = createRequestSchema.safeParse(rawData)

  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
    }
  }

  const request = await db.request.create({
    data: {
      ...validated.data,
      buyerId: user.id,
    },
  })

  revalidatePath('/buyer/requests')
  revalidatePath('/supplier/requests')

  return { success: true, data: { id: request.id } }
}

export async function getBuyerRequests(): Promise<RequestWithRelations[]> {
  const user = await getCurrentUser()
  
  if (!user || user.role !== 'BUYER') {
    return []
  }

  return db.request.findMany({
    where: { buyerId: user.id },
    include: {
      buyer: true,
      offers: {
        include: { supplier: true },
      },
      order: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getAvailableRequests(): Promise<RequestWithRelations[]> {
  const user = await getCurrentUser()
  
  if (!user || user.role !== 'SUPPLIER') {
    return []
  }

  return db.request.findMany({
    where: {
      status: 'OPEN',
      expiresAt: { gt: new Date() },
    },
    include: {
      buyer: true,
      offers: {
        include: { supplier: true },
      },
      order: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getRequestById(id: string): Promise<RequestWithRelations | null> {
  const user = await getCurrentUser()
  
  if (!user) {
    return null
  }

  const request = await db.request.findUnique({
    where: { id },
    include: {
      buyer: true,
      offers: {
        include: { supplier: true },
        orderBy: { createdAt: 'desc' },
      },
      order: true,
    },
  })

  if (!request) return null

  // Buyers can only see their own requests
  if (user.role === 'BUYER' && request.buyerId !== user.id) {
    return null
  }

  return request
}

export async function cancelRequest(requestId: string): Promise<ActionResponse> {
  const user = await getCurrentUser()
  
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const request = await db.request.findUnique({
    where: { id: requestId },
  })

  if (!request) {
    return { success: false, error: 'Request not found' }
  }

  if (request.buyerId !== user.id) {
    return { success: false, error: 'Not authorized' }
  }

  if (request.status !== 'OPEN' && request.status !== 'IN_PROGRESS') {
    return { success: false, error: 'Cannot cancel this request' }
  }

  await db.request.update({
    where: { id: requestId },
    data: { status: 'CANCELLED' },
  })

  // Reject all pending offers
  await db.offer.updateMany({
    where: { requestId, status: 'PENDING' },
    data: { status: 'REJECTED' },
  })

  revalidatePath('/buyer/requests')
  revalidatePath(`/buyer/requests/${requestId}`)

  return { success: true }
}
