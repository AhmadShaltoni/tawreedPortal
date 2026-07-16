'use server'

import { hash } from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { ALL_PERMISSION_KEYS } from '@/lib/permissions'
import type { ActionResponse } from '@/types'
import { revalidatePath } from 'next/cache'

// Staff roles that can be created/managed from this page.
const STAFF_ROLES = ['ADMIN', 'SUPER_ADMIN', 'DELIVERY'] as const

const passwordSchema = z
  .string()
  .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
  .regex(/[a-zA-Z]/, 'يجب أن تحتوي على حرف واحد على الأقل')
  .regex(/[0-9]/, 'يجب أن تحتوي على رقم واحد على الأقل')

const createStaffSchema = z.object({
  username: z.string().min(2, 'الاسم مطلوب'),
  phone: z.string().regex(/^07\d{8}$/, 'يجب أن يكون رقم الهاتف بصيغة 07xxxxxxxx'),
  email: z.string().email('البريد الإلكتروني غير صحيح').optional().or(z.literal('')),
  password: passwordSchema,
  role: z.enum(STAFF_ROLES, { message: 'الدور غير صحيح' }),
  permissions: z.array(z.string()).default([]),
})

function sanitizePermissions(role: string, permissions: string[]): string[] {
  // Only ADMIN carries an explicit permission set; SUPER_ADMIN has all,
  // DELIVERY is fixed to orders. Store an empty array for those.
  if (role !== 'ADMIN') return []
  const allowed = new Set<string>(ALL_PERMISSION_KEYS as string[])
  return permissions.filter((p) => allowed.has(p))
}

export async function getStaff() {
  const { authorized } = await requireRole(['SUPER_ADMIN'])
  if (!authorized) return []

  return db.user.findMany({
    where: { role: { in: [...STAFF_ROLES] } },
    select: {
      id: true,
      username: true,
      phone: true,
      email: true,
      role: true,
      permissions: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createStaff(input: {
  username: string
  phone: string
  email?: string
  password: string
  role: (typeof STAFF_ROLES)[number]
  permissions: string[]
}): Promise<ActionResponse<{ id: string }>> {
  const { authorized, error } = await requireRole(['SUPER_ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'غير مصرّح' }

  const validated = createStaffSchema.safeParse(input)
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors }
  }

  const data = validated.data

  const existingPhone = await db.user.findUnique({ where: { phone: data.phone } })
  if (existingPhone) return { success: false, error: 'رقم الهاتف مسجّل بالفعل' }

  if (data.email) {
    const existingEmail = await db.user.findUnique({ where: { email: data.email } })
    if (existingEmail) return { success: false, error: 'البريد الإلكتروني مسجّل بالفعل' }
  }

  const passwordHash = await hash(data.password, 12)

  const user = await db.user.create({
    data: {
      username: data.username,
      phone: data.phone,
      email: data.email || null,
      passwordHash,
      role: data.role,
      permissions: sanitizePermissions(data.role, data.permissions),
      isVerified: true,
      isActive: true,
    },
  })

  revalidatePath('/admin/staff')
  return { success: true, data: { id: user.id } }
}

export async function updateStaff(
  id: string,
  input: {
    username: string
    role: (typeof STAFF_ROLES)[number]
    permissions: string[]
  }
): Promise<ActionResponse> {
  const { authorized, user: actor, error } = await requireRole(['SUPER_ADMIN'])
  if (!authorized || !actor) return { success: false, error: error ?? 'غير مصرّح' }

  const schema = z.object({
    username: z.string().min(2, 'الاسم مطلوب'),
    role: z.enum(STAFF_ROLES, { message: 'الدور غير صحيح' }),
    permissions: z.array(z.string()).default([]),
  })
  const validated = schema.safeParse(input)
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors }
  }

  const target = await db.user.findUnique({ where: { id }, select: { role: true } })
  if (!target) return { success: false, error: 'المستخدم غير موجود' }

  // Guard against removing the last super admin by demoting them.
  if (target.role === 'SUPER_ADMIN' && validated.data.role !== 'SUPER_ADMIN') {
    const superAdmins = await db.user.count({ where: { role: 'SUPER_ADMIN', isActive: true } })
    if (superAdmins <= 1) {
      return { success: false, error: 'لا يمكن إزالة آخر مدير عام في النظام' }
    }
  }

  await db.user.update({
    where: { id },
    data: {
      username: validated.data.username,
      role: validated.data.role,
      permissions: sanitizePermissions(validated.data.role, validated.data.permissions),
    },
  })

  revalidatePath('/admin/staff')
  return { success: true }
}

export async function resetStaffPassword(id: string, newPassword: string): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['SUPER_ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'غير مصرّح' }

  const validated = passwordSchema.safeParse(newPassword)
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0]?.message ?? 'كلمة المرور غير صالحة' }
  }

  const target = await db.user.findUnique({ where: { id }, select: { role: true } })
  if (!target) return { success: false, error: 'المستخدم غير موجود' }

  const passwordHash = await hash(validated.data, 12)
  await db.user.update({ where: { id }, data: { passwordHash } })

  revalidatePath('/admin/staff')
  return { success: true }
}

export async function toggleStaffActive(id: string): Promise<ActionResponse> {
  const { authorized, user: actor, error } = await requireRole(['SUPER_ADMIN'])
  if (!authorized || !actor) return { success: false, error: error ?? 'غير مصرّح' }

  if (actor.id === id) {
    return { success: false, error: 'لا يمكنك تعطيل حسابك الخاص' }
  }

  const target = await db.user.findUnique({ where: { id }, select: { role: true, isActive: true } })
  if (!target) return { success: false, error: 'المستخدم غير موجود' }

  // Don't allow deactivating the last active super admin.
  if (target.role === 'SUPER_ADMIN' && target.isActive) {
    const activeSupers = await db.user.count({ where: { role: 'SUPER_ADMIN', isActive: true } })
    if (activeSupers <= 1) {
      return { success: false, error: 'لا يمكن تعطيل آخر مدير عام نشط' }
    }
  }

  await db.user.update({ where: { id }, data: { isActive: !target.isActive } })
  revalidatePath('/admin/staff')
  return { success: true }
}

export async function deleteStaff(id: string): Promise<ActionResponse> {
  const { authorized, user: actor, error } = await requireRole(['SUPER_ADMIN'])
  if (!authorized || !actor) return { success: false, error: error ?? 'غير مصرّح' }

  if (actor.id === id) {
    return { success: false, error: 'لا يمكنك حذف حسابك الخاص' }
  }

  const target = await db.user.findUnique({ where: { id }, select: { role: true } })
  if (!target) return { success: false, error: 'المستخدم غير موجود' }

  if (target.role === 'SUPER_ADMIN') {
    const superAdmins = await db.user.count({ where: { role: 'SUPER_ADMIN' } })
    if (superAdmins <= 1) {
      return { success: false, error: 'لا يمكن حذف آخر مدير عام' }
    }
  }

  try {
    await db.user.delete({ where: { id } })
    revalidatePath('/admin/staff')
    return { success: true }
  } catch (err) {
    console.error('Error deleting staff member:', err)
    return { success: false, error: 'تعذّر الحذف — قد يملك هذا الحساب بيانات مرتبطة. يمكنك تعطيله بدلاً من ذلك.' }
  }
}
