'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useLanguage } from '@/lib/LanguageContext'
import { Button, Input, Textarea, Select } from '@/components/ui'
import {
  sendNotification,
  searchUsers,
  searchNotificationTargets,
  uploadNotificationImage,
  type NotificationTargetOption,
  type NotificationTargetType,
} from '@/actions/notifications'
import Link from 'next/link'
import {
  Ban,
  Package,
  LayoutGrid,
  Tag,
  Award,
  Link2,
  Receipt,
  Search,
  Upload,
  X,
  Loader2,
} from 'lucide-react'

const TARGET_TYPES: {
  value: NotificationTargetType | 'NONE'
  label: string
  icon: typeof Ban
}[] = [
  { value: 'NONE', label: 'بدون وجهة', icon: Ban },
  { value: 'PRODUCT', label: 'منتج', icon: Package },
  { value: 'COLLECTION', label: 'قسم تسويقي', icon: LayoutGrid },
  { value: 'CATEGORY', label: 'تصنيف', icon: Tag },
  { value: 'BRAND', label: 'ماركة', icon: Award },
  { value: 'URL', label: 'رابط خارجي', icon: Link2 },
  { value: 'ORDER', label: 'طلب محدد', icon: Receipt },
]

const COLLECTION_TYPE_LABELS: Record<string, string> = {
  MANUAL: 'يدوي',
  OFFERS: 'عروض',
  FEATURED: 'مميز',
}

const PICKER_TARGET_TYPES: NotificationTargetType[] = [
  'PRODUCT',
  'CATEGORY',
  'BRAND',
  'COLLECTION',
]

const MAX_VISIBLE_OPTIONS = 60

// Normalize Arabic text so search tolerates hamza/teh-marbuta/diacritics
// variants (e.g. "اراك" matches "أراك", "مشروبه" matches "مشروبة").
function normalizeArabic(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ً-ْٰـ]/g, '') // diacritics + tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ئ/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
}

// Every word of the query must appear somewhere in the option's text
function matchesQuery(option: NotificationTargetOption, normalizedTokens: string[]): boolean {
  const haystack = normalizeArabic(
    `${option.label} ${option.subLabel || ''} ${option.meta || ''}`
  )
  return normalizedTokens.every((token) => haystack.includes(token))
}

export function ComposeNotificationForm() {
  const router = useRouter()
  const { dir } = useLanguage()
  const [isPending, startTransition] = useTransition()

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    imageUrl: '',
    recipientType: 'all',
    specificUserId: '',
    targetType: 'NONE' as NotificationTargetType | 'NONE',
    externalUrl: '',
    orderId: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Recipient search (existing behavior)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showSearch, setShowSearch] = useState(false)

  // Destination target picker: the full list is fetched once per target type
  // and filtered locally (Arabic-normalized) as the admin types.
  const [selectedTarget, setSelectedTarget] = useState<NotificationTargetOption | null>(null)
  const [targetQuery, setTargetQuery] = useState('')
  const [targetOptions, setTargetOptions] = useState<NotificationTargetOption[]>([])
  const [targetLoading, setTargetLoading] = useState(false)
  const [showTargetDropdown, setShowTargetDropdown] = useState(false)

  // Image
  const [useProductImage, setUseProductImage] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isPickerType = PICKER_TARGET_TYPES.includes(formData.targetType as NotificationTargetType)

  // Load the full option list when the destination type changes
  useEffect(() => {
    if (!isPickerType) return
    let cancelled = false

    setTargetLoading(true)
    searchNotificationTargets(
      formData.targetType as 'PRODUCT' | 'CATEGORY' | 'BRAND' | 'COLLECTION',
      ''
    )
      .then((result) => {
        if (cancelled) return
        if (result.success && result.data) {
          setTargetOptions((result.data as { items: NotificationTargetOption[] }).items)
        } else {
          setTargetOptions([])
        }
      })
      .catch((error) => {
        console.error('Target search error:', error)
        if (!cancelled) setTargetOptions([])
      })
      .finally(() => {
        if (!cancelled) setTargetLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.targetType, isPickerType])

  const filteredOptions = useMemo(() => {
    const q = normalizeArabic(targetQuery)
    // While an option is selected the input shows its label — don't filter by it
    if (!q || (selectedTarget && targetQuery === selectedTarget.label)) return targetOptions
    const tokens = q.split(' ').filter(Boolean)
    return targetOptions.filter((o) => matchesQuery(o, tokens))
  }, [targetOptions, targetQuery, selectedTarget])

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

  const handleSelectTargetType = (value: NotificationTargetType | 'NONE') => {
    setFormData((prev) => ({ ...prev, targetType: value }))
    setSelectedTarget(null)
    setTargetQuery('')
    setTargetOptions([])
    setShowTargetDropdown(false)
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors.target
      return newErrors
    })
  }

  const handleSelectTarget = (option: NotificationTargetOption) => {
    setSelectedTarget(option)
    setTargetQuery(option.label)
    setShowTargetDropdown(false)
    if (formData.targetType === 'PRODUCT' && option.image && useProductImage) {
      setFormData((prev) => ({ ...prev, imageUrl: option.image as string }))
    }
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors.target
      return newErrors
    })
  }

  const handleUseProductImageToggle = (checked: boolean) => {
    setUseProductImage(checked)
    if (checked && selectedTarget?.image) {
      setFormData((prev) => ({ ...prev, imageUrl: selectedTarget.image as string }))
    }
  }

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors.image
      return newErrors
    })

    try {
      const fd = new FormData()
      fd.append('file', file)
      const result = await uploadNotificationImage(fd)
      if (result.success && result.data) {
        setUseProductImage(false)
        setFormData((prev) => ({ ...prev, imageUrl: (result.data as { url: string }).url }))
      } else {
        setErrors((prev) => ({ ...prev, image: result.error || 'فشل رفع الصورة' }))
      }
    } catch (error) {
      console.error('Image upload error:', error)
      setErrors((prev) => ({ ...prev, image: 'فشل رفع الصورة' }))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
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
    if (isPickerType && !selectedTarget) {
      newErrors.target = 'الرجاء اختيار الوجهة'
    }
    if (formData.targetType === 'URL' && !formData.externalUrl.trim()) {
      newErrors.target = 'الرجاء إدخال الرابط'
    }
    if (formData.targetType === 'ORDER' && !formData.orderId.trim()) {
      newErrors.target = 'الرجاء إدخال رقم الطلب'
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
        fd.append('imageUrl', formData.imageUrl)
        fd.append('recipientType', formData.recipientType)
        if (formData.specificUserId) {
          fd.append('specificUserId', formData.specificUserId)
        }

        fd.append('targetType', formData.targetType)
        if (isPickerType && selectedTarget) {
          fd.append('targetId', selectedTarget.id)
          fd.append('targetLabel', selectedTarget.label)
        } else if (formData.targetType === 'ORDER') {
          fd.append('targetId', formData.orderId.trim())
          fd.append('targetLabel', `طلب #${formData.orderId.trim()}`)
        } else if (formData.targetType === 'URL') {
          fd.append('linkUrl', formData.externalUrl.trim())
          fd.append('targetLabel', formData.externalUrl.trim())
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

      {/* Destination */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          وجهة الإشعار (اختياري)
        </label>
        <p className="text-xs text-gray-500 mb-3">
          المكان الذي ينتقل إليه المستخدم عند الضغط على الإشعار
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {TARGET_TYPES.map(({ value, label, icon: Icon }) => {
            const active = formData.targetType === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleSelectTargetType(value)}
                className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 px-2 py-3 text-xs font-medium transition-colors ${
                  active
                    ? 'border-blue-900 bg-blue-50 text-blue-900'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </button>
            )
          })}
        </div>

        {/* Product / Category / Brand / Collection picker */}
        {isPickerType && (
          <div className="relative">
            <div className="relative">
              <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                value={targetQuery}
                onChange={(e) => {
                  setTargetQuery(e.target.value)
                  setShowTargetDropdown(true)
                  if (selectedTarget && e.target.value !== selectedTarget.label) {
                    setSelectedTarget(null)
                  }
                }}
                onFocus={() => setShowTargetDropdown(true)}
                placeholder={
                  formData.targetType === 'PRODUCT'
                    ? 'ابحث عن منتج... (الأحدث أولًا)'
                    : 'ابحث...'
                }
                className={`ps-9 ${errors.target ? 'border-red-500' : ''}`}
              />
            </div>

            {showTargetDropdown && (
              <div className="absolute top-full mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-72 overflow-y-auto">
                {targetLoading ? (
                  <div className="flex items-center justify-center gap-2 px-4 py-4 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري التحميل...
                  </div>
                ) : filteredOptions.length === 0 ? (
                  <div className="px-4 py-4 text-sm text-gray-500 text-center">
                    لا توجد نتائج
                  </div>
                ) : (
                  <>
                    {filteredOptions.slice(0, MAX_VISIBLE_OPTIONS).map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleSelectTarget(option)}
                        className="w-full flex items-center gap-3 px-4 py-2 text-start hover:bg-gray-100 border-b last:border-b-0"
                      >
                        {option.image ? (
                          <Image
                            src={option.image}
                            alt=""
                            width={32}
                            height={32}
                            className="rounded object-cover w-8 h-8 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-gray-100 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {option.label}
                          </p>
                          {(option.subLabel || option.meta) && (
                            <p className="text-xs text-gray-500 truncate">
                              {option.meta ? COLLECTION_TYPE_LABELS[option.meta] || option.meta : ''}
                              {option.meta && option.subLabel ? ' · ' : ''}
                              {option.subLabel}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                    {filteredOptions.length > MAX_VISIBLE_OPTIONS && (
                      <div className="px-4 py-2 text-xs text-gray-500 text-center bg-gray-50 sticky bottom-0">
                        +{filteredOptions.length - MAX_VISIBLE_OPTIONS} نتيجة أخرى — اكتب للتصفية
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* External URL */}
        {formData.targetType === 'URL' && (
          <Input
            type="url"
            name="externalUrl"
            value={formData.externalUrl}
            onChange={handleChange}
            placeholder="https://example.com"
            className={errors.target ? 'border-red-500' : ''}
          />
        )}

        {/* Order ID */}
        {formData.targetType === 'ORDER' && (
          <Input
            type="text"
            name="orderId"
            value={formData.orderId}
            onChange={handleChange}
            placeholder="معرّف الطلب"
            className={errors.target ? 'border-red-500' : ''}
          />
        )}

        {errors.target && (
          <p className="text-red-600 text-sm mt-1">{errors.target}</p>
        )}
      </div>

      {/* Image */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          صورة الإشعار (اختياري)
        </label>

        {formData.targetType === 'PRODUCT' && selectedTarget?.image && (
          <label className="flex items-center gap-2 text-sm text-gray-700 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={useProductImage}
              onChange={(e) => handleUseProductImageToggle(e.target.checked)}
              className="rounded border-gray-300"
            />
            استخدام صورة المنتج المحدد
          </label>
        )}

        <div className="flex items-start gap-3">
          {formData.imageUrl ? (
            <div className="relative shrink-0">
              <Image
                src={formData.imageUrl}
                alt=""
                width={64}
                height={64}
                className="rounded-lg object-cover w-16 h-16 border border-gray-200"
              />
              <button
                type="button"
                onClick={() => {
                  setFormData((prev) => ({ ...prev, imageUrl: '' }))
                  setUseProductImage(false)
                }}
                className="absolute -top-2 -end-2 bg-white border border-gray-300 rounded-full p-0.5 hover:bg-gray-50"
              >
                <X className="w-3 h-3 text-gray-600" />
              </button>
            </div>
          ) : (
            <div className="w-16 h-16 rounded-lg border border-dashed border-gray-300 flex items-center justify-center shrink-0 text-gray-300">
              <Package className="w-6 h-6" />
            </div>
          )}

          <div className="flex-1 space-y-2">
            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageFile}
                className="hidden"
                id="notification-image-upload"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                isLoading={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 me-1" />
                رفع صورة
              </Button>
            </div>
            <Input
              type="url"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={(e) => {
                setUseProductImage(false)
                handleChange(e)
              }}
              placeholder="أو الصق رابط صورة مباشر: https://example.com/image.jpg"
            />
          </div>
        </div>
        {errors.image && (
          <p className="text-red-600 text-sm mt-1">{errors.image}</p>
        )}
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
