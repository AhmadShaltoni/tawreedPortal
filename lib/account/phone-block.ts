import { db } from '@/lib/db'
import { hashPhone } from '@/lib/account/phone-hash'
import { normalizeJordanPhone } from '@/lib/otp/validators'

/**
 * Produce a masked, non-identifying representation of a Jordanian phone number
 * for admin display in the blocklist (e.g. "079****98"). Returns null when the
 * phone is not a valid Jordanian mobile number.
 *
 * The full number is never stored for blocked phones — only this masked form
 * plus the irreversible HMAC hash used for lookups.
 */
export function maskPhone(phone: string): string | null {
  const normalized = normalizeJordanPhone(phone) // +962XXXXXXXXX
  if (!normalized) return null
  const local = `0${normalized.slice(4)}` // 07XXXXXXXX
  return `${local.slice(0, 3)}****${local.slice(-2)}`
}

/**
 * Returns true when the given phone number has been blocked by an admin and is
 * therefore barred from registering (or re-registering) an account.
 *
 * Fails open (returns false) only when the phone cannot be normalized, since a
 * malformed phone can never match a stored hash anyway.
 */
export async function isPhoneBlocked(phone: string): Promise<boolean> {
  const phoneNumberHash = hashPhone(phone)
  if (!phoneNumberHash) return false

  const blocked = await db.blockedPhone.findUnique({
    where: { phoneNumberHash },
    select: { id: true },
  })
  return Boolean(blocked)
}

/**
 * Standard error payload returned by registration flows when a phone is blocked.
 */
export const BLOCKED_PHONE_MESSAGE =
  'هذا الرقم محظور من إنشاء حساب. تواصل مع الدعم'
