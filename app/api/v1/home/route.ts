import { db } from '@/lib/db'
import { apiResponse, corsOptions } from '@/lib/api-auth'
import { calcProductDiscounts, applyDiscount } from '@/lib/discount-engine'

export async function OPTIONS() {
  return corsOptions()
}

// GET /api/v1/home - Aggregated home screen data
export async function GET() {
  const [collections, brands, categories] = await Promise.all([
    // Collections marked for home display
    db.collection.findMany({
      where: { isActive: true, showOnHome: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        nameEn: true,
        slug: true,
        image: true,
        type: true,
        products: {
          orderBy: { sortOrder: 'asc' },
          take: 10,
          include: {
            product: {
              select: {
                id: true,
                name: true,
                nameEn: true,
                image: true,
                isActive: true,
                categoryId: true,
                brand: { select: { id: true, name: true, nameEn: true, slug: true } },
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
            },
          },
        },
      },
    }),

    // Active brands
    db.brand.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        nameEn: true,
        slug: true,
        logo: true,
      },
    }),

    // Top-level categories
    db.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        nameEn: true,
        slug: true,
        image: true,
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: { id: true, name: true, nameEn: true, slug: true, image: true },
        },
      },
    }),
  ])

  // Collect all active products from all collections
  const allProducts: { id: string; categoryId: string; collectionIds: string[] }[] = []
  for (const col of collections) {
    for (const cp of col.products) {
      if (cp.product.isActive) {
        allProducts.push({
          id: cp.product.id,
          categoryId: cp.product.categoryId,
          collectionIds: [col.id],
        })
      }
    }
  }

  // Calculate discounts in one batch
  const discountMap = await calcProductDiscounts(allProducts)

  // Filter out inactive products from collections and apply discounts
  const processedCollections = collections.map((col) => ({
    ...col,
    products: col.products
      .filter((cp) => cp.product.isActive)
      .map((cp) => {
        const product = cp.product
        const campaignDiscount = discountMap.get(product.id) || 0
        if (campaignDiscount === 0) {
          const { categoryId, ...rest } = product
          return rest
        }
        const { categoryId, ...rest } = product
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
      }),
  }))

  return apiResponse({
    collections: processedCollections,
    brands,
    categories,
  })
}
