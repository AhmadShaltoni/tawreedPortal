import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getCouponCategoryOptions } from '@/actions/discount-codes'
import CouponForm from '../CouponForm'
import { isAdminLike } from '@/lib/permissions'

export const metadata = {
  title: 'إنشاء كود خصم جديد',
}

export default async function NewCouponPage() {
  const user = await getCurrentUser()

  if (!user || !isAdminLike(user.role)) {
    redirect('/login')
  }

  const categoriesResult = await getCouponCategoryOptions()

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">إنشاء كود خصم جديد</h1>
      <CouponForm categories={categoriesResult.data ?? []} />
    </div>
  )
}
