// OTP Authentication System - Type Definitions

export type OtpSessionStatus =
  | 'pending'       // OTP sent, waiting for verification
  | 'verified'      // Successfully verified
  | 'expired'       // OTP expired (5 minutes)
  | 'failed'        // Delivery failed
  | 'max_attempts'  // Too many wrong attempts

export interface SendOtpRequest {
  phone: string
}

export interface VerifyOtpRequest {
  phone: string
  code: string
}

export interface ResendOtpRequest {
  phone: string
}

export interface OtpStatusResponse {
  phone: string
  status: OtpSessionStatus
  sentAt: string
  expiresAt: string
  remainingSeconds: number
  resendAllowed: boolean
  attempts: number
  maxAttempts: number
}

export interface SendOtpResponse {
  success: boolean
  message: string
  expiresAt: string
  resendAllowedAt: string
}

export interface VerifyOtpResponse {
  success: boolean
  message: string
  token?: string
  user?: {
    id: string
    phone: string
    username: string
    role: string
    storeName?: string | null
    isNewUser: boolean
  }
}

export interface WhatsAppSendResult {
  success: boolean
  messageId?: string
  error?: string
}
