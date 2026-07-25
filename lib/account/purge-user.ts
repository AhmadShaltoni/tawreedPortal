import type { Prisma } from '@prisma/client'
import { hashPhone } from '@/lib/account/phone-hash'
import { getOrCreateDeletedUserPlaceholder } from '@/lib/account/deleted-user'

/**
 * Core account-deletion routine shared by the buyer self-service delete
 * (`actions/account.ts`) and the admin delete (`actions/users.ts`).
 *
 * Runs entirely inside the caller's transaction and:
 * 1. Preserves single-use / per-user coupon usages keyed by phone hash so a
 *    deleted+re-registered number cannot re-consume the same code.
 * 2. Records one-time-grant flags (welcome bonus, referral invitee) so they
 *    cannot be re-claimed after re-registering with the same phone.
 * 3. Reassigns the user's orders — both as buyer and as supplier — to the
 *    shared "حساب محذوف" placeholder so business/financial history is retained
 *    with no personal data (buyer delivery details are scrubbed).
 * 4. Deletes the user; cascades remove cart, notifications, loyalty data,
 *    referrals, requests, offers, etc.; device tokens are nullified.
 *
 * Any JWT for this user becomes invalid immediately because the row is gone.
 */
export async function purgeUserWithinTx(
  tx: Prisma.TransactionClient,
  user: { id: string; phone: string }
): Promise<void> {
  const phoneNumberHash = hashPhone(user.phone)

  // 1. Preserve single-use coupon usage by phone hash (abuse prevention).
  //    Skipped when the phone can't be normalized (e.g. placeholder numbers).
  if (phoneNumberHash) {
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
        welcomeBonusReceived: welcomeBonus ? true : undefined,
        referralInviteeUsed: referral?.referralRewardClaimed ? true : undefined,
      },
    })
  }

  // 3. Reassign orders to the placeholder buyer so history survives the delete.
  const placeholderId = await getOrCreateDeletedUserPlaceholder(tx)

  // Orders where the user was the buyer — scrub personal delivery details.
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

  // Orders where the user was the assigned supplier — keep the record but
  // point the supplier link at the placeholder so it reads "حساب محذوف".
  await tx.order.updateMany({
    where: { supplierId: user.id },
    data: { supplierId: placeholderId },
  })

  // 4. Delete the user. Cascades handle the rest.
  await tx.user.delete({ where: { id: user.id } })
}
