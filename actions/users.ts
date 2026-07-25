'use server'

import { hash } from 'bcryptjs'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireRole, getCurrentUser } from '@/lib/auth'
import { adminCreateUserSchema } from '@/lib/validations'
import { hashPhone } from '@/lib/account/phone-hash'
import { maskPhone } from '@/lib/account/phone-block'
import { purgeUserWithinTx } from '@/lib/account/purge-user'
import type { ActionResponse } from '@/types'
import { revalidatePath } from 'next/cache'

export async function adminCreateUser(formData: FormData): Promise<ActionResponse<{ id: string }>> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  const rawData = {
    email: formData.get('email'),
    password: formData.get('password'),
    username: formData.get('username'),
    phone: formData.get('phone') || undefined,
    role: formData.get('role'),
    storeName: formData.get('storeName') || undefined,
    businessAddress: formData.get('businessAddress') || undefined,
    city: formData.get('city') || undefined,
  }

  const validated = adminCreateUserSchema.safeParse(rawData)
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors }
  }

  const existingUser = await db.user.findUnique({ where: { email: validated.data.email } })
  if (existingUser) {
    return { success: false, error: 'User with this email already exists' }
  }

  const { password, ...rest } = validated.data
  const passwordHash = await hash(password, 12)

  const user = await db.user.create({
    data: { ...rest, passwordHash, isVerified: true },
  })

  revalidatePath('/admin/users')
  return { success: true, data: { id: user.id } }
}

export async function getUsers(options?: {
  role?: string
  search?: string
  page?: number
  limit?: number
}) {
  const { role, search, page = 1, limit = 20 } = options ?? {}

  const where: Record<string, unknown> = {}
  if (role) where.role = role
  if (search) {
    where.OR = [
      { username: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { storeName: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        phone: true,
        role: true,
        storeName: true,
        city: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
        _count: { select: { buyerOrders: true, supplierOrders: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.user.count({ where }),
  ])

  return { users, total, pages: Math.ceil(total / limit) }
}

export async function toggleUserActive(id: string): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  const user = await db.user.findUnique({ where: { id } })
  if (!user) return { success: false, error: 'User not found' }

  await db.user.update({
    where: { id },
    data: { isActive: !user.isActive },
  })

  revalidatePath('/admin/users')
  return { success: true }
}

export async function getUserById(id: string) {
  return db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      username: true,
      phone: true,
      role: true,
      storeName: true,
      businessAddress: true,
      city: true,
      isActive: true,
      isVerified: true,
      createdAt: true,
      _count: { select: { buyerOrders: true, supplierOrders: true } },
    },
  })
}

/**
 * Delete any buyer/supplier account from the dashboard, even one with previous
 * orders. Orders are retained under the shared "حساب محذوف" placeholder (see
 * lib/account/purge-user.ts) rather than being removed.
 *
 * Pass `block: true` to also add the account's phone to the blocklist before
 * deletion, preventing it from re-registering.
 */
export async function deleteUser(
  id: string,
  options?: { block?: boolean }
): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  const user = await db.user.findUnique({ where: { id } })
  if (!user) return { success: false, error: 'User not found' }

  // Staff accounts are managed from the dedicated staff page.
  if (user.role === 'SUPER_ADMIN' || user.role === 'DELIVERY') {
    return { success: false, error: 'أدر حسابات الموظفين من صفحة الموظفين والصلاحيات' }
  }

  // Prevent deleting the only admin user
  if (user.role === 'ADMIN') {
    const adminCount = await db.user.count({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } } })
    if (adminCount <= 1) {
      return { success: false, error: 'Cannot delete the only admin user' }
    }
  }

  try {
    await db.$transaction(async (tx) => {
      if (options?.block) {
        await blockPhoneWithinTx(tx, user.phone)
      }
      await purgeUserWithinTx(tx, { id: user.id, phone: user.phone })
    })
    revalidatePath('/admin/users')
    return { success: true }
  } catch (error) {
    console.error('Error deleting user:', error)
    return { success: false, error: 'Failed to delete user. User may have associated data.' }
  }
}

/**
 * Record a phone number on the registration blocklist. Shared by blockUser and
 * the delete-and-block path. No-op (returns false) when the phone can't be
 * normalized to a valid Jordanian mobile number.
 */
async function blockPhoneWithinTx(
  tx: Prisma.TransactionClient,
  phone: string,
  reason?: string,
  blockedById?: string
): Promise<boolean> {
  const phoneNumberHash = hashPhone(phone)
  if (!phoneNumberHash) return false

  await tx.blockedPhone.upsert({
    where: { phoneNumberHash },
    create: {
      phoneNumberHash,
      phoneMasked: maskPhone(phone),
      reason: reason || null,
      blockedById: blockedById || null,
    },
    update: {
      reason: reason || undefined,
      blockedById: blockedById || undefined,
    },
  })
  return true
}

/**
 * Block a user's phone from registering a new account and deactivate the
 * existing account (so current sessions/logins are cut off). The account row is
 * kept — use deleteUser to remove it. Blocking is keyed by phone hash, so the
 * block survives even if the account is deleted later.
 */
export async function blockUser(id: string, reason?: string): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  const user = await db.user.findUnique({ where: { id } })
  if (!user) return { success: false, error: 'User not found' }

  if (user.role === 'SUPER_ADMIN' || user.role === 'DELIVERY' || user.role === 'ADMIN') {
    return { success: false, error: 'لا يمكن حظر حسابات الموظفين' }
  }

  if (!hashPhone(user.phone)) {
    return { success: false, error: 'رقم الهاتف غير صالح' }
  }

  const admin = await getCurrentUser()

  try {
    await db.$transaction(async (tx) => {
      await blockPhoneWithinTx(tx, user.phone, reason, admin?.id)
      await tx.user.update({ where: { id }, data: { isActive: false } })
    })
    revalidatePath('/admin/users')
    revalidatePath('/admin/users/blocked')
    return { success: true }
  } catch (error) {
    console.error('Error blocking user:', error)
    return { success: false, error: 'فشل حظر المستخدم' }
  }
}

/** List all blocked phone numbers (most recent first) for the admin blocklist. */
export async function getBlockedPhones() {
  return db.blockedPhone.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      phoneMasked: true,
      reason: true,
      createdAt: true,
    },
  })
}

/** Remove a phone from the blocklist so it can register again. */
export async function unblockPhone(id: string): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  try {
    await db.blockedPhone.delete({ where: { id } })
    revalidatePath('/admin/users/blocked')
    return { success: true }
  } catch (error) {
    console.error('Error unblocking phone:', error)
    return { success: false, error: 'فشل رفع الحظر' }
  }
}
