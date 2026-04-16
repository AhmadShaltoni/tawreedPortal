'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { toggleDiscountCode, deleteDiscountCode } from '@/actions/discount-codes'
import { Edit, Trash2, Eye, Ticket, Users, Calendar } from 'lucide-react'

interface CouponWithStats {
  id: string
  code: string
  discountPercent: number
  isSingleUse: boolean
  maxUsage: number | null
  minOrderAmount: number | null
  startDate: Date | string | null
  endDate: Date | string | null
  isActive: boolean
  createdAt: Date | string
  updatedAt: Date | string
  _count: { usages: number }
}

interface CouponListClientProps {
  initialCoupons: CouponWithStats[]
}

function getCouponStatus(coupon: CouponWithStats): 'active' | 'inactive' | 'expired' {
  if (!coupon.isActive) return 'inactive'
  if (coupon.endDate && new Date(coupon.endDate) < new Date()) return 'expired'
  return 'active'
}

export default function CouponListClient({ initialCoupons }: CouponListClientProps) {
  const router = useRouter()
  const [coupons, setCoupons] = useState<CouponWithStats[]>(initialCoupons)
  const [loading, setLoading] = useState<string | null>(null)

  const handleToggle = async (id: string) => {
    setLoading(id)
    try {
      const result = await toggleDiscountCode(id)
      if (result.success) {
        setCoupons(
          coupons.map((c) =>
            c.id === id ? { ...c, isActive: !c.isActive } : c
          )
        )
        router.refresh()
      } else {
        alert(result.error || 'حدث خطأ')
      }
    } catch {
      alert('حدث خطأ')
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف كود الخصم هذا؟')) return

    setLoading(id)
    try {
      const result = await deleteDiscountCode(id)
      if (result.success) {
        setCoupons(coupons.filter((c) => c.id !== id))
        router.refresh()
      } else {
        alert(result.error || 'حدث خطأ')
      }
    } catch {
      alert('حدث خطأ')
    } finally {
      setLoading(null)
    }
  }

  if (coupons.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">لا توجد أكواد خصم حالياً</p>
        <Link href="/admin/coupons/new">
          <Button>إنشاء أول كود خصم</Button>
        </Link>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {coupons.map((coupon) => {
        const status = getCouponStatus(coupon)
        return (
          <Card key={coupon.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between gap-4">
              {/* Main Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-mono text-lg font-bold bg-gray-100 px-3 py-1 rounded">
                    {coupon.code}
                  </span>
                  <Badge variant={status === 'active' ? 'default' : status === 'expired' ? 'error' : 'warning'}>
                    {status === 'active' ? 'نشط' : status === 'expired' ? 'منتهي' : 'معطل'}
                  </Badge>
                  {coupon.isSingleUse && (
                    <Badge variant="info">استخدام لمرة واحدة</Badge>
                  )}
                </div>

                <div className="text-2xl font-bold text-green-600 mb-3">
                  {coupon.discountPercent}% خصم
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  {/* Usage */}
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>
                      {coupon._count.usages}
                      {coupon.maxUsage ? ` / ${coupon.maxUsage}` : ''} استخدام
                    </span>
                  </div>

                  {/* Min order */}
                  {coupon.minOrderAmount && (
                    <span>الحد الأدنى: {coupon.minOrderAmount} د.أ</span>
                  )}

                  {/* Date range */}
                  {(coupon.startDate || coupon.endDate) && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {coupon.startDate
                          ? new Date(coupon.startDate).toLocaleDateString('ar-JO')
                          : '...'}
                        {' — '}
                        {coupon.endDate
                          ? new Date(coupon.endDate).toLocaleDateString('ar-JO')
                          : 'بدون انتهاء'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Link href={`/admin/coupons/${coupon.id}`}>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                </Link>

                <Button
                  variant={coupon.isActive ? 'outline' : 'secondary'}
                  size="sm"
                  onClick={() => handleToggle(coupon.id)}
                  disabled={loading === coupon.id}
                >
                  {loading === coupon.id ? (
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(coupon.id)}
                  disabled={loading === coupon.id}
                >
                  {loading === coupon.id ? (
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
