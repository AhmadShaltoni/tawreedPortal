/**
 * Quick test script - Send OTP via WhatsApp Business API
 * Usage: npx tsx scripts/test-whatsapp-otp.ts
 */

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || 'EAAcUOLM7fhoBRkyyKP6pb5omPY1hPCB97Xc7TZCeK6lZAnPrMp66ZCuPndonEHOctps6OzZCjx1xGVvks5ImQCZCddWqV0C1kRg3OlQcLgQ7G7uZBf58ZCnxAcsZBqZCe6K9FWmVVv9HL0qGdeY271mueRVapyOC8OZBDuVwr4TW7OtWnIU1TKOCPdRdRHFq7ncNi4cV6U5xagr2twVn9mXZBm16cu8jl7zzkzNBvPEf14JweGlAU3wZAbaIjGP9qBczjHAkAtbrbwopyKZAdjM6rQevU0uh3KwZDZD'
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '1131047976765015'

const RECIPIENT_PHONE = '962798336958' // Your number (Jordan +962)
const OTP_CODE = '847291' // Test OTP code

async function sendWhatsAppOtp() {
  const url = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`

  // Try sending as text message first
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: RECIPIENT_PHONE,
    type: 'text',
    text: {
      preview_url: false,
      body: `رمز التحقق الخاص بك في توريد: *${OTP_CODE}*\n\nلا تشارك هذا الرمز مع أي شخص.\nصالح لمدة 5 دقائق.`,
    },
  }

  console.log('📱 Sending WhatsApp OTP...')
  console.log(`   To: +${RECIPIENT_PHONE}`)
  console.log(`   Code: ${OTP_CODE}`)
  console.log(`   API URL: ${url}`)
  console.log('')

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Failed to send!')
      console.error(`   Status: ${response.status}`)
      console.error(`   Error:`, JSON.stringify(data, null, 2))

      // If text message fails, try with hello_world template
      if (data.error?.code === 131030 || data.error?.message?.includes('template')) {
        console.log('\n🔄 Text message failed (no active conversation). Trying template...')
        await tryWithTemplate()
      }
    } else {
      console.log('✅ Message sent successfully!')
      console.log(`   Message ID: ${data.messages?.[0]?.id}`)
      console.log(`   Status: ${data.messages?.[0]?.message_status}`)
      console.log(JSON.stringify(data, null, 2))
    }
  } catch (error) {
    console.error('❌ Network error:', error)
  }
}

async function tryWithTemplate() {
  const url = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: RECIPIENT_PHONE,
    type: 'template',
    template: {
      name: 'hello_world',
      language: { code: 'en_US' },
    },
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Template also failed!')
      console.error(`   Error:`, JSON.stringify(data, null, 2))
      console.log('\n💡 You may need to create an authentication template in Meta Business Suite.')
    } else {
      console.log('✅ Template message sent! (hello_world)')
      console.log(`   Message ID: ${data.messages?.[0]?.id}`)
      console.log('\n💡 Now that a conversation is active, text messages should work within 24h.')
    }
  } catch (error) {
    console.error('❌ Network error:', error)
  }
}

sendWhatsAppOtp()
