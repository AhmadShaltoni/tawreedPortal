import { db } from '@/lib/db'
import { createAndSendNotification } from '@/lib/push-notifications'
import { awardOrderPoints, reverseOrderPoints, awardWelcomeBonus, processReferralRewards } from '@/actions/loyalty-points'
import { updateUserCampaignProgress } from '@/actions/loyalty-campaigns'
import type { ActionResponse } from '@/types'

export type OrderStatusValue = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

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
  const order = await db.order.findUnique({ where: { id: input.orderId } })
  if (!order) return { success: false, error: 'Order not found' }

  const statusHistory = ((order.statusHistory as Array<Record<string, unknown>>) || [])
  statusHistory.push({
    status: input.status,
    timestamp: new Date().toISOString(),
    note: input.note ?? null,
  })

  await db.order.update({
    where: { id: input.orderId },
    data: {
      status: input.status,
      statusHistory: statusHistory as any,
      ...(input.status === 'DELIVERED' ? { actualDelivery: new Date() } : {}),
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
