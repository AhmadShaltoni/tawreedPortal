import { getCategoryTree } from '@/actions/categories'
import { getSuppliers, getDefaultSupplier } from '@/actions/suppliers'
import { getBrands } from '@/actions/brands'
import { getCollections } from '@/actions/collections'
import { getUnitTypes } from '@/actions/unit-types'
import { NewProductForm } from './NewProductForm'

export default async function NewProductPage() {
  const [categoryTree, suppliers, defaultSupplier, brands, collections, unitTypes] = await Promise.all([
    getCategoryTree(),
    getSuppliers({ isActive: true }),
    getDefaultSupplier(),
    getBrands({ isActive: true }),
    getCollections({ isActive: true }),
    getUnitTypes({ isActive: true }),
  ])
  return (
    <NewProductForm
      categoryTree={categoryTree}
      suppliers={suppliers}
      defaultSupplierId={defaultSupplier?.id || null}
      brands={brands}
      collections={collections}
      unitTypes={unitTypes}
    />
  )
}
