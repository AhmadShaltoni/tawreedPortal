import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiResponse, apiError, corsOptions } from '@/lib/api-auth'

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

// GET /api/v1/products/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const product = await db.product.findUnique({
    where: { id, isActive: true },
    include: {
      category: { select: { id: true, name: true, nameEn: true, slug: true } },
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
    },
  })

  if (!product) return apiError('Product not found', 404)

  return apiResponse({ product })
}
