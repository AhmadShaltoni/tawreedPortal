'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createDiscountCampaign, updateDiscountCampaign } from '@/actions/discount-campaigns'
import { Package, Layers, FolderTree, Globe, Search, X, Check } from 'lucide-react'

interface Props {
  collections: { id: string; name: string; nameEn: string | null }[]
  categories: { id: string; name: string; nameEn: string | null; depth: number }[]
  products: { id: string; name: string; nameEn: string | null; image: string | null }[]
  initialData?: {
    id: string
    name: string
    nameEn: string | null
    discountPercent: number
    startDate: Date
    endDate: Date | null
    scope: string
    collectionId: string | null
    categoryId: string | null
    status: string
    products?: { productId: string }[]
  }
}

type Scope = 'ALL_PRODUCTS' | 'SPECIFIC_PRODUCTS' | 'COLLECTION' | 'CATEGORY'

export default function DiscountCampaignForm({ collections, categories, products, initialData }: Props) {
  const router = useRouter()
  const isEdit = !!initialData

  const [name, setName] = useState(initialData?.name || '')
  const [nameEn, setNameEn] = useState(initialData?.nameEn || '')
  const [discountPercent, setDiscountPercent] = useState(initialData?.discountPercent?.toString() || '')
  const [startDate, setStartDate] = useState(
    initialData?.startDate ? new Date(initialData.startDate).toISOString().slice(0, 16) : ''
  )
  const [endDate, setEndDate] = useState(
    initialData?.endDate ? new Date(initialData.endDate).toISOString().slice(0, 16) : ''
  )
  const [scope, setScope] = useState<Scope>((initialData?.scope as Scope) || 'SPECIFIC_PRODUCTS')
  const [collectionId, setCollectionId] = useState(initialData?.collectionId || '')
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || '')
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
    initialData?.products?.map(p => p.productId) || []
  )
  const [productSearch, setProductSearch] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const filteredProducts = products.filter(p => {
    if (!productSearch) return true
    return p.name.includes(productSearch) || (p.nameEn && p.nameEn.toLowerCase().includes(productSearch.toLowerCase()))
  })

  const handleToggleProduct = (productId: string) => {
    setSelectedProductIds(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    )
  }

  const handleSelectAll = () => {
    const allFilteredIds = filteredProducts.map(p => p.id)
    const allSelected = allFilteredIds.every(id => selectedProductIds.includes(id))
    if (allSelected) {
      setSelectedProductIds(prev => prev.filter(id => !allFilteredIds.includes(id)))
    } else {
      setSelectedProductIds(prev => [...new Set([...prev, ...allFilteredIds])])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    const payload = {
      name,
      nameEn: nameEn || undefined,
      discountPercent: parseFloat(discountPercent),
      startDate,
      endDate: endDate || null,
      scope,
      collectionId: scope === 'COLLECTION' ? collectionId : null,
      categoryId: scope === 'CATEGORY' ? categoryId : null,
      productIds: scope === 'SPECIFIC_PRODUCTS' ? selectedProductIds : undefined,
      status: 'ACTIVE' as const,
    }

    let result
    if (isEdit && initialData) {
      result = await updateDiscountCampaign(initialData.id, payload)
    } else {
      result = await createDiscountCampaign(payload)
    }

    if (result.success) {
      router.push('/admin/discount-campaigns')
      router.refresh()
    } else {
      setError(result.error || 'حدث خطأ')
    }
    setSaving(false)
  }

  const scopeOptions = [
    { value: 'SPECIFIC_PRODUCTS', label: 'منتجات محددة', icon: Package, desc: 'اختر منتجات معينة' },
    { value: 'COLLECTION', label: 'قسم تسويقي', icon: Layers, desc: 'كل منتجات القسم' },
    { value: 'CATEGORY', label: 'فئة كاملة', icon: FolderTree, desc: 'كل منتجات الفئة' },
    { value: 'ALL_PRODUCTS', label: 'جميع المنتجات', icon: Globe, desc: 'خصم على كل المتجر' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="text-lg font-semibold">معلومات الحملة</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم الحملة *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: خصم نهاية الأسبوع"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الاسم بالإنجليزية</label>
            <Input
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g., Weekend Discount"
            />
          </div>
        </div>

        <div className="max-w-xs">
          <label className="block text-sm font-medium text-gray-700 mb-1">نسبة الخصم (%) *</label>
          <Input
            type="number"
            value={discountPercent}
            onChange={(e) => setDiscountPercent(e.target.value)}
            placeholder="5"
            min="0.1"
            max="100"
            step="0.1"
            required
          />
        </div>
      </div>

      {/* Schedule */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="text-lg font-semibold">المدة الزمنية</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ البداية *</label>
            <Input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              تاريخ النهاية <span className="text-gray-400">(اختياري - اتركه فارغاً للمدة المفتوحة)</span>
            </label>
            <Input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Scope Selection */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="text-lg font-semibold">نطاق التطبيق</h2>
        <p className="text-sm text-gray-500">اختر على ماذا سيتم تطبيق الخصم</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {scopeOptions.map(opt => {
            const Icon = opt.icon
            const isSelected = scope === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setScope(opt.value as Scope)}
                className={`p-4 rounded-xl border-2 transition-all text-center ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className={`w-6 h-6 mx-auto mb-2 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                <div className={`text-sm font-medium ${isSelected ? 'text-blue-800' : 'text-gray-700'}`}>
                  {opt.label}
                </div>
                <div className="text-xs text-gray-500 mt-1">{opt.desc}</div>
              </button>
            )
          })}
        </div>

        {/* Scope-specific fields */}
        {scope === 'COLLECTION' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">اختر القسم التسويقي *</label>
            <select
              value={collectionId}
              onChange={(e) => setCollectionId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              required
            >
              <option value="">-- اختر قسم --</option>
              {collections.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.nameEn ? `(${c.nameEn})` : ''}</option>
              ))}
            </select>
          </div>
        )}

        {scope === 'CATEGORY' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">اختر الفئة *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              required
            >
              <option value="">-- اختر فئة --</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {'—'.repeat(c.depth)} {c.name} {c.nameEn ? `(${c.nameEn})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {scope === 'SPECIFIC_PRODUCTS' && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                اختر المنتجات * <span className="text-blue-600">({selectedProductIds.length} محدد)</span>
              </label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                {filteredProducts.every(p => selectedProductIds.includes(p.id)) ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
              </button>
            </div>

            <div className="relative">
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="ابحث عن منتج..."
                className="w-full border border-gray-300 rounded-lg pr-9 pl-3 py-2 text-sm"
              />
              {productSearch && (
                <button
                  type="button"
                  onClick={() => setProductSearch('')}
                  className="absolute left-3 top-2.5"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>

            {/* Selected products tags */}
            {selectedProductIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedProductIds.slice(0, 10).map(id => {
                  const product = products.find(p => p.id === id)
                  if (!product) return null
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                    >
                      {product.name}
                      <button type="button" onClick={() => handleToggleProduct(id)}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )
                })}
                {selectedProductIds.length > 10 && (
                  <span className="text-xs text-gray-500 py-1">+{selectedProductIds.length - 10} أخرى</span>
                )}
              </div>
            )}

            {/* Product list */}
            <div className="border rounded-lg max-h-64 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <p className="text-center text-gray-500 py-4 text-sm">لا توجد نتائج</p>
              ) : (
                filteredProducts.map(product => {
                  const isSelected = selectedProductIds.includes(product.id)
                  return (
                    <label
                      key={product.id}
                      className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                        isSelected ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      {product.image && (
                        <img src={product.image} alt="" className="w-8 h-8 rounded object-cover" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{product.name}</div>
                        {product.nameEn && (
                          <div className="text-xs text-gray-500 truncate">{product.nameEn}</div>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleProduct(product.id)}
                        className="sr-only"
                      />
                    </label>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? 'جاري الحفظ...' : isEdit ? 'حفظ التعديلات' : 'إنشاء حملة الخصم'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          إلغاء
        </Button>
      </div>
    </form>
  )
}
