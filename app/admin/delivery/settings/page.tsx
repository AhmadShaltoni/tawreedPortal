'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, Save, Loader2 } from 'lucide-react'
import { getDeliveryConfig, updateDeliveryConfig } from '@/actions/delivery'
import { Button } from '@/components/ui/Button'

type DeliveryConfig = {
  id: string
  isEnabled: boolean
  defaultFee: number
  freeDeliveryEnabled: boolean
  freeDeliveryThreshold: number | null
  freeDeliveryScope: string
  minOrderAmount: number | null
  estimatedDeliveryDays: number
}

export default function DeliverySettingsPage() {
  const [config, setConfig] = useState<DeliveryConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    getDeliveryConfig().then((data) => {
      setConfig(data)
      setIsLoading(false)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSaving(true)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    const result = await updateDeliveryConfig(formData)

    if (result.success) {
      setMessage({ type: 'success', text: 'تم حفظ الإعدادات بنجاح' })
    } else {
      setMessage({ type: 'error', text: result.error || 'حدث خطأ' })
    }
    setIsSaving(false)
  }

  if (isLoading || !config) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/delivery" className="text-gray-500 hover:text-gray-700">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">إعدادات التوصيل العامة</h1>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Global Toggle */}
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">تفعيل خدمة التوصيل</h3>
              <p className="text-sm text-gray-500 mt-1">عند الإيقاف، لن يتمكن العملاء من إتمام أي طلب</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="isEnabled"
                value="true"
                defaultChecked={config.isEnabled}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* Default Fee */}
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">رسوم التوصيل</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الرسوم الافتراضية (د.أ)</label>
            <input
              type="number"
              name="defaultFee"
              step="0.1"
              min="0"
              defaultValue={config.defaultFee}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">تُطبق على المحافظات التي ليس لها سعر خاص</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">مدة التوصيل المتوقعة (أيام)</label>
            <input
              type="number"
              name="estimatedDeliveryDays"
              min="1"
              max="30"
              defaultValue={config.estimatedDeliveryDays}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأدنى للطلب (د.أ)</label>
            <input
              type="number"
              name="minOrderAmount"
              step="0.5"
              min="0"
              defaultValue={config.minOrderAmount ?? ''}
              placeholder="اتركه فارغاً لعدم تحديد حد أدنى"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">إذا كان فارغاً، لا يوجد حد أدنى للطلب</p>
          </div>
        </div>

        {/* Free Delivery */}
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">التوصيل المجاني</h3>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="freeDeliveryEnabled"
                value="true"
                defaultChecked={config.freeDeliveryEnabled}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">عتبة التوصيل المجاني (د.أ)</label>
            <input
              type="number"
              name="freeDeliveryThreshold"
              step="0.5"
              min="0"
              defaultValue={config.freeDeliveryThreshold ?? ''}
              placeholder="مثال: 30 = مجاني للطلبات فوق 30 د.أ"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">نطاق التوصيل المجاني</label>
            <select
              name="freeDeliveryScope"
              defaultValue={config.freeDeliveryScope}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL_CITIES">جميع المحافظات</option>
              <option value="SPECIFIC_CITIES">محافظات محددة (يُدار من صفحة المناطق)</option>
            </select>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <Button type="submit" isLoading={isSaving}>
            <Save className="w-4 h-4" />
            حفظ الإعدادات
          </Button>
        </div>
      </form>
    </div>
  )
}
