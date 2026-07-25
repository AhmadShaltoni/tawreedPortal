'use server'

import { db } from '@/lib/db'
import { hashPhone } from '@/lib/account/phone-hash'
import { purgeUserWithinTx } from '@/lib/account/purge-user'
import type { ActionResponse } from '@/types'

/**
 * Permanently delete a buyer's own account and all personal data, while
 * preserving non-personal records needed to prevent coupon/bonus abuse after a
 * user deletes and re-registers with the same phone number.
 *
 * This is the self-service (mobile) path and is restricted to BUYER accounts.
 * The shared deletion routine lives in `lib/account/purge-user.ts` and is also
 * used by the admin delete in `actions/users.ts`.
 *
 * The user's JWT becomes invalid immediately because the user no longer exists.
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

    if (!hashPhone(user.phone)) {
      return { success: false, error: 'رقم الهاتف غير صالح' }
    }

    await db.$transaction((tx) => purgeUserWithinTx(tx, user))

    return { success: true }
  } catch (error) {
    console.error('[actions/account.deleteAccount]', error)
    return { success: false, error: 'فشل حذف الحساب' }
  }
}
