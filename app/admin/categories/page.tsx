import Link from 'next/link'
import { PackageX } from 'lucide-react'
import { getCategories, getCategoryBreadcrumb, getCategoryById } from '@/actions/categories'
import { db } from '@/lib/db'
import { CategoryListClient } from './CategoryListClient'

const UNCATEGORIZED_SLUG = 'other'

async function getUncategorizedCount(): Promise<number> {
  const other = await db.category.findFirst({
    where: { slug: UNCATEGORIZED_SLUG },
    select: { id: true },
  })
  if (!other) return 0
  return db.product.count({ where: { categoryId: other.id } })
}

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ parent?: string }>
}) {
  const params = await searchParams
  const parentId = params.parent || null

  const [categories, breadcrumb, parentCategory, uncategorizedCount] = await Promise.all([
    getCategories(true, parentId),
    parentId ? getCategoryBreadcrumb(parentId) : Promise.resolve([]),
    parentId ? getCategoryById(parentId) : Promise.resolve(null),
    parentId ? Promise.resolve(0) : getUncategorizedCount(),
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
              <p className="text-xs text-gray-600">منتجات لم تُصنّف بعد — اضغط لنقلها إلى التصنيف المناسب</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-200 text-amber-800 text-sm font-semibold">
            {uncategorizedCount} منتج
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
