// OTP Provider Interface & Twilio Verify Implementation

import type { OtpChannel, OtpProviderInterface, OtpProviderResult, OtpVerifyResult } from './types'
import { OTP_CONFIG } from './config'

/**
 * Twilio Verify OTP Provider
 * Uses Twilio Verify service for WhatsApp and SMS OTP delivery
 */
export class TwilioOtpProvider implements OtpProviderInterface {
  private accountSid: string
  private authToken: string
  private serviceSid: string
  private baseUrl: string

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || ''
    this.authToken = process.env.TWILIO_AUTH_TOKEN || ''
    this.serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID || ''
    this.baseUrl = `https://verify.twilio.com/v2/Services/${this.serviceSid}`

    if (!this.accountSid || !this.authToken || !this.serviceSid) {
      console.warn('[OTP] Twilio credentials not configured. OTP sending will fail.')
    }
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')
    return `Basic ${credentials}`
  }

  async sendOtp(phone: string, channel: OtpChannel): Promise<OtpProviderResult> {
    try {
      const twilioChannel = channel === 'whatsapp' ? 'whatsapp' : 'sms'

      const response = await fetch(`${this.baseUrl}/Verifications`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: phone,
          Channel: twilioChannel,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('[OTP] Twilio send error:', data.message || data.code)
        return {
          success: false,
          error: data.message || 'Failed to send OTP',
          channel,
        }
      }

      console.log(`[OTP] Sent via ${channel} to ${phone.slice(0, 7)}*** - SID: ${data.sid}`)

      return {
        success: true,
        sid: data.sid,
        channel,
      }
    } catch (error) {
      console.error('[OTP] Twilio send exception:', error)
      return {
        success: false,
        error: 'OTP service unavailable',
        channel,
      }
    }
  }

  async verifyOtp(phone: string, code: string): Promise<OtpVerifyResult> {
    try {
      const response = await fetch(`${this.baseUrl}/VerificationCheck`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: phone,
          Code: code,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('[OTP] Twilio verify error:', data.message || data.code)
        return {
          success: false,
          error: data.message || 'Verification failed',
        }
      }

      if (data.status === 'approved') {
        console.log(`[OTP] Verified successfully for ${phone.slice(0, 7)}***`)
        return { success: true }
      }

      return {
        success: false,
        error: 'Invalid OTP code',
      }
    } catch (error) {
      console.error('[OTP] Twilio verify exception:', error)
      return {
        success: false,
        error: 'Verification service unavailable',
      }
    }
  }
}

/**
 * Development/Testing OTP Provider
 * Always succeeds with the configured dev code
 */
export class DevOtpProvider implements OtpProviderInterface {
  async sendOtp(phone: string, channel: OtpChannel): Promise<OtpProviderResult> {
    console.log(`[OTP-DEV] Mock send to ${phone} via ${channel} - Code: ${OTP_CONFIG.DEV_OTP_CODE}`)
    return {
      success: true,
      sid: `dev_${Date.now()}`,
      channel,
    }
  }

  async verifyOtp(phone: string, code: string): Promise<OtpVerifyResult> {
    const isValid = code === OTP_CONFIG.DEV_OTP_CODE
    console.log(`[OTP-DEV] Verify ${phone}: code=${code}, valid=${isValid}`)
    return {
      success: isValid,
      error: isValid ? undefined : 'Invalid OTP code',
    }
  }
}

/**
 * Factory function to get the appropriate OTP provider
 */
export function getOtpProvider(): OtpProviderInterface {
  if (OTP_CONFIG.DEV_MODE) {
    return new DevOtpProvider()
  }
  return new TwilioOtpProvider()
}
