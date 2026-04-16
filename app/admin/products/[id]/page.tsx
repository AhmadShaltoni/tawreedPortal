import { notFound } from 'next/navigation'
import { getProductById } from '@/actions/products'
import { getCategoryTree } from '@/actions/categories'
import { EditProductForm } from './EditProductForm'

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [product, categoryTree] = await Promise.all([
    getProductById(id),
    getCategoryTree(true),
  ])

  if (!product) notFound()

  return <EditProductForm product={product} categoryTree={categoryTree} />
}
