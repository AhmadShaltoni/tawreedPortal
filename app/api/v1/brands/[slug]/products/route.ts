import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiResponse, apiError, corsOptions } from '@/lib/api-auth'

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

// GET /api/v1/brands/[slug]/products - Products by brand (card-level response)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { searchParams } = new URL(request.url)
  const page = Number(searchParams.get('page')) || 1
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 100)

  const brand = await db.brand.findUnique({
    where: { slug, isActive: true },
    select: { id: true, name: true, nameEn: true, slug: true, logo: true },
  })

  if (!brand) return apiError('Brand not found', 404)

  const where = {
    brandId: brand.id,
    isActive: true,
    variants: { some: { isActive: true, stock: { gt: 0 } } },
  }

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        nameEn: true,
        image: true,
        isActive: true,
        sortOrder: true,
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

  // Transform to card-level response
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
    brand,
    products: productCards,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
}
