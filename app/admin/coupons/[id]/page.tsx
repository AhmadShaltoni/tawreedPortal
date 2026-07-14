import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDiscountCodeById, getCouponCategoryOptions } from '@/actions/discount-codes'
import { Card } from '@/components/ui/Card'
import CouponForm from '../CouponForm'

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

  const [result, categoriesResult] = await Promise.all([
    getDiscountCodeById(id),
    getCouponCategoryOptions(),
  ])

  if (!result.success || !result.data) {
    redirect('/admin/coupons')
  }

  const coupon = result.data

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">تعديل كود الخصم</h1>

      {/* Usage Stats */}
      {coupon.usages.length > 0 && (
        <Card className="p-6 max-w-2xl">
          <h2 className="text-lg font-semibold mb-4">
            إحصائيات الاستخدام ({coupon._count.usages} استخدام)
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-right py-2 px-3 font-medium">المستخدم</th>
                  <th className="text-right py-2 px-3 font-medium">الهاتف</th>
                  <th className="text-right py-2 px-3 font-medium">مبلغ الطلب</th>
                  <th className="text-right py-2 px-3 font-medium">مبلغ الخصم</th>
                  <th className="text-right py-2 px-3 font-medium">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {coupon.usages.map((usage) => (
                  <tr key={usage.id} className="border-b last:border-0">
                    <td className="py-2 px-3">{usage.user.username}</td>
                    <td className="py-2 px-3 font-mono text-xs" dir="ltr">{usage.user.phone}</td>
                    <td className="py-2 px-3">{usage.orderTotal.toFixed(2)} د.أ</td>
                    <td className="py-2 px-3 text-green-600">{usage.discountAmount.toFixed(2)} د.أ</td>
                    <td className="py-2 px-3 text-gray-500">
                      {new Date(usage.createdAt).toLocaleDateString('ar-JO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <CouponForm categories={categoriesResult.data ?? []} coupon={coupon} />
    </div>
  )
}
