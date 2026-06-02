// POST /api/v1/auth/resend-sms-otp
// Resend OTP via SMS (manual fallback after 3 minutes)

import { NextRequest, NextResponse } from 'next/server'
import { resendViaSms } from '@/lib/otp'

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

    const result = await resendViaSms(phone)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.statusCode || 400 }
      )
    }

    return NextResponse.json(result.data, { status: 200 })
  } catch (error) {
    console.error('[API] resend-sms-otp error:', error)
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}
