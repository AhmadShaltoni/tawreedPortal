'use server'

import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createProductSchema, updateProductSchema, productVariantSchema } from '@/lib/validations'
import { saveProductImage, deleteProductImage } from '@/lib/upload'
import type { ActionResponse } from '@/types'
import type { Unit } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export async function createProduct(formData: FormData): Promise<ActionResponse<{ id: string }>> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  const rawData = {
    name: formData.get('name'),
    nameEn: formData.get('nameEn') || undefined,
    description: formData.get('description') || undefined,
    descriptionEn: formData.get('descriptionEn') || undefined,
    categoryId: formData.get('categoryId'),
    brandId: formData.get('brandId') || undefined,
    supplierId: formData.get('supplierId') || undefined,
    isActive: formData.get('isActive') === 'true',
  }

  const validated = createProductSchema.safeParse(rawData)
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors }
  }

  // Handle image upload
  let imagePath: string | undefined
  const imageFile = formData.get('image')
  if (imageFile && imageFile instanceof File && imageFile.size > 0) {
    try {
      imagePath = await saveProductImage(imageFile)
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Image upload failed' }
    }
  }

  // Parse and validate variants
  const variantsJson = formData.get('variants')
  if (!variantsJson || typeof variantsJson !== 'string') {
    return { success: false, error: 'يجب إضافة حجم واحد على الأقل' }
  }

  let variantsData: unknown[]
  try {
    variantsData = JSON.parse(variantsJson)
  } catch {
    return { success: false, error: 'Invalid variants data' }
  }

  if (!Array.isArray(variantsData) || variantsData.length === 0) {
    return { success: false, error: 'يجب إضافة حجم واحد على الأقل' }
  }

  const validatedVariants: Array<{
    size: string
    sizeEn?: string
    sku?: string
    barcode?: string
    stock: number
    minOrderQuantity: number
    isDefault: boolean
    isActive: boolean
    sortOrder: number
    units: Array<{
      unit: Unit
      label: string
      labelEn?: string
      piecesPerUnit: number
      price: number
      wholesalePrice?: number | null
      compareAtPrice?: number | null
      isDefault: boolean
      sortOrder: number
    }>
  }> = []

  for (let i = 0; i < variantsData.length; i++) {
    const result = productVariantSchema.safeParse(variantsData[i])
    if (!result.success) {
      return { success: false, error: `خطأ في بيانات الحجم ${i + 1}: ${result.error.issues[0]?.message}` }
    }
    validatedVariants.push({
      ...result.data,
      isDefault: result.data.isDefault ?? (i === 0),
      isActive: result.data.isActive ?? true,
      sortOrder: result.data.sortOrder ?? i,
      units: result.data.units.map((u, j) => ({
        ...u,
        unit: u.unit as Unit,
        isDefault: u.isDefault ?? (j === 0),
        sortOrder: u.sortOrder ?? j,
      })),
    })
  }

  // Parse additional category IDs, tag IDs, collection IDs
  const categoryIdsJson = formData.get('categoryIds')
  const categoryIds: string[] = categoryIdsJson ? JSON.parse(categoryIdsJson as string) : []
  const tagIdsJson = formData.get('tagIds')
  const tagIds: string[] = tagIdsJson ? JSON.parse(tagIdsJson as string) : []
  const collectionIdsJson = formData.get('collectionIds')
  const collectionIds: string[] = collectionIdsJson ? JSON.parse(collectionIdsJson as string) : []

  // Parse variant options
  const variantOptionsRaw = formData.get('variantOptions')
  let variantOptionsMap: Record<number, Array<{ name: string; nameEn?: string; stock: number; priceOverride?: number | null; sortOrder?: number }>> = {}
  if (variantOptionsRaw) {
    try { variantOptionsMap = JSON.parse(variantOptionsRaw as string) } catch { /* ignore */ }
  }

  // Upload option images (keyed by "optionImage_{variantIndex}_{optionIndex}")
  const optionImagesMap: Record<string, string> = {}
  // Upload variant images (keyed by "variantImage_{variantIndex}")
  const variantImagesMap: Record<string, string> = {}
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('optionImage_') && value instanceof File && value.size > 0) {
      const imageUrl = await saveProductImage(value)
      optionImagesMap[key] = imageUrl
    }
    if (key.startsWith('variantImage_') && value instanceof File && value.size > 0) {
      const imageUrl = await saveProductImage(value)
      variantImagesMap[key] = imageUrl
    }
  }

  // Create product, variants, and units in a transaction
  const product = await db.$transaction(async (tx) => {
    const p = await tx.product.create({
      data: {
        ...validated.data,
        brandId: (rawData.brandId as string) || null,
        supplierId: rawData.supplierId as string | undefined || null,
        image: imagePath,
        isActive: validated.data.isActive ?? true,
      },
    })

    // Create ProductOnCategory junction records
    const allCategoryIds = [validated.data.categoryId, ...categoryIds.filter(id => id !== validated.data.categoryId)]
    for (let i = 0; i < allCategoryIds.length; i++) {
      await tx.productOnCategory.create({
        data: { productId: p.id, categoryId: allCategoryIds[i], isPrimary: i === 0, sortOrder: i },
      })
    }

    // Assign tags
    for (const tagId of tagIds) {
      await tx.productTag.create({ data: { productId: p.id, tagId } })
    }

    // Add to collections
    for (const collectionId of collectionIds) {
      const maxSort = await tx.collectionProduct.aggregate({
        where: { collectionId },
        _max: { sortOrder: true },
      })
      await tx.collectionProduct.create({
        data: { productId: p.id, collectionId, sortOrder: (maxSort._max.sortOrder ?? -1) + 1 },
      })
    }

    for (let i = 0; i < validatedVariants.length; i++) {
      const variant = validatedVariants[i]
      const { units, ...variantData } = variant
      const variantImageKey = `variantImage_${i}`
      const variantImage = variantImagesMap[variantImageKey] || null
      const v = await tx.productVariant.create({
        data: { ...variantData, image: variantImage, productId: p.id },
      })
      for (const unitData of units) {
        await tx.productUnit.create({
          data: { ...unitData, variantId: v.id },
        })
      }
      // Create variant options if present
      const options = variantOptionsMap[i]
      if (options && options.length > 0) {
        for (let oi = 0; oi < options.length; oi++) {
          const opt = options[oi]
          const optionImageKey = `optionImage_${i}_${oi}`
          const optionImage = optionImagesMap[optionImageKey] || null
          await tx.variantOption.create({
            data: {
              name: opt.name,
              nameEn: opt.nameEn || null,
              image: optionImage,
              stock: opt.stock || 0,
              priceOverride: opt.priceOverride ?? null,
              sortOrder: opt.sortOrder ?? 0,
              variantId: v.id,
            },
          })
        }
      }
    }

    return p
  })

  revalidatePath('/admin/products')
  return { success: true, data: { id: product.id } }
}

export async function updateProduct(id: string, formData: FormData): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  const existing = await db.product.findUnique({ where: { id } })
  if (!existing) return { success: false, error: 'Product not found' }

  const rawData: Record<string, unknown> = {}
  const fields = ['name', 'nameEn', 'description', 'descriptionEn', 'categoryId', 'brandId']
  
  for (const field of fields) {
    const value = formData.get(field)
    if (value !== null && value !== '') {
      rawData[field] = value
    }
  }
  
  // Handle supplierId (can be empty to remove supplier)
  const supplierIdValue = formData.get('supplierId')
  const supplierId = supplierIdValue && supplierIdValue !== '' ? supplierIdValue as string : null

  // Handle brandId (can be empty to remove brand)
  const brandIdValue = formData.get('brandId')
  const brandId = brandIdValue && brandIdValue !== '' ? brandIdValue as string : null

  const isActive = formData.get('isActive')
  if (isActive !== null) {
    rawData.isActive = isActive === 'true'
  }

  const validated = updateProductSchema.safeParse(rawData)
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors }
  }

  // Handle image upload
  let imagePath: string | undefined
  const imageFile = formData.get('image')
  if (imageFile && imageFile instanceof File && imageFile.size > 0) {
    try {
      imagePath = await saveProductImage(imageFile)
      if (existing.image) {
        await deleteProductImage(existing.image)
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Image upload failed' }
    }
  }

  // Parse and validate variants
  const variantsJson = formData.get('variants')
  let validatedVariants: Array<{
    size: string
    sizeEn?: string
    sku?: string
    barcode?: string
    stock: number
    minOrderQuantity: number
    isDefault: boolean
    isActive: boolean
    sortOrder: number
    units: Array<{
      unit: Unit
      label: string
      labelEn?: string
      piecesPerUnit: number
      price: number
      wholesalePrice?: number | null
      compareAtPrice?: number | null
      isDefault: boolean
      sortOrder: number
    }>
  }> | null = null

  if (variantsJson && typeof variantsJson === 'string') {
    let variantsData: unknown[]
    try {
      variantsData = JSON.parse(variantsJson)
    } catch {
      return { success: false, error: 'Invalid variants data' }
    }

    if (!Array.isArray(variantsData) || variantsData.length === 0) {
      return { success: false, error: 'يجب إضافة حجم واحد على الأقل' }
    }

    validatedVariants = []
    for (let i = 0; i < variantsData.length; i++) {
      const result = productVariantSchema.safeParse(variantsData[i])
      if (!result.success) {
        return { success: false, error: `خطأ في بيانات الحجم ${i + 1}: ${result.error.issues[0]?.message}` }
      }
      validatedVariants.push({
        ...result.data,
        isDefault: result.data.isDefault ?? (i === 0),
        isActive: result.data.isActive ?? true,
        sortOrder: result.data.sortOrder ?? i,
        units: result.data.units.map((u, j) => ({
          ...u,
          unit: u.unit as Unit,
          isDefault: u.isDefault ?? (j === 0),
          sortOrder: u.sortOrder ?? j,
        })),
      })
    }
  }

  // Parse additional category IDs, tag IDs, collection IDs
  const categoryIdsJson = formData.get('categoryIds')
  const tagIdsJson = formData.get('tagIds')
  const collectionIdsJson = formData.get('collectionIds')

  // Update product, variants, and units in a transaction
  await db.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        ...validated.data,
        supplierId,
        brandId,
        ...(imagePath ? { image: imagePath } : {}),
      },
    })

    // Update ProductOnCategory if categoryIds provided
    if (categoryIdsJson) {
      const categoryIds: string[] = JSON.parse(categoryIdsJson as string)
      const primaryCategoryId = validated.data.categoryId ?? existing.categoryId
      const allCategoryIds = [primaryCategoryId, ...categoryIds.filter(cid => cid !== primaryCategoryId)]
      await tx.productOnCategory.deleteMany({ where: { productId: id } })
      for (let i = 0; i < allCategoryIds.length; i++) {
        await tx.productOnCategory.create({
          data: { productId: id, categoryId: allCategoryIds[i], isPrimary: i === 0, sortOrder: i },
        })
      }
    }

    // Update tags if tagIds provided
    if (tagIdsJson) {
      const tagIds: string[] = JSON.parse(tagIdsJson as string)
      await tx.productTag.deleteMany({ where: { productId: id } })
      for (const tagId of tagIds) {
        await tx.productTag.create({ data: { productId: id, tagId } })
      }
    }

    // Update collections if collectionIds provided
    if (collectionIdsJson) {
      const collectionIds: string[] = JSON.parse(collectionIdsJson as string)
      await tx.collectionProduct.deleteMany({ where: { productId: id } })
      for (const collectionId of collectionIds) {
        const maxSort = await tx.collectionProduct.aggregate({
          where: { collectionId },
          _max: { sortOrder: true },
        })
        await tx.collectionProduct.create({
          data: { productId: id, collectionId, sortOrder: (maxSort._max.sortOrder ?? -1) + 1 },
        })
      }
    }

    if (validatedVariants) {
      // Delete all existing variants (cascades to units and options)
      await tx.productVariant.deleteMany({ where: { productId: id } })

      // Parse options from form data
      const optionsRaw = formData.get('variantOptions')
      let variantOptionsMap: Record<number, Array<{ name: string; nameEn?: string; stock: number; priceOverride?: number | null; sortOrder?: number }>> = {}
      if (optionsRaw) {
        try { variantOptionsMap = JSON.parse(optionsRaw as string) } catch { /* ignore */ }
      }

      // Upload option images (keyed by "optionImage_{variantIndex}_{optionIndex}")
      const optionImagesMap: Record<string, string> = {}
      // Upload variant images (keyed by "variantImage_{variantIndex}")
      const variantImagesMap: Record<string, string> = {}
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('optionImage_') && value instanceof File && value.size > 0) {
          const imageUrl = await saveProductImage(value)
          optionImagesMap[key] = imageUrl
        }
        if (key.startsWith('variantImage_') && value instanceof File && value.size > 0) {
          const imageUrl = await saveProductImage(value)
          variantImagesMap[key] = imageUrl
        }
      }

      // Parse existing option images (already uploaded, passed as URLs)
      const existingOptionImagesRaw = formData.get('existingOptionImages')
      let existingOptionImages: Record<string, string> = {}
      if (existingOptionImagesRaw) {
        try { existingOptionImages = JSON.parse(existingOptionImagesRaw as string) } catch { /* ignore */ }
      }

      // Parse existing variant images (already uploaded, passed as URLs)
      const existingVariantImagesRaw = formData.get('existingVariantImages')
      let existingVariantImages: Record<string, string> = {}
      if (existingVariantImagesRaw) {
        try { existingVariantImages = JSON.parse(existingVariantImagesRaw as string) } catch { /* ignore */ }
      }

      for (let i = 0; i < validatedVariants.length; i++) {
        const variant = validatedVariants[i]
        const { units, ...variantData } = variant
        const variantImageKey = `variantImage_${i}`
        const variantImage = variantImagesMap[variantImageKey] || existingVariantImages[variantImageKey] || null
        const v = await tx.productVariant.create({
          data: { ...variantData, image: variantImage, productId: id },
        })
        for (const unitData of units) {
          await tx.productUnit.create({
            data: { ...unitData, variantId: v.id },
          })
        }
        // Create variant options if present
        const options = variantOptionsMap[i]
        if (options && options.length > 0) {
          for (let oi = 0; oi < options.length; oi++) {
            const opt = options[oi]
            const optionImageKey = `optionImage_${i}_${oi}`
            const optionImage = optionImagesMap[optionImageKey] || existingOptionImages[optionImageKey] || null
            await tx.variantOption.create({
              data: {
                name: opt.name,
                nameEn: opt.nameEn || null,
                image: optionImage,
                stock: opt.stock || 0,
                priceOverride: opt.priceOverride ?? null,
                sortOrder: opt.sortOrder ?? 0,
                variantId: v.id,
              },
            })
          }
        }
      }
    }
  })

  revalidatePath('/admin/products')
  revalidatePath(`/admin/products/${id}`)
  return { success: true }
}

export async function deleteProduct(id: string): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  const product = await db.product.findUnique({ where: { id } })
  if (!product) return { success: false, error: 'Product not found' }

  // Delete image
  if (product.image) {
    await deleteProductImage(product.image)
  }

  await db.product.delete({ where: { id } })

  revalidatePath('/admin/products')
  return { success: true }
}

export async function toggleProductActive(id: string): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  const product = await db.product.findUnique({ where: { id } })
  if (!product) return { success: false, error: 'Product not found' }

  await db.product.update({
    where: { id },
    data: { isActive: !product.isActive },
  })

  revalidatePath('/admin/products')
  return { success: true }
}

export async function reorderProducts(orderedIds: string[]): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  if (!orderedIds.length) return { success: false, error: 'No products to reorder' }

  await db.$transaction(
    orderedIds.map((id, index) =>
      db.product.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  )

  revalidatePath('/admin/products')
  return { success: true }
}

export async function getProducts(options?: {
  categoryId?: string
  supplierId?: string
  search?: string
  isActive?: boolean
  page?: number
  limit?: number
  includeDescendants?: boolean
}) {
  const { categoryId, supplierId, search, isActive, page = 1, limit = 20 } = options ?? {}

  const where: Record<string, unknown> = {}
  if (categoryId) {
    if (options?.includeDescendants) {
      // Get all descendant category IDs
      const { getCategoryDescendantIds } = await import('@/actions/categories')
      const descendantIds = await getCategoryDescendantIds(categoryId)
      where.categoryId = { in: [categoryId, ...descendantIds] }
    } else {
      where.categoryId = categoryId
    }
  }
  if (supplierId) where.supplierId = supplierId
  if (isActive !== undefined) where.isActive = isActive
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { nameEn: { contains: search, mode: 'insensitive' } },
      { variants: { some: { sku: { contains: search, mode: 'insensitive' } } } },
    ]
  }

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      include: {
        category: true,
        supplier: true,
        variants: {
          orderBy: { sortOrder: 'asc' },
          include: { units: { orderBy: { sortOrder: 'asc' } } },
        },
      },
      orderBy: { sortOrder: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.product.count({ where }),
  ])

  return { products, total, pages: Math.ceil(total / limit) }
}

export async function getProductById(id: string) {
  return db.product.findUnique({
    where: { id },
    include: { 
      category: true,
      supplier: true,
      variants: {
        orderBy: { sortOrder: 'asc' },
        include: {
          units: { orderBy: { sortOrder: 'asc' } },
          options: { orderBy: { sortOrder: 'asc' } },
        },
      },
    },
  })
}
