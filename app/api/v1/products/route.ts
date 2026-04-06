import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiResponse, corsOptions } from '@/lib/api-auth'

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

// GET /api/v1/products?categoryId=xxx&search=xxx&page=1&limit=20
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const categoryId = searchParams.get('categoryId')
  const search = searchParams.get('search')
  const page = Number(searchParams.get('page')) || 1
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 100)

  const where: Record<string, unknown> = { isActive: true }
  if (categoryId) where.categoryId = categoryId
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { nameEn: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      include: { category: { select: { id: true, name: true, nameEn: true, slug: true } } },
      orderBy: { sortOrder: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.product.count({ where }),
  ])

  return apiResponse({
    products,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
}
