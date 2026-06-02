// OTP Rate Limiter - In-memory with periodic cleanup
// For production with multiple instances, replace with Redis

import { OTP_CONFIG } from './config'

interface RateLimitEntry {
  attempts: number
  windowStart: number
  lastRequest: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart > OTP_CONFIG.RATE_LIMIT_WINDOW_SECONDS * 1000) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

export interface RateLimitResult {
  allowed: boolean
  remainingAttempts: number
  retryAfterSeconds?: number
  error?: string
}

/**
 * Check if a phone number is rate limited for OTP requests
 */
export function checkRateLimit(phone: string): RateLimitResult {
  const now = Date.now()
  const entry = rateLimitStore.get(phone)

  if (!entry) {
    // First request
    rateLimitStore.set(phone, {
      attempts: 1,
      windowStart: now,
      lastRequest: now,
    })
    return { allowed: true, remainingAttempts: OTP_CONFIG.RATE_LIMIT_MAX_REQUESTS - 1 }
  }

  // Check if window has expired
  if (now - entry.windowStart > OTP_CONFIG.RATE_LIMIT_WINDOW_SECONDS * 1000) {
    // Reset window
    rateLimitStore.set(phone, {
      attempts: 1,
      windowStart: now,
      lastRequest: now,
    })
    return { allowed: true, remainingAttempts: OTP_CONFIG.RATE_LIMIT_MAX_REQUESTS - 1 }
  }

  // Check cooldown between requests
  const timeSinceLastRequest = (now - entry.lastRequest) / 1000
  if (timeSinceLastRequest < OTP_CONFIG.RESEND_COOLDOWN_SECONDS) {
    const retryAfter = Math.ceil(OTP_CONFIG.RESEND_COOLDOWN_SECONDS - timeSinceLastRequest)
    return {
      allowed: false,
      remainingAttempts: OTP_CONFIG.RATE_LIMIT_MAX_REQUESTS - entry.attempts,
      retryAfterSeconds: retryAfter,
      error: `يرجى الانتظار ${retryAfter} ثانية قبل إعادة المحاولة`,
    }
  }

  // Check max attempts in window
  if (entry.attempts >= OTP_CONFIG.RATE_LIMIT_MAX_REQUESTS) {
    const windowRemaining = Math.ceil(
      (OTP_CONFIG.RATE_LIMIT_WINDOW_SECONDS * 1000 - (now - entry.windowStart)) / 1000
    )
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds: windowRemaining,
      error: `تم تجاوز الحد الأقصى للمحاولات. يرجى الانتظار ${Math.ceil(windowRemaining / 60)} دقيقة`,
    }
  }

  // Allow request
  entry.attempts += 1
  entry.lastRequest = now
  return { allowed: true, remainingAttempts: OTP_CONFIG.RATE_LIMIT_MAX_REQUESTS - entry.attempts }
}

/**
 * Reset rate limit for a phone (e.g., after successful verification)
 */
export function resetRateLimit(phone: string): void {
  rateLimitStore.delete(phone)
}
