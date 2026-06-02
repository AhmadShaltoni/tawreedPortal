// GET /api/v1/auth/otp-status?phone=07XXXXXXXX
// Get current OTP session status

import { NextRequest, NextResponse } from 'next/server'
import { getOtpStatus } from '@/lib/otp'

export async function GET(request: NextRequest) {
  try {
    const phone = request.nextUrl.searchParams.get('phone')

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'رقم الهاتف مطلوب' },
        { status: 400 }
      )
    }

    const result = getOtpStatus(phone)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.statusCode || 400 }
      )
    }

    return NextResponse.json({ success: true, ...result.data }, { status: 200 })
  } catch (error) {
    console.error('[API] otp-status error:', error)
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}
