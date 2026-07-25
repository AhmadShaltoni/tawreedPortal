import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { isAdminLike } from '@/lib/permissions'

// The catch-all "Other" category is treated as one flavour of "uncategorized".
// Because Product.categoryId is required, a product is never truly category-less;
// instead we surface two distinct groups that both need attention:
//   - "other": the product sits in the catch-all "Other/أخرى" bucket
//   - "no-subcategory": the product sits directly on a ROOT category that has
//     child subcategories (i.e. it was never assigned to a specific subcategory)
const UNCATEGORIZED_SLUG = 'other'

type UncategorizedGroup = 'other' | 'no-subcategory'

// Robustly resolve the catch-all "Other" category regardless of how its slug was
// generated (an Arabic-only name yields the slug "untitled", not "other").
async function getUncategorizedCategoryId(): Promise<string | null> {
  const category = await db.category.findFirst({
    where: {
      OR: [
        { slug: UNCATEGORIZED_SLUG },
        { nameEn: { equals: 'Other', mode: 'insensitive' } },
        { name: 'أخرى' },
      ],
    },
    select: { id: true },
  })
  return category?.id ?? null
}

// Prisma filter for products sitting on a root category that owns subcategories,
// excluding the catch-all bucket (handled separately as the "other" group).
function noSubcategoryFilter(otherId: string | null): Record<string, unknown> {
  const filter: Record<string, unknown> = {
    category: { parentId: null, children: { some: {} } },
  }
  if (otherId) filter.NOT = { categoryId: otherId }
  return filter
}

// List products that need categorization, split into the two groups above.
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!isAdminLike(user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const otherId = await getUncategorizedCategoryId()

    const searchParams = req.nextUrl.searchParams
    const q = searchParams.get('q') || ''
    const groupParam = searchParams.get('group') || 'all' // all | other | no-subcategory
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '30')
    const skip = (page - 1) * limit

    const searchCondition = q.trim()
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { nameEn: { contains: q, mode: 'insensitive' } },
          ],
        }
      : null

    // Group filters (any may be null when there is nothing to match)
    const otherFilter = otherId ? { categoryId: otherId } : null
    const noSubFilter = noSubcategoryFilter(otherId)

    const withSearch = (base: Record<string, unknown> | null) => {
      if (!base) return null
      return searchCondition ? { AND: [base, searchCondition] } : base
    }

    // Count each group independently so the UI can label the split
    const [otherCount, noSubCount] = await Promise.all([
      otherFilter ? db.product.count({ where: withSearch(otherFilter)! }) : Promise.resolve(0),
      db.product.count({ where: withSearch(noSubFilter)! }),
    ])

    // Build the where clause for the requested group
    let listBase: Record<string, unknown> | null
    if (groupParam === 'other') {
      listBase = otherFilter
    } else if (groupParam === 'no-subcategory') {
      listBase = noSubFilter
    } else {
      const orParts = [otherFilter, noSubFilter].filter(Boolean) as Record<string, unknown>[]
      listBase = orParts.length ? { OR: orParts } : null
    }

    const where = withSearch(listBase)
    const total = groupParam === 'other' ? otherCount : groupParam === 'no-subcategory' ? noSubCount : otherCount + noSubCount

    const products = where
      ? await db.product.findMany({
          where,
          select: {
            id: true,
            name: true,
            nameEn: true,
            image: true,
            isActive: true,
            category: { select: { id: true, name: true, parentId: true } },
          },
          orderBy: { name: 'asc' },
          skip,
          take: limit,
        })
      : []

    // Tag each product with its group so the client can render a distinguishing badge
    const tagged = products.map((p) => ({
      ...p,
      group: (otherId && p.category?.id === otherId ? 'other' : 'no-subcategory') as UncategorizedGroup,
    }))

    return NextResponse.json({
      products: tagged,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      counts: { other: otherCount, noSubcategory: noSubCount, total: otherCount + noSubCount },
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
        // Remember where the product sat so we can clear that classification
        const current = await tx.product.findUnique({
          where: { id: productId },
          select: { categoryId: true },
        })

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

        // Remove the previous primary classification (root or "Other") so the
        // product no longer shows up as uncategorized under its old bucket
        if (current?.categoryId && current.categoryId !== categoryId) {
          await tx.productOnCategory.deleteMany({ where: { productId, categoryId: current.categoryId } })
        }
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
