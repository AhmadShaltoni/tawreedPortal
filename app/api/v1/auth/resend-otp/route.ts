// POST /api/v1/auth/resend-otp
// Resend OTP via WhatsApp

import { NextRequest, NextResponse } from 'next/server'
import { resendOtp } from '@/lib/otp'

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

    const result = await resendOtp(phone)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.statusCode || 400 }
      )
    }

    return NextResponse.json(result.data, { status: 200 })
  } catch (error) {
    console.error('[API] resend-otp error:', error)
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}
