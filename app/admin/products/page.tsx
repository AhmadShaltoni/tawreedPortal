import { getProducts } from '@/actions/products'
import { getCategories, getCategoryTree } from '@/actions/categories'
import { getSuppliers } from '@/actions/suppliers'
import { ProductListClient } from './ProductListClient'

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; search?: string; page?: string; supplier?: string }>
}) {
  const params = await searchParams
  const categoryId = params.category
  const search = params.search
  const page = Number(params.page) || 1
  const supplierId = params.supplier

  const [{ products, total, pages }, categories, categoryTree, suppliers] = await Promise.all([
    getProducts({ categoryId, search, page, supplierId, includeDescendants: true }),
    getCategories(true),
    getCategoryTree(true),
    getSuppliers({ isActive: true }),
  ])

  return (
    <ProductListClient
      products={products}
      categories={categories}
      categoryTree={categoryTree}
      suppliers={suppliers}
      total={total}
      pages={pages}
      currentPage={page}
      currentCategory={categoryId}
      currentSearch={search}
      currentSupplier={supplierId}
    />
  )
}
