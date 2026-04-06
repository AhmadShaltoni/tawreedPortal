'use server'

import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { createOfferSchema } from '@/lib/validations'
import type { ActionResponse, OfferWithRequest } from '@/types'
import { revalidatePath } from 'next/cache'

export async function createOffer(formData: FormData): Promise<ActionResponse<{ id: string }>> {
  const user = await getCurrentUser()
  
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }
  
  if (user.role !== 'SUPPLIER') {
    return { success: false, error: 'Only suppliers can submit offers' }
  }

  const rawData = {
    requestId: formData.get('requestId'),
    pricePerUnit: formData.get('pricePerUnit'),
    quantity: formData.get('quantity'),
    unit: formData.get('unit'),
    deliveryDays: formData.get('deliveryDays'),
    deliveryNotes: formData.get('deliveryNotes') || undefined,
    notes: formData.get('notes') || undefined,
    validUntil: formData.get('validUntil'),
  }

  const validated = createOfferSchema.safeParse(rawData)

  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
    }
  }

  // Check if request exists and is open
  const request = await db.request.findUnique({
    where: { id: validated.data.requestId },
  })

  if (!request) {
    return { success: false, error: 'Request not found' }
  }

  if (request.status !== 'OPEN') {
    return { success: false, error: 'This request is no longer accepting offers' }
  }

  // Check if supplier already submitted an offer
  const existingOffer = await db.offer.findUnique({
    where: {
      requestId_supplierId: {
        requestId: validated.data.requestId,
        supplierId: user.id,
      },
    },
  })

  if (existingOffer) {
    return { success: false, error: 'You have already submitted an offer for this request' }
  }

  // Calculate total price
  const totalPrice = validated.data.pricePerUnit * validated.data.quantity

  const offer = await db.offer.create({
    data: {
      ...validated.data,
      totalPrice,
      supplierId: user.id,
    },
  })

  // Update request status to IN_PROGRESS
  await db.request.update({
    where: { id: validated.data.requestId },
    data: { status: 'IN_PROGRESS' },
  })

  // Create notification for buyer
  await db.notification.create({
    data: {
      userId: request.buyerId,
      type: 'NEW_OFFER',
      title: 'New Offer Received',
      message: `You received a new offer for "${request.title}"`,
      linkUrl: `/buyer/requests/${request.id}`,
    },
  })

  revalidatePath('/supplier/offers')
  revalidatePath(`/buyer/requests/${validated.data.requestId}`)

  return { success: true, data: { id: offer.id } }
}

export async function getSupplierOffers(): Promise<OfferWithRequest[]> {
  const user = await getCurrentUser()
  
  if (!user || user.role !== 'SUPPLIER') {
    return []
  }

  return db.offer.findMany({
    where: { supplierId: user.id },
    include: {
      request: {
        include: { buyer: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function acceptOffer(offerId: string): Promise<ActionResponse> {
  const user = await getCurrentUser()
  
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const offer = await db.offer.findUnique({
    where: { id: offerId },
    include: { request: true },
  })

  if (!offer) {
    return { success: false, error: 'Offer not found' }
  }

  if (offer.request.buyerId !== user.id) {
    return { success: false, error: 'Not authorized' }
  }

  if (offer.status !== 'PENDING') {
    return { success: false, error: 'This offer is no longer pending' }
  }

  // Accept this offer
  await db.offer.update({
    where: { id: offerId },
    data: { status: 'ACCEPTED' },
  })

  // Reject all other pending offers for this request
  await db.offer.updateMany({
    where: {
      requestId: offer.requestId,
      id: { not: offerId },
      status: 'PENDING',
    },
    data: { status: 'REJECTED' },
  })

  // Close the request
  await db.request.update({
    where: { id: offer.requestId },
    data: { status: 'CLOSED' },
  })

  // Create the order
  const order = await db.order.create({
    data: {
      totalPrice: offer.totalPrice,
      deliveryAddress: offer.request.deliveryAddress || '',
      deliveryCity: offer.request.deliveryCity,
      expectedDelivery: offer.request.deliveryDeadline,
      requestId: offer.requestId,
      offerId: offer.id,
      buyerId: user.id,
      supplierId: offer.supplierId,
      statusHistory: JSON.stringify([
        { status: 'CONFIRMED', timestamp: new Date().toISOString(), note: 'Order created' },
      ]),
    },
  })

  // Create order item (snapshot of product)
  // For RFQ-based orders, we don't have a specific product, so productId is null
  await db.orderItem.create({
    data: {
      orderId: order.id,
      productId: null, // RFQ-based order, no specific product
      productName: offer.request.productName,
      quantity: Math.floor(offer.quantity),
      unit: offer.unit,
      pricePerUnit: offer.pricePerUnit,
      totalPrice: offer.totalPrice,
    },
  })

  // Notify supplier
  await db.notification.create({
    data: {
      userId: offer.supplierId,
      type: 'OFFER_ACCEPTED',
      title: 'Offer Accepted!',
      message: `Your offer for "${offer.request.title}" has been accepted`,
      linkUrl: `/supplier/orders/${order.id}`,
    },
  })

  revalidatePath('/buyer/requests')
  revalidatePath('/buyer/orders')
  revalidatePath('/supplier/offers')
  revalidatePath('/supplier/orders')

  return { success: true }
}

export async function rejectOffer(offerId: string): Promise<ActionResponse> {
  const user = await getCurrentUser()
  
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const offer = await db.offer.findUnique({
    where: { id: offerId },
    include: { request: true },
  })

  if (!offer) {
    return { success: false, error: 'Offer not found' }
  }

  if (offer.request.buyerId !== user.id) {
    return { success: false, error: 'Not authorized' }
  }

  if (offer.status !== 'PENDING') {
    return { success: false, error: 'This offer is no longer pending' }
  }

  await db.offer.update({
    where: { id: offerId },
    data: { status: 'REJECTED' },
  })

  // Notify supplier
  await db.notification.create({
    data: {
      userId: offer.supplierId,
      type: 'OFFER_REJECTED',
      title: 'Offer Rejected',
      message: `Your offer for "${offer.request.title}" was not accepted`,
      linkUrl: `/supplier/offers`,
    },
  })

  revalidatePath(`/buyer/requests/${offer.requestId}`)

  return { success: true }
}

export async function withdrawOffer(offerId: string): Promise<ActionResponse> {
  const user = await getCurrentUser()
  
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const offer = await db.offer.findUnique({
    where: { id: offerId },
  })

  if (!offer) {
    return { success: false, error: 'Offer not found' }
  }

  if (offer.supplierId !== user.id) {
    return { success: false, error: 'Not authorized' }
  }

  if (offer.status !== 'PENDING') {
    return { success: false, error: 'Cannot withdraw this offer' }
  }

  await db.offer.update({
    where: { id: offerId },
    data: { status: 'WITHDRAWN' },
  })

  revalidatePath('/supplier/offers')

  return { success: true }
}
