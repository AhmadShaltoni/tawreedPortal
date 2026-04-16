import { getCategories, getCategoryBreadcrumb, getCategoryById } from '@/actions/categories'
import { CategoryListClient } from './CategoryListClient'

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ parent?: string }>
}) {
  const params = await searchParams
  const parentId = params.parent || null

  const [categories, breadcrumb, parentCategory] = await Promise.all([
    getCategories(true, parentId),
    parentId ? getCategoryBreadcrumb(parentId) : Promise.resolve([]),
    parentId ? getCategoryById(parentId) : Promise.resolve(null),
  ])

  return (
    <CategoryListClient
      categories={categories}
      breadcrumb={breadcrumb}
      parentId={parentId}
      parentName={parentCategory ? parentCategory.name : null}
      parentNameEn={parentCategory ? parentCategory.nameEn : null}
    />
  )
}
