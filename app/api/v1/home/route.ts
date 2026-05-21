import { db } from '@/lib/db'
import { apiResponse, corsOptions } from '@/lib/api-auth'

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

  // Filter out inactive products from collections
  const processedCollections = collections.map((col) => ({
    ...col,
    products: col.products
      .filter((cp) => cp.product.isActive)
      .map((cp) => cp.product),
  }))

  return apiResponse({
    collections: processedCollections,
    brands,
    categories,
  })
}
