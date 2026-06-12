'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Upload, X } from 'lucide-react'
import { createMarketingSection, updateMarketingSection } from '@/actions/marketing-sections'

interface SectionData {
  id: string
  name: string
  nameEn: string | null
  slug: string
  description: string | null
  descriptionEn: string | null
  image: string | null
  isActive: boolean
  showOnHome: boolean
}

export function MarketingSectionForm({ section }: { section?: SectionData }) {
  const router = useRouter()
  const isEditing = !!section
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [imagePreview, setImagePreview] = useState<string | null>(section?.image || null)
  const [removeImage, setRemoveImage] = useState(false)
  const [isActive, setIsActive] = useState(section?.isActive ?? true)
  const [showOnHome, setShowOnHome] = useState(section?.showOnHome ?? false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setFieldErrors({})

    const formData = new FormData(e.currentTarget)
    
    // Explicitly set boolean values (checkbox hidden input pattern is unreliable)
    formData.set('isActive', isActive ? 'true' : 'false')
    formData.set('showOnHome', showOnHome ? 'true' : 'false')
    
    // Attach the selected file manually (since the input may not be in DOM when preview shows)
    if (selectedFile) {
      formData.set('image', selectedFile)
    }
    
    if (removeImage) {
      formData.set('removeImage', 'true')
    }

    let result
    if (isEditing) {
      result = await updateMarketingSection(section.id, formData)
    } else {
      result = await createMarketingSection(formData)
    }

    if (result.success) {
      if (isEditing) {
        router.refresh()
      } else {
        router.push('/admin/marketing-sections')
      }
    } else {
      setError(result.error || null)
      if (result.errors) {
        setFieldErrors(result.errors as Record<string, string[]>)
      }
    }
    setLoading(false)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setRemoveImage(false)
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onload = () => setImagePreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setImagePreview(null)
    setRemoveImage(true)
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/marketing-sections"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? `تعديل: ${section.name}` : 'إضافة قسم تسويقي جديد'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isEditing ? 'تعديل بيانات القسم التسويقي' : 'إنشاء قسم تسويقي جديد لعرض المنتجات'}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {/* Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              اسم القسم (عربي) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              defaultValue={section?.name || ''}
              required
              onChange={(e) => {
                if (!isEditing) {
                  const slugInput = e.target.form?.querySelector<HTMLInputElement>('[name="slug"]')
                  if (slugInput && !slugInput.dataset.manual) {
                    slugInput.value = generateSlug(e.target.value)
                  }
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="مثال: عروض الأسبوع"
            />
            {fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name[0]}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              اسم القسم (إنجليزي)
            </label>
            <input
              type="text"
              name="nameEn"
              defaultValue={section?.nameEn || ''}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Weekly Offers"
              dir="ltr"
            />
          </div>
        </div>

        {/* Slug */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            الرابط (Slug) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="slug"
            defaultValue={section?.slug || ''}
            required
            dir="ltr"
            onInput={(e) => { (e.target as HTMLInputElement).dataset.manual = 'true' }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            placeholder="weekly-offers"
          />
          {fieldErrors.slug && <p className="text-red-500 text-xs mt-1">{fieldErrors.slug[0]}</p>}
          <p className="text-xs text-gray-400 mt-1">يُستخدم في رابط الصفحة، حروف إنجليزية صغيرة وأرقام وشرطات فقط</p>
        </div>

        {/* Description */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الوصف (عربي)</label>
            <textarea
              name="description"
              defaultValue={section?.description || ''}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="وصف مختصر للقسم..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الوصف (إنجليزي)</label>
            <textarea
              name="descriptionEn"
              defaultValue={section?.descriptionEn || ''}
              rows={3}
              dir="ltr"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Short description..."
            />
          </div>
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">صورة القسم</label>
          {imagePreview && !removeImage ? (
            <div className="relative w-full max-w-md h-40 rounded-lg overflow-hidden border border-gray-200">
              <Image
                src={imagePreview}
                alt="Preview"
                fill
                className="object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 left-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full max-w-md h-40 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">اضغط لرفع صورة</span>
              <span className="text-xs text-gray-400 mt-1">PNG, JPG, WebP (أقصى حجم: 5 ميغابايت)</span>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleImageChange}
              />
            </label>
          )}
        </div>

        {/* Settings */}
        <div className="flex items-center gap-6 pt-4 border-t border-gray-200">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">مفعّل</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnHome}
              onChange={(e) => setShowOnHome(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">عرض في الصفحة الرئيسية</span>
          </label>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Link
            href="/admin/marketing-sections"
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            إلغاء
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'جاري الحفظ...' : isEditing ? 'حفظ التغييرات' : 'إنشاء القسم'}
          </button>
        </div>
      </form>
    </div>
  )
}
