// OTP Service - Database-backed, WhatsApp-only

import { randomInt, createHash } from 'crypto'
import { OTP_CONFIG } from './config'
import { sendWhatsAppOtp } from './provider'
import { validatePhone, normalizeJordanPhone } from './validators'
import { db } from '@/lib/db'
import type {
  OtpSessionStatus,
  SendOtpResponse,
  VerifyOtpResponse,
  OtpStatusResponse,
} from './types'

/**
 * Generate a cryptographically random 6-digit OTP code
 */
function generateOtpCode(): string {
  return randomInt(100000, 999999).toString()
}

/**
 * Hash OTP code for storage (SHA-256)
 */
function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

/**
 * Check rate limit from database
 */
async function checkRateLimit(phone: string): Promise<{ allowed: boolean; error?: string }> {
  const now = new Date()
  const windowMs = OTP_CONFIG.RATE_LIMIT_WINDOW_SECONDS * 1000
  const cooldownMs = OTP_CONFIG.RESEND_COOLDOWN_SECONDS * 1000

  const entry = await db.otpRateLimit.findUnique({ where: { phone } })

  if (!entry) {
    await db.otpRateLimit.create({
      data: { phone, attempts: 1, windowStart: now, lastRequest: now },
    })
    return { allowed: true }
  }

  // Check if window expired - reset
  if (now.getTime() - entry.windowStart.getTime() > windowMs) {
    await db.otpRateLimit.update({
      where: { phone },
      data: { attempts: 1, windowStart: now, lastRequest: now },
    })
    return { allowed: true }
  }

  // Check cooldown
  const timeSinceLast = now.getTime() - entry.lastRequest.getTime()
  if (timeSinceLast < cooldownMs) {
    const retryAfter = Math.ceil((cooldownMs - timeSinceLast) / 1000)
    return { allowed: false, error: `يرجى الانتظار ${retryAfter} ثانية قبل إعادة المحاولة` }
  }

  // Check max attempts in window
  if (entry.attempts >= OTP_CONFIG.RATE_LIMIT_MAX_REQUESTS) {
    const windowRemaining = Math.ceil(
      (windowMs - (now.getTime() - entry.windowStart.getTime())) / 1000
    )
    return {
      allowed: false,
      error: `تم تجاوز الحد الأقصى للمحاولات. يرجى الانتظار ${Math.ceil(windowRemaining / 60)} دقيقة`,
    }
  }

  // Allow and increment
  await db.otpRateLimit.update({
    where: { phone },
    data: { attempts: entry.attempts + 1, lastRequest: now },
  })
  return { allowed: true }
}

/**
 * Invalidate any existing pending sessions for this phone
 */
async function invalidateExistingSessions(phone: string): Promise<void> {
  await db.otpSession.updateMany({
    where: { phone, status: 'pending' },
    data: { status: 'expired' },
  })
}

/**
 * Send OTP via WhatsApp
 */
export async function sendOtp(phone: string): Promise<{ success: boolean; data?: SendOtpResponse; error?: string; statusCode?: number }> {
  const validation = validatePhone(phone)
  if (!validation.valid || !validation.normalized) {
    return { success: false, error: validation.error, statusCode: 400 }
  }

  const normalizedPhone = validation.normalized

  // Check rate limit
  const rateLimit = await checkRateLimit(normalizedPhone)
  if (!rateLimit.allowed) {
    return { success: false, error: rateLimit.error, statusCode: 429 }
  }

  // Generate OTP
  const code = OTP_CONFIG.DEV_MODE ? OTP_CONFIG.DEV_OTP_CODE : generateOtpCode()
  const hashedCode = hashCode(code)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + OTP_CONFIG.EXPIRATION_SECONDS * 1000)
  const resendAllowedAt = new Date(now.getTime() + OTP_CONFIG.RESEND_COOLDOWN_SECONDS * 1000)

  // Send via WhatsApp
  const result = await sendWhatsAppOtp(normalizedPhone, code)

  if (!result.success) {
    console.error(`[OTP] WhatsApp delivery failed for ${normalizedPhone.slice(0, 7)}***`)
    return {
      success: false,
      error: 'فشل في إرسال رمز التحقق عبر واتساب. يرجى المحاولة لاحقاً',
      statusCode: 503,
    }
  }

  // Invalidate old sessions and create new one in DB
  await invalidateExistingSessions(normalizedPhone)

  await db.otpSession.create({
    data: {
      phone: normalizedPhone,
      code: hashedCode,
      status: 'pending',
      attempts: 0,
      messageId: result.messageId,
      expiresAt,
    },
  })

  return {
    success: true,
    data: {
      success: true,
      message: 'تم إرسال رمز التحقق عبر واتساب',
      expiresAt: expiresAt.toISOString(),
      resendAllowedAt: resendAllowedAt.toISOString(),
    },
  }
}

/**
 * Verify OTP code against database session
 */
export async function verifyOtp(
  phone: string,
  code: string
): Promise<{ success: boolean; data?: VerifyOtpResponse; error?: string; statusCode?: number }> {
  const validation = validatePhone(phone)
  if (!validation.valid || !validation.normalized) {
    return { success: false, error: validation.error, statusCode: 400 }
  }

  const normalizedPhone = validation.normalized

  // Validate code format
  if (!code || !/^\d{6}$/.test(code)) {
    return { success: false, error: 'رمز التحقق يجب أن يكون 6 أرقام', statusCode: 400 }
  }

  // Find active session
  const session = await db.otpSession.findFirst({
    where: { phone: normalizedPhone, status: 'pending' },
    orderBy: { createdAt: 'desc' },
  })

  if (!session) {
    return { success: false, error: 'لا يوجد رمز تحقق نشط لهذا الرقم. أعد إرسال الرمز', statusCode: 400 }
  }

  // Check expiration
  if (new Date() > session.expiresAt) {
    await db.otpSession.update({
      where: { id: session.id },
      data: { status: 'expired' },
    })
    return { success: false, error: 'انتهت صلاحية رمز التحقق. أعد إرسال الرمز', statusCode: 400 }
  }

  // Check max attempts
  if (session.attempts >= OTP_CONFIG.MAX_VERIFY_ATTEMPTS) {
    await db.otpSession.update({
      where: { id: session.id },
      data: { status: 'max_attempts' },
    })
    return {
      success: false,
      error: 'تم تجاوز الحد الأقصى لمحاولات التحقق. أعد إرسال الرمز',
      statusCode: 429,
    }
  }

  // Increment attempts
  await db.otpSession.update({
    where: { id: session.id },
    data: { attempts: session.attempts + 1 },
  })

  // Verify code
  const hashedInput = hashCode(code)
  if (hashedInput !== session.code) {
    const remaining = OTP_CONFIG.MAX_VERIFY_ATTEMPTS - (session.attempts + 1)
    return {
      success: false,
      error: `رمز التحقق غير صحيح. المحاولات المتبقية: ${remaining}`,
      statusCode: 400,
    }
  }

  // Success - mark verified
  await db.otpSession.update({
    where: { id: session.id },
    data: { status: 'verified', verifiedAt: new Date() },
  })

  // Reset rate limit on success
  await db.otpRateLimit.deleteMany({ where: { phone: normalizedPhone } })

  return {
    success: true,
    data: {
      success: true,
      message: 'تم التحقق بنجاح',
    },
  }
}

/**
 * Resend OTP via WhatsApp (after cooldown)
 */
export async function resendOtp(phone: string): Promise<{ success: boolean; data?: SendOtpResponse; error?: string; statusCode?: number }> {
  const validation = validatePhone(phone)
  if (!validation.valid || !validation.normalized) {
    return { success: false, error: validation.error, statusCode: 400 }
  }

  const normalizedPhone = validation.normalized

  // Check rate limit
  const rateLimit = await checkRateLimit(normalizedPhone)
  if (!rateLimit.allowed) {
    return { success: false, error: rateLimit.error, statusCode: 429 }
  }

  // Check if there's an active session and cooldown
  const existingSession = await db.otpSession.findFirst({
    where: { phone: normalizedPhone, status: 'pending' },
    orderBy: { createdAt: 'desc' },
  })

  if (existingSession) {
    const cooldownMs = OTP_CONFIG.RESEND_COOLDOWN_SECONDS * 1000
    const timeSinceSent = Date.now() - existingSession.createdAt.getTime()
    if (timeSinceSent < cooldownMs) {
      const remainingSeconds = Math.ceil((cooldownMs - timeSinceSent) / 1000)
      return {
        success: false,
        error: `يرجى الانتظار ${remainingSeconds} ثانية قبل إعادة الإرسال`,
        statusCode: 400,
      }
    }
  }

  // Generate new OTP and send
  const code = OTP_CONFIG.DEV_MODE ? OTP_CONFIG.DEV_OTP_CODE : generateOtpCode()
  const hashedCode = hashCode(code)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + OTP_CONFIG.EXPIRATION_SECONDS * 1000)
  const resendAllowedAt = new Date(now.getTime() + OTP_CONFIG.RESEND_COOLDOWN_SECONDS * 1000)

  const result = await sendWhatsAppOtp(normalizedPhone, code)

  if (!result.success) {
    return {
      success: false,
      error: 'فشل في إعادة إرسال رمز التحقق. يرجى المحاولة لاحقاً',
      statusCode: 503,
    }
  }

  // Invalidate old sessions and create new one
  await invalidateExistingSessions(normalizedPhone)

  await db.otpSession.create({
    data: {
      phone: normalizedPhone,
      code: hashedCode,
      status: 'pending',
      attempts: 0,
      messageId: result.messageId,
      expiresAt,
    },
  })

  return {
    success: true,
    data: {
      success: true,
      message: 'تم إعادة إرسال رمز التحقق عبر واتساب',
      expiresAt: expiresAt.toISOString(),
      resendAllowedAt: resendAllowedAt.toISOString(),
    },
  }
}

/**
 * Get OTP session status from database
 */
export async function getOtpStatus(phone: string): Promise<{ success: boolean; data?: OtpStatusResponse; error?: string; statusCode?: number }> {
  const normalized = normalizeJordanPhone(phone)
  if (!normalized) {
    return { success: false, error: 'رقم الهاتف غير صالح', statusCode: 400 }
  }

  const session = await db.otpSession.findFirst({
    where: { phone: normalized, status: 'pending' },
    orderBy: { createdAt: 'desc' },
  })

  if (!session) {
    return { success: false, error: 'لا يوجد رمز تحقق نشط لهذا الرقم', statusCode: 404 }
  }

  const now = Date.now()

  // Check if expired
  if (now > session.expiresAt.getTime()) {
    await db.otpSession.update({
      where: { id: session.id },
      data: { status: 'expired' },
    })
    return { success: false, error: 'انتهت صلاحية رمز التحقق', statusCode: 400 }
  }

  const remainingSeconds = Math.ceil((session.expiresAt.getTime() - now) / 1000)
  const cooldownMs = OTP_CONFIG.RESEND_COOLDOWN_SECONDS * 1000
  const resendAllowed = (now - session.createdAt.getTime()) >= cooldownMs

  return {
    success: true,
    data: {
      phone: normalized,
      status: session.status as OtpSessionStatus,
      sentAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      remainingSeconds,
      resendAllowed,
      attempts: session.attempts,
      maxAttempts: OTP_CONFIG.MAX_VERIFY_ATTEMPTS,
    },
  }
}

/**
 * Cleanup expired OTP sessions (run periodically via cron or API)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await db.otpSession.updateMany({
    where: {
      status: 'pending',
      expiresAt: { lt: new Date() },
    },
    data: { status: 'expired' },
  })
  return result.count
}
