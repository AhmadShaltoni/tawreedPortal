// OTP Phone Number Validators

import { OTP_CONFIG } from './config'

/**
 * Normalize a Jordanian phone number to E.164 format (+962XXXXXXXXX)
 */
export function normalizeJordanPhone(phone: string): string | null {
  // Remove spaces, dashes, parentheses
  const cleaned = phone.replace(/[\s\-()]/g, '')

  // Match Jordanian mobile numbers
  const match = cleaned.match(/^(?:\+962|00962|0)(7[789]\d{7})$/)
  if (!match) return null

  return `+962${match[1]}`
}

/**
 * Validate that a phone number is a valid Jordanian mobile number
 */
export function validatePhone(phone: string): { valid: boolean; error?: string; normalized?: string } {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'رقم الهاتف مطلوب' }
  }

  const cleaned = phone.replace(/[\s\-()]/g, '')

  if (!OTP_CONFIG.JORDAN_PHONE_REGEX.test(cleaned)) {
    return {
      valid: false,
      error: 'رقم الهاتف غير صالح. يجب أن يكون رقم أردني (07XXXXXXXX)',
    }
  }

  const normalized = normalizeJordanPhone(cleaned)
  if (!normalized) {
    return { valid: false, error: 'فشل في معالجة رقم الهاتف' }
  }

  return { valid: true, normalized }
}
