'use server'

import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createProductSchema, updateProductSchema } from '@/lib/validations'
import { saveProductImage, deleteProductImage } from '@/lib/upload'
import type { ActionResponse } from '@/types'
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

  const product = await db.product.create({
    data: {
      ...validated.data,
      image: imagePath,
      isActive: validated.data.isActive ?? true,
    },
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

export async function getProducts(options?: {
  categoryId?: string
  search?: string
  isActive?: boolean
  page?: number
  limit?: number
}) {
  const { categoryId, search, isActive, page = 1, limit = 20 } = options ?? {}

  const where: Record<string, unknown> = {}
  if (categoryId) where.categoryId = categoryId
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
      include: { category: true },
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
    include: { category: true },
  })
}
