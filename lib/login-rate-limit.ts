import { db } from '@/lib/db'

// Failed-login throttle: after MAX_ATTEMPTS failures within WINDOW, the
// identifier (phone) is blocked for BLOCK_DURATION. A successful login clears it.
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const BLOCK_DURATION_MS = 15 * 60 * 1000 // 15 minutes

export interface LoginRateResult {
  allowed: boolean
  retryAfterSeconds: number
}

// Call before verifying a password. Returns allowed=false while blocked.
export async function checkLoginRateLimit(identifier: string): Promise<LoginRateResult> {
  try {
    const entry = await db.loginRateLimit.findUnique({ where: { identifier } })
    if (!entry) return { allowed: true, retryAfterSeconds: 0 }

    if (entry.blockedUntil && entry.blockedUntil > new Date()) {
      const retryAfterSeconds = Math.ceil((entry.blockedUntil.getTime() - Date.now()) / 1000)
      return { allowed: false, retryAfterSeconds }
    }
    return { allowed: true, retryAfterSeconds: 0 }
  } catch (err) {
    // Fail open: never block logins because the throttle store is unavailable.
    console.error('[login-rate-limit] check failed:', err)
    return { allowed: true, retryAfterSeconds: 0 }
  }
}

// Call after a failed password attempt. Escalates to a block at the threshold.
export async function recordFailedLogin(identifier: string): Promise<void> {
  try {
    const now = new Date()
    const entry = await db.loginRateLimit.findUnique({ where: { identifier } })

    // No record, or the previous window has expired → start a fresh window.
    if (!entry || now.getTime() - entry.windowStart.getTime() > WINDOW_MS) {
      await db.loginRateLimit.upsert({
        where: { identifier },
        create: { identifier, attempts: 1, windowStart: now, blockedUntil: null },
        update: { attempts: 1, windowStart: now, blockedUntil: null },
      })
      return
    }

    const attempts = entry.attempts + 1
    const blockedUntil = attempts >= MAX_ATTEMPTS ? new Date(now.getTime() + BLOCK_DURATION_MS) : null
    await db.loginRateLimit.update({
      where: { identifier },
      data: { attempts, blockedUntil },
    })
  } catch (err) {
    console.error('[login-rate-limit] record failed:', err)
  }
}

// Call after a successful login to reset the counter.
export async function clearLoginRateLimit(identifier: string): Promise<void> {
  try {
    await db.loginRateLimit.deleteMany({ where: { identifier } })
  } catch (err) {
    console.error('[login-rate-limit] clear failed:', err)
  }
}
