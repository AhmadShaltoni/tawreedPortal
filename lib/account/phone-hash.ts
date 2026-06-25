import { createHmac } from 'crypto'
import { normalizeJordanPhone } from '@/lib/otp/validators'

/**
 * Produce a stable, non-reversible hash of a phone number for use in
 * account-deletion abuse-prevention records.
 *
 * The phone number is first normalized to E.164 (+962XXXXXXXXX) so that the
 * same number hashes identically regardless of the format it was entered in.
 * We use HMAC-SHA256 keyed with AUTH_SECRET (rather than a plain SHA-256) so
 * that the hashes cannot be reversed via a precomputed rainbow table of the
 * limited Jordanian mobile number space.
 *
 * Returns null when the phone number is not a valid Jordanian mobile number.
 */
export function hashPhone(phone: string): string | null {
  const normalized = normalizeJordanPhone(phone)
  if (!normalized) return null

  const secret = process.env.AUTH_SECRET
  if (!secret) {
    throw new Error('AUTH_SECRET is not configured')
  }

  return createHmac('sha256', secret).update(normalized).digest('hex')
}
