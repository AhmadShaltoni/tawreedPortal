import { notFound } from 'next/navigation'
import { getProductById } from '@/actions/products'
import { getCategories } from '@/actions/categories'
import { EditProductForm } from './EditProductForm'

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [product, categories] = await Promise.all([
    getProductById(id),
    getCategories(true),
  ])

  if (!product) notFound()

  return <EditProductForm product={product} categories={categories} />
}
