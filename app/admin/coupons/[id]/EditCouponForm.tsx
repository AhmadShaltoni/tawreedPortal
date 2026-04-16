'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateDiscountCode } from '@/actions/discount-codes'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface Usage {
  id: string
  discountAmount: number
  orderTotal: number
  createdAt: Date | string
  userId: string
  orderId: string | null
  user: { id: string; username: string; phone: string }
}

interface CouponWithUsages {
  id: string
  code: string
  discountPercent: number
  isSingleUse: boolean
  maxUsage: number | null
  minOrderAmount: number | null
  startDate: Date | string | null
  endDate: Date | string | null
  isActive: boolean
  usages: Usage[]
  _count: { usages: number }
}

function formatDateForInput(date: Date | string | null): string {
  if (!date) return ''
  const d = new Date(date)
  return d.toISOString().slice(0, 16)
}

export default function EditCouponForm({ coupon }: { coupon: CouponWithUsages }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [form, setForm] = useState({
    code: coupon.code,
    discountPercent: String(coupon.discountPercent),
    isSingleUse: coupon.isSingleUse,
    maxUsage: coupon.maxUsage ? String(coupon.maxUsage) : '',
    minOrderAmount: coupon.minOrderAmount ? String(coupon.minOrderAmount) : '',
    startDate: formatDateForInput(coupon.startDate),
    endDate: formatDateForInput(coupon.endDate),
    isActive: coupon.isActive,
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : name === 'code' ? value.toUpperCase() : value,
    }))
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData()
    formData.append('code', form.code)
    formData.append('discountPercent', form.discountPercent)
    formData.append('isSingleUse', String(form.isSingleUse))
    if (form.maxUsage) formData.append('maxUsage', form.maxUsage)
    if (form.minOrderAmount) formData.append('minOrderAmount', form.minOrderAmount)
    if (form.startDate) formData.append('startDate', form.startDate)
    if (form.endDate) formData.append('endDate', form.endDate)
    formData.append('isActive', String(form.isActive))

    const result = await updateDiscountCode(coupon.id, formData)

    if (result.success) {
      router.push('/admin/coupons')
    } else if (result.errors) {
      setErrors(result.errors)
    } else {
      setErrors({ submit: [result.error || 'حدث خطأ'] })
    }

    setLoading(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/coupons" className="text-blue-600 hover:underline">
          إدارة أكواد الخصم
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-600">تعديل</span>
      </div>

      {/* Usage Stats */}
      {coupon.usages.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">إحصائيات الاستخدام ({coupon._count.usages} استخدام)</h2>
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Code */}
        <div>
          <label className="block text-sm font-medium mb-2">الكود</label>
          <Input
            type="text"
            name="code"
            value={form.code}
            onChange={handleInputChange}
            placeholder="مثال: ISTKLAL2026"
            maxLength={20}
            disabled={loading}
            style={{ direction: 'ltr', textAlign: 'left' }}
          />
          {errors.code && (
            <p className="text-red-600 text-sm mt-1">{errors.code[0]}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            سيتم تحويل الكود تلقائياً لأحرف كبيرة
          </p>
        </div>

        {/* Discount Percent */}
        <div>
          <label className="block text-sm font-medium mb-2">نسبة الخصم (%)</label>
          <Input
            type="number"
            name="discountPercent"
            value={form.discountPercent}
            onChange={handleInputChange}
            placeholder="مثال: 15"
            min={1}
            max={100}
            disabled={loading}
          />
          {errors.discountPercent && (
            <p className="text-red-600 text-sm mt-1">{errors.discountPercent[0]}</p>
          )}
        </div>

        {/* Single Use Toggle */}
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <input
            type="checkbox"
            id="isSingleUse"
            name="isSingleUse"
            checked={form.isSingleUse}
            onChange={handleInputChange}
            disabled={loading}
            className="w-4 h-4 cursor-pointer"
          />
          <label htmlFor="isSingleUse" className="cursor-pointer flex-1">
            <span className="font-medium">استخدام لمرة واحدة لكل مستخدم</span>
            <p className="text-xs text-gray-600 mt-1">
              عندما يكون مفعلاً، كل مستخدم يمكنه استخدام هذا الكود مرة واحدة فقط
            </p>
          </label>
        </div>

        {/* Max Usage & Min Order Amount */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              الحد الأقصى للاستخدام
              <span className="text-gray-400 text-xs mr-1">(اختياري)</span>
            </label>
            <Input
              type="number"
              name="maxUsage"
              value={form.maxUsage}
              onChange={handleInputChange}
              placeholder="غير محدود"
              min={1}
              disabled={loading}
            />
            {errors.maxUsage && (
              <p className="text-red-600 text-sm mt-1">{errors.maxUsage[0]}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              إجمالي عدد مرات الاستخدام لجميع المستخدمين
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              الحد الأدنى للطلب (د.أ)
              <span className="text-gray-400 text-xs mr-1">(اختياري)</span>
            </label>
            <Input
              type="number"
              name="minOrderAmount"
              value={form.minOrderAmount}
              onChange={handleInputChange}
              placeholder="بدون حد أدنى"
              min={0}
              step="0.01"
              disabled={loading}
            />
            {errors.minOrderAmount && (
              <p className="text-red-600 text-sm mt-1">{errors.minOrderAmount[0]}</p>
            )}
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              تاريخ البداية
              <span className="text-gray-400 text-xs mr-1">(اختياري)</span>
            </label>
            <Input
              type="datetime-local"
              name="startDate"
              value={form.startDate}
              onChange={handleInputChange}
              disabled={loading}
            />
            {errors.startDate && (
              <p className="text-red-600 text-sm mt-1">{errors.startDate[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              تاريخ الانتهاء
              <span className="text-gray-400 text-xs mr-1">(اختياري)</span>
            </label>
            <Input
              type="datetime-local"
              name="endDate"
              value={form.endDate}
              onChange={handleInputChange}
              disabled={loading}
            />
            {errors.endDate && (
              <p className="text-red-600 text-sm mt-1">{errors.endDate[0]}</p>
            )}
          </div>
        </div>

        {/* Active Toggle */}
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <input
            type="checkbox"
            id="isActive"
            name="isActive"
            checked={form.isActive}
            onChange={handleInputChange}
            disabled={loading}
            className="w-4 h-4 cursor-pointer"
          />
          <label htmlFor="isActive" className="cursor-pointer flex-1">
            <span className="font-medium">تفعيل الكود</span>
          </label>
        </div>

        {/* Errors */}
        {errors.submit && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{errors.submit[0]}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </Button>
          <Link href="/admin/coupons">
            <Button type="button" variant="outline">
              إلغاء
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
