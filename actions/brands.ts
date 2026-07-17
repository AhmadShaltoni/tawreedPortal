'use server'

import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createBrandSchema, updateBrandSchema } from '@/lib/validations'
import { saveBrandImage, deleteBrandImage } from '@/lib/upload'
import { rebuildBrandProductsSearchText } from '@/lib/search-index'
import type { ActionResponse } from '@/types'
import { revalidatePath } from 'next/cache'

export async function createBrand(formData: FormData): Promise<ActionResponse<{ id: string }>> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  const name = formData.get('name') as string
  let slug = formData.get('slug') as string || ''
  
  // Generate slug from name if not provided
  if (!slug && name) {
    slug = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const rawData = {
    name,
    nameEn: formData.get('nameEn') || undefined,
    slug,
    description: formData.get('description') || undefined,
    descriptionEn: formData.get('descriptionEn') || undefined,
    isActive: formData.get('isActive') === 'true',
  }

  const validated = createBrandSchema.safeParse(rawData)
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors }
  }

  // Check slug uniqueness
  const existing = await db.brand.findUnique({ where: { slug: validated.data.slug! } })
  if (existing) {
    return { success: false, errors: { slug: ['This slug is already taken'] } }
  }

  // Handle logo upload
  let logoPath: string | undefined
  const logoFile = formData.get('logo')
  if (logoFile && logoFile instanceof File && logoFile.size > 0) {
    try {
      logoPath = await saveBrandImage(logoFile)
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Logo upload failed' }
    }
  }

  const brand = await db.brand.create({
    data: {
      name: validated.data.name,
      nameEn: validated.data.nameEn,
      slug: validated.data.slug!,
      description: validated.data.description,
      descriptionEn: validated.data.descriptionEn,
      isActive: validated.data.isActive ?? true,
      logo: logoPath,
    },
  })

  revalidatePath('/admin/brands')
  // Product add/edit forms embed the brand list — refresh them so their
  // dropdown isn't stale until a hard reload.
  revalidatePath('/admin/products', 'layout')
  return { success: true, data: { id: brand.id } }
}

export async function updateBrand(id: string, formData: FormData): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  const existing = await db.brand.findUnique({ where: { id } })
  if (!existing) return { success: false, error: 'Brand not found' }

  const rawData: Record<string, unknown> = {}
  const fields = ['name', 'nameEn', 'slug', 'description', 'descriptionEn']
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

  const validated = updateBrandSchema.safeParse(rawData)
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors }
  }

  // Check slug uniqueness if changing
  if (validated.data.slug && validated.data.slug !== existing.slug) {
    const slugExists = await db.brand.findUnique({ where: { slug: validated.data.slug } })
    if (slugExists) {
      return { success: false, errors: { slug: ['This slug is already taken'] } }
    }
  }

  // Handle logo upload
  let logoPath: string | undefined
  const logoFile = formData.get('logo')
  if (logoFile && logoFile instanceof File && logoFile.size > 0) {
    try {
      logoPath = await saveBrandImage(logoFile)
      if (existing.logo) {
        await deleteBrandImage(existing.logo)
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Logo upload failed' }
    }
  }

  await db.brand.update({
    where: { id },
    data: {
      ...validated.data,
      ...(logoPath !== undefined && { logo: logoPath }),
    },
  })

  // Brand name is part of each product's searchText
  if (validated.data.name !== existing.name || validated.data.nameEn !== existing.nameEn) {
    await rebuildBrandProductsSearchText(id)
  }

  revalidatePath('/admin/brands')
  // Product add/edit forms embed the brand list — refresh them so their
  // dropdown isn't stale until a hard reload.
  revalidatePath('/admin/products', 'layout')
  return { success: true }
}

export async function deleteBrand(id: string): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  const brand = await db.brand.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  })
  if (!brand) return { success: false, error: 'Brand not found' }

  if (brand._count.products > 0) {
    return { success: false, error: `Cannot delete brand with ${brand._count.products} products. Remove brand from products first.` }
  }

  if (brand.logo) {
    await deleteBrandImage(brand.logo)
  }

  await db.brand.delete({ where: { id } })

  revalidatePath('/admin/brands')
  // Product add/edit forms embed the brand list — refresh them so their
  // dropdown isn't stale until a hard reload.
  revalidatePath('/admin/products', 'layout')
  return { success: true }
}

export async function getBrands(options?: { isActive?: boolean }) {
  const where: Record<string, unknown> = {}
  if (options?.isActive !== undefined) where.isActive = options.isActive

  return db.brand.findMany({
    where,
    include: { _count: { select: { products: true } } },
    orderBy: { sortOrder: 'asc' },
  })
}

export async function reorderBrands(orderedIds: string[]): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  if (!orderedIds.length) return { success: false, error: 'No brands to reorder' }

  await db.$transaction(
    orderedIds.map((id, index) =>
      db.brand.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  )

  revalidatePath('/admin/brands')
  // Product add/edit forms embed the brand list — refresh them so their
  // dropdown isn't stale until a hard reload.
  revalidatePath('/admin/products', 'layout')
  return { success: true }
}
