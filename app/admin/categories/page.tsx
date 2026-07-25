import Link from 'next/link'
import { PackageX } from 'lucide-react'
import { getCategories, getCategoryBreadcrumb, getCategoryById } from '@/actions/categories'
import { db } from '@/lib/db'
import { CategoryListClient } from './CategoryListClient'

const UNCATEGORIZED_SLUG = 'other'

// Resolve the catch-all "Other" category robustly (an Arabic-only name yields the
// slug "untitled", not "other"), so the banner never silently reads 0.
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

// Products needing categorization come in two groups: those in the catch-all
// "Other" bucket, and those sitting on a root category that owns subcategories.
async function getUncategorizedCounts(): Promise<{ other: number; noSubcategory: number; total: number }> {
  const otherId = await getUncategorizedCategoryId()
  const [other, noSubcategory] = await Promise.all([
    otherId ? db.product.count({ where: { categoryId: otherId } }) : Promise.resolve(0),
    db.product.count({
      where: {
        category: { parentId: null, children: { some: {} } },
        ...(otherId ? { NOT: { categoryId: otherId } } : {}),
      },
    }),
  ])
  return { other, noSubcategory, total: other + noSubcategory }
}

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ parent?: string }>
}) {
  const params = await searchParams
  const parentId = params.parent || null

  const [categories, breadcrumb, parentCategory, uncategorizedCounts] = await Promise.all([
    getCategories(true, parentId),
    parentId ? getCategoryBreadcrumb(parentId) : Promise.resolve([]),
    parentId ? getCategoryById(parentId) : Promise.resolve(null),
    parentId ? Promise.resolve({ other: 0, noSubcategory: 0, total: 0 }) : getUncategorizedCounts(),
  ])

  return (
    <div className="space-y-6">
      {/* Uncategorized products banner (root level only) */}
      {!parentId && (
        <Link
          href="/admin/categories/uncategorized"
          className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg p-4 hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <PackageX className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">منتجات بدون تصنيف</p>
              <p className="text-xs text-gray-600">
                {uncategorizedCounts.total > 0
                  ? `${uncategorizedCounts.other} في «أخرى» · ${uncategorizedCounts.noSubcategory} بدون تصنيف فرعي — اضغط للنقل`
                  : 'منتجات لم تُصنّف بعد — اضغط لنقلها إلى التصنيف المناسب'}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-200 text-amber-800 text-sm font-semibold">
            {uncategorizedCounts.total} منتج
          </span>
        </Link>
      )}

      <CategoryListClient
        categories={categories}
        breadcrumb={breadcrumb}
        parentId={parentId}
        parentName={parentCategory ? parentCategory.name : null}
        parentNameEn={parentCategory ? parentCategory.nameEn : null}
      />
    </div>
  )
}
