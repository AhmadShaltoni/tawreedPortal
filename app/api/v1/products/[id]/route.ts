import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { calcProductDiscount, applyDiscount } from '@/lib/discount-engine'

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

// GET /api/v1/products/[id] - Full product detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const product = await db.product.findUnique({
    where: {
      id,
      isActive: true,
    },
    include: {
      category: { select: { id: true, name: true, nameEn: true, slug: true } },
      brand: { select: { id: true, name: true, nameEn: true, slug: true, logo: true } },
      collections: { select: { collectionId: true } },
      categories: {
        include: { category: { select: { id: true, name: true, nameEn: true, slug: true } } },
        orderBy: { isPrimary: 'desc' },
      },
      tags: {
        include: { tag: { select: { id: true, name: true, nameEn: true, slug: true } } },
      },
      variants: {
        where: { isActive: true },
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
  })

  if (!product) return apiError('Product not found', 404)

  // Calculate campaign discount for this product
  const collectionIds = product.collections?.map(c => c.collectionId) || []
  const campaignDiscount = await calcProductDiscount(product.id, product.categoryId, collectionIds)

  if (campaignDiscount > 0) {
    const discountedProduct = {
      ...product,
      discountPercent: campaignDiscount,
      variants: product.variants.map(v => ({
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
    return apiResponse({ product: discountedProduct })
  }

  return apiResponse({ product })
}
