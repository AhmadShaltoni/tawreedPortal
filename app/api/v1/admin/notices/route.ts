import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const noticeSchema = z.object({
  text: z.string().min(1).max(255),
  backgroundColor: z.string().regex(/^#[0-9A-F]{6}$/i),
  textColor: z.string().regex(/^#[0-9A-F]{6}$/i),
})

/**
 * GET /api/v1/admin/notices
 * Admin only - returns all notices including inactive ones
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'غير مصرح بالدخول' },
        { status: 401 }
      )
    }

    const notices = await db.notice.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      data: notices,
    })
  } catch (error) {
    console.error('[api/v1/admin/notices] GET error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'فشل في جلب النوتس',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/admin/notices
 * Admin only - create a new notice
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'غير مصرح بالدخول' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validated = noticeSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'بيانات غير صحيحة',
          errors: validated.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const notice = await db.notice.create({
      data: validated.data,
    })

    return NextResponse.json(
      {
        success: true,
        data: notice,
        message: 'تم إنشاء النوتس بنجاح',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[api/v1/admin/notices] POST error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'فشل في إنشاء النوتس',
      },
      { status: 500 }
    )
  }
}
