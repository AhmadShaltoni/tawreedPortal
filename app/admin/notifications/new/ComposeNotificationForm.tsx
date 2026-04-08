'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/LanguageContext'
import { Button, Input, Textarea, Select } from '@/components/ui'
import { sendNotification, searchUsers } from '@/actions/notifications'
import Link from 'next/link'

export function ComposeNotificationForm() {
  const router = useRouter()
  const { dir } = useLanguage()
  const [isPending, startTransition] = useTransition()

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    linkUrl: '',
    imageUrl: '',
    recipientType: 'all',
    specificUserId: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showSearch, setShowSearch] = useState(false)

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)

    if (query.length < 2) {
      setSearchResults([])
      return
    }

    try {
      const result = await searchUsers(query, 'BUYER')
      if (
        result.success &&
        result.data &&
        typeof result.data === 'object' &&
        'users' in result.data
      ) {
        const data = result.data as unknown as { users: any[] }
        setSearchResults(
          data.users.map((user: any) => ({
            id: user.id,
            label: `${user.storeName || user.username} (${user.phone})`,
          }))
        )
      }
    } catch (error) {
      console.error('Search error:', error)
    }
  }

  const handleSelectUser = (userId: string, userLabel: string) => {
    setFormData((prev) => ({ ...prev, specificUserId: userId }))
    setSearchQuery(userLabel)
    setShowSearch(false)
    setSearchResults([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate
    const newErrors: Record<string, string> = {}
    if (!formData.title.trim()) newErrors.title = 'العنوان مطلوب'
    if (!formData.message.trim()) newErrors.message = 'الرسالة مطلوبة'
    if (formData.recipientType === 'specific' && !formData.specificUserId) {
      newErrors.specificUserId = 'الرجاء اختيار مستقبل'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    startTransition(async () => {
      try {
        const fd = new FormData()
        fd.append('title', formData.title)
        fd.append('message', formData.message)
        fd.append('linkUrl', formData.linkUrl)
        fd.append('imageUrl', formData.imageUrl)
        fd.append('recipientType', formData.recipientType)
        if (formData.specificUserId) {
          fd.append('specificUserId', formData.specificUserId)
        }

        const result = await sendNotification(fd)

        if (result.success) {
          alert('تم إرسال الإشعار بنجاح!')
          router.push('/admin/notifications')
        } else {
          setErrors({ submit: result.error || 'حدث خطأ' })
        }
      } catch (error) {
        setErrors({ submit: 'حدث خطأ في الإرسال' })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          العنوان
        </label>
        <Input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="مثال: طلب جديد"
          className={errors.title ? 'border-red-500' : ''}
        />
        {errors.title && (
          <p className="text-red-600 text-sm mt-1">{errors.title}</p>
        )}
      </div>

      {/* Message */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          الرسالة
        </label>
        <Textarea
          name="message"
          value={formData.message}
          onChange={handleChange}
          placeholder="اكتب نص الإشعار هنا..."
          rows={4}
          className={errors.message ? 'border-red-500' : ''}
        />
        {errors.message && (
          <p className="text-red-600 text-sm mt-1">{errors.message}</p>
        )}
      </div>

      {/* Link URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          رابط التحويل (اختياري)
        </label>
        <Input
          type="text"
          name="linkUrl"
          value={formData.linkUrl}
          onChange={handleChange}
          placeholder="مثال: /products/123 أو /orders/456"
        />
        <p className="text-xs text-gray-500 mt-1">
          المسار الذي يتم فتحه عند الضغط على الإشعار
        </p>
      </div>

      {/* Image URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          رابط الصورة (اختياري)
        </label>
        <Input
          type="url"
          name="imageUrl"
          value={formData.imageUrl}
          onChange={handleChange}
          placeholder="https://example.com/image.jpg"
        />
      </div>

      {/* Recipients */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          المستقبلون
        </label>
        <Select
          name="recipientType"
          value={formData.recipientType}
          onChange={handleChange}
          options={[
            { value: 'all', label: 'جميع المستخدمين' },
            { value: 'buyers', label: 'جميع المشترين' },
            { value: 'suppliers', label: 'جميع الموردين' },
            { value: 'specific', label: 'مستخدم محدد' },
          ]}
        />
      </div>

      {/* Specific User Search */}
      {formData.recipientType === 'specific' && (
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ابحث عن المستخدم
          </label>
          <Input
            type="text"
            value={searchQuery}
            onChange={handleSearch}
            onFocus={() => setShowSearch(true)}
            placeholder="ابحث بالهاتف أو الاسم..."
            className={errors.specificUserId ? 'border-red-500' : ''}
          />

          {/* Search Results */}
          {showSearch && searchResults.length > 0 && (
            <div className="absolute top-full mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg z-10">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelectUser(user.id, user.label)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 border-b last:border-b-0 text-sm"
                >
                  {user.label}
                </button>
              ))}
            </div>
          )}

          {errors.specificUserId && (
            <p className="text-red-600 text-sm mt-1">{errors.specificUserId}</p>
          )}
        </div>
      )}

      {/* Submit Error */}
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {errors.submit}
        </div>
      )}

      {/* Actions */}
      <div className={`flex gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <Button
          type="submit"
          variant="primary"
          disabled={isPending}
          className="flex-1"
        >
          {isPending ? 'جاري الإرسال...' : 'إرسال الإشعار'}
        </Button>
        <Link href="/admin/notifications" className="flex-1">
          <Button type="button" variant="outline" className="w-full">
            إلغاء
          </Button>
        </Link>
      </div>
    </form>
  )
}
