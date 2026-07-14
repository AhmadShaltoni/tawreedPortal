'use server'

import { db } from '@/lib/db'
import { hashPhone } from '@/lib/account/phone-hash'
import { getOrCreateDeletedUserPlaceholder } from '@/lib/account/deleted-user'
import type { ActionResponse } from '@/types'

/**
 * Permanently delete a buyer account and all personal data, while preserving
 * non-personal records needed to prevent coupon/bonus abuse after a user
 * deletes and re-registers with the same phone number.
 *
 * Steps (all within a single transaction):
 * 1. Load the user and ensure they are a BUYER.
 * 2. Hash the normalized phone number (no plain phone is ever retained).
 * 3. Copy single-use discount-code usages into DeletedUserCouponUsage.
 * 4. Record welcome-bonus / referral-invitee flags into DeletedAccountRecord.
 * 5. Reassign the user's orders to the shared placeholder buyer and scrub
 *    personal delivery details (orders are retained for business records).
 * 6. Delete the user (cascades remove cart, notifications, loyalty data,
 *    referrals, requests, etc.; device tokens are auto-nullified).
 *
 * The user's JWT becomes invalid immediately because the user no longer
 * exists in the database.
 */
export async function deleteAccount(userId: string): Promise<ActionResponse> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, phone: true, role: true },
    })

    if (!user) {
      return { success: false, error: 'الحساب غير موجود' }
    }

    if (user.role !== 'BUYER') {
      return { success: false, error: 'لا يمكن حذف هذا النوع من الحسابات' }
    }

    const phoneNumberHash = hashPhone(user.phone)
    if (!phoneNumberHash) {
      return { success: false, error: 'رقم الهاتف غير صالح' }
    }

    await db.$transaction(async (tx) => {
      // 1. Preserve single-use coupon usage by phone hash (abuse prevention).
      const singleUseUsages = await tx.discountCodeUsage.findMany({
        where: {
          userId: user.id,
          discountCode: { OR: [{ isSingleUse: true }, { maxUsagePerUser: 1 }] },
        },
        select: { discountCodeId: true },
      })

      const uniqueCodeIds = [...new Set(singleUseUsages.map((u) => u.discountCodeId))]
      for (const discountCodeId of uniqueCodeIds) {
        await tx.deletedUserCouponUsage.upsert({
          where: {
            phoneNumberHash_discountCodeId: { phoneNumberHash, discountCodeId },
          },
          create: { phoneNumberHash, discountCodeId },
          update: {},
        })
      }

      // 2. Record one-time grant flags (welcome bonus + referral invitee).
      const welcomeBonus = await tx.loyaltyTransaction.findFirst({
        where: { userId: user.id, type: 'EARN_WELCOME' },
        select: { id: true },
      })

      const referral = await tx.userReferral.findUnique({
        where: { userId: user.id },
        select: { referralRewardClaimed: true },
      })

      await tx.deletedAccountRecord.upsert({
        where: { phoneNumberHash },
        create: {
          phoneNumberHash,
          welcomeBonusReceived: Boolean(welcomeBonus),
          referralInviteeUsed: Boolean(referral?.referralRewardClaimed),
        },
        update: {
          welcomeBonusReceived: welcomeBonus
            ? true
            : undefined,
          referralInviteeUsed: referral?.referralRewardClaimed
            ? true
            : undefined,
        },
      })

      // 3. Reassign orders to the placeholder buyer and scrub personal data.
      const placeholderId = await getOrCreateDeletedUserPlaceholder(tx)
      await tx.order.updateMany({
        where: { buyerId: user.id },
        data: {
          buyerId: placeholderId,
          deliveryAddress: 'حساب محذوف',
          deliveryAddressDetails: null,
          deliveryCity: 'حساب محذوف',
          deliveryCityId: null,
          deliveryAreaId: null,
          buyerNotes: null,
        },
      })

      // 4. Delete the user. Cascades handle cart, notifications, loyalty
      //    balance/transactions, referral, requests, discount-code usages,
      //    redeemed rewards, campaign progress; device tokens are nullified.
      await tx.user.delete({ where: { id: user.id } })
    })

    return { success: true }
  } catch (error) {
    console.error('[actions/account.deleteAccount]', error)
    return { success: false, error: 'فشل حذف الحساب' }
  }
}
