'use server'

import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createTagSchema, updateTagSchema } from '@/lib/validations'
import type { ActionResponse } from '@/types'
import { revalidatePath } from 'next/cache'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\u0600-\u06FFa-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function createTag(formData: FormData): Promise<ActionResponse<{ id: string }>> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  const rawData = {
    name: formData.get('name'),
    nameEn: formData.get('nameEn') || undefined,
    categoryId: formData.get('categoryId'),
    isActive: formData.get('isActive') !== 'false',
  }

  const validated = createTagSchema.safeParse(rawData)
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors }
  }

  // Verify category exists
  const category = await db.category.findUnique({ where: { id: validated.data.categoryId } })
  if (!category) return { success: false, error: 'Category not found' }

  // Generate and check slug uniqueness within category
  let slug = generateSlug(validated.data.name)
  if (!slug) slug = `tag-${Date.now()}`

  const existing = await db.tag.findUnique({
    where: { categoryId_slug: { categoryId: validated.data.categoryId, slug } },
  })
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`
  }

  // Get next sort order
  const lastTag = await db.tag.findFirst({
    where: { categoryId: validated.data.categoryId },
    orderBy: { sortOrder: 'desc' },
  })

  const tag = await db.tag.create({
    data: {
      name: validated.data.name,
      nameEn: validated.data.nameEn,
      slug,
      categoryId: validated.data.categoryId,
      isActive: validated.data.isActive ?? true,
      sortOrder: (lastTag?.sortOrder ?? -1) + 1,
    },
  })

  revalidatePath('/admin/categories')
  return { success: true, data: { id: tag.id } }
}

export async function updateTag(id: string, formData: FormData): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  const existing = await db.tag.findUnique({ where: { id } })
  if (!existing) return { success: false, error: 'Tag not found' }

  const rawData: Record<string, unknown> = {}
  const name = formData.get('name')
  if (name) rawData.name = name
  const nameEn = formData.get('nameEn')
  if (nameEn !== null) rawData.nameEn = nameEn || undefined
  const isActive = formData.get('isActive')
  if (isActive !== null) rawData.isActive = isActive === 'true'

  const validated = updateTagSchema.safeParse(rawData)
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors }
  }

  // If name changed, regenerate slug
  let newSlug: string | undefined
  if (validated.data.name && validated.data.name !== existing.name) {
    newSlug = generateSlug(validated.data.name)
    if (!newSlug) newSlug = `tag-${Date.now()}`
    const slugExists = await db.tag.findFirst({
      where: { categoryId: existing.categoryId, slug: newSlug, id: { not: id } },
    })
    if (slugExists) {
      newSlug = `${newSlug}-${Date.now().toString(36)}`
    }
  }

  await db.tag.update({
    where: { id },
    data: {
      ...validated.data,
      ...(newSlug && { slug: newSlug }),
    },
  })

  revalidatePath('/admin/categories')
  return { success: true }
}

export async function deleteTag(id: string): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  const tag = await db.tag.findUnique({ where: { id } })
  if (!tag) return { success: false, error: 'Tag not found' }

  await db.tag.delete({ where: { id } })

  revalidatePath('/admin/categories')
  return { success: true }
}

export async function getTagsByCategory(categoryId: string) {
  return db.tag.findMany({
    where: { categoryId },
    include: { _count: { select: { products: true } } },
    orderBy: { sortOrder: 'asc' },
  })
}

export async function reorderTags(orderedIds: string[]): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  if (!orderedIds.length) return { success: false, error: 'No tags to reorder' }

  await db.$transaction(
    orderedIds.map((id, index) =>
      db.tag.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  )

  revalidatePath('/admin/categories')
  return { success: true }
}

export async function assignTagsToProduct(
  productId: string,
  tagIds: string[]
): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  // Remove existing tags and replace with new ones
  await db.$transaction([
    db.productTag.deleteMany({ where: { productId } }),
    db.productTag.createMany({
      data: tagIds.map((tagId) => ({ productId, tagId })),
      skipDuplicates: true,
    }),
  ])

  revalidatePath('/admin/products')
  return { success: true }
}
