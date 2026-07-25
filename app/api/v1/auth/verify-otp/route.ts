// POST /api/v1/auth/verify-otp
// Verify OTP code and authenticate user

import { NextRequest, NextResponse } from 'next/server'
import { verifyOtp } from '@/lib/otp'
import { normalizeJordanPhone } from '@/lib/otp'
import { db } from '@/lib/db'
import { encode } from 'next-auth/jwt'
import { isPhoneBlocked, BLOCKED_PHONE_MESSAGE } from '@/lib/account/phone-block'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, code } = body

    if (!phone || !code) {
      return NextResponse.json(
        { success: false, error: 'رقم الهاتف ورمز التحقق مطلوبان' },
        { status: 400 }
      )
    }

    // Verify the OTP
    const result = await verifyOtp(phone, code)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.statusCode || 400 }
      )
    }

    // OTP verified - find or create user
    const normalizedPhone = normalizeJordanPhone(phone)
    if (!normalizedPhone) {
      return NextResponse.json(
        { success: false, error: 'رقم الهاتف غير صالح' },
        { status: 400 }
      )
    }

    // Reject phones the admin has blocked from creating/using accounts.
    if (await isPhoneBlocked(normalizedPhone)) {
      return NextResponse.json(
        { success: false, error: BLOCKED_PHONE_MESSAGE },
        { status: 403 }
      )
    }

    // Convert to local format for database lookup (07XXXXXXXX)
    const localPhone = `0${normalizedPhone.slice(4)}` // +962 -> 0

    let user = await db.user.findUnique({
      where: { phone: localPhone },
      select: {
        id: true,
        phone: true,
        username: true,
        role: true,
        storeName: true,
        isActive: true,
      },
    })

    let isNewUser = false

    if (!user) {
      // New user - create account with minimal info
      // They will complete their profile later
      isNewUser = true
      user = await db.user.create({
        data: {
          phone: localPhone,
          username: localPhone, // Temporary - user can update later
          passwordHash: '', // No password for OTP users
          role: 'BUYER', // Default role
          isVerified: true, // Phone verified via OTP
        },
        select: {
          id: true,
          phone: true,
          username: true,
          role: true,
          storeName: true,
          isActive: true,
        },
      })
    } else if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: 'الحساب معطل. تواصل مع الدعم' },
        { status: 403 }
      )
    }

    // Mark user as verified if not already
    if (!isNewUser) {
      await db.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      })
    }

    // Generate JWT token
    const secret = process.env.AUTH_SECRET
    if (!secret) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const token = await encode({
      token: {
        id: user.id,
        phone: user.phone,
        username: user.username,
        role: user.role,
        storeName: user.storeName,
      },
      salt: '',
      secret,
    })

    // Register device token if provided
    const deviceToken = body.deviceToken
    if (deviceToken && user) {
      await db.deviceToken.upsert({
        where: { token: deviceToken },
        create: {
          token: deviceToken,
          userId: user.id,
          platform: body.platform || 'unknown',
        },
        update: {
          userId: user.id,
          platform: body.platform || 'unknown',
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'تم التحقق بنجاح',
      token,
      user: {
        id: user.id,
        phone: user.phone,
        username: user.username,
        role: user.role,
        storeName: user.storeName,
        isNewUser,
      },
    })
  } catch (error) {
    console.error('[API] verify-otp error:', error)
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}
