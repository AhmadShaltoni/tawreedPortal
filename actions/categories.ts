'use server'

import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createCategorySchema, updateCategorySchema } from '@/lib/validations'
import { saveCategoryImage, deleteCategoryImage } from '@/lib/upload'
import type { ActionResponse } from '@/types'
import { revalidatePath } from 'next/cache'

// ============================================
// CRUD Operations
// ============================================

export async function createCategory(formData: FormData): Promise<ActionResponse<{ id: string }>> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  const rawData = {
    name: formData.get('name'),
    nameEn: formData.get('nameEn') || undefined,
    slug: formData.get('slug'),
    parentId: formData.get('parentId') || undefined,
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

  // If parentId is provided, validate it
  let parentDepth = -1
  let parentPath = ''
  if (validated.data.parentId) {
    const parent = await db.category.findUnique({ where: { id: validated.data.parentId } })
    if (!parent) return { success: false, error: 'Parent category not found' }
    if (!parent.isActive) return { success: false, error: 'Parent category is inactive' }

    // Ensure parent doesn't have products (leaf → branch transition blocked)
    const parentProductCount = await db.product.count({ where: { categoryId: parent.id } })
    if (parentProductCount > 0) {
      return { success: false, error: 'لا يمكن إضافة صنف فرعي لصنف يحتوي على منتجات. انقل المنتجات أولاً.' }
    }

    parentDepth = parent.depth
    parentPath = parent.path
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
      name: validated.data.name,
      nameEn: validated.data.nameEn,
      slug: validated.data.slug,
      sortOrder: validated.data.sortOrder ?? 0,
      isActive: validated.data.isActive ?? true,
      image: imagePath,
      parentId: validated.data.parentId || null,
      depth: parentDepth + 1,
      path: '', // temporary, will be updated below
    },
  })

  // Update path to include own ID
  const newPath = parentPath ? `${parentPath}/${category.id}` : category.id
  await db.category.update({
    where: { id: category.id },
    data: { path: newPath },
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

  // Handle parentId change (moving category)
  const newParentId = formData.get('parentId')
  if (newParentId !== null) {
    rawData.parentId = String(newParentId)
  }

  const validated = updateCategorySchema.safeParse(rawData)
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors }
  }

  // Check slug uniqueness if changed
  if (validated.data.slug && validated.data.slug !== existing.slug) {
    const slugExists = await db.category.findUnique({ where: { slug: validated.data.slug } })
    if (slugExists) return { success: false, error: 'A category with this slug already exists' }
  }

  // Handle parent change
  const changingParent = validated.data.parentId !== undefined &&
    (validated.data.parentId || null) !== existing.parentId

  if (changingParent) {
    const targetParentId = validated.data.parentId || null

    if (targetParentId) {
      // Prevent moving under itself
      if (targetParentId === id) {
        return { success: false, error: 'لا يمكن نقل صنف ليكون تابعاً لنفسه' }
      }
      // Prevent circular reference: ensure target is not a descendant
      const descendantIds = await getCategoryDescendantIds(id)
      if (descendantIds.includes(targetParentId)) {
        return { success: false, error: 'لا يمكن نقل صنف ليكون تابعاً لأحد فروعه' }
      }
      // Ensure new parent doesn't have products
      const parentProductCount = await db.product.count({ where: { categoryId: targetParentId } })
      if (parentProductCount > 0) {
        return { success: false, error: 'لا يمكن النقل لصنف يحتوي على منتجات' }
      }

      const newParent = await db.category.findUnique({ where: { id: targetParentId } })
      if (!newParent) return { success: false, error: 'Parent category not found' }
    }
  }

  // Handle image upload
  let imagePath = existing.image
  const imageFile = formData.get('image') as File | null
  if (imageFile && imageFile.size > 0) {
    try {
      if (existing.image) {
        await deleteCategoryImage(existing.image)
      }
      imagePath = await saveCategoryImage(imageFile)
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to upload image' }
    }
  }

  // Build update data without parentId first
  const { parentId: _parentId, ...restValidated } = validated.data
  const updateData: Record<string, unknown> = {
    ...restValidated,
    ...(imagePath !== undefined && { image: imagePath }),
  }

  // If changing parent, recalculate depth and path
  if (changingParent) {
    const targetParentId = validated.data.parentId || null
    let newDepth = 0
    let newPath = id

    if (targetParentId) {
      const newParent = await db.category.findUnique({ where: { id: targetParentId } })
      if (newParent) {
        newDepth = newParent.depth + 1
        newPath = `${newParent.path}/${id}`
      }
    }

    updateData.parentId = targetParentId
    updateData.depth = newDepth
    updateData.path = newPath

    // Update the category first
    await db.category.update({ where: { id }, data: updateData })

    // Recursively update all descendants' depth and path
    await recalculateDescendants(id, newPath, newDepth)
  } else {
    await db.category.update({ where: { id }, data: updateData })
  }

  revalidatePath('/admin/categories')
  return { success: true }
}

export async function deleteCategory(id: string): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  // Check if category has children
  const childCount = await db.category.count({ where: { parentId: id } })
  if (childCount > 0) {
    return { success: false, error: `لا يمكن حذف صنف يحتوي على ${childCount} أصناف فرعية. احذفها أو انقلها أولاً.` }
  }

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

// ============================================
// Read Operations
// ============================================

export async function getCategories(includeInactive = false, parentId?: string | null) {
  const where: Record<string, unknown> = {}
  if (!includeInactive) where.isActive = true

  // parentId === undefined means "all categories" (backward compatible)
  // parentId === null means "root categories only"
  // parentId === "some-id" means "children of that category"
  if (parentId === null) {
    where.parentId = null
  } else if (parentId !== undefined) {
    where.parentId = parentId
  }

  return db.category.findMany({
    where,
    include: {
      _count: { select: { products: true, children: true } },
    },
    orderBy: { sortOrder: 'asc' },
  })
}

export async function getCategoryById(id: string) {
  return db.category.findUnique({
    where: { id },
    include: {
      _count: { select: { products: true, children: true } },
      parent: { select: { id: true, name: true, nameEn: true, slug: true } },
    },
  })
}

export async function getCategoryBreadcrumb(categoryId: string) {
  const category = await db.category.findUnique({
    where: { id: categoryId },
    select: { path: true },
  })
  if (!category || !category.path) return []

  const ancestorIds = category.path.split('/').filter(Boolean)
  if (ancestorIds.length === 0) return []

  const ancestors = await db.category.findMany({
    where: { id: { in: ancestorIds } },
    select: { id: true, name: true, nameEn: true, slug: true },
  })

  // Sort by order in path
  return ancestorIds
    .map(id => ancestors.find(a => a.id === id))
    .filter((item): item is NonNullable<typeof item> => item != null)
}

export async function getCategoryTree(includeInactive = false) {
  const where: Record<string, unknown> = {}
  if (!includeInactive) where.isActive = true

  const allCategories = await db.category.findMany({
    where,
    include: {
      _count: { select: { products: true, children: true } },
    },
    orderBy: { sortOrder: 'asc' },
  })

  type CatNode = typeof allCategories[0] & { children: CatNode[] }

  // Build tree from flat list
  const map = new Map<string, CatNode>()
  const roots: CatNode[] = []

  for (const cat of allCategories) {
    map.set(cat.id, { ...cat, children: [] })
  }

  for (const cat of allCategories) {
    const node = map.get(cat.id)!
    if (cat.parentId && map.has(cat.parentId)) {
      map.get(cat.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

export async function getCategoryDescendantIds(categoryId: string): Promise<string[]> {
  const category = await db.category.findUnique({
    where: { id: categoryId },
    select: { path: true },
  })
  if (!category) return []

  // Find categories whose path starts with this category's path
  const descendants = await db.category.findMany({
    where: {
      path: { startsWith: category.path + '/' },
      id: { not: categoryId },
    },
    select: { id: true },
  })

  return descendants.map(d => d.id)
}

/**
 * Get all leaf categories (categories with no children).
 * These are the only categories where products can be assigned.
 */
export async function getLeafCategories(includeInactive = false) {
  const where: Record<string, unknown> = {}
  if (!includeInactive) where.isActive = true

  const all = await db.category.findMany({
    where,
    include: { _count: { select: { children: true } } },
    orderBy: { sortOrder: 'asc' },
  })

  return all.filter(c => c._count.children === 0)
}

// ============================================
// Reorder Operations
// ============================================

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

// ============================================
// Internal Helpers
// ============================================

async function recalculateDescendants(parentId: string, parentPath: string, parentDepth: number) {
  const children = await db.category.findMany({
    where: { parentId },
    select: { id: true },
  })

  for (const child of children) {
    const childPath = `${parentPath}/${child.id}`
    const childDepth = parentDepth + 1
    await db.category.update({
      where: { id: child.id },
      data: { path: childPath, depth: childDepth },
    })
    await recalculateDescendants(child.id, childPath, childDepth)
  }
}
