import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { createDiscountCodeSchema } from '@/lib/validations'

export async function OPTIONS() {
  return corsOptions()
}

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/admin/coupons/:id
 * Get a single discount code with usage details (admin only)
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const { user, error: authError } = await authenticateApiRequest(request)
    if (!user) return apiError(authError || 'Authentication required', 401)
    if (user.role !== 'ADMIN') return apiError('Admin access required', 403)

    const code = await db.discountCode.findUnique({
      where: { id },
      include: {
        usages: {
          include: { user: { select: { id: true, username: true, phone: true } } },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { usages: true } },
      },
    })

    if (!code) return apiError('كود الخصم غير موجود', 404)

    return apiResponse({ code })
  } catch (error) {
    console.error('[api/v1/admin/coupons/[id]] GET error:', error)
    return apiError('فشل في جلب كود الخصم', 500)
  }
}

/**
 * PUT /api/v1/admin/coupons/:id
 * Update a discount code (admin only)
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
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

    // Check uniqueness (exclude current record)
    const existing = await db.discountCode.findFirst({
      where: {
        code: { equals: validated.data.code, mode: 'insensitive' },
        id: { not: id },
      },
    })
    if (existing) {
      return apiError('كود الخصم موجود بالفعل', 409)
    }

    const discountCode = await db.discountCode.update({
      where: { id },
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

    return apiResponse({ code: discountCode })
  } catch (error) {
    console.error('[api/v1/admin/coupons/[id]] PUT error:', error)
    if ((error as any).code === 'P2025') {
      return apiError('كود الخصم غير موجود', 404)
    }
    return apiError('فشل في تعديل كود الخصم', 500)
  }
}

/**
 * DELETE /api/v1/admin/coupons/:id
 * Delete a discount code (admin only)
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const { user, error: authError } = await authenticateApiRequest(request)
    if (!user) return apiError(authError || 'Authentication required', 401)
    if (user.role !== 'ADMIN') return apiError('Admin access required', 403)

    await db.discountCode.delete({ where: { id } })

    return apiResponse({ message: 'تم حذف كود الخصم بنجاح' })
  } catch (error) {
    console.error('[api/v1/admin/coupons/[id]] DELETE error:', error)
    if ((error as any).code === 'P2025') {
      return apiError('كود الخصم غير موجود', 404)
    }
    return apiError('فشل في حذف كود الخصم', 500)
  }
}
