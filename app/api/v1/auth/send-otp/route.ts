// POST /api/v1/auth/send-otp
// Send OTP via WhatsApp (with SMS fallback)

import { NextRequest, NextResponse } from 'next/server'
import { sendOtp } from '@/lib/otp'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone } = body

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'رقم الهاتف مطلوب' },
        { status: 400 }
      )
    }

    const result = await sendOtp(phone)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.statusCode || 400 }
      )
    }

    return NextResponse.json(result.data, { status: 200 })
  } catch (error) {
    console.error('[API] send-otp error:', error)
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}
