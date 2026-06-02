// OTP Authentication System - Type Definitions

export type OtpChannel = 'whatsapp' | 'sms'

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

export interface ResendSmsRequest {
  phone: string
}

export interface OtpStatusResponse {
  phone: string
  status: OtpSessionStatus
  channel: OtpChannel
  sentAt: string
  expiresAt: string
  remainingSeconds: number
  smsFallbackAllowed: boolean
  smsFallbackAllowedAt: string | null
  attempts: number
  maxAttempts: number
}

export interface SendOtpResponse {
  success: boolean
  channel: OtpChannel
  message: string
  expiresAt: string
  smsFallbackAllowedAt: string
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

export interface OtpProviderResult {
  success: boolean
  sid?: string
  error?: string
  channel: OtpChannel
}

export interface OtpVerifyResult {
  success: boolean
  error?: string
}

export interface OtpProviderInterface {
  sendOtp(phone: string, channel: OtpChannel): Promise<OtpProviderResult>
  verifyOtp(phone: string, code: string): Promise<OtpVerifyResult>
}
