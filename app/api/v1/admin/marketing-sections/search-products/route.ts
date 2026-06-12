import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

// GET /api/v1/admin/marketing-sections/search-products?q=...&exclude=id1,id2&all=true
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const all = searchParams.get('all') === 'true'
  const excludeStr = searchParams.get('exclude') || ''
  const excludeIds = excludeStr ? excludeStr.split(',').filter(Boolean) : []

  const where: Record<string, unknown> = {
    isActive: true,
    ...(excludeIds.length > 0 && { id: { notIn: excludeIds } }),
  }

  // If a search query is provided, filter by name
  if (q.trim()) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { nameEn: { contains: q, mode: 'insensitive' } },
    ]
  }

  // If not all and no query, return empty (backward compat)
  if (!all && !q.trim()) {
    return NextResponse.json({ products: [] })
  }

  const products = await db.product.findMany({
    where,
    select: {
      id: true,
      name: true,
      nameEn: true,
      image: true,
      isActive: true,
      category: { select: { id: true, name: true, nameEn: true } },
      brand: { select: { id: true, name: true, nameEn: true } },
      variants: {
        where: { isActive: true },
        take: 1,
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          size: true,
          sizeEn: true,
          units: {
            where: { isDefault: true },
            take: 1,
            select: { id: true, price: true, compareAtPrice: true, label: true, labelEn: true },
          },
        },
      },
    },
    take: 200,
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ products })
}
