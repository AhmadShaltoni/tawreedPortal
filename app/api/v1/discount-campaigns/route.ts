import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiResponse, corsOptions } from '@/lib/api-auth'

export async function OPTIONS() {
  return corsOptions()
}

// GET /api/v1/discount-campaigns - Get active discount campaigns (public, for mobile display)
export async function GET(request: NextRequest) {
  const now = new Date()

  // Auto-expire campaigns
  await db.discountCampaign.updateMany({
    where: {
      status: { in: ['ACTIVE', 'SCHEDULED'] },
      endDate: { not: null, lt: now },
    },
    data: { status: 'EXPIRED' },
  })

  // Auto-activate scheduled campaigns
  await db.discountCampaign.updateMany({
    where: {
      status: 'SCHEDULED',
      startDate: { lte: now },
      OR: [
        { endDate: null },
        { endDate: { gt: now } },
      ],
    },
    data: { status: 'ACTIVE' },
  })

  const campaigns = await db.discountCampaign.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { endDate: null },
        { endDate: { gt: now } },
      ],
    },
    select: {
      id: true,
      name: true,
      nameEn: true,
      discountPercent: true,
      startDate: true,
      endDate: true,
      scope: true,
      collectionId: true,
      categoryId: true,
      collection: { select: { id: true, name: true, nameEn: true, slug: true } },
      category: { select: { id: true, name: true, nameEn: true, slug: true } },
      _count: { select: { products: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return apiResponse({ campaigns })
}
