import { getSuppliers } from '@/actions/suppliers'
import { getProducts } from '@/actions/products'
import { SupplierListClient } from './SupplierListClient'

export default async function AdminSuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ supplier?: string }>
}) {
  const params = await searchParams
  const supplierId = params.supplier

  const [suppliers, productsResult] = await Promise.all([
    getSuppliers(),
    supplierId ? getProducts({ supplierId, limit: 100 }) : Promise.resolve(null),
  ])

  return (
    <SupplierListClient
      suppliers={suppliers}
      selectedSupplierId={supplierId}
      supplierProducts={productsResult?.products || null}
    />
  )
}
