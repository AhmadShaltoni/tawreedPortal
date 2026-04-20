import { getCategoryTree } from '@/actions/categories'
import { getSuppliers, getDefaultSupplier } from '@/actions/suppliers'
import { NewProductForm } from './NewProductForm'

export default async function NewProductPage() {
  const [categoryTree, suppliers, defaultSupplier] = await Promise.all([
    getCategoryTree(),
    getSuppliers({ isActive: true }),
    getDefaultSupplier(),
  ])
  return (
    <NewProductForm
      categoryTree={categoryTree}
      suppliers={suppliers}
      defaultSupplierId={defaultSupplier?.id || null}
    />
  )
}
