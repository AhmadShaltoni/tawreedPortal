import { notFound } from 'next/navigation'
import { getAdminOrderById } from '@/actions/admin-orders'
import { OrderDetailClient } from './OrderDetailClient'

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const order = await getAdminOrderById(id)
  if (!order) notFound()

  return <OrderDetailClient order={order as any} />
}
