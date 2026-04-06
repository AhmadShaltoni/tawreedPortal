import { getProducts } from '@/actions/products'
import { getCategories } from '@/actions/categories'
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

  const [{ products, total, pages }, categories] = await Promise.all([
    getProducts({ categoryId, search, page }),
    getCategories(true),
  ])

  return (
    <ProductListClient
      products={products}
      categories={categories}
      total={total}
      pages={pages}
      currentPage={page}
      currentCategory={categoryId}
      currentSearch={search}
    />
  )
}
