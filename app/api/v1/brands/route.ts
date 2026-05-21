import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiResponse, corsOptions } from '@/lib/api-auth'

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

// GET /api/v1/brands - List all active brands
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = Number(searchParams.get('page')) || 1
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 100)

  const where = { isActive: true }

  const [brands, total] = await Promise.all([
    db.brand.findMany({
      where,
      select: {
        id: true,
        name: true,
        nameEn: true,
        slug: true,
        logo: true,
        sortOrder: true,
        _count: { select: { products: true } },
      },
      orderBy: { sortOrder: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.brand.count({ where }),
  ])

  return apiResponse({
    brands,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
}
