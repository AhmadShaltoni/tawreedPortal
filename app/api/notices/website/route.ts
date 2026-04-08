import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/notices/website
 * Public endpoint - returns only active notices for website display
 * Only returns notices with isMobileOnly = false
 */
export async function GET(request: NextRequest) {
  try {
    const notices = await db.notice.findMany({
      where: {
        isActive: true,
        // Only show notices NOT marked for mobile only (for website display)
        isMobileOnly: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        text: true,
        backgroundColor: true,
        textColor: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: notices,
    })
  } catch (error) {
    console.error('[api/notices/website] GET error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'فشل في جلب النوتس',
      },
      { status: 500 }
    )
  }
}
