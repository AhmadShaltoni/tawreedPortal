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

  // Create product, variants, and units in a transaction
  const product = await db.$transaction(async (tx) => {
    const p = await tx.product.create({
      data: {
        ...validated.data,
        supplierId: rawData.supplierId as string | undefined || null,
        image: imagePath,
        isActive: validated.data.isActive ?? true,
      },
    })

    for (const variant of validatedVariants) {
      const { units, ...variantData } = variant
      const v = await tx.productVariant.create({
        data: { ...variantData, productId: p.id },
      })
      for (const unitData of units) {
        await tx.productUnit.create({
          data: { ...unitData, variantId: v.id },
        })
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
  const fields = ['name', 'nameEn', 'description', 'descriptionEn', 'categoryId']
  
  for (const field of fields) {
    const value = formData.get(field)
    if (value !== null && value !== '') {
      rawData[field] = value
    }
  }
  
  // Handle supplierId (can be empty to remove supplier)
  const supplierIdValue = formData.get('supplierId')
  const supplierId = supplierIdValue && supplierIdValue !== '' ? supplierIdValue as string : null

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

  // Update product, variants, and units in a transaction
  await db.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        ...validated.data,
        supplierId,
        ...(imagePath ? { image: imagePath } : {}),
      },
    })

    if (validatedVariants) {
      // Delete all existing variants (cascades to units)
      await tx.productVariant.deleteMany({ where: { productId: id } })

      for (const variant of validatedVariants) {
        const { units, ...variantData } = variant
        const v = await tx.productVariant.create({
          data: { ...variantData, productId: id },
        })
        for (const unitData of units) {
          await tx.productUnit.create({
            data: { ...unitData, variantId: v.id },
          })
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
        include: { units: { orderBy: { sortOrder: 'asc' } } },
      },
    },
  })
}
