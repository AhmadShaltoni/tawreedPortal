'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowRight, Plus, Loader2, Trash2, Edit, Gift } from 'lucide-react'
import { getDeliveryPromotions, createDeliveryPromotion, updateDeliveryPromotion, deleteDeliveryPromotion, toggleDeliveryPromotion, getDeliveryZonesWithCities } from '@/actions/delivery'
import { Button } from '@/components/ui/Button'

interface Promotion {
  id: string
  name: string
  nameEn: string | null
  type: string
  value: number
  scope: string
  cityIds: string[]
  minOrderAmount: number | null
  startDate: string
  endDate: string
  isActive: boolean
  usageLimit: number | null
  usageCount: number
}

interface CityOption {
  id: string
  name: string
  nameEn: string
}

const TYPE_LABELS: Record<string, string> = {
  FREE_DELIVERY: 'توصيل مجاني',
  REDUCED_FEE: 'تخفيض مبلغ',
  FLAT_RATE: 'سعر ثابت',
}

export default function DeliveryPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [cities, setCities] = useState<CityOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    nameEn: '',
    type: 'FREE_DELIVERY',
    value: '0',
    scope: 'ALL_CITIES',
    cityIds: [] as string[],
    minOrderAmount: '',
    startDate: '',
    endDate: '',
    isActive: true,
    usageLimit: '',
  })

  const loadData = useCallback(async () => {
    const [promos, citiesData] = await Promise.all([
      getDeliveryPromotions(),
      getDeliveryZonesWithCities(),
    ])
    setPromotions(promos.map((p) => ({ ...p, startDate: p.startDate.toISOString(), endDate: p.endDate.toISOString() })) as Promotion[])
    setCities(citiesData.map((c) => ({ id: c.id, name: c.name, nameEn: c.nameEn })))
    setIsLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function resetForm() {
    setFormData({
      name: '', nameEn: '', type: 'FREE_DELIVERY', value: '0', scope: 'ALL_CITIES',
      cityIds: [], minOrderAmount: '', startDate: '', endDate: '', isActive: true, usageLimit: '',
    })
    setEditingId(null)
    setShowForm(false)
  }

  function startEdit(promo: Promotion) {
    setFormData({
      name: promo.name,
      nameEn: promo.nameEn || '',
      type: promo.type,
      value: promo.value.toString(),
      scope: promo.scope,
      cityIds: promo.cityIds,
      minOrderAmount: promo.minOrderAmount?.toString() || '',
      startDate: promo.startDate.slice(0, 16),
      endDate: promo.endDate.slice(0, 16),
      isActive: promo.isActive,
      usageLimit: promo.usageLimit?.toString() || '',
    })
    setEditingId(promo.id)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    setMessage(null)

    const fd = new FormData()
    fd.set('name', formData.name)
    fd.set('nameEn', formData.nameEn)
    fd.set('type', formData.type)
    fd.set('value', formData.value)
    fd.set('scope', formData.scope)
    fd.set('cityIds', JSON.stringify(formData.cityIds))
    fd.set('minOrderAmount', formData.minOrderAmount)
    fd.set('startDate', formData.startDate)
    fd.set('endDate', formData.endDate)
    fd.set('isActive', formData.isActive.toString())
    fd.set('usageLimit', formData.usageLimit)

    const result = editingId
      ? await updateDeliveryPromotion(editingId, fd)
      : await createDeliveryPromotion(fd)

    if (result.success) {
      setMessage({ type: 'success', text: editingId ? 'تم التحديث' : 'تم الإنشاء' })
      resetForm()
      await loadData()
    } else {
      setMessage({ type: 'error', text: result.error || 'حدث خطأ' })
    }
    setIsSaving(false)
    setTimeout(() => setMessage(null), 3000)
  }

  async function handleDelete(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذا العرض؟')) return
    await deleteDeliveryPromotion(id)
    await loadData()
    setMessage({ type: 'success', text: 'تم الحذف' })
    setTimeout(() => setMessage(null), 3000)
  }

  async function handleToggle(id: string, currentActive: boolean) {
    await toggleDeliveryPromotion(id, !currentActive)
    await loadData()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    )
  }

  const now = new Date()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/delivery" className="text-gray-500 hover:text-gray-700">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">عروض التوصيل</h1>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true) }}>
          <Plus className="w-4 h-4" />
          عرض جديد
        </Button>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">
            {editingId ? 'تعديل العرض' : 'إنشاء عرض جديد'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم العرض *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="مثال: توصيل مجاني - رمضان"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم بالإنجليزية</label>
                <input
                  type="text"
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  dir="ltr"
                  placeholder="e.g., Free Delivery - Ramadan"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نوع العرض *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="FREE_DELIVERY">توصيل مجاني</option>
                  <option value="REDUCED_FEE">تخفيض مبلغ ثابت</option>
                  <option value="FLAT_RATE">سعر ثابت</option>
                </select>
              </div>
              {formData.type !== 'FREE_DELIVERY' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.type === 'REDUCED_FEE' ? 'مبلغ التخفيض (د.أ)' : 'السعر الثابت (د.أ)'}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">النطاق</label>
                <select
                  value={formData.scope}
                  onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="ALL_CITIES">جميع المحافظات</option>
                  <option value="SPECIFIC_CITIES">محافظات محددة</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأدنى للطلب (د.أ)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.minOrderAmount}
                  onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                  placeholder="فارغ = بدون حد أدنى"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            {formData.scope === 'SPECIFIC_CITIES' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اختر المحافظات</label>
                <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-gray-50 max-h-40 overflow-y-auto">
                  {cities.map((city) => (
                    <label key={city.id} className="inline-flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.cityIds.includes(city.id)}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            cityIds: e.target.checked
                              ? [...formData.cityIds, city.id]
                              : formData.cityIds.filter((id) => id !== city.id),
                          })
                        }}
                        className="rounded text-blue-600"
                      />
                      {city.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ البداية *</label>
                <input
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الانتهاء *</label>
                <input
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">حد الاستخدام</label>
                <input
                  type="number"
                  min="1"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                  placeholder="فارغ = غير محدود"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span className="text-sm text-gray-700">مفعّل</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" isLoading={isSaving}>
                {editingId ? 'تحديث' : 'إنشاء العرض'}
              </Button>
              <button type="button" onClick={resetForm} className="text-sm text-gray-500 hover:text-gray-700">
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Promotions List */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-right px-4 py-3 font-medium text-gray-600">العرض</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">النوع</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">النطاق</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">الفترة</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">الاستخدام</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">الحالة</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {promotions.map((promo) => {
              const start = new Date(promo.startDate)
              const end = new Date(promo.endDate)
              const isExpired = end < now
              const isUpcoming = start > now
              const isRunning = promo.isActive && !isExpired && !isUpcoming

              return (
                <tr key={promo.id} className={`hover:bg-gray-50 ${isExpired ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-purple-500" />
                      <span className="font-medium">{promo.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{TYPE_LABELS[promo.type] || promo.type}</td>
                  <td className="px-4 py-3">
                    {promo.scope === 'ALL_CITIES' ? 'جميع المحافظات' : `${promo.cityIds.length} محافظات`}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    <div>{start.toLocaleDateString('ar-JO')}</div>
                    <div>{end.toLocaleDateString('ar-JO')}</div>
                  </td>
                  <td className="px-4 py-3">
                    {promo.usageCount}{promo.usageLimit ? ` / ${promo.usageLimit}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    {isExpired ? (
                      <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">منتهي</span>
                    ) : isUpcoming ? (
                      <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">قادم</span>
                    ) : isRunning ? (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">فعّال</span>
                    ) : (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">معطّل</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEdit(promo)} className="text-blue-600 hover:text-blue-800">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleToggle(promo.id, promo.isActive)} className="text-gray-400 hover:text-gray-600 text-xs">
                        {promo.isActive ? 'تعطيل' : 'تفعيل'}
                      </button>
                      <button onClick={() => handleDelete(promo.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {promotions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  لا توجد عروض توصيل. أنشئ عرضاً جديداً لتبدأ.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
