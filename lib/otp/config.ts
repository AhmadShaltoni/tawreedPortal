// OTP System Configuration

export const OTP_CONFIG = {
  // OTP expiration time in seconds (5 minutes)
  EXPIRATION_SECONDS: 5 * 60,

  // Cooldown between resend requests (seconds)
  RESEND_COOLDOWN_SECONDS: 60,

  // Maximum verification attempts per OTP session
  MAX_VERIFY_ATTEMPTS: 5,

  // Rate limiting: max OTP requests per phone per window
  RATE_LIMIT_MAX_REQUESTS: 5,

  // Rate limiting: window duration in seconds (15 minutes)
  RATE_LIMIT_WINDOW_SECONDS: 15 * 60,

  // Phone number validation for Jordan
  JORDAN_PHONE_REGEX: /^(\+962|00962|0)7[789]\d{7}$/,

  // Development mode - bypass WhatsApp and use fixed code.
  // Hard-guarded so it can NEVER activate in production even if the env var
  // is accidentally set there (would otherwise make every OTP = DEV_OTP_CODE).
  DEV_MODE: process.env.OTP_DEV_MODE === 'true' && process.env.NODE_ENV !== 'production',

  // Development OTP code (only works in dev mode)
  DEV_OTP_CODE: '123456',
} as const
