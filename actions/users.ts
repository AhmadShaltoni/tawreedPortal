'use server'

import { hash } from 'bcryptjs'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { adminCreateUserSchema } from '@/lib/validations'
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
        _count: { select: { buyerOrders: true } },
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
      _count: { select: { buyerOrders: true } },
    },
  })
}
