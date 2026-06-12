import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiResponse, corsOptions } from '@/lib/api-auth'
import { calcProductDiscounts, applyDiscount } from '@/lib/discount-engine'

export async function OPTIONS() {
  return corsOptions()
}

// GET /api/v1/marketing-sections/:slug - Get section details with products
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const section = await db.collection.findFirst({
    where: { slug, isActive: true, type: 'MANUAL' },
    select: {
      id: true,
      name: true,
      nameEn: true,
      slug: true,
      description: true,
      descriptionEn: true,
      image: true,
      products: {
        orderBy: { sortOrder: 'asc' },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              nameEn: true,
              description: true,
              descriptionEn: true,
              image: true,
              images: true,
              isActive: true,
              brand: { select: { id: true, name: true, nameEn: true, slug: true, logo: true } },
              category: { select: { id: true, name: true, nameEn: true, slug: true } },
              variants: {
                where: { isActive: true },
                orderBy: { sortOrder: 'asc' },
                select: {
                  id: true,
                  size: true,
                  sizeEn: true,
                  image: true,
                  stock: true,
                  isDefault: true,
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
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!section) {
    return apiResponse({ error: 'Marketing section not found' }, 404)
  }

  // Filter out inactive products and flatten
  const activeProducts = section.products
    .filter((cp) => cp.product.isActive)
    .map((cp) => cp.product)

  // Calculate campaign discounts for all products in this section
  const discountMap = await calcProductDiscounts(
    activeProducts.map(p => ({
      id: p.id,
      categoryId: p.category?.id || '',
      collectionIds: [section.id], // This product is in this collection
    }))
  )

  // Apply discounts to product unit prices
  const productsWithDiscounts = activeProducts.map(p => {
    const campaignDiscount = discountMap.get(p.id) || 0
    if (campaignDiscount === 0) return p

    return {
      ...p,
      discountPercent: campaignDiscount,
      variants: p.variants.map(v => ({
        ...v,
        units: v.units.map(u => ({
          ...u,
          compareAtPrice: u.price,
          price: applyDiscount(u.price, campaignDiscount),
        })),
        options: v.options.map(o => ({
          ...o,
          priceOverride: o.priceOverride ? applyDiscount(o.priceOverride, campaignDiscount) : null,
        })),
      })),
    }
  })

  const response = {
    ...section,
    products: productsWithDiscounts,
  }

  return apiResponse({ section: response })
}
