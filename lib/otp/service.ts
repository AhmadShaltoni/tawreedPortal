// OTP Service - Core Business Logic

import { OTP_CONFIG } from './config'
import { getOtpProvider } from './provider'
import { checkRateLimit, resetRateLimit } from './rate-limiter'
import { validatePhone, normalizeJordanPhone } from './validators'
import type {
  OtpChannel,
  OtpSessionStatus,
  SendOtpResponse,
  VerifyOtpResponse,
  OtpStatusResponse,
} from './types'

// In-memory OTP session store
// For production with multiple server instances, use Redis or database
interface OtpSession {
  phone: string
  channel: OtpChannel
  status: OtpSessionStatus
  sentAt: number
  expiresAt: number
  smsFallbackAllowedAt: number
  attempts: number
  twilioSid?: string
}

const otpSessions = new Map<string, OtpSession>()

// Cleanup expired sessions every minute
setInterval(() => {
  const now = Date.now()
  for (const [key, session] of otpSessions.entries()) {
    if (now > session.expiresAt) {
      otpSessions.delete(key)
    }
  }
}, 60 * 1000)

/**
 * Send OTP - Primary flow
 * 1. Validates phone number
 * 2. Checks rate limit
 * 3. Attempts WhatsApp first
 * 4. Falls back to SMS if WhatsApp fails immediately
 */
export async function sendOtp(phone: string): Promise<{ success: boolean; data?: SendOtpResponse; error?: string; statusCode?: number }> {
  // Validate phone
  const validation = validatePhone(phone)
  if (!validation.valid || !validation.normalized) {
    return { success: false, error: validation.error, statusCode: 400 }
  }

  const normalizedPhone = validation.normalized

  // Check rate limit
  const rateLimit = checkRateLimit(normalizedPhone)
  if (!rateLimit.allowed) {
    return { success: false, error: rateLimit.error, statusCode: 429 }
  }

  const provider = getOtpProvider()
  const now = Date.now()
  const expiresAt = now + OTP_CONFIG.EXPIRATION_SECONDS * 1000
  const smsFallbackAllowedAt = now + OTP_CONFIG.SMS_FALLBACK_DELAY_SECONDS * 1000

  // Try WhatsApp first
  console.log(`[OTP] Attempting WhatsApp delivery to ${normalizedPhone.slice(0, 7)}***`)
  const whatsappResult = await provider.sendOtp(normalizedPhone, 'whatsapp')

  let finalChannel: OtpChannel = 'whatsapp'
  let finalSid = whatsappResult.sid

  if (!whatsappResult.success) {
    // WhatsApp failed immediately - fallback to SMS
    console.log(`[OTP] WhatsApp failed, falling back to SMS for ${normalizedPhone.slice(0, 7)}***`)
    const smsResult = await provider.sendOtp(normalizedPhone, 'sms')

    if (!smsResult.success) {
      console.error(`[OTP] Both channels failed for ${normalizedPhone.slice(0, 7)}***`)
      return {
        success: false,
        error: 'فشل في إرسال رمز التحقق. يرجى المحاولة لاحقاً',
        statusCode: 503,
      }
    }

    finalChannel = 'sms'
    finalSid = smsResult.sid
  }

  // Store OTP session
  const session: OtpSession = {
    phone: normalizedPhone,
    channel: finalChannel,
    status: 'pending',
    sentAt: now,
    expiresAt,
    smsFallbackAllowedAt,
    attempts: 0,
    twilioSid: finalSid,
  }
  otpSessions.set(normalizedPhone, session)

  return {
    success: true,
    data: {
      success: true,
      channel: finalChannel,
      message: finalChannel === 'whatsapp'
        ? 'تم إرسال رمز التحقق عبر واتساب'
        : 'تم إرسال رمز التحقق عبر رسالة نصية',
      expiresAt: new Date(expiresAt).toISOString(),
      smsFallbackAllowedAt: new Date(smsFallbackAllowedAt).toISOString(),
    },
  }
}

/**
 * Verify OTP code
 */
export async function verifyOtp(
  phone: string,
  code: string
): Promise<{ success: boolean; data?: VerifyOtpResponse; error?: string; statusCode?: number }> {
  // Validate phone
  const validation = validatePhone(phone)
  if (!validation.valid || !validation.normalized) {
    return { success: false, error: validation.error, statusCode: 400 }
  }

  const normalizedPhone = validation.normalized

  // Validate code format (6 digits)
  if (!code || !/^\d{6}$/.test(code)) {
    return { success: false, error: 'رمز التحقق يجب أن يكون 6 أرقام', statusCode: 400 }
  }

  // Check session exists
  const session = otpSessions.get(normalizedPhone)
  if (!session) {
    return { success: false, error: 'لا يوجد رمز تحقق نشط لهذا الرقم. أعد إرسال الرمز', statusCode: 400 }
  }

  // Check expiration
  if (Date.now() > session.expiresAt) {
    session.status = 'expired'
    otpSessions.delete(normalizedPhone)
    return { success: false, error: 'انتهت صلاحية رمز التحقق. أعد إرسال الرمز', statusCode: 400 }
  }

  // Check max attempts
  if (session.attempts >= OTP_CONFIG.MAX_VERIFY_ATTEMPTS) {
    session.status = 'max_attempts'
    otpSessions.delete(normalizedPhone)
    return {
      success: false,
      error: 'تم تجاوز الحد الأقصى لمحاولات التحقق. أعد إرسال الرمز',
      statusCode: 429,
    }
  }

  // Increment attempts
  session.attempts += 1

  // Verify with provider
  const provider = getOtpProvider()
  const result = await provider.verifyOtp(normalizedPhone, code)

  if (!result.success) {
    const remaining = OTP_CONFIG.MAX_VERIFY_ATTEMPTS - session.attempts
    return {
      success: false,
      error: `رمز التحقق غير صحيح. المحاولات المتبقية: ${remaining}`,
      statusCode: 400,
    }
  }

  // Success - mark verified and cleanup
  session.status = 'verified'
  otpSessions.delete(normalizedPhone)
  resetRateLimit(normalizedPhone)

  return {
    success: true,
    data: {
      success: true,
      message: 'تم التحقق بنجاح',
    },
  }
}

/**
 * Resend OTP via SMS (manual fallback after 3 minutes)
 */
export async function resendViaSms(phone: string): Promise<{ success: boolean; data?: SendOtpResponse; error?: string; statusCode?: number }> {
  // Validate phone
  const validation = validatePhone(phone)
  if (!validation.valid || !validation.normalized) {
    return { success: false, error: validation.error, statusCode: 400 }
  }

  const normalizedPhone = validation.normalized

  // Check rate limit
  const rateLimit = checkRateLimit(normalizedPhone)
  if (!rateLimit.allowed) {
    return { success: false, error: rateLimit.error, statusCode: 429 }
  }

  // Check if there's an active session
  const session = otpSessions.get(normalizedPhone)
  if (!session) {
    return { success: false, error: 'لا يوجد رمز تحقق نشط. أعد إرسال الرمز من البداية', statusCode: 400 }
  }

  // Check if SMS fallback is allowed (3 minute wait)
  const now = Date.now()
  if (now < session.smsFallbackAllowedAt) {
    const remainingSeconds = Math.ceil((session.smsFallbackAllowedAt - now) / 1000)
    return {
      success: false,
      error: `يرجى الانتظار ${remainingSeconds} ثانية قبل طلب رسالة نصية`,
      statusCode: 400,
    }
  }

  // Send via SMS
  const provider = getOtpProvider()
  const smsResult = await provider.sendOtp(normalizedPhone, 'sms')

  if (!smsResult.success) {
    return {
      success: false,
      error: 'فشل في إرسال الرسالة النصية. يرجى المحاولة لاحقاً',
      statusCode: 503,
    }
  }

  // Update session
  const newExpiresAt = now + OTP_CONFIG.EXPIRATION_SECONDS * 1000
  session.channel = 'sms'
  session.sentAt = now
  session.expiresAt = newExpiresAt
  session.attempts = 0
  session.twilioSid = smsResult.sid

  return {
    success: true,
    data: {
      success: true,
      channel: 'sms',
      message: 'تم إرسال رمز التحقق عبر رسالة نصية',
      expiresAt: new Date(newExpiresAt).toISOString(),
      smsFallbackAllowedAt: new Date(now).toISOString(), // Already allowed
    },
  }
}

/**
 * Get OTP session status
 */
export function getOtpStatus(phone: string): { success: boolean; data?: OtpStatusResponse; error?: string; statusCode?: number } {
  const normalized = normalizeJordanPhone(phone)
  if (!normalized) {
    return { success: false, error: 'رقم الهاتف غير صالح', statusCode: 400 }
  }

  const session = otpSessions.get(normalized)
  if (!session) {
    return { success: false, error: 'لا يوجد رمز تحقق نشط لهذا الرقم', statusCode: 404 }
  }

  const now = Date.now()

  // Check if expired
  if (now > session.expiresAt) {
    otpSessions.delete(normalized)
    return { success: false, error: 'انتهت صلاحية رمز التحقق', statusCode: 400 }
  }

  const remainingSeconds = Math.ceil((session.expiresAt - now) / 1000)
  const smsFallbackAllowed = now >= session.smsFallbackAllowedAt

  return {
    success: true,
    data: {
      phone: normalized,
      status: session.status,
      channel: session.channel,
      sentAt: new Date(session.sentAt).toISOString(),
      expiresAt: new Date(session.expiresAt).toISOString(),
      remainingSeconds,
      smsFallbackAllowed,
      smsFallbackAllowedAt: new Date(session.smsFallbackAllowedAt).toISOString(),
      attempts: session.attempts,
      maxAttempts: OTP_CONFIG.MAX_VERIFY_ATTEMPTS,
    },
  }
}
