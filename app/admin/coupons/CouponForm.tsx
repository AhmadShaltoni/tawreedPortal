'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  createDiscountCode,
  updateDiscountCode,
  searchCouponUsers,
  searchCouponProducts,
  type CouponUserOption,
  type CouponProductOption,
} from '@/actions/discount-codes'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Link from 'next/link'
import { ChevronRight, X, Search } from 'lucide-react'

interface CategoryOption {
  id: string
  name: string
}

export interface CouponFormInitial {
  id: string
  code: string
  discountPercent: number
  maxDiscountCap: number | null
  isSingleUse: boolean
  maxUsagePerUser: number | null
  maxUsage: number | null
  minOrderAmount: number | null
  firstOrderOnly: boolean
  allowStacking: boolean
  startDate: Date | string | null
  endDate: Date | string | null
  isActive: boolean
  allowedUser: CouponUserOption | null
  categories: CategoryOption[]
  products: CouponProductOption[]
}

function formatDateForInput(date: Date | string | null): string {
  if (!date) return ''
  return new Date(date).toISOString().slice(0, 16)
}

export default function CouponForm({
  categories,
  coupon,
}: {
  categories: CategoryOption[]
  coupon?: CouponFormInitial
}) {
  const router = useRouter()
  const isEdit = !!coupon
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [form, setForm] = useState({
    code: coupon?.code ?? '',
    discountPercent: coupon ? String(coupon.discountPercent) : '',
    maxDiscountCap: coupon?.maxDiscountCap ? String(coupon.maxDiscountCap) : '',
    maxUsagePerUser: coupon
      ? coupon.isSingleUse && !coupon.maxUsagePerUser
        ? '1'
        : coupon.maxUsagePerUser
          ? String(coupon.maxUsagePerUser)
          : ''
      : '',
    maxUsage: coupon?.maxUsage ? String(coupon.maxUsage) : '',
    minOrderAmount: coupon?.minOrderAmount ? String(coupon.minOrderAmount) : '',
    firstOrderOnly: coupon?.firstOrderOnly ?? false,
    allowStacking: coupon?.allowStacking ?? true,
    startDate: formatDateForInput(coupon?.startDate ?? null),
    endDate: formatDateForInput(coupon?.endDate ?? null),
    isActive: coupon?.isActive ?? true,
  })

  // Targeting state
  const [allowedUser, setAllowedUser] = useState<CouponUserOption | null>(
    coupon?.allowedUser ?? null
  )
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(
    new Set(coupon?.categories.map((c) => c.id) ?? [])
  )
  const [selectedProducts, setSelectedProducts] = useState<CouponProductOption[]>(
    coupon?.products ?? []
  )

  // User search
  const [userQuery, setUserQuery] = useState('')
  const [userResults, setUserResults] = useState<CouponUserOption[]>([])
  const [userSearching, setUserSearching] = useState(false)
  const userSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Product search
  const [productQuery, setProductQuery] = useState('')
  const [productResults, setProductResults] = useState<CouponProductOption[]>([])
  const [productSearching, setProductSearching] = useState(false)
  const productSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const handleUserQueryChange = (value: string) => {
    setUserQuery(value)
    if (userSearchTimer.current) clearTimeout(userSearchTimer.current)
    if (value.trim().length < 2) {
      setUserResults([])
      return
    }
    userSearchTimer.current = setTimeout(async () => {
      setUserSearching(true)
      const result = await searchCouponUsers(value)
      setUserResults(result.success && result.data ? result.data : [])
      setUserSearching(false)
    }, 300)
  }

  const handleProductQueryChange = (value: string) => {
    setProductQuery(value)
    if (productSearchTimer.current) clearTimeout(productSearchTimer.current)
    if (value.trim().length < 2) {
      setProductResults([])
      return
    }
    productSearchTimer.current = setTimeout(async () => {
      setProductSearching(true)
      const result = await searchCouponProducts(value)
      setProductResults(result.success && result.data ? result.data : [])
      setProductSearching(false)
    }, 300)
  }

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const addProduct = (product: CouponProductOption) => {
    setSelectedProducts((prev) =>
      prev.some((p) => p.id === product.id) ? prev : [...prev, product]
    )
    setProductQuery('')
    setProductResults([])
  }

  const removeProduct = (id: string) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData()
    formData.append('code', form.code)
    formData.append('discountPercent', form.discountPercent)
    if (form.maxDiscountCap) formData.append('maxDiscountCap', form.maxDiscountCap)
    if (form.maxUsagePerUser) formData.append('maxUsagePerUser', form.maxUsagePerUser)
    if (form.maxUsage) formData.append('maxUsage', form.maxUsage)
    if (form.minOrderAmount) formData.append('minOrderAmount', form.minOrderAmount)
    formData.append('firstOrderOnly', String(form.firstOrderOnly))
    formData.append('allowStacking', String(form.allowStacking))
    if (allowedUser) formData.append('allowedUserId', allowedUser.id)
    selectedCategoryIds.forEach((id) => formData.append('categoryIds', id))
    selectedProducts.forEach((p) => formData.append('productIds', p.id))
    if (form.startDate) formData.append('startDate', form.startDate)
    if (form.endDate) formData.append('endDate', form.endDate)
    formData.append('isActive', String(form.isActive))

    const result = isEdit
      ? await updateDiscountCode(coupon.id, formData)
      : await createDiscountCode(formData)

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
        <span className="text-gray-600">{isEdit ? 'تعديل' : 'كود خصم جديد'}</span>
      </div>

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

        {/* Discount Percent + Cap */}
        <div className="grid grid-cols-2 gap-4">
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

          <div>
            <label className="block text-sm font-medium mb-2">
              سقف الخصم (د.أ)
              <span className="text-gray-400 text-xs mr-1">(اختياري)</span>
            </label>
            <Input
              type="number"
              name="maxDiscountCap"
              value={form.maxDiscountCap}
              onChange={handleInputChange}
              placeholder="بدون سقف"
              min={0}
              step="0.01"
              disabled={loading}
            />
            {errors.maxDiscountCap && (
              <p className="text-red-600 text-sm mt-1">{errors.maxDiscountCap[0]}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              أقصى مبلغ خصم مهما كبر الطلب — مهم لطلبات الجملة الكبيرة
            </p>
          </div>
        </div>

        {/* Usage limits */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              حد الاستخدام لكل مستخدم
              <span className="text-gray-400 text-xs mr-1">(اختياري)</span>
            </label>
            <Input
              type="number"
              name="maxUsagePerUser"
              value={form.maxUsagePerUser}
              onChange={handleInputChange}
              placeholder="غير محدود"
              min={1}
              disabled={loading}
            />
            {errors.maxUsagePerUser && (
              <p className="text-red-600 text-sm mt-1">{errors.maxUsagePerUser[0]}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              1 = مرة واحدة لكل مستخدم، فارغ = بلا حد
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              الحد الأقصى الكلي للاستخدام
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
        </div>

        {/* Min order amount */}
        <div className="grid grid-cols-2 gap-4">
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

        {/* Behavior toggles */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <input
              type="checkbox"
              id="firstOrderOnly"
              name="firstOrderOnly"
              checked={form.firstOrderOnly}
              onChange={handleInputChange}
              disabled={loading}
              className="w-4 h-4 cursor-pointer"
            />
            <label htmlFor="firstOrderOnly" className="cursor-pointer flex-1">
              <span className="font-medium">للطلب الأول فقط</span>
              <p className="text-xs text-gray-600 mt-1">
                الكود يعمل فقط للمستخدمين الذين لم يقوموا بأي طلب سابق (لاكتساب عملاء جدد)
              </p>
            </label>
          </div>

          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <input
              type="checkbox"
              id="allowStacking"
              name="allowStacking"
              checked={form.allowStacking}
              onChange={handleInputChange}
              disabled={loading}
              className="w-4 h-4 cursor-pointer"
            />
            <label htmlFor="allowStacking" className="cursor-pointer flex-1">
              <span className="font-medium">السماح بالدمج مع كوبونات المكافآت</span>
              <p className="text-xs text-gray-600 mt-1">
                عند إيقافه، لا يمكن استخدام هذا الكود مع كوبون مكافآت الولاء في نفس الطلب
              </p>
            </label>
          </div>
        </div>

        {/* Allowed user */}
        <div className="p-4 border border-gray-200 rounded-lg space-y-3">
          <label className="block text-sm font-medium">
            تخصيص الكود لمستخدم محدد
            <span className="text-gray-400 text-xs mr-1">(اختياري)</span>
          </label>
          {allowedUser ? (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <div className="text-sm">
                <span className="font-medium">{allowedUser.username}</span>
                {allowedUser.storeName && (
                  <span className="text-gray-500"> — {allowedUser.storeName}</span>
                )}
                <span className="text-gray-500 font-mono text-xs mr-2" dir="ltr">
                  {allowedUser.phone}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAllowedUser(null)}
                className="text-gray-400 hover:text-red-500"
                disabled={loading}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search className="w-4 h-4 absolute top-3 right-3 text-gray-400" />
                <Input
                  type="text"
                  value={userQuery}
                  onChange={(e) => handleUserQueryChange(e.target.value)}
                  placeholder="ابحث بالاسم أو الهاتف أو اسم المتجر..."
                  disabled={loading}
                  className="pr-9"
                />
              </div>
              {(userResults.length > 0 || userSearching) && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                  {userSearching ? (
                    <p className="p-3 text-sm text-gray-500">جاري البحث...</p>
                  ) : (
                    userResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setAllowedUser(u)
                          setUserQuery('')
                          setUserResults([])
                        }}
                        className="w-full text-right px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-0"
                      >
                        <span className="font-medium">{u.username}</span>
                        {u.storeName && (
                          <span className="text-gray-500"> — {u.storeName}</span>
                        )}
                        <span className="text-gray-400 font-mono text-xs mr-2" dir="ltr">
                          {u.phone}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
          <p className="text-xs text-gray-500">
            عند التحديد، لن يعمل الكود إلا مع هذا المستخدم — أي شخص آخر سيرى &quot;كود غير موجود&quot;
          </p>
        </div>

        {/* Category scope */}
        <div className="p-4 border border-gray-200 rounded-lg space-y-3">
          <label className="block text-sm font-medium">
            حصر الخصم بفئات محددة
            <span className="text-gray-400 text-xs mr-1">(اختياري — فارغ = كل الطلب)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const selected = selectedCategoryIds.has(cat.id)
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  disabled={loading}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selected
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {cat.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Product scope */}
        <div className="p-4 border border-gray-200 rounded-lg space-y-3">
          <label className="block text-sm font-medium">
            حصر الخصم بمنتجات محددة
            <span className="text-gray-400 text-xs mr-1">(اختياري — فارغ = كل الطلب)</span>
          </label>
          {selectedProducts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedProducts.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-full px-3 py-1 text-sm"
                >
                  {p.name}
                  <button
                    type="button"
                    onClick={() => removeProduct(p.id)}
                    disabled={loading}
                    className="text-blue-400 hover:text-red-500"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="relative">
            <div className="relative">
              <Search className="w-4 h-4 absolute top-3 right-3 text-gray-400" />
              <Input
                type="text"
                value={productQuery}
                onChange={(e) => handleProductQueryChange(e.target.value)}
                placeholder="ابحث عن منتج لإضافته..."
                disabled={loading}
                className="pr-9"
              />
            </div>
            {(productResults.length > 0 || productSearching) && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                {productSearching ? (
                  <p className="p-3 text-sm text-gray-500">جاري البحث...</p>
                ) : (
                  productResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addProduct(p)}
                      className="w-full text-right px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-0"
                    >
                      {p.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500">
            عند تحديد فئات أو منتجات، تُحسب نسبة الخصم على قيمتها فقط داخل السلة وليس على كامل الطلب
          </p>
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
            <span className="font-medium">{isEdit ? 'تفعيل الكود' : 'تفعيل الكود فوراً'}</span>
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
            {loading ? 'جاري الحفظ...' : isEdit ? 'حفظ التعديلات' : 'حفظ كود الخصم'}
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
