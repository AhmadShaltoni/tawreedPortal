'use server'

import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { requirePermission } from '@/lib/auth'
import { priceOrderItems, OrderPricingError, type DesiredItem } from '@/lib/order-pricing'
import { createAndSendNotification } from '@/lib/push-notifications'
import { awardOrderPoints, reverseOrderPoints } from './loyalty-points'
import type { ActionResponse } from '@/types'
import { revalidatePath } from 'next/cache'

/**
 * Admin resolution of a buyer's order-edit request.
 *
 * approveOrderEdit re-prices the proposed items authoritatively (prices/stock
 * may have moved since the buyer submitted), atomically swaps the order's items
 * and delivery info, adjusts stock by the net per-selection delta, and keeps the
 * order PENDING. rejectOrderEdit just marks the request rejected.
 */

const round2 = (n: number) => Math.round(n * 100) / 100

// Stock bucket key: option-level stock when an option is selected, else variant.
function stockKey(refs: { variantId: string | null; variantOptionId: string | null }): string | null {
  if (!refs.variantId) return null
  return refs.variantOptionId ? `o:${refs.variantOptionId}` : `v:${refs.variantId}`
}

export async function approveOrderEdit(editRequestId: string, adminNote?: string): Promise<ActionResponse> {
  const { authorized, user, error } = await requirePermission('orders')
  if (!authorized || !user) return { success: false, error: error ?? 'Not authorized' }

  const editRequest = await db.orderEditRequest.findUnique({
    where: { id: editRequestId },
    include: { order: { include: { items: true, redeemedReward: true } } },
  })
  if (!editRequest) return { success: false, error: 'طلب التعديل غير موجود' }
  if (editRequest.status !== 'PENDING') {
    return { success: false, error: 'تمت معالجة طلب التعديل بالفعل' }
  }

  const order = editRequest.order
  if (order.status !== 'PENDING') {
    return { success: false, error: 'لا يمكن تطبيق التعديل إلا على طلب قيد المراجعة' }
  }

  const desiredItems = editRequest.proposedItems as unknown as DesiredItem[]

  // Discount code applied to the original order — re-apply on the new items.
  const usage = await db.discountCodeUsage.findFirst({
    where: { orderId: order.id },
    include: { discountCode: true },
  })

  const buyer = await db.user.findUnique({ where: { id: order.buyerId }, select: { phone: true } })

  const proposedCityId = editRequest.proposedDeliveryCityId ?? order.deliveryCityId ?? null

  // Authoritative re-price (no stock check here — stock is enforced atomically
  // via the delta updates inside the transaction below).
  let priced
  try {
    priced = await priceOrderItems({
      items: desiredItems,
      userId: order.buyerId,
      userPhone: buyer?.phone ?? null,
      deliveryCityId: proposedCityId,
      couponCode: usage?.discountCode?.code ?? null,
      loyaltyCoupon: order.redeemedReward,
      checkStock: false,
    })
  } catch (err) {
    if (err instanceof OrderPricingError) return { success: false, error: err.message }
    throw err
  }

  // Net stock delta per selection bucket: new demand minus old reservation.
  const oldQty = new Map<string, number>()
  for (const item of order.items) {
    if (item.isReward) continue
    const key = stockKey(item)
    if (!key) continue
    oldQty.set(key, (oldQty.get(key) ?? 0) + item.quantity)
  }
  const newQty = new Map<string, { qty: number; name: string; variantOptionId: string | null; variantId: string }>()
  for (const p of priced.items) {
    const key = stockKey(p)
    if (!key) continue
    const prev = newQty.get(key)
    newQty.set(key, {
      qty: (prev?.qty ?? 0) + p.quantity,
      name: `${p.productName}${p.variantSize ? ` - ${p.variantSize}` : ''}`,
      variantOptionId: p.variantOptionId,
      variantId: p.variantId,
    })
  }

  const productsTotalChanged = round2(priced.productsTotal) !== round2(order.totalPrice)

  try {
    await db.$transaction(async (tx) => {
      const allKeys = new Set<string>([...oldQty.keys(), ...newQty.keys()])
      for (const key of allKeys) {
        const before = oldQty.get(key) ?? 0
        const after = newQty.get(key)?.qty ?? 0
        const delta = after - before
        if (delta === 0) continue

        const meta = newQty.get(key)
        const isOption = key.startsWith('o:')
        const targetId = key.slice(2)

        if (delta > 0) {
          // Need more stock — decrement with a guard so we never oversell.
          if (isOption) {
            const res = await tx.variantOption.updateMany({
              where: { id: targetId, isActive: true, stock: { gte: delta } },
              data: { stock: { decrement: delta } },
            })
            if (res.count !== 1) throw new OrderPricingError(`الكمية غير متوفرة لـ "${meta?.name ?? 'أحد المنتجات'}"`)
          } else {
            const res = await tx.productVariant.updateMany({
              where: { id: targetId, isActive: true, product: { isActive: true }, stock: { gte: delta } },
              data: { stock: { decrement: delta } },
            })
            if (res.count !== 1) throw new OrderPricingError(`الكمية غير متوفرة لـ "${meta?.name ?? 'أحد المنتجات'}"`)
          }
        } else {
          // Returning stock (item removed or quantity reduced).
          const give = -delta
          if (isOption) {
            await tx.variantOption.updateMany({ where: { id: targetId }, data: { stock: { increment: give } } })
          } else {
            await tx.productVariant.updateMany({ where: { id: targetId }, data: { stock: { increment: give } } })
          }
        }
      }

      // Replace editable items (keep reward prize items untouched).
      await tx.orderItem.deleteMany({ where: { orderId: order.id, isReward: false } })
      await tx.orderItem.createMany({
        data: priced.items.map((p) => ({
          orderId: order.id,
          productId: p.productId,
          productName: p.productName,
          productNameEn: p.productNameEn,
          productImage: p.productImage,
          variantSize: p.variantSize,
          variantSizeEn: p.variantSizeEn,
          variantOptionName: p.variantOptionName,
          variantOptionNameEn: p.variantOptionNameEn,
          quantity: p.quantity,
          unit: p.unit,
          pricePerUnit: p.pricePerUnit,
          totalPrice: p.totalPrice,
          originalPricePerUnit: p.originalPricePerUnit,
          discountPercent: p.discountPercent,
          piecesPerUnit: p.piecesPerUnit,
          unitLabel: p.unitLabel,
          unitLabelEn: p.unitLabelEn,
          note: p.note,
          variantId: p.variantId,
          variantOptionId: p.variantOptionId,
          productUnitId: p.productUnitId,
        })),
      })

      // Apply proposed delivery fields (only those the buyer changed).
      const statusHistory = ((order.statusHistory as Array<Record<string, unknown>>) || [])
      statusHistory.push({
        status: order.status,
        timestamp: new Date().toISOString(),
        note: 'تم تطبيق تعديل الطلب المطلوب من العميل',
      })

      await tx.order.update({
        where: { id: order.id },
        data: {
          totalPrice: priced.productsTotal,
          deliveryFee: priced.deliveryFee,
          ...(editRequest.proposedDeliveryAddress ? { deliveryAddress: editRequest.proposedDeliveryAddress } : {}),
          ...(editRequest.proposedDeliveryAddressDetails !== null ? { deliveryAddressDetails: editRequest.proposedDeliveryAddressDetails } : {}),
          ...(editRequest.proposedDeliveryCity ? { deliveryCity: editRequest.proposedDeliveryCity } : {}),
          ...(editRequest.proposedDeliveryCityId ? { deliveryCityId: editRequest.proposedDeliveryCityId } : {}),
          ...(editRequest.proposedDeliveryAreaId ? { deliveryAreaId: editRequest.proposedDeliveryAreaId } : {}),
          ...(editRequest.proposedBuyerNotes !== null ? { buyerNotes: editRequest.proposedBuyerNotes } : {}),
          statusHistory: statusHistory as unknown as Prisma.InputJsonValue,
        },
      })

      // Keep the discount usage record consistent with the recomputed total.
      if (usage) {
        await tx.discountCodeUsage.update({
          where: { id: usage.id },
          data: { discountAmount: priced.discountCodeAmount, orderTotal: priced.itemsSubtotal },
        })
      }

      await tx.orderEditRequest.update({
        where: { id: editRequest.id },
        data: {
          status: 'APPROVED',
          adminNote: adminNote?.trim() || null,
          resolvedAt: new Date(),
          resolvedById: user.id,
          estimatedTotal: priced.productsTotal,
          estimatedDeliveryFee: priced.deliveryFee,
        },
      })
    })
  } catch (err) {
    if (err instanceof OrderPricingError) return { success: false, error: err.message }
    throw err
  }

  // Re-sync loyalty points if the products total moved (order still PENDING).
  if (productsTotalChanged) {
    try {
      await reverseOrderPoints(order.id)
      await awardOrderPoints(order.id, 'ORDER_PLACED')
    } catch (err) {
      console.error('Failed to re-sync loyalty points after order edit:', err)
    }
  }

  await createAndSendNotification(order.buyerId, {
    type: 'ORDER_UPDATE',
    title: 'تم قبول تعديل طلبك ✅',
    message: `تم تحديث طلبك #${order.orderNumber.slice(-8)} حسب طلبك`,
    linkUrl: `/orders/${order.id}`,
    data: { orderId: order.id, orderNumber: order.orderNumber },
  })

  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${order.id}`)
  return { success: true }
}

export async function rejectOrderEdit(editRequestId: string, adminNote?: string): Promise<ActionResponse> {
  const { authorized, user, error } = await requirePermission('orders')
  if (!authorized || !user) return { success: false, error: error ?? 'Not authorized' }

  const editRequest = await db.orderEditRequest.findUnique({
    where: { id: editRequestId },
    include: { order: { select: { id: true, orderNumber: true, buyerId: true } } },
  })
  if (!editRequest) return { success: false, error: 'طلب التعديل غير موجود' }
  if (editRequest.status !== 'PENDING') {
    return { success: false, error: 'تمت معالجة طلب التعديل بالفعل' }
  }

  await db.orderEditRequest.update({
    where: { id: editRequest.id },
    data: {
      status: 'REJECTED',
      adminNote: adminNote?.trim() || null,
      resolvedAt: new Date(),
      resolvedById: user.id,
    },
  })

  await createAndSendNotification(editRequest.order.buyerId, {
    type: 'ORDER_UPDATE',
    title: 'تعذّر تطبيق تعديل طلبك',
    message: `لم نتمكن من تطبيق التعديل على الطلب #${editRequest.order.orderNumber.slice(-8)}${adminNote?.trim() ? `: ${adminNote.trim()}` : ''}`,
    linkUrl: `/orders/${editRequest.order.id}`,
    data: { orderId: editRequest.order.id, orderNumber: editRequest.order.orderNumber },
  })

  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${editRequest.order.id}`)
  return { success: true }
}
