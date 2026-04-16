import { getAllDiscountCodes } from '@/actions/discount-codes'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'
import CouponListClient from './CouponListClient'

export const metadata = {
  title: 'إدارة أكواد الخصم',
}

export default async function CouponsPage() {
  const user = await getCurrentUser()

  if (!user || user.role !== 'ADMIN') {
    redirect('/login')
  }

  const result = await getAllDiscountCodes()
  const coupons = result.success && result.data ? result.data : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إدارة أكواد الخصم</h1>
          <p className="text-gray-600 mt-1">
            أضف وأدير أكواد الخصم والقسائم الترويجية
          </p>
        </div>
        <Link href="/admin/coupons/new">
          <Button>
            <Plus className="w-4 h-4 ml-2" />
            إضافة كود خصم جديد
          </Button>
        </Link>
      </div>

      {/* List */}
      <CouponListClient initialCoupons={coupons} />
    </div>
  )
}
