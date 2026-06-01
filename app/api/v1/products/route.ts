import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiResponse, corsOptions } from '@/lib/api-auth'

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

// GET /api/v1/products?categoryId=xxx&brandId=xxx&tagId=xxx&collectionId=xxx&search=xxx&page=1&limit=20&includeDescendants=true&view=card
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const categoryId = searchParams.get('categoryId')
  const brandId = searchParams.get('brandId')
  const tagId = searchParams.get('tagId')
  const collectionId = searchParams.get('collectionId')
  const search = searchParams.get('search')
  const includeDescendants = searchParams.get('includeDescendants') === 'true'
  const view = searchParams.get('view') // 'card' for lightweight response
  const page = Number(searchParams.get('page')) || 1
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 100)

  const where: Record<string, unknown> = {
    isActive: true,
    variants: { some: { stock: { gt: 0 }, isActive: true } },
  }

  if (categoryId) {
    if (includeDescendants) {
      // Find all descendant category IDs using materialized path
      const category = await db.category.findUnique({
        where: { id: categoryId },
        select: { path: true },
      })
      if (category?.path) {
        const descendants = await db.category.findMany({
          where: { path: { startsWith: category.path + '/' } },
          select: { id: true },
        })
        const allIds = [categoryId, ...descendants.map(d => d.id)]
        where.categoryId = { in: allIds }
      } else {
        where.categoryId = categoryId
      }
    } else {
      where.categoryId = categoryId
    }
  }

  if (brandId) {
    where.brandId = brandId
  }

  if (tagId) {
    where.tags = { some: { tagId } }
  }

  if (collectionId) {
    where.collections = { some: { collectionId } }
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { nameEn: { contains: search, mode: 'insensitive' } },
    ]
  }

  // Card-level (lightweight) response for mobile lists
  if (view === 'card') {
    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          nameEn: true,
          image: true,
          category: { select: { id: true, name: true, nameEn: true, slug: true } },
          brand: { select: { id: true, name: true, nameEn: true, logo: true } },
          variants: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            take: 1,
            include: {
              units: {
                where: { isDefault: true },
                take: 1,
                select: { price: true, compareAtPrice: true },
              },
            },
          },
        },
        orderBy: { sortOrder: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.product.count({ where }),
    ])

    const productCards = products.map((p) => {
      const defaultUnit = p.variants[0]?.units[0]
      return {
        id: p.id,
        name: p.name,
        nameEn: p.nameEn,
        image: p.image,
        brand: p.brand,
        primaryCategory: p.category,
        startingPrice: defaultUnit?.price ?? 0,
        hasDiscount: defaultUnit?.compareAtPrice != null && defaultUnit.compareAtPrice > (defaultUnit?.price ?? 0),
        inStock: true,
      }
    })

    return apiResponse({
      products: productCards,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  }

  // Full response (backward-compatible)
  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, nameEn: true, slug: true } },
        brand: { select: { id: true, name: true, nameEn: true, slug: true, logo: true } },
        variants: {
          where: { isActive: true, stock: { gt: 0 } },
          orderBy: { sortOrder: 'asc' },
          include: {
            units: {
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                unit: true,
                label: true,
                labelEn: true,
                piecesPerUnit: true,
                price: true,
                compareAtPrice: true,
                isDefault: true,
                sortOrder: true,
              },
            },
            options: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                name: true,
                nameEn: true,
                image: true,
                stock: true,
                priceOverride: true,
                isActive: true,
                sortOrder: true,
              },
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.product.count({ where }),
  ])

  return apiResponse({
    products,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
}
