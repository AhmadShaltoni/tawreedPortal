'use server'

import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createCollectionSchema, updateCollectionSchema } from '@/lib/validations'
import { saveCollectionImage, deleteCollectionImage } from '@/lib/upload'
import type { ActionResponse } from '@/types'
import { revalidatePath } from 'next/cache'

export async function createCollection(formData: FormData): Promise<ActionResponse<{ id: string }>> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  const rawData = {
    name: formData.get('name'),
    nameEn: formData.get('nameEn') || undefined,
    slug: formData.get('slug'),
    description: formData.get('description') || undefined,
    descriptionEn: formData.get('descriptionEn') || undefined,
    type: formData.get('type') || undefined,
    showOnHome: formData.get('showOnHome') === 'true',
    isActive: formData.get('isActive') === 'true',
  }

  const validated = createCollectionSchema.safeParse(rawData)
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors }
  }

  // Check slug uniqueness
  const existing = await db.collection.findUnique({ where: { slug: validated.data.slug } })
  if (existing) {
    return { success: false, errors: { slug: ['This slug is already taken'] } }
  }

  // Handle image upload
  let imagePath: string | undefined
  const imageFile = formData.get('image')
  if (imageFile && imageFile instanceof File && imageFile.size > 0) {
    try {
      imagePath = await saveCollectionImage(imageFile)
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Image upload failed' }
    }
  }

  const collection = await db.collection.create({
    data: {
      name: validated.data.name,
      nameEn: validated.data.nameEn,
      slug: validated.data.slug,
      description: validated.data.description,
      descriptionEn: validated.data.descriptionEn,
      type: (validated.data.type as 'MANUAL' | 'OFFERS' | 'FEATURED') ?? 'MANUAL',
      showOnHome: validated.data.showOnHome ?? false,
      isActive: validated.data.isActive ?? true,
      image: imagePath,
    },
  })

  revalidatePath('/admin/collections')
  // The new-product form embeds the collections list — keep it fresh.
  revalidatePath('/admin/products', 'layout')
  return { success: true, data: { id: collection.id } }
}

export async function updateCollection(id: string, formData: FormData): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  const existing = await db.collection.findUnique({ where: { id } })
  if (!existing) return { success: false, error: 'Collection not found' }

  const rawData: Record<string, unknown> = {}
  const fields = ['name', 'nameEn', 'slug', 'description', 'descriptionEn', 'type']
  for (const field of fields) {
    const value = formData.get(field)
    if (value !== null && value !== '') {
      rawData[field] = value
    }
  }
  const showOnHome = formData.get('showOnHome')
  if (showOnHome !== null) rawData.showOnHome = showOnHome === 'true'
  const isActive = formData.get('isActive')
  if (isActive !== null) rawData.isActive = isActive === 'true'

  const validated = updateCollectionSchema.safeParse(rawData)
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors }
  }

  // Check slug uniqueness if changing
  if (validated.data.slug && validated.data.slug !== existing.slug) {
    const slugExists = await db.collection.findUnique({ where: { slug: validated.data.slug } })
    if (slugExists) {
      return { success: false, errors: { slug: ['This slug is already taken'] } }
    }
  }

  // Handle image upload
  let imagePath: string | undefined
  const imageFile = formData.get('image')
  if (imageFile && imageFile instanceof File && imageFile.size > 0) {
    try {
      imagePath = await saveCollectionImage(imageFile)
      if (existing.image) {
        await deleteCollectionImage(existing.image)
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Image upload failed' }
    }
  }

  await db.collection.update({
    where: { id },
    data: {
      ...validated.data,
      ...(imagePath !== undefined && { image: imagePath }),
    },
  })

  revalidatePath('/admin/collections')
  // The new-product form embeds the collections list — keep it fresh.
  revalidatePath('/admin/products', 'layout')
  return { success: true }
}

export async function deleteCollection(id: string): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  const collection = await db.collection.findUnique({ where: { id } })
  if (!collection) return { success: false, error: 'Collection not found' }

  if (collection.image) {
    await deleteCollectionImage(collection.image)
  }

  await db.collection.delete({ where: { id } })

  revalidatePath('/admin/collections')
  // The new-product form embeds the collections list — keep it fresh.
  revalidatePath('/admin/products', 'layout')
  return { success: true }
}

export async function getCollections(options?: { isActive?: boolean; showOnHome?: boolean }) {
  const where: Record<string, unknown> = {}
  if (options?.isActive !== undefined) where.isActive = options.isActive
  if (options?.showOnHome !== undefined) where.showOnHome = options.showOnHome

  return db.collection.findMany({
    where,
    include: { _count: { select: { products: true } } },
    orderBy: { sortOrder: 'asc' },
  })
}

export async function addProductsToCollection(
  collectionId: string,
  productIds: string[]
): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  const collection = await db.collection.findUnique({ where: { id: collectionId } })
  if (!collection) return { success: false, error: 'Collection not found' }

  // Get current max sortOrder
  const lastProduct = await db.collectionProduct.findFirst({
    where: { collectionId },
    orderBy: { sortOrder: 'desc' },
  })
  let nextSort = (lastProduct?.sortOrder ?? -1) + 1

  // Create entries (skip existing)
  await db.collectionProduct.createMany({
    data: productIds.map((productId) => ({
      collectionId,
      productId,
      sortOrder: nextSort++,
    })),
    skipDuplicates: true,
  })

  revalidatePath('/admin/collections')
  // The new-product form embeds the collections list — keep it fresh.
  revalidatePath('/admin/products', 'layout')
  return { success: true }
}

export async function removeProductFromCollection(
  collectionId: string,
  productId: string
): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  await db.collectionProduct.delete({
    where: { collectionId_productId: { collectionId, productId } },
  }).catch(() => null) // Ignore if not found

  revalidatePath('/admin/collections')
  // The new-product form embeds the collections list — keep it fresh.
  revalidatePath('/admin/products', 'layout')
  return { success: true }
}

export async function reorderCollectionProducts(
  collectionId: string,
  orderedProductIds: string[]
): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  await db.$transaction(
    orderedProductIds.map((productId, index) =>
      db.collectionProduct.update({
        where: { collectionId_productId: { collectionId, productId } },
        data: { sortOrder: index },
      })
    )
  )

  revalidatePath('/admin/collections')
  // The new-product form embeds the collections list — keep it fresh.
  revalidatePath('/admin/products', 'layout')
  return { success: true }
}

export async function reorderCollections(orderedIds: string[]): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  if (!orderedIds.length) return { success: false, error: 'No collections to reorder' }

  await db.$transaction(
    orderedIds.map((id, index) =>
      db.collection.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  )

  revalidatePath('/admin/collections')
  // The new-product form embeds the collections list — keep it fresh.
  revalidatePath('/admin/products', 'layout')
  return { success: true }
}
