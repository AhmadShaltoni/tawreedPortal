import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDiscountCodeReport } from '@/actions/discount-codes'
import CouponReportClient from './CouponReportClient'
import { isAdminLike } from '@/lib/permissions'

export const metadata = {
  title: 'تقرير كود الخصم',
}

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function CouponReportPage({ params }: PageProps) {
  const { id } = await params
  const user = await getCurrentUser()

  if (!user || !isAdminLike(user.role)) {
    redirect('/login')
  }

  const result = await getDiscountCodeReport(id)

  if (!result.success || !result.data) {
    redirect('/admin/coupons')
  }

  return <CouponReportClient coupon={result.data} />
}
