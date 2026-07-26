import { db } from '@/lib/db'
import { createAndSendNotification } from '@/lib/push-notifications'
import { awardOrderPoints, reverseOrderPoints, awardWelcomeBonus, processReferralRewards } from '@/actions/loyalty-points'
import { updateUserCampaignProgress } from '@/actions/loyalty-campaigns'
import type { ActionResponse } from '@/types'

export type OrderStatusValue = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

// Legal forward transitions. CANCELLED is terminal (revive by placing a new
// order); DELIVERED may still be cancelled to handle returns/refunds. This
// blocks backward jumps like CANCELLED→DELIVERED that would otherwise
// re-trigger loyalty awards after a reversal.
const ALLOWED_TRANSITIONS: Record<OrderStatusValue, OrderStatusValue[]> = {
  PENDING: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'DELIVERED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['CANCELLED'],
  CANCELLED: [],
}

/**
 * Core admin order-status transition, shared by the dashboard server action
 * and the mobile admin API: updates the order + status history, notifies the
 * buyer, and runs the loyalty hooks. Authorization is the caller's job.
 */
export async function applyOrderStatusUpdate(input: {
  orderId: string
  status: OrderStatusValue
  note?: string | null
}): Promise<ActionResponse> {
  const order = await db.order.findUnique({
    where: { id: input.orderId },
    include: { items: { select: { variantId: true, variantOptionId: true, quantity: true, isReward: true } } },
  })
  if (!order) return { success: false, error: 'Order not found' }

  const currentStatus = order.status as OrderStatusValue

  // No-op if the status is unchanged.
  if (currentStatus === input.status) {
    return { success: false, error: 'الطلب موجود بالفعل في هذه الحالة' }
  }

  // Enforce the transition state machine (prevents re-award / backward jumps).
  if (!ALLOWED_TRANSITIONS[currentStatus]?.includes(input.status)) {
    return { success: false, error: `لا يمكن تغيير حالة الطلب من ${currentStatus} إلى ${input.status}` }
  }

  // Restock only when moving INTO a cancelled state (reverse the checkout
  // decrement). Reward prize items and legacy/RFQ lines without a live variant
  // reference never decremented stock, so they're skipped.
  const isCancelling = input.status === 'CANCELLED'

  const statusHistory = ((order.statusHistory as Array<Record<string, unknown>>) || [])
  statusHistory.push({
    status: input.status,
    timestamp: new Date().toISOString(),
    note: input.note ?? null,
  })

  await db.$transaction(async (tx) => {
    if (isCancelling) {
      for (const item of order.items) {
        if (item.isReward || !item.variantId || item.quantity <= 0) continue
        if (item.variantOptionId) {
          await tx.variantOption.updateMany({
            where: { id: item.variantOptionId },
            data: { stock: { increment: item.quantity } },
          })
        } else {
          await tx.productVariant.updateMany({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          })
        }
      }
    }

    await tx.order.update({
      where: { id: input.orderId },
      data: {
        status: input.status,
        statusHistory: statusHistory as any,
        ...(input.status === 'DELIVERED' ? { actualDelivery: new Date() } : {}),
      },
    })
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
  const copy = statusCopy[input.status] ?? {
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
      status: input.status,
    },
  })

  // Loyalty system hooks - when order is cancelled, reverse any earned points
  if (input.status === 'CANCELLED') {
    await reverseOrderPoints(input.orderId)
  }

  // Loyalty system hooks - when order is delivered
  if (input.status === 'DELIVERED') {
    // Calculate and award loyalty points (no-op if already awarded on placement)
    await awardOrderPoints(input.orderId, 'DELIVERED')

    // Update campaign progress
    await updateUserCampaignProgress(order.buyerId, input.orderId)

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

  return { success: true }
}
