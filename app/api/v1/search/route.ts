import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { calcProductDiscounts, applyDiscount } from '@/lib/discount-engine'

export async function OPTIONS() {
  return corsOptions()
}

// GET /api/v1/search?q=query&page=1&limit=20
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))
  const skip = (page - 1) * limit

  if (!query || query.length < 2) {
    return apiError('Search query must be at least 2 characters', 400)
  }

  // Use Prisma contains for now; can be upgraded to PostgreSQL FTS later
  const where = {
    isActive: true,
    OR: [
      { name: { contains: query, mode: 'insensitive' as const } },
      { nameEn: { contains: query, mode: 'insensitive' as const } },
      { description: { contains: query, mode: 'insensitive' as const } },
      { descriptionEn: { contains: query, mode: 'insensitive' as const } },
      { brand: { name: { contains: query, mode: 'insensitive' as const } } },
      { brand: { nameEn: { contains: query, mode: 'insensitive' as const } } },
    ],
  }

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        nameEn: true,
        image: true,
        categoryId: true,
        brand: { select: { id: true, name: true, nameEn: true, slug: true } },
        category: { select: { id: true, name: true, nameEn: true, slug: true } },
        collections: { select: { collectionId: true } },
        variants: {
          where: { isActive: true },
          take: 1,
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            size: true,
            sizeEn: true,
            stock: true,
            units: {
              where: { isDefault: true },
              take: 1,
              select: { id: true, price: true, compareAtPrice: true, unit: true, label: true, labelEn: true },
            },
          },
        },
      },
    }),
    db.product.count({ where }),
  ])

  // Apply campaign discounts
  const discountMap = await calcProductDiscounts(
    products.map(p => ({
      id: p.id,
      categoryId: p.categoryId,
      collectionIds: p.collections.map(c => c.collectionId),
    }))
  )

  const productsWithDiscounts = products.map(p => {
    const campaignDiscount = discountMap.get(p.id) || 0
    const { categoryId, collections, ...rest } = p
    if (campaignDiscount === 0) return rest

    return {
      ...rest,
      discountPercent: campaignDiscount,
      variants: rest.variants.map(v => ({
        ...v,
        units: v.units.map(u => ({
          ...u,
          compareAtPrice: u.price,
          price: applyDiscount(u.price, campaignDiscount),
        })),
      })),
    }
  })

  return apiResponse({
    products: productsWithDiscounts,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}
