'use server'

import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createCategorySchema, updateCategorySchema } from '@/lib/validations'
import { saveCategoryImage, deleteCategoryImage } from '@/lib/upload'
import type { ActionResponse } from '@/types'
import { revalidatePath } from 'next/cache'

export async function createCategory(formData: FormData): Promise<ActionResponse<{ id: string }>> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  const rawData = {
    name: formData.get('name'),
    nameEn: formData.get('nameEn') || undefined,
    slug: formData.get('slug'),
    sortOrder: formData.get('sortOrder') || 0,
    isActive: formData.get('isActive') === 'true',
  }

  const validated = createCategorySchema.safeParse(rawData)
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors }
  }

  // Check slug uniqueness
  const existing = await db.category.findUnique({ where: { slug: validated.data.slug } })
  if (existing) {
    return { success: false, error: 'A category with this slug already exists' }
  }

  // Handle image upload
  let imagePath: string | null = null
  const imageFile = formData.get('image') as File | null
  if (imageFile && imageFile.size > 0) {
    try {
      imagePath = await saveCategoryImage(imageFile)
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to upload image' }
    }
  }

  const category = await db.category.create({
    data: {
      ...validated.data,
      image: imagePath,
      isActive: validated.data.isActive ?? true,
    },
  })

  revalidatePath('/admin/categories')
  return { success: true, data: { id: category.id } }
}

export async function updateCategory(id: string, formData: FormData): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  const existing = await db.category.findUnique({ where: { id } })
  if (!existing) return { success: false, error: 'Category not found' }

  const rawData: Record<string, unknown> = {}
  const fields = ['name', 'nameEn', 'slug', 'sortOrder']
  for (const field of fields) {
    const value = formData.get(field)
    if (value !== null && value !== '') rawData[field] = value
  }
  const isActive = formData.get('isActive')
  if (isActive !== null) rawData.isActive = isActive === 'true'

  const validated = updateCategorySchema.safeParse(rawData)
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors }
  }

  // Check slug uniqueness if changed
  if (validated.data.slug && validated.data.slug !== existing.slug) {
    const slugExists = await db.category.findUnique({ where: { slug: validated.data.slug } })
    if (slugExists) return { success: false, error: 'A category with this slug already exists' }
  }

  // Handle image upload
  let imagePath = existing.image
  const imageFile = formData.get('image') as File | null
  if (imageFile && imageFile.size > 0) {
    try {
      // Delete old image if exists
      if (existing.image) {
        await deleteCategoryImage(existing.image)
      }
      imagePath = await saveCategoryImage(imageFile)
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to upload image' }
    }
  }

  await db.category.update({
    where: { id },
    data: {
      ...validated.data,
      ...(imagePath !== undefined && { image: imagePath }),
    },
  })

  revalidatePath('/admin/categories')
  return { success: true }
}

export async function deleteCategory(id: string): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  // Check if category has products
  const productCount = await db.product.count({ where: { categoryId: id } })
  if (productCount > 0) {
    return { success: false, error: `Cannot delete category with ${productCount} products. Move or delete them first.` }
  }

  const category = await db.category.findUnique({ where: { id } })
  if (category?.image) {
    await deleteCategoryImage(category.image)
  }

  await db.category.delete({ where: { id } })
  revalidatePath('/admin/categories')
  return { success: true }
}

export async function getCategories(includeInactive = false) {
  return db.category.findMany({
    where: includeInactive ? {} : { isActive: true },
    include: { _count: { select: { products: true } } },
    orderBy: { sortOrder: 'asc' },
  })
}

export async function getCategoryById(id: string) {
  return db.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  })
}

export async function reorderCategories(orderedIds: string[]): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  const updates = orderedIds.map((id, index) =>
    db.category.update({ where: { id }, data: { sortOrder: index + 1 } })
  )

  await db.$transaction(updates)
  revalidatePath('/admin/categories')
  return { success: true }
}
