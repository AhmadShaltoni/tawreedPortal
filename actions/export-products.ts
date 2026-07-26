'use server'

import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'

export async function getAllProductsForExport(options?: {
  categoryId?: string
  supplierId?: string
  search?: string
  includeDescendants?: boolean
}) {
  // Exposes internal wholesale/cost prices — restrict to staff with product
  // access. Server Actions bypass page/layout gating, so authorize here.
  const { authorized } = await requirePermission('products')
  if (!authorized) return []

  const { categoryId, supplierId, search } = options ?? {}

  const where: Record<string, unknown> = { isActive: true }
  if (categoryId) {
    if (options?.includeDescendants) {
      const { getCategoryDescendantIds } = await import('@/actions/categories')
      const descendantIds = await getCategoryDescendantIds(categoryId)
      where.categoryId = { in: [categoryId, ...descendantIds] }
    } else {
      where.categoryId = categoryId
    }
  }
  if (supplierId) where.supplierId = supplierId
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { nameEn: { contains: search, mode: 'insensitive' } },
      { variants: { some: { sku: { contains: search, mode: 'insensitive' } } } },
    ]
  }

  const products = await db.product.findMany({
    where,
    include: {
      category: true,
      variants: {
        orderBy: { sortOrder: 'asc' },
        include: {
          units: { orderBy: { sortOrder: 'asc' } },
        },
      },
    },
    orderBy: { sortOrder: 'asc' },
  })

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    nameEn: p.nameEn,
    image: p.image,
    category: p.category.name,
    variants: p.variants.map((v) => ({
      size: v.size,
      stock: v.stock,
      image: v.image,
      units: v.units.map((u) => ({
        price: u.price,
        wholesalePrice: u.wholesalePrice,
        label: u.label,
        piecesPerUnit: u.piecesPerUnit,
        isDefault: u.isDefault,
      })),
    })),
  }))
}
