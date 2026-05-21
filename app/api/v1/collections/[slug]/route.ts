import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiResponse, apiError, corsOptions } from '@/lib/api-auth'

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

// GET /api/v1/collections/[slug] - Collection detail with products (card-level)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { searchParams } = new URL(request.url)
  const page = Number(searchParams.get('page')) || 1
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 100)

  const collection = await db.collection.findUnique({
    where: { slug, isActive: true },
    select: {
      id: true,
      name: true,
      nameEn: true,
      slug: true,
      description: true,
      descriptionEn: true,
      image: true,
      type: true,
    },
  })

  if (!collection) return apiError('Collection not found', 404)

  const [collectionProducts, total] = await Promise.all([
    db.collectionProduct.findMany({
      where: {
        collectionId: collection.id,
        product: {
          isActive: true,
          variants: { some: { isActive: true, stock: { gt: 0 } } },
        },
      },
      include: {
        product: {
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
        },
      },
      orderBy: { sortOrder: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.collectionProduct.count({
      where: {
        collectionId: collection.id,
        product: { isActive: true },
      },
    }),
  ])

  // Transform to card-level response
  const products = collectionProducts.map((cp) => {
    const p = cp.product
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
    collection,
    products,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
}
