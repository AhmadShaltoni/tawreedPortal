'use server'

import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'
import type { ActionResponse } from '@/types'

/**
 * Notice type for responses
 */
interface NoticeType {
  id: string
  text: string
  backgroundColor: string
  textColor: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Notice type for responses (updated)
 */
interface NoticeType {
  id: string
  text: string
  backgroundColor: string
  textColor: string
  isMobileOnly: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Validation schema for Notice inputs
 * Validates hex color format (#RRGGBB) and text length (max 255 chars)
 */
const noticeSchema = z.object({
  text: z.string()
    .min(1, 'يجب إدخال النص')
    .max(255, 'النص يجب أن لا يتجاوز 255 حرف'),
  backgroundColor: z.string()
    .regex(/^#[0-9A-F]{6}$/i, 'لون الخلفية يجب أن يكون بصيغة hex (#RRGGBB)')
    .default('#f97316'),
  textColor: z.string()
    .regex(/^#[0-9A-F]{6}$/i, 'لون النص يجب أن يكون بصيغة hex (#RRGGBB)')
    .default('#FFFFFF'),
  isMobileOnly: z.boolean().default(true),
})

type NoticeInput = z.infer<typeof noticeSchema>

/**
 * Get all active notices (public API)
 * Used by frontend component for rotation
 */
export async function getActiveNotices(): Promise<ActionResponse<NoticeType[]>> {
  try {
    const notices = await db.notice.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return {
      success: true,
      data: notices,
    }
  } catch (error) {
    console.error('[notices.getActiveNotices]', error)
    return {
      success: false,
      error: 'فشل في جلب النوتس',
    }
  }
}

/**
 * Create a new notice (admin only)
 */
export async function createNotice(
  formData: FormData
): Promise<ActionResponse<NoticeType>> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'غير مصرح بالدخول' }
    }

    const data = {
      text: formData.get('text'),
      backgroundColor: formData.get('backgroundColor') || '#f97316',
      textColor: formData.get('textColor') || '#FFFFFF',
      isMobileOnly: formData.get('isMobileOnly') === 'true' ? true : false,
    }

    const validated = noticeSchema.safeParse(data)
    if (!validated.success) {
      return {
        success: false,
        errors: validated.error.flatten().fieldErrors,
      }
    }

    const notice = await db.notice.create({
      data: validated.data,
    })

    return {
      success: true,
      data: notice,
    }
  } catch (error) {
    console.error('[notices.createNotice]', error)
    return {
      success: false,
      error: 'فشل في إنشاء النوتس',
    }
  }
}

/**
 * Update an existing notice (admin only)
 */
export async function updateNotice(
  id: string,
  formData: FormData
): Promise<ActionResponse<NoticeType>> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'غير مصرح بالدخول' }
    }

    const data = {
      text: formData.get('text'),
      backgroundColor: formData.get('backgroundColor') || '#f97316',
      textColor: formData.get('textColor') || '#FFFFFF',
      isMobileOnly: formData.get('isMobileOnly') === 'true' ? true : false,
    }

    const validated = noticeSchema.safeParse(data)
    if (!validated.success) {
      return {
        success: false,
        errors: validated.error.flatten().fieldErrors,
      }
    }

    const notice = await db.notice.update({
      where: { id },
      data: validated.data,
    })

    return {
      success: true,
      data: notice,
    }
  } catch (error) {
    console.error('[notices.updateNotice]', error)
    if ((error as any).code === 'P2025') {
      return {
        success: false,
        error: 'النوتس غير موجود',
      }
    }
    return {
      success: false,
      error: 'فشل في تعديل النوتس',
    }
  }
}

/**
 * Soft delete - disable a notice (admin only)
 */
export async function disableNotice(id: string): Promise<ActionResponse<NoticeType>> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'غير مصرح بالدخول' }
    }

    const notice = await db.notice.update({
      where: { id },
      data: { isActive: false },
    })

    return {
      success: true,
      data: notice,
    }
  } catch (error) {
    console.error('[notices.disableNotice]', error)
    if ((error as any).code === 'P2025') {
      return {
        success: false,
        error: 'النوتس غير موجود',
      }
    }
    return {
      success: false,
      error: 'فشل في إخفاء النوتس',
    }
  }
}

/**
 * Restore a disabled notice (admin only)
 */
export async function enableNotice(id: string): Promise<ActionResponse<NoticeType>> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'غير مصرح بالدخول' }
    }

    const notice = await db.notice.update({
      where: { id },
      data: { isActive: true },
    })

    return {
      success: true,
      data: notice,
    }
  } catch (error) {
    console.error('[notices.enableNotice]', error)
    if ((error as any).code === 'P2025') {
      return {
        success: false,
        error: 'النوتس غير موجود',
      }
    }
    return {
      success: false,
      error: 'فشل في تفعيل النوتس',
    }
  }
}

/**
 * Get all notices including disabled ones (admin only)
 */
export async function getAllNotices(
  includeInactive: boolean = false
): Promise<ActionResponse<NoticeType[]>> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'غير مصرح بالدخول' }
    }

    const notices = await db.notice.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return {
      success: true,
      data: notices,
    }
  } catch (error) {
    console.error('[notices.getAllNotices]', error)
    return {
      success: false,
      error: 'فشل في جلب النوتس',
    }
  }
}

/**
 * Delete a notice permanently (admin only)
 */
export async function deleteNotice(id: string): Promise<ActionResponse<void>> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'غير مصرح بالدخول' }
    }

    await db.notice.delete({
      where: { id },
    })

    return {
      success: true,
    }
  } catch (error) {
    console.error('[notices.deleteNotice]', error)
    if ((error as any).code === 'P2025') {
      return {
        success: false,
        error: 'النوتس غير موجود',
      }
    }
    return {
      success: false,
      error: 'فشل في حذف النوتس',
    }
  }
}
