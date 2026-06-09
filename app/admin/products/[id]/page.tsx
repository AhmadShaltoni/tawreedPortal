import { notFound } from 'next/navigation'
import { getProductById } from '@/actions/products'
import { getCategoryTree } from '@/actions/categories'
import { getSuppliers } from '@/actions/suppliers'
import { getBrands } from '@/actions/brands'
import { EditProductForm } from './EditProductForm'

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [product, categoryTree, suppliers, brands] = await Promise.all([
    getProductById(id),
    getCategoryTree(true),
    getSuppliers({ isActive: true }),
    getBrands({ isActive: true }),
  ])

  if (!product) notFound()

  return <EditProductForm product={product} categoryTree={categoryTree} suppliers={suppliers} brands={brands} />
}
