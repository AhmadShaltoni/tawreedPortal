import { getAdminOrders } from '@/actions/admin-orders'
import { OrderListClient } from './OrderListClient'

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>
}) {
  const params = await searchParams
  const status = params.status
  const search = params.search
  const page = Number(params.page) || 1

  const { orders, total, pages } = await getAdminOrders({ status, search, page })

  return (
    <OrderListClient
      orders={orders}
      total={total}
      pages={pages}
      currentPage={page}
      currentStatus={status}
      currentSearch={search}
    />
  )
}
