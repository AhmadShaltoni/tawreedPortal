import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const q = searchParams.get('q') || ''
    const brandId = searchParams.get('brandId') || ''
    const categoryId = searchParams.get('categoryId') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const excludeBrand = searchParams.get('excludeBrand') === 'true'

    const skip = (page - 1) * limit

    // Build AND conditions array
    const conditions: Record<string, unknown>[] = []

    // Search by name
    if (q.trim()) {
      conditions.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { nameEn: { contains: q, mode: 'insensitive' } },
        ],
      })
    }

    // Filter by category
    if (categoryId) {
      conditions.push({ categoryId })
    }

    // Exclude products already in this brand (include null and different brands)
    if (excludeBrand && brandId) {
      conditions.push({
        OR: [{ brandId: null }, { brandId: { not: brandId } }],
      })
    }

    const prismaWhere = conditions.length > 0 ? { AND: conditions } : {}

    const [products, total] = await Promise.all([
      db.product.findMany({
        where: prismaWhere,
        select: {
          id: true,
          name: true,
          nameEn: true,
          image: true,
          isActive: true,
          brandId: true,
          category: {
            select: { id: true, name: true },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      db.product.count({ where: prismaWhere }),
    ])

    return NextResponse.json({
      products,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error searching products:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
