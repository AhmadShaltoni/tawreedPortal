import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { createDiscountCodeSchema } from '@/lib/validations'

export async function OPTIONS() {
  return corsOptions()
}

/**
 * GET /api/v1/admin/coupons
 * List all discount codes with usage stats (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await authenticateApiRequest(request)
    if (!user) return apiError(authError || 'Authentication required', 401)
    if (user.role !== 'ADMIN') return apiError('Admin access required', 403)

    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get('page')) || 1
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 100)

    const [codes, total] = await Promise.all([
      db.discountCode.findMany({
        include: { _count: { select: { usages: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.discountCode.count(),
    ])

    return apiResponse({
      codes,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('[api/v1/admin/coupons] GET error:', error)
    return apiError('فشل في جلب أكواد الخصم', 500)
  }
}

/**
 * POST /api/v1/admin/coupons
 * Create a new discount code (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await authenticateApiRequest(request)
    if (!user) return apiError(authError || 'Authentication required', 401)
    if (user.role !== 'ADMIN') return apiError('Admin access required', 403)

    const body = await request.json()
    const validated = createDiscountCodeSchema.safeParse(body)

    if (!validated.success) {
      return apiResponse({
        error: 'Validation failed',
        errors: validated.error.flatten().fieldErrors,
      }, 400)
    }

    // Check uniqueness
    const existing = await db.discountCode.findFirst({
      where: { code: { equals: validated.data.code, mode: 'insensitive' } },
    })
    if (existing) {
      return apiError('كود الخصم موجود بالفعل', 409)
    }

    const discountCode = await db.discountCode.create({
      data: {
        code: validated.data.code,
        discountPercent: validated.data.discountPercent,
        isSingleUse: validated.data.isSingleUse,
        maxUsage: validated.data.maxUsage ?? null,
        minOrderAmount: validated.data.minOrderAmount ?? null,
        startDate: validated.data.startDate,
        endDate: validated.data.endDate,
        isActive: validated.data.isActive,
      },
    })

    return apiResponse({ code: discountCode }, 201)
  } catch (error) {
    console.error('[api/v1/admin/coupons] POST error:', error)
    return apiError('فشل في إنشاء كود الخصم', 500)
  }
}
