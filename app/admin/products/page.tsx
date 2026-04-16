import { getProducts } from '@/actions/products'
import { getCategories, getCategoryTree } from '@/actions/categories'
import { ProductListClient } from './ProductListClient'

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; search?: string; page?: string }>
}) {
  const params = await searchParams
  const categoryId = params.category
  const search = params.search
  const page = Number(params.page) || 1

  const [{ products, total, pages }, categories, categoryTree] = await Promise.all([
    getProducts({ categoryId, search, page, includeDescendants: true }),
    getCategories(true),
    getCategoryTree(true),
  ])

  return (
    <ProductListClient
      products={products}
      categories={categories}
      categoryTree={categoryTree}
      total={total}
      pages={pages}
      currentPage={page}
      currentCategory={categoryId}
      currentSearch={search}
    />
  )
}
