'use server'

import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createUnitTypeSchema, updateUnitTypeSchema } from '@/lib/validations'
import type { ActionResponse } from '@/types'
import { revalidatePath } from 'next/cache'

function generateCode(name: string, nameEn?: string | null): string {
  const base = (nameEn || name)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_؀-ۿ]/g, '')
  return base || `UNIT_${Date.now().toString(36).toUpperCase()}`
}

export async function getUnitTypes(options?: { isActive?: boolean }) {
  const where: Record<string, unknown> = {}
  if (options?.isActive !== undefined) where.isActive = options.isActive

  return db.unitType.findMany({
    where,
    orderBy: { sortOrder: 'asc' },
  })
}

// Unit types with how many product selling units use each one (for the admin page)
export async function getUnitTypesWithUsage() {
  const [unitTypes, usage] = await Promise.all([
    db.unitType.findMany({ orderBy: { sortOrder: 'asc' } }),
    db.productUnit.groupBy({ by: ['unit'], _count: { unit: true } }),
  ])
  const usageMap = new Map(usage.map((u) => [u.unit, u._count.unit]))
  return unitTypes.map((ut) => ({ ...ut, usageCount: usageMap.get(ut.code) ?? 0 }))
}

export async function createUnitType(formData: FormData): Promise<ActionResponse<{ id: string }>> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  const rawData = {
    name: formData.get('name'),
    nameEn: formData.get('nameEn') || undefined,
    defaultPieces: formData.get('defaultPieces') || 1,
  }

  const validated = createUnitTypeSchema.safeParse(rawData)
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors }
  }

  // Prevent duplicate names
  const nameExists = await db.unitType.findFirst({ where: { name: validated.data.name } })
  if (nameExists) {
    return { success: false, error: 'يوجد وحدة بهذا الاسم مسبقاً' }
  }

  // Generate a unique stable code
  let code = generateCode(validated.data.name, validated.data.nameEn)
  const codeExists = await db.unitType.findUnique({ where: { code } })
  if (codeExists) {
    code = `${code}_${Date.now().toString(36).toUpperCase()}`
  }

  const maxSort = await db.unitType.aggregate({ _max: { sortOrder: true } })

  const unitType = await db.unitType.create({
    data: {
      code,
      name: validated.data.name,
      nameEn: validated.data.nameEn,
      defaultPieces: validated.data.defaultPieces ?? 1,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  })

  revalidatePath('/admin/units')
  return { success: true, data: { id: unitType.id } }
}

export async function updateUnitType(id: string, formData: FormData): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  const existing = await db.unitType.findUnique({ where: { id } })
  if (!existing) return { success: false, error: 'الوحدة غير موجودة' }

  const rawData: Record<string, unknown> = {}
  const name = formData.get('name')
  if (name !== null && name !== '') rawData.name = name
  const nameEn = formData.get('nameEn')
  if (nameEn !== null) rawData.nameEn = nameEn === '' ? undefined : nameEn
  const defaultPieces = formData.get('defaultPieces')
  if (defaultPieces !== null && defaultPieces !== '') rawData.defaultPieces = defaultPieces
  const isActive = formData.get('isActive')
  if (isActive !== null) rawData.isActive = isActive === 'true'

  const validated = updateUnitTypeSchema.safeParse(rawData)
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors }
  }

  // Prevent duplicate names when renaming
  if (validated.data.name && validated.data.name !== existing.name) {
    const nameExists = await db.unitType.findFirst({
      where: { name: validated.data.name, id: { not: id } },
    })
    if (nameExists) {
      return { success: false, error: 'يوجد وحدة بهذا الاسم مسبقاً' }
    }
  }

  await db.unitType.update({
    where: { id },
    data: validated.data,
  })

  revalidatePath('/admin/units')
  return { success: true }
}

export async function deleteUnitType(id: string): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  const unitType = await db.unitType.findUnique({ where: { id } })
  if (!unitType) return { success: false, error: 'الوحدة غير موجودة' }

  // Block deletion if any product selling unit uses this type
  const usageCount = await db.productUnit.count({ where: { unit: unitType.code } })
  if (usageCount > 0) {
    return {
      success: false,
      error: `لا يمكن حذف الوحدة لأنها مستخدمة في ${usageCount} وحدة بيع داخل المنتجات. عدّل المنتجات أولاً أو قم بتعطيل الوحدة بدلاً من حذفها.`,
    }
  }

  await db.unitType.delete({ where: { id } })

  revalidatePath('/admin/units')
  return { success: true }
}

export async function reorderUnitTypes(orderedIds: string[]): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  if (!orderedIds.length) return { success: false, error: 'No unit types to reorder' }

  await db.$transaction(
    orderedIds.map((id, index) =>
      db.unitType.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  )

  revalidatePath('/admin/units')
  return { success: true }
}
