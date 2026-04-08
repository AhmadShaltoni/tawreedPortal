'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createNotice } from '@/actions/notices'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export default function NewNoticeForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [preview, setPreview] = useState({
    text: 'مثال على النوتس',
    backgroundColor: '#f97316',
    textColor: '#FFFFFF',
    isMobileOnly: true,
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setPreview((prev) => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
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
    formData.append('text', preview.text)
    formData.append('backgroundColor', preview.backgroundColor)
    formData.append('textColor', preview.textColor)
    formData.append('isMobileOnly', String(preview.isMobileOnly))

    const result = await createNotice(formData)

    if (result.success) {
      router.push('/admin/notices')
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
        <Link href="/admin/notices" className="text-blue-600 hover:underline">
          إدارة النوتس
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-600">نوتس جديد</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Text Input */}
        <div>
          <label className="block text-sm font-medium mb-2">النص</label>
          <Input
            type="text"
            name="text"
            value={preview.text}
            onChange={handleInputChange}
            placeholder="أدخل نص الإعلان (255 حرف كحد أقصى)"
            maxLength={255}
            disabled={loading}
          />
          {errors.text && (
            <p className="text-red-600 text-sm mt-1">{errors.text[0]}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {preview.text.length}/255
          </p>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-4">
          {/* Background Color */}
          <div>
            <label className="block text-sm font-medium mb-2">
              لون الخلفية
            </label>
            <div className="flex gap-2">
              <Input
                type="color"
                name="backgroundColor"
                value={preview.backgroundColor}
                onChange={handleInputChange}
                disabled={loading}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={preview.backgroundColor}
                onChange={handleInputChange}
                name="backgroundColor"
                placeholder="#FFA500"
                disabled={loading}
                className="flex-1"
              />
            </div>
            {errors.backgroundColor && (
              <p className="text-red-600 text-sm mt-1">
                {errors.backgroundColor[0]}
              </p>
            )}
          </div>

          {/* Text Color */}
          <div>
            <label className="block text-sm font-medium mb-2">
              لون النص
            </label>
            <div className="flex gap-2">
              <Input
                type="color"
                name="textColor"
                value={preview.textColor}
                onChange={handleInputChange}
                disabled={loading}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={preview.textColor}
                onChange={handleInputChange}
                name="textColor"
                placeholder="#FFFFFF"
                disabled={loading}
                className="flex-1"
              />
            </div>
            {errors.textColor && (
              <p className="text-red-600 text-sm mt-1">
                {errors.textColor[0]}
              </p>
            )}
          </div>
        </div>

        {/* Mobile Only Toggle */}
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <input
            type="checkbox"
            id="isMobileOnly"
            name="isMobileOnly"
            checked={preview.isMobileOnly}
            onChange={handleInputChange}
            disabled={loading}
            className="w-4 h-4 cursor-pointer"
          />
          <label htmlFor="isMobileOnly" className="cursor-pointer flex-1">
            <span className="font-medium">اظهر فقط في تطبيق الهاتف</span>
            <p className="text-xs text-gray-600 mt-1">
              عندما يكون مفعلاً، لن يظهر هذا النوتس على موقع الويب
            </p>
          </label>
        </div>

        {/* Preview */}
        <div
          className="p-6 rounded-lg"
          style={{
            backgroundColor: preview.backgroundColor,
            color: preview.textColor,
          }}
        >
          <p className="text-center text-sm md:text-base">{preview.text}</p>
        </div>

        {/* Errors */}
        {errors.submit && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{errors.submit[0]}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'جاري الحفظ...' : 'حفظ النوتس'}
          </Button>
          <Link href="/admin/notices" className="flex-1">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              إلغاء
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
