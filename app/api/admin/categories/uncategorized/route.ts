import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { isAdminLike } from '@/lib/permissions'

// The catch-all "Other" category is treated as "uncategorized"
const UNCATEGORIZED_SLUG = 'other'

async function getUncategorizedCategoryId(): Promise<string | null> {
  const category = await db.category.findFirst({
    where: { slug: UNCATEGORIZED_SLUG },
    select: { id: true },
  })
  return category?.id ?? null
}

// List products that are considered uncategorized (in the "Other" category)
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!isAdminLike(user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const otherId = await getUncategorizedCategoryId()
    if (!otherId) {
      return NextResponse.json({ products: [], total: 0, page: 1, totalPages: 0 })
    }

    const searchParams = req.nextUrl.searchParams
    const q = searchParams.get('q') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '30')
    const skip = (page - 1) * limit

    const conditions: Record<string, unknown>[] = [{ categoryId: otherId }]
    if (q.trim()) {
      conditions.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { nameEn: { contains: q, mode: 'insensitive' } },
        ],
      })
    }

    const where = { AND: conditions }

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          nameEn: true,
          image: true,
          isActive: true,
          category: { select: { id: true, name: true } },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      db.product.count({ where }),
    ])

    return NextResponse.json({
      products,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching uncategorized products:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Assign selected products to a target category
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!isAdminLike(user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productIds, categoryId } = await req.json()

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: 'No products provided' }, { status: 400 })
    }
    if (!categoryId || typeof categoryId !== 'string') {
      return NextResponse.json({ error: 'No category provided' }, { status: 400 })
    }

    // Verify target category exists
    const target = await db.category.findUnique({ where: { id: categoryId }, select: { id: true } })
    if (!target) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const otherId = await getUncategorizedCategoryId()

    await db.$transaction(async (tx) => {
      for (const productId of productIds) {
        // Update denormalized primary category
        await tx.product.update({
          where: { id: productId },
          data: { categoryId },
        })

        // Demote any existing primary classification
        await tx.productOnCategory.updateMany({
          where: { productId },
          data: { isPrimary: false },
        })

        // Remove the old "uncategorized" classification so it no longer appears as uncategorized
        if (otherId && otherId !== categoryId) {
          await tx.productOnCategory.deleteMany({ where: { productId, categoryId: otherId } })
        }

        // Set the target category as the primary classification
        await tx.productOnCategory.upsert({
          where: { productId_categoryId: { productId, categoryId } },
          create: { productId, categoryId, isPrimary: true, sortOrder: 0 },
          update: { isPrimary: true },
        })
      }
    })

    return NextResponse.json({ success: true, assigned: productIds.length })
  } catch (error) {
    console.error('Error assigning products to category:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
