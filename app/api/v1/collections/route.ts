import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiResponse, corsOptions } from '@/lib/api-auth'

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

// GET /api/v1/collections - List active collections
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const showOnHome = searchParams.get('showOnHome')
  const page = Number(searchParams.get('page')) || 1
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 100)

  const where: Record<string, unknown> = { isActive: true }
  if (showOnHome === 'true') where.showOnHome = true

  const [collections, total] = await Promise.all([
    db.collection.findMany({
      where,
      select: {
        id: true,
        name: true,
        nameEn: true,
        slug: true,
        description: true,
        descriptionEn: true,
        image: true,
        type: true,
        showOnHome: true,
        sortOrder: true,
        _count: { select: { products: true } },
      },
      orderBy: { sortOrder: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.collection.count({ where }),
  ])

  return apiResponse({
    collections,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
}
