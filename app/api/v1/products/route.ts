import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiResponse, corsOptions } from '@/lib/api-auth'
import { calcProductDiscounts, applyDiscount } from '@/lib/discount-engine'
import { searchProductIds, paginateSearchIds, sortByIdOrder } from '@/lib/search-index'

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

  // Arabic-aware fuzzy search: ranked IDs from searchText, then paginated
  // in rank order after applying the other filters
  let searchPageIds: string[] | null = null
  let searchTotal = 0
  if (search) {
    const rankedIds = await searchProductIds(search)
    const paged = await paginateSearchIds(rankedIds, where, (page - 1) * limit, limit)
    searchPageIds = paged.pageIds
    searchTotal = paged.total
    where.id = { in: searchPageIds }
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
          categoryId: true,
          category: { select: { id: true, name: true, nameEn: true, slug: true } },
          brand: { select: { id: true, name: true, nameEn: true, logo: true } },
          collections: { select: { collectionId: true } },
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
        ...(searchPageIds === null ? { skip: (page - 1) * limit, take: limit } : {}),
      }),
      searchPageIds === null ? db.product.count({ where }) : Promise.resolve(searchTotal),
    ])

    const orderedProducts = searchPageIds ? sortByIdOrder(products, searchPageIds) : products

    // Calculate campaign discounts for all products in batch
    const discountMap = await calcProductDiscounts(
      orderedProducts.map(p => ({
        id: p.id,
        categoryId: p.categoryId,
        collectionIds: p.collections.map(c => c.collectionId),
      }))
    )

    const productCards = orderedProducts.map((p) => {
      const defaultUnit = p.variants[0]?.units[0]
      const originalPrice = defaultUnit?.price ?? 0
      const campaignDiscount = discountMap.get(p.id) || 0
      const hasManualDiscount = defaultUnit?.compareAtPrice != null && defaultUnit.compareAtPrice > originalPrice
      const hasCampaignDiscount = campaignDiscount > 0

      let displayPrice = originalPrice
      let displayCompareAtPrice: number | null = defaultUnit?.compareAtPrice ?? null

      if (hasCampaignDiscount) {
        displayPrice = applyDiscount(originalPrice, campaignDiscount)
        displayCompareAtPrice = originalPrice
      }

      return {
        id: p.id,
        name: p.name,
        nameEn: p.nameEn,
        image: p.image,
        brand: p.brand,
        primaryCategory: p.category,
        startingPrice: displayPrice,
        compareAtPrice: displayCompareAtPrice,
        hasDiscount: hasManualDiscount || hasCampaignDiscount,
        discountPercent: hasCampaignDiscount ? campaignDiscount : null,
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
        collections: { select: { collectionId: true } },
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
      ...(searchPageIds === null ? { skip: (page - 1) * limit, take: limit } : {}),
    }),
    searchPageIds === null ? db.product.count({ where }) : Promise.resolve(searchTotal),
  ])

  const orderedProducts = searchPageIds ? sortByIdOrder(products, searchPageIds) : products

  // Calculate campaign discounts for all products in batch
  const discountMap = await calcProductDiscounts(
    orderedProducts.map(p => ({
      id: p.id,
      categoryId: p.categoryId,
      collectionIds: p.collections.map(c => c.collectionId),
    }))
  )

  // Apply campaign discounts to product units
  const productsWithDiscounts = orderedProducts.map(p => {
    const campaignDiscount = discountMap.get(p.id) || 0
    if (campaignDiscount === 0) {
      // Remove collections from response (internal only)
      const { collections, ...rest } = p
      return rest
    }

    const { collections, ...rest } = p
    return {
      ...rest,
      discountPercent: campaignDiscount,
      variants: rest.variants.map(v => ({
        ...v,
        units: v.units.map(u => ({
          ...u,
          compareAtPrice: u.price, // Original price becomes compareAtPrice
          price: applyDiscount(u.price, campaignDiscount), // Discounted price
        })),
        options: v.options.map(o => ({
          ...o,
          priceOverride: o.priceOverride ? applyDiscount(o.priceOverride, campaignDiscount) : null,
        })),
      })),
    }
  })

  return apiResponse({
    products: productsWithDiscounts,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
}
