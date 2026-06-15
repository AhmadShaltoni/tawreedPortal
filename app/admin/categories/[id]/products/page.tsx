import { notFound } from 'next/navigation'
import { getCategoryById, getCategoryTree, getCategoryBreadcrumb } from '@/actions/categories'
import { getProductsByCategory } from '@/actions/products'
import { CategoryProductsClient } from './CategoryProductsClient'

export default async function CategoryProductsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [category, products, categoryTree, breadcrumb] = await Promise.all([
    getCategoryById(id),
    getProductsByCategory(id),
    getCategoryTree(true),
    getCategoryBreadcrumb(id),
  ])

  if (!category) notFound()

  return (
    <CategoryProductsClient
      category={category}
      products={products}
      categoryTree={categoryTree}
      breadcrumb={breadcrumb}
    />
  )
}
