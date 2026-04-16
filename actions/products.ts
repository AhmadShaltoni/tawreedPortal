'use server'

import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createProductSchema, updateProductSchema, productUnitSchema } from '@/lib/validations'
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
    price: formData.get('price'),
    compareAtPrice: formData.get('compareAtPrice') || undefined,
    categoryId: formData.get('categoryId'),
    unit: formData.get('unit'),
    sku: formData.get('sku') || undefined,
    barcode: formData.get('barcode') || undefined,
    stock: formData.get('stock'),
    minOrderQuantity: formData.get('minOrderQuantity') || 1,
    isActive: formData.get('isActive') === 'true',
  }

  const validated = createProductSchema.safeParse(rawData)
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors }
  }

  // Prevent adding product with 0 stock
  if (validated.data.stock <= 0) {
    return { success: false, error: 'لا يمكن إضافة منتج بمخزون 0' }
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

  // Parse and validate units BEFORE creating the product
  const unitsJson = formData.get('units')
  console.log('[createProduct] Raw units from formData:', typeof unitsJson, unitsJson ? String(unitsJson).substring(0, 200) : 'NULL')
  
  const validatedUnits: Array<{
    unit: Unit
    label: string
    labelEn?: string
    piecesPerUnit: number
    price: number
    compareAtPrice?: number | null
    isDefault: boolean
    sortOrder: number
  }> = []

  if (unitsJson && typeof unitsJson === 'string') {
    try {
      const unitsData = JSON.parse(unitsJson)
      console.log('[createProduct] Parsed units count:', Array.isArray(unitsData) ? unitsData.length : 'NOT_ARRAY')
      if (Array.isArray(unitsData)) {
        for (let i = 0; i < unitsData.length; i++) {
          const unitResult = productUnitSchema.safeParse(unitsData[i])
          if (unitResult.success) {
            validatedUnits.push({
              ...unitResult.data,
              unit: unitResult.data.unit as Unit,
              isDefault: unitResult.data.isDefault ?? false,
              sortOrder: unitResult.data.sortOrder ?? i,
            })
          } else {
            console.error(`[createProduct] Unit ${i} validation failed:`, JSON.stringify(unitResult.error.issues))
          }
        }
      }
    } catch (err) {
      console.error('[createProduct] Failed to parse units JSON:', err)
    }
  }

  console.log('[createProduct] Valid units to create:', validatedUnits.length)

  // Create product and units in a transaction
  const product = await db.$transaction(async (tx) => {
    const p = await tx.product.create({
      data: {
        ...validated.data,
        image: imagePath,
        isActive: validated.data.isActive ?? true,
      },
    })

    // Create units
    for (const unitData of validatedUnits) {
      await tx.productUnit.create({
        data: {
          ...unitData,
          productId: p.id,
        },
      })
    }

    console.log(`[createProduct] Product ${p.id} created with ${validatedUnits.length} units`)
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
  const fields = ['name', 'nameEn', 'description', 'descriptionEn', 'price', 'compareAtPrice', 'categoryId', 'unit', 'sku', 'barcode', 'stock', 'minOrderQuantity']
  
  for (const field of fields) {
    const value = formData.get(field)
    if (value !== null && value !== '') {
      rawData[field] = value
    }
  }
  
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
      // Delete old image
      if (existing.image) {
        await deleteProductImage(existing.image)
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Image upload failed' }
    }
  }

  await db.product.update({
    where: { id },
    data: {
      ...validated.data,
      ...(imagePath ? { image: imagePath } : {}),
    },
  })

  // Parse and validate units BEFORE updating
  const unitsJson = formData.get('units')
  console.log('[updateProduct] Raw units from formData:', typeof unitsJson, unitsJson ? String(unitsJson).substring(0, 200) : 'NULL')
  
  const validatedUnits: Array<{
    unit: Unit
    label: string
    labelEn?: string
    piecesPerUnit: number
    price: number
    compareAtPrice?: number | null
    isDefault: boolean
    sortOrder: number
  }> = []

  if (unitsJson && typeof unitsJson === 'string') {
    try {
      const unitsData = JSON.parse(unitsJson)
      console.log('[updateProduct] Parsed units count:', Array.isArray(unitsData) ? unitsData.length : 'NOT_ARRAY')
      if (Array.isArray(unitsData)) {
        for (let i = 0; i < unitsData.length; i++) {
          const unitResult = productUnitSchema.safeParse(unitsData[i])
          if (unitResult.success) {
            validatedUnits.push({
              ...unitResult.data,
              unit: unitResult.data.unit as Unit,
              isDefault: unitResult.data.isDefault ?? false,
              sortOrder: unitResult.data.sortOrder ?? i,
            })
          } else {
            console.error(`[updateProduct] Unit ${i} validation failed:`, JSON.stringify(unitResult.error.issues))
          }
        }
      }
    } catch (err) {
      console.error('[updateProduct] Failed to parse units JSON:', err)
    }
  }

  console.log('[updateProduct] Valid units to save:', validatedUnits.length)

  // Update product and units in a transaction
  await db.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        ...validated.data,
        ...(imagePath ? { image: imagePath } : {}),
      },
    })

    // Delete all existing units and recreate
    await tx.productUnit.deleteMany({ where: { productId: id } })
    for (const unitData of validatedUnits) {
      await tx.productUnit.create({
        data: {
          ...unitData,
          productId: id,
        },
      })
    }

    console.log(`[updateProduct] Product ${id} updated with ${validatedUnits.length} units`)
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
  search?: string
  isActive?: boolean
  page?: number
  limit?: number
  includeDescendants?: boolean
}) {
  const { categoryId, search, isActive, page = 1, limit = 20 } = options ?? {}

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
  if (isActive !== undefined) where.isActive = isActive
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { nameEn: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      include: { category: true, units: { orderBy: { sortOrder: 'asc' } } },
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
      units: { orderBy: { sortOrder: 'asc' } } 
    },
  })
}
