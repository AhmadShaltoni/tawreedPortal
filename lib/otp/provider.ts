// WhatsApp Business Cloud API - OTP Delivery Provider

import type { WhatsAppSendResult } from './types'
import { OTP_CONFIG } from './config'

/**
 * Send OTP via WhatsApp Business Cloud API using authentication template
 */
export async function sendWhatsAppOtp(phone: string, code: string): Promise<WhatsAppSendResult> {
  if (OTP_CONFIG.DEV_MODE) {
    console.log(`[OTP-DEV] Mock send to ${phone} - Code: ${code}`)
    return { success: true, messageId: `dev_${Date.now()}` }
  }

  const token = process.env.WHATSAPP_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const templateName = process.env.WHATSAPP_OTP_TEMPLATE_NAME

  if (!token || !phoneNumberId) {
    console.error('[OTP] WhatsApp Business API credentials not configured')
    return { success: false, error: 'WhatsApp API not configured' }
  }

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`

  // Build payload - use authentication template if configured, otherwise text
  let payload: Record<string, unknown>

  if (templateName) {
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'ar' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: code },
            ],
          },
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [
              { type: 'text', text: code },
            ],
          },
        ],
      },
    }
  } else {
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'text',
      text: {
        preview_url: false,
        body: `رمز التحقق الخاص بك في توريد: *${code}*\n\nلا تشارك هذا الرمز مع أي شخص.\nصالح لمدة 5 دقائق.`,
      },
    }
  }

  try {
    console.log(`[OTP] Sending WhatsApp message to ${phone.slice(0, 7)}***`)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[OTP] WhatsApp API error:', JSON.stringify(data.error || data))
      return {
        success: false,
        error: data.error?.message || 'Failed to send WhatsApp message',
      }
    }

    const messageId = data.messages?.[0]?.id || `wa_${Date.now()}`
    console.log(`[OTP] WhatsApp message sent to ${phone.slice(0, 7)}*** - ID: ${messageId}`)

    return { success: true, messageId }
  } catch (error) {
    console.error('[OTP] WhatsApp send exception:', error)
    return { success: false, error: 'WhatsApp service unavailable' }
  }
}
