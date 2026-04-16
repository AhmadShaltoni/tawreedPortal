'use server'

import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { createDiscountCodeSchema } from '@/lib/validations'
import type { ActionResponse, DiscountCodeWithStats, DiscountCodeWithUsages } from '@/types'

interface DiscountCodeType {
  id: string
  code: string
  discountPercent: number
  isSingleUse: boolean
  maxUsage: number | null
  minOrderAmount: number | null
  startDate: Date | null
  endDate: Date | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Create a new discount code (admin only)
 */
export async function createDiscountCode(
  formData: FormData
): Promise<ActionResponse<DiscountCodeType>> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'غير مصرح بالدخول' }
    }

    const data = {
      code: formData.get('code'),
      discountPercent: formData.get('discountPercent'),
      isSingleUse: formData.get('isSingleUse') === 'true',
      maxUsage: formData.get('maxUsage') || null,
      minOrderAmount: formData.get('minOrderAmount') || null,
      startDate: formData.get('startDate') || null,
      endDate: formData.get('endDate') || null,
      isActive: formData.get('isActive') !== 'false',
    }

    const validated = createDiscountCodeSchema.safeParse(data)
    if (!validated.success) {
      return {
        success: false,
        errors: validated.error.flatten().fieldErrors,
      }
    }

    // Check uniqueness
    const existing = await db.discountCode.findFirst({
      where: { code: { equals: validated.data.code, mode: 'insensitive' } },
    })
    if (existing) {
      return { success: false, errors: { code: ['كود الخصم موجود بالفعل'] } }
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

    return { success: true, data: discountCode }
  } catch (error) {
    console.error('[discount-codes.create]', error)
    return { success: false, error: 'فشل في إنشاء كود الخصم' }
  }
}

/**
 * Update an existing discount code (admin only)
 */
export async function updateDiscountCode(
  id: string,
  formData: FormData
): Promise<ActionResponse<DiscountCodeType>> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'غير مصرح بالدخول' }
    }

    const data = {
      code: formData.get('code'),
      discountPercent: formData.get('discountPercent'),
      isSingleUse: formData.get('isSingleUse') === 'true',
      maxUsage: formData.get('maxUsage') || null,
      minOrderAmount: formData.get('minOrderAmount') || null,
      startDate: formData.get('startDate') || null,
      endDate: formData.get('endDate') || null,
      isActive: formData.get('isActive') !== 'false',
    }

    const validated = createDiscountCodeSchema.safeParse(data)
    if (!validated.success) {
      return {
        success: false,
        errors: validated.error.flatten().fieldErrors,
      }
    }

    // Check uniqueness (exclude current record)
    const existing = await db.discountCode.findFirst({
      where: {
        code: { equals: validated.data.code, mode: 'insensitive' },
        id: { not: id },
      },
    })
    if (existing) {
      return { success: false, errors: { code: ['كود الخصم موجود بالفعل'] } }
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

    return { success: true, data: discountCode }
  } catch (error) {
    console.error('[discount-codes.update]', error)
    if ((error as any).code === 'P2025') {
      return { success: false, error: 'كود الخصم غير موجود' }
    }
    return { success: false, error: 'فشل في تعديل كود الخصم' }
  }
}

/**
 * Get all discount codes with usage stats (admin only)
 */
export async function getAllDiscountCodes(): Promise<ActionResponse<DiscountCodeWithStats[]>> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'غير مصرح بالدخول' }
    }

    const codes = await db.discountCode.findMany({
      include: {
        _count: { select: { usages: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return { success: true, data: codes as DiscountCodeWithStats[] }
  } catch (error) {
    console.error('[discount-codes.getAll]', error)
    return { success: false, error: 'فشل في جلب أكواد الخصم' }
  }
}

/**
 * Get a single discount code with usage details (admin only)
 */
export async function getDiscountCodeById(
  id: string
): Promise<ActionResponse<DiscountCodeWithUsages>> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'غير مصرح بالدخول' }
    }

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

    if (!code) {
      return { success: false, error: 'كود الخصم غير موجود' }
    }

    return { success: true, data: code as DiscountCodeWithUsages }
  } catch (error) {
    console.error('[discount-codes.getById]', error)
    return { success: false, error: 'فشل في جلب كود الخصم' }
  }
}

/**
 * Toggle discount code active/inactive (admin only)
 */
export async function toggleDiscountCode(
  id: string
): Promise<ActionResponse<DiscountCodeType>> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'غير مصرح بالدخول' }
    }

    const existing = await db.discountCode.findUnique({ where: { id } })
    if (!existing) {
      return { success: false, error: 'كود الخصم غير موجود' }
    }

    const discountCode = await db.discountCode.update({
      where: { id },
      data: { isActive: !existing.isActive },
    })

    return { success: true, data: discountCode }
  } catch (error) {
    console.error('[discount-codes.toggle]', error)
    return { success: false, error: 'فشل في تبديل حالة كود الخصم' }
  }
}

/**
 * Delete a discount code permanently (admin only)
 */
export async function deleteDiscountCode(
  id: string
): Promise<ActionResponse<void>> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'غير مصرح بالدخول' }
    }

    await db.discountCode.delete({ where: { id } })

    return { success: true }
  } catch (error) {
    console.error('[discount-codes.delete]', error)
    if ((error as any).code === 'P2025') {
      return { success: false, error: 'كود الخصم غير موجود' }
    }
    return { success: false, error: 'فشل في حذف كود الخصم' }
  }
}
