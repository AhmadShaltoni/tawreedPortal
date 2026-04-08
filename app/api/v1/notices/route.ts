import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/v1/notices
 * Public endpoint - returns only active notices for mobile app
 * Only returns notices with isMobileOnly = true
 */
export async function GET(request: NextRequest) {
  try {
    // Check if this is a mobile request or website request
    // Mobile app requests should include a special header or user agent
    const userAgent = request.headers.get('user-agent') || ''
    const isMobileRequest = request.headers.get('x-mobile-app') === 'true'

    const notices = await db.notice.findMany({
      where: {
        isActive: true,
        // Only show notices marked for mobile
        isMobileOnly: true,
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
    console.error('[api/v1/notices] GET error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'فشل في جلب النوتس',
      },
      { status: 500 }
    )
  }
}
