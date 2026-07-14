'use server'

import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { createDiscountCodeSchema } from '@/lib/validations'
import type { ActionResponse, DiscountCodeWithStats, DiscountCodeWithUsages, DiscountCodeWithFullReport } from '@/types'

interface DiscountCodeType {
  id: string
  code: string
  discountPercent: number
  maxDiscountCap: number | null
  isSingleUse: boolean
  maxUsagePerUser: number | null
  maxUsage: number | null
  minOrderAmount: number | null
  firstOrderOnly: boolean
  allowStacking: boolean
  allowedUserId: string | null
  startDate: Date | null
  endDate: Date | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

/** Reads all coupon fields (old + new) out of the admin form's FormData. */
function parseCouponFormData(formData: FormData) {
  const maxUsagePerUser = formData.get('maxUsagePerUser')
  return {
    code: formData.get('code'),
    discountPercent: formData.get('discountPercent'),
    maxDiscountCap: formData.get('maxDiscountCap') || null,
    // Keep the legacy flag in sync: per-user limit of 1 == single use
    isSingleUse: maxUsagePerUser === '1',
    maxUsagePerUser: maxUsagePerUser || null,
    maxUsage: formData.get('maxUsage') || null,
    minOrderAmount: formData.get('minOrderAmount') || null,
    firstOrderOnly: formData.get('firstOrderOnly') === 'true',
    allowStacking: formData.get('allowStacking') !== 'false',
    allowedUserId: (formData.get('allowedUserId') as string) || null,
    categoryIds: formData.getAll('categoryIds').map(String).filter(Boolean),
    productIds: formData.getAll('productIds').map(String).filter(Boolean),
    startDate: formData.get('startDate') || null,
    endDate: formData.get('endDate') || null,
    isActive: formData.get('isActive') !== 'false',
  }
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

    const validated = createDiscountCodeSchema.safeParse(parseCouponFormData(formData))
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
        maxDiscountCap: validated.data.maxDiscountCap ?? null,
        isSingleUse: validated.data.isSingleUse,
        maxUsagePerUser: validated.data.maxUsagePerUser ?? null,
        maxUsage: validated.data.maxUsage ?? null,
        minOrderAmount: validated.data.minOrderAmount ?? null,
        firstOrderOnly: validated.data.firstOrderOnly,
        allowStacking: validated.data.allowStacking,
        allowedUserId: validated.data.allowedUserId,
        categories: { connect: validated.data.categoryIds.map((id) => ({ id })) },
        products: { connect: validated.data.productIds.map((id) => ({ id })) },
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

    const validated = createDiscountCodeSchema.safeParse(parseCouponFormData(formData))
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
        maxDiscountCap: validated.data.maxDiscountCap ?? null,
        isSingleUse: validated.data.isSingleUse,
        maxUsagePerUser: validated.data.maxUsagePerUser ?? null,
        maxUsage: validated.data.maxUsage ?? null,
        minOrderAmount: validated.data.minOrderAmount ?? null,
        firstOrderOnly: validated.data.firstOrderOnly,
        allowStacking: validated.data.allowStacking,
        allowedUserId: validated.data.allowedUserId,
        categories: { set: validated.data.categoryIds.map((cid) => ({ id: cid })) },
        products: { set: validated.data.productIds.map((pid) => ({ id: pid })) },
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
        allowedUser: { select: { id: true, username: true, phone: true, storeName: true } },
        categories: { select: { id: true, name: true } },
        products: { select: { id: true, name: true } },
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

/** Minimal user info for the "restrict to user" picker in coupon forms */
export interface CouponUserOption {
  id: string
  username: string
  phone: string
  storeName: string | null
}

/**
 * Search users by name / phone / store name for coupon targeting (admin only)
 */
export async function searchCouponUsers(
  query: string
): Promise<ActionResponse<CouponUserOption[]>> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'غير مصرح بالدخول' }
    }

    const q = query.trim()
    if (q.length < 2) {
      return { success: true, data: [] }
    }

    const users = await db.user.findMany({
      where: {
        role: 'BUYER',
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
          { storeName: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, username: true, phone: true, storeName: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return { success: true, data: users }
  } catch (error) {
    console.error('[discount-codes.searchUsers]', error)
    return { success: false, error: 'فشل في البحث عن المستخدمين' }
  }
}

/** Minimal product info for the coupon product-scope picker */
export interface CouponProductOption {
  id: string
  name: string
}

/**
 * Search products by name for coupon scoping (admin only)
 */
export async function searchCouponProducts(
  query: string
): Promise<ActionResponse<CouponProductOption[]>> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'غير مصرح بالدخول' }
    }

    const q = query.trim()
    if (q.length < 2) {
      return { success: true, data: [] }
    }

    const products = await db.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { nameEn: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      take: 15,
    })

    return { success: true, data: products }
  } catch (error) {
    console.error('[discount-codes.searchProducts]', error)
    return { success: false, error: 'فشل في البحث عن المنتجات' }
  }
}

/** Active categories for the coupon category-scope picker (admin only) */
export async function getCouponCategoryOptions(): Promise<
  ActionResponse<{ id: string; name: string }[]>
> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'غير مصرح بالدخول' }
    }

    const categories = await db.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { sortOrder: 'asc' },
    })

    return { success: true, data: categories }
  } catch (error) {
    console.error('[discount-codes.getCategories]', error)
    return { success: false, error: 'فشل في جلب الفئات' }
  }
}

/**
 * Get a discount code with full usage report (admin only)
 * Includes detailed user info: store name, city, area, address, registration date
 */
export async function getDiscountCodeReport(
  id: string
): Promise<ActionResponse<DiscountCodeWithFullReport>> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'غير مصرح بالدخول' }
    }

    const code = await db.discountCode.findUnique({
      where: { id },
      include: {
        usages: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                phone: true,
                storeName: true,
                city: true,
                businessAddress: true,
                address: true,
                role: true,
                createdAt: true,
                cityRef: { select: { name: true, nameEn: true } },
                areaRef: { select: { name: true, nameEn: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { usages: true } },
      },
    })

    if (!code) {
      return { success: false, error: 'كود الخصم غير موجود' }
    }

    return { success: true, data: code as unknown as DiscountCodeWithFullReport }
  } catch (error) {
    console.error('[discount-codes.getReport]', error)
    return { success: false, error: 'فشل في جلب تقرير كود الخصم' }
  }
}
