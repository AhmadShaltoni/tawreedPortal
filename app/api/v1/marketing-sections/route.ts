import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiResponse, corsOptions } from '@/lib/api-auth'

export async function OPTIONS() {
  return corsOptions()
}

// GET /api/v1/marketing-sections - List active marketing sections for mobile
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const showOnHome = searchParams.get('showOnHome')
  const limit = Math.min(Number(searchParams.get('limit')) || 10, 50)

  const where: Record<string, unknown> = { isActive: true, type: 'MANUAL' }
  if (showOnHome === 'true') where.showOnHome = true

  const sections = await db.collection.findMany({
    where,
    select: {
      id: true,
      name: true,
      nameEn: true,
      slug: true,
      description: true,
      descriptionEn: true,
      image: true,
      showOnHome: true,
      sortOrder: true,
      _count: { select: { products: true } },
    },
    orderBy: { sortOrder: 'asc' },
    take: limit,
  })

  return apiResponse({ sections })
}
