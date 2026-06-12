'use server'

import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { saveCollectionImage, deleteCollectionImage } from '@/lib/upload'
import type { ActionResponse } from '@/types'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const createMarketingSectionSchema = z.object({
  name: z.string().min(2, 'اسم القسم مطلوب'),
  nameEn: z.string().optional(),
  slug: z.string()
    .min(2, 'الرابط مطلوب')
    .regex(/^[a-z0-9-]+$/, 'يجب أن يحتوي الرابط على حروف صغيرة وأرقام وشرطات فقط'),
  description: z.string().optional(),
  descriptionEn: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  showOnHome: z.coerce.boolean().optional(),
})

const updateMarketingSectionSchema = createMarketingSectionSchema.partial()

// Create a new marketing section
export async function createMarketingSection(formData: FormData): Promise<ActionResponse<{ id: string }>> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'غير مصرح' }

  const rawData = {
    name: formData.get('name'),
    nameEn: formData.get('nameEn') || undefined,
    slug: formData.get('slug'),
    description: formData.get('description') || undefined,
    descriptionEn: formData.get('descriptionEn') || undefined,
    isActive: formData.get('isActive') === 'true',
    showOnHome: formData.get('showOnHome') === 'true',
  }

  const validated = createMarketingSectionSchema.safeParse(rawData)
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors }
  }

  // Check slug uniqueness
  const existing = await db.collection.findUnique({ where: { slug: validated.data.slug } })
  if (existing) {
    return { success: false, errors: { slug: ['هذا الرابط مستخدم بالفعل'] } }
  }

  // If showOnHome is true, check that we don't exceed 2 home sections
  if (validated.data.showOnHome) {
    const homeCount = await db.collection.count({ where: { showOnHome: true, type: 'MANUAL' } })
    if (homeCount >= 2) {
      return { success: false, error: 'لا يمكن عرض أكثر من قسمين تسويقيين في الصفحة الرئيسية' }
    }
  }

  // Handle image upload
  let imagePath: string | undefined
  const imageFile = formData.get('image')
  if (imageFile && imageFile instanceof File && imageFile.size > 0) {
    try {
      imagePath = await saveCollectionImage(imageFile)
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'فشل رفع الصورة' }
    }
  }

  // Get next sortOrder
  const lastSection = await db.collection.findFirst({
    where: { type: 'MANUAL' },
    orderBy: { sortOrder: 'desc' },
  })
  const nextSort = (lastSection?.sortOrder ?? -1) + 1

  const section = await db.collection.create({
    data: {
      name: validated.data.name,
      nameEn: validated.data.nameEn,
      slug: validated.data.slug,
      description: validated.data.description,
      descriptionEn: validated.data.descriptionEn,
      type: 'MANUAL',
      isActive: validated.data.isActive ?? true,
      showOnHome: validated.data.showOnHome ?? false,
      image: imagePath,
      sortOrder: nextSort,
    },
  })

  revalidatePath('/admin/marketing-sections')
  return { success: true, data: { id: section.id } }
}

// Update a marketing section
export async function updateMarketingSection(id: string, formData: FormData): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'غير مصرح' }

  const existing = await db.collection.findUnique({ where: { id } })
  if (!existing) return { success: false, error: 'القسم غير موجود' }

  const rawData: Record<string, unknown> = {}
  const fields = ['name', 'nameEn', 'slug', 'description', 'descriptionEn']
  for (const field of fields) {
    const value = formData.get(field)
    if (value !== null && value !== '') {
      rawData[field] = value
    }
  }
  const isActive = formData.get('isActive')
  if (isActive !== null) rawData.isActive = isActive === 'true'
  const showOnHome = formData.get('showOnHome')
  if (showOnHome !== null) rawData.showOnHome = showOnHome === 'true'

  const validated = updateMarketingSectionSchema.safeParse(rawData)
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors }
  }

  // Check slug uniqueness if changing
  if (validated.data.slug && validated.data.slug !== existing.slug) {
    const slugExists = await db.collection.findUnique({ where: { slug: validated.data.slug } })
    if (slugExists) {
      return { success: false, errors: { slug: ['هذا الرابط مستخدم بالفعل'] } }
    }
  }

  // If enabling showOnHome, check count (excluding current)
  if (validated.data.showOnHome && !existing.showOnHome) {
    const homeCount = await db.collection.count({
      where: { showOnHome: true, type: 'MANUAL', id: { not: id } },
    })
    if (homeCount >= 2) {
      return { success: false, error: 'لا يمكن عرض أكثر من قسمين تسويقيين في الصفحة الرئيسية' }
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
      return { success: false, error: err instanceof Error ? err.message : 'فشل رفع الصورة' }
    }
  }

  // Handle image removal
  const removeImage = formData.get('removeImage') === 'true'
  if (removeImage && existing.image) {
    await deleteCollectionImage(existing.image)
    imagePath = ''
  }

  await db.collection.update({
    where: { id },
    data: {
      ...validated.data,
      ...(imagePath !== undefined && { image: imagePath || null }),
    },
  })

  revalidatePath('/admin/marketing-sections')
  return { success: true }
}

// Delete a marketing section
export async function deleteMarketingSection(id: string): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'غير مصرح' }

  const section = await db.collection.findUnique({ where: { id } })
  if (!section) return { success: false, error: 'القسم غير موجود' }

  if (section.image) {
    await deleteCollectionImage(section.image)
  }

  await db.collection.delete({ where: { id } })

  revalidatePath('/admin/marketing-sections')
  return { success: true }
}

// Get all marketing sections
export async function getMarketingSections() {
  return db.collection.findMany({
    where: { type: 'MANUAL' },
    include: { _count: { select: { products: true } } },
    orderBy: { sortOrder: 'asc' },
  })
}

// Get a single marketing section with products
export async function getMarketingSection(id: string) {
  return db.collection.findUnique({
    where: { id },
    include: {
      products: {
        orderBy: { sortOrder: 'asc' },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              nameEn: true,
              image: true,
              isActive: true,
              category: { select: { id: true, name: true, nameEn: true } },
              brand: { select: { id: true, name: true, nameEn: true } },
              variants: {
                where: { isActive: true },
                take: 1,
                orderBy: { sortOrder: 'asc' },
                select: {
                  id: true,
                  size: true,
                  sizeEn: true,
                  units: {
                    where: { isDefault: true },
                    take: 1,
                    select: { id: true, price: true, compareAtPrice: true, label: true, labelEn: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
}

// Add products to a marketing section
export async function addProductsToMarketingSection(
  sectionId: string,
  productIds: string[]
): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'غير مصرح' }

  const section = await db.collection.findUnique({ where: { id: sectionId } })
  if (!section) return { success: false, error: 'القسم غير موجود' }

  // Get current max sortOrder
  const lastProduct = await db.collectionProduct.findFirst({
    where: { collectionId: sectionId },
    orderBy: { sortOrder: 'desc' },
  })
  let nextSort = (lastProduct?.sortOrder ?? -1) + 1

  await db.collectionProduct.createMany({
    data: productIds.map((productId) => ({
      collectionId: sectionId,
      productId,
      sortOrder: nextSort++,
    })),
    skipDuplicates: true,
  })

  revalidatePath('/admin/marketing-sections')
  return { success: true }
}

// Remove a product from a marketing section
export async function removeProductFromMarketingSection(
  sectionId: string,
  productId: string
): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'غير مصرح' }

  await db.collectionProduct.delete({
    where: { collectionId_productId: { collectionId: sectionId, productId } },
  }).catch(() => null)

  revalidatePath('/admin/marketing-sections')
  return { success: true }
}

// Toggle marketing section active status
export async function toggleMarketingSectionStatus(id: string): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'غير مصرح' }

  const section = await db.collection.findUnique({ where: { id } })
  if (!section) return { success: false, error: 'القسم غير موجود' }

  await db.collection.update({
    where: { id },
    data: { isActive: !section.isActive },
  })

  revalidatePath('/admin/marketing-sections')
  return { success: true }
}

// Toggle showOnHome
export async function toggleMarketingSectionHome(id: string): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'غير مصرح' }

  const section = await db.collection.findUnique({ where: { id } })
  if (!section) return { success: false, error: 'القسم غير موجود' }

  // If enabling, check count
  if (!section.showOnHome) {
    const homeCount = await db.collection.count({
      where: { showOnHome: true, type: 'MANUAL', id: { not: id } },
    })
    if (homeCount >= 2) {
      return { success: false, error: 'لا يمكن عرض أكثر من قسمين تسويقيين في الصفحة الرئيسية' }
    }
  }

  await db.collection.update({
    where: { id },
    data: { showOnHome: !section.showOnHome },
  })

  revalidatePath('/admin/marketing-sections')
  return { success: true }
}

// Reorder marketing sections
export async function reorderMarketingSections(orderedIds: string[]): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'غير مصرح' }

  await Promise.all(
    orderedIds.map((id, index) =>
      db.collection.update({ where: { id }, data: { sortOrder: index } })
    )
  )

  revalidatePath('/admin/marketing-sections')
  return { success: true }
}
