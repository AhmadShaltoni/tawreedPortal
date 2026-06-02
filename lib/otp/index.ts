// OTP Module - Public API
export { sendOtp, verifyOtp, resendViaSms, getOtpStatus } from './service'
export { validatePhone, normalizeJordanPhone } from './validators'
export { OTP_CONFIG } from './config'
export { getOtpProvider } from './provider'
export type * from './types'
