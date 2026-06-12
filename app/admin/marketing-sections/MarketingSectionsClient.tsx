'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Plus, Edit, Trash2, Eye, EyeOff, Home, Package, GripVertical } from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'
import { deleteMarketingSection, toggleMarketingSectionStatus, toggleMarketingSectionHome, reorderMarketingSections } from '@/actions/marketing-sections'
import { useRouter } from 'next/navigation'

interface Section {
  id: string
  name: string
  nameEn: string | null
  slug: string
  image: string | null
  isActive: boolean
  showOnHome: boolean
  sortOrder: number
  _count: { products: number }
}

export function MarketingSectionsClient({ sections }: { sections: Section[] }) {
  const { t, dir } = useLanguage()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف القسم "${name}"؟`)) return
    setLoading(id)
    await deleteMarketingSection(id)
    setLoading(null)
    router.refresh()
  }

  const handleToggleActive = async (id: string) => {
    setLoading(id)
    await toggleMarketingSectionStatus(id)
    setLoading(null)
    router.refresh()
  }

  const handleToggleHome = async (id: string) => {
    setLoading(id)
    const result = await toggleMarketingSectionHome(id)
    if (!result.success && result.error) {
      alert(result.error)
    }
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="p-6" dir={dir}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">أقسام التسويق</h1>
          <p className="text-sm text-gray-500 mt-1">إدارة الأقسام التسويقية التي تظهر في الصفحة الرئيسية للتطبيق</p>
        </div>
        <Link
          href="/admin/marketing-sections/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          إضافة قسم جديد
        </Link>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>ملاحظة:</strong> يتم عرض قسمين تسويقيين كحد أقصى في الصفحة الرئيسية للتطبيق.
          استخدم زر <Home className="w-4 h-4 inline" /> لتحديد الأقسام التي تظهر في الصفحة الرئيسية.
        </p>
      </div>

      {/* Sections Grid */}
      {sections.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد أقسام تسويقية</h3>
          <p className="text-gray-500 mb-4">ابدأ بإنشاء قسم تسويقي جديد لعرض المنتجات بطريقة مميزة</p>
          <Link
            href="/admin/marketing-sections/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800"
          >
            <Plus className="w-4 h-4" />
            إضافة قسم جديد
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => (
            <div
              key={section.id}
              className={`bg-white rounded-xl border border-gray-200 p-4 transition-all ${
                loading === section.id ? 'opacity-50' : ''
              } ${!section.isActive ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-4">
                {/* Drag Handle */}
                <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />

                {/* Image */}
                <div className="w-20 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  {section.image ? (
                    <Image
                      src={section.image}
                      alt={section.name}
                      width={80}
                      height={56}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Package className="w-6 h-6" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 truncate">{section.name}</h3>
                    {section.showOnHome && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        الصفحة الرئيسية
                      </span>
                    )}
                    {!section.isActive && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        غير مفعّل
                      </span>
                    )}
                  </div>
                  {section.nameEn && (
                    <p className="text-sm text-gray-500">{section.nameEn}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {section._count.products} منتج مرتبط • /{section.slug}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleHome(section.id)}
                    disabled={loading === section.id}
                    className={`p-2 rounded-lg transition-colors ${
                      section.showOnHome
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                    title={section.showOnHome ? 'إزالة من الصفحة الرئيسية' : 'عرض في الصفحة الرئيسية'}
                  >
                    <Home className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleToggleActive(section.id)}
                    disabled={loading === section.id}
                    className={`p-2 rounded-lg transition-colors ${
                      section.isActive
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                    title={section.isActive ? 'إلغاء التفعيل' : 'تفعيل'}
                  >
                    {section.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>

                  <Link
                    href={`/admin/marketing-sections/${section.id}`}
                    className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    title="تعديل"
                  >
                    <Edit className="w-4 h-4" />
                  </Link>

                  <button
                    onClick={() => handleDelete(section.id, section.name)}
                    disabled={loading === section.id}
                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
