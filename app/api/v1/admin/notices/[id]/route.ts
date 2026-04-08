import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const noticeSchema = z.object({
  text: z.string().min(1).max(255).optional(),
  backgroundColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  textColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
})

/**
 * PUT /api/v1/admin/notices/[id]
 * Admin only - update a notice
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const notice = await db.notice.update({
      where: { id },
      data: validated.data,
    })

    return NextResponse.json({
      success: true,
      data: notice,
      message: 'تم تحديث النوتس بنجاح',
    })
  } catch (error: any) {
    console.error('[api/v1/admin/notices/[id]] PUT error:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'النوتس غير موجود' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'فشل في تحديث النوتس',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/v1/admin/notices/[id]
 * Admin only - soft delete a notice
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'غير مصرح بالدخول' },
        { status: 401 }
      )
    }

    const notice = await db.notice.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({
      success: true,
      data: notice,
      message: 'تم حذف النوتس بنجاح',
    })
  } catch (error: any) {
    console.error('[api/v1/admin/notices/[id]] DELETE error:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'النوتس غير موجود' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'فشل في حذف النوتس',
      },
      { status: 500 }
    )
  }
}
