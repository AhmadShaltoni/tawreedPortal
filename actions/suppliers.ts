'use server'

import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import type { ActionResponse } from '@/types'
import { revalidatePath } from 'next/cache'

export async function getSuppliers(options?: { isActive?: boolean }) {
  const where: Record<string, unknown> = {}
  if (options?.isActive !== undefined) where.isActive = options.isActive

  return db.supplier.findMany({
    where,
    include: {
      _count: { select: { products: true } },
    },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  })
}

export async function getSupplierById(id: string) {
  return db.supplier.findUnique({
    where: { id },
    include: {
      _count: { select: { products: true } },
    },
  })
}

export async function createSupplier(formData: FormData): Promise<ActionResponse<{ id: string }>> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  const name = formData.get('name') as string
  if (!name || !name.trim()) {
    return { success: false, error: 'اسم المورد مطلوب' }
  }

  const supplier = await db.supplier.create({
    data: {
      name: name.trim(),
      nameEn: (formData.get('nameEn') as string)?.trim() || null,
      phone: (formData.get('phone') as string)?.trim() || null,
      email: (formData.get('email') as string)?.trim() || null,
      address: (formData.get('address') as string)?.trim() || null,
      city: (formData.get('city') as string)?.trim() || null,
    },
  })

  revalidatePath('/admin/suppliers')
  return { success: true, data: { id: supplier.id } }
}

export async function updateSupplier(id: string, formData: FormData): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  const name = formData.get('name') as string
  if (!name || !name.trim()) {
    return { success: false, error: 'اسم المورد مطلوب' }
  }

  const existing = await db.supplier.findUnique({ where: { id } })
  if (!existing) return { success: false, error: 'المورد غير موجود' }

  await db.supplier.update({
    where: { id },
    data: {
      name: name.trim(),
      nameEn: (formData.get('nameEn') as string)?.trim() || null,
      phone: (formData.get('phone') as string)?.trim() || null,
      email: (formData.get('email') as string)?.trim() || null,
      address: (formData.get('address') as string)?.trim() || null,
      city: (formData.get('city') as string)?.trim() || null,
    },
  })

  revalidatePath('/admin/suppliers')
  return { success: true }
}

export async function deleteSupplier(id: string): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  const existing = await db.supplier.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  })
  if (!existing) return { success: false, error: 'المورد غير موجود' }

  if (existing._count.products > 0) {
    return { success: false, error: `لا يمكن حذف المورد لأنه مرتبط بـ ${existing._count.products} منتج` }
  }

  await db.supplier.delete({ where: { id } })

  revalidatePath('/admin/suppliers')
  return { success: true }
}

export async function setDefaultSupplier(id: string): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  const existing = await db.supplier.findUnique({ where: { id } })
  if (!existing) return { success: false, error: 'المورد غير موجود' }

  // Remove default from all, then set new default
  await db.$transaction([
    db.supplier.updateMany({ data: { isDefault: false } }),
    db.supplier.update({ where: { id }, data: { isDefault: true } }),
  ])

  revalidatePath('/admin/suppliers')
  revalidatePath('/admin/products')
  return { success: true }
}

export async function getDefaultSupplier() {
  return db.supplier.findFirst({
    where: { isDefault: true, isActive: true },
  })
}
