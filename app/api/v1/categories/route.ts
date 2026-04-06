import { db } from '@/lib/db'
import { apiResponse, corsOptions } from '@/lib/api-auth'

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

// GET /api/v1/categories
export async function GET() {
  const categories = await db.category.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      nameEn: true,
      slug: true,
      image: true,
      sortOrder: true,
      _count: { select: { products: { where: { isActive: true } } } },
    },
    orderBy: { sortOrder: 'asc' },
  })

  // Transform response to include image metadata
  const categoriesWithImages = categories.map(cat => ({
    ...cat,
    image: cat.image ? {
      url: cat.image,
      alt: cat.name,
    } : null,
  }))

  return apiResponse({ categories: categoriesWithImages })
}
