import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDiscountCodeById } from '@/actions/discount-codes'
import EditCouponForm from './EditCouponForm'

export const metadata = {
  title: 'تعديل كود الخصم',
}

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditCouponPage({ params }: PageProps) {
  const { id } = await params
  const user = await getCurrentUser()

  if (!user || user.role !== 'ADMIN') {
    redirect('/login')
  }

  const result = await getDiscountCodeById(id)

  if (!result.success || !result.data) {
    redirect('/admin/coupons')
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">تعديل كود الخصم</h1>
      <EditCouponForm coupon={result.data} />
    </div>
  )
}
