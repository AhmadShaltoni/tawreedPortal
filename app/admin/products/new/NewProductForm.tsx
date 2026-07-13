'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Languages, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { useLanguage } from '@/lib/LanguageContext'
import { createProduct } from '@/actions/products'
import { useAutoTranslate } from '@/lib/useAutoTranslate'
import { getTagsByCategory } from '@/actions/tags'
import { compressImage } from '@/lib/compress-image'
import { ImageLightbox } from '@/components/ui/ImageLightbox'
import { VariantsEditor, createDefaultVariant, type VariantEntry, type UnitTypeOption } from '@/components/admin/VariantsEditor'

interface CategoryNode {
  id: string
  name: string
  nameEn: string | null
  _count: { products: number; children: number }
  children: CategoryNode[]
}

interface SupplierOption {
  id: string
  name: string
  nameEn: string | null
  isDefault: boolean
}

interface BrandOption {
  id: string
  name: string
  nameEn: string | null
}

interface CollectionOption {
  id: string
  name: string
  nameEn: string | null
}

interface TagOption {
  id: string
  name: string
  nameEn: string | null
}

interface Props {
  categoryTree: CategoryNode[]
  suppliers: SupplierOption[]
  defaultSupplierId: string | null
  brands: BrandOption[]
  collections: CollectionOption[]
  unitTypes: UnitTypeOption[]
}

export function NewProductForm({ categoryTree, suppliers, defaultSupplierId, brands, collections, unitTypes }: Props) {
  const { t, dir, lang } = useLanguage()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Category selection
  const [selectedPath, setSelectedPath] = useState<string[]>([])
  const [additionalCategoryIds, setAdditionalCategoryIds] = useState<string[]>([])
  
  // Other fields
  const [selectedBrandId, setSelectedBrandId] = useState<string>('')
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(defaultSupplierId || '')
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [lightbox, setLightbox] = useState<{ src: string; name: string } | null>(null)
  const [availableTags, setAvailableTags] = useState<TagOption[]>([])
  
  // Variants
  const [variants, setVariants] = useState<VariantEntry[]>(() => [createDefaultVariant(true, unitTypes)])
  
  // Refs
  const nameEnRef = useRef<HTMLInputElement>(null)
  const descEnRef = useRef<HTMLTextAreaElement>(null)
  const nameArRef = useRef<HTMLInputElement>(null)
  const descArRef = useRef<HTMLTextAreaElement>(null)
  const translate = useAutoTranslate()

  const finalCategoryId = selectedPath.length > 0 ? selectedPath[selectedPath.length - 1] : ''

  // Load tags when category changes
  useEffect(() => {
    const loadTags = async () => {
      if (finalCategoryId) {
        try {
          const tags = await getTagsByCategory(finalCategoryId)
          setAvailableTags(tags)
          // Clear selected tags if they don't exist in new category
          setSelectedTagIds((prev) => prev.filter((tid) => tags.some((t) => t.id === tid)))
        } catch (err) {
          console.error('Failed to load tags:', err)
        }
      } else {
        setAvailableTags([])
        setSelectedTagIds([])
      }
    }
    loadTags()
  }, [finalCategoryId])

  function findNodeInTree(nodes: CategoryNode[], id: string): CategoryNode | null {
    for (const node of nodes) {
      if (node.id === id) return node
      const found = findNodeInTree(node.children, id)
      if (found) return found
    }
    return null
  }

  function getChildrenAtLevel(level: number): CategoryNode[] {
    if (level === 0) return categoryTree
    const parentId = selectedPath[level - 1]
    if (!parentId) return []
    const parent = findNodeInTree(categoryTree, parentId)
    return parent?.children || []
  }

  function getDropdownCount(): number {
    let count = 1
    for (let i = 0; i < selectedPath.length; i++) {
      const node = findNodeInTree(categoryTree, selectedPath[i])
      if (node && node.children.length > 0) {
        count++
      } else {
        break
      }
    }
    return count
  }

  function handleLevelChange(level: number, categoryId: string) {
    const newPath = selectedPath.slice(0, level)
    if (categoryId) newPath.push(categoryId)
    setSelectedPath(newPath)
  }

  function toggleAdditionalCategory(categoryId: string) {
    setAdditionalCategoryIds((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId)
      } else {
        return [...prev, categoryId]
      }
    })
  }

  function toggleCollection(collectionId: string) {
    setSelectedCollectionIds((prev) => {
      if (prev.includes(collectionId)) {
        return prev.filter((id) => id !== collectionId)
      } else {
        return [...prev, collectionId]
      }
    })
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) => {
      if (prev.includes(tagId)) {
        return prev.filter((id) => id !== tagId)
      } else {
        return [...prev, tagId]
      }
    })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setFieldErrors({})

    const formData = new FormData(e.currentTarget)
    formData.set('isActive', 'true')
    formData.set('brandId', selectedBrandId)
    formData.set('supplierId', selectedSupplierId)
    formData.set('categoryIds', JSON.stringify(additionalCategoryIds))
    formData.set('tagIds', JSON.stringify(selectedTagIds))
    formData.set('collectionIds', JSON.stringify(selectedCollectionIds))

    const variantsPayload = variants.map((v, vi) => ({
      size: v.size,
      sizeEn: v.sizeEn || undefined,
      sku: v.sku || undefined,
      barcode: v.barcode || undefined,
      stock: v.stock,
      minOrderQuantity: v.minOrderQuantity,
      isDefault: v.isDefault,
      sortOrder: vi,
      units: v.units.map((u, ui) => ({ ...u, sortOrder: ui })),
    }))
    formData.set('variants', JSON.stringify(variantsPayload))

    // Build options map keyed by variant index
    const variantOptionsMap: Record<number, Array<{ name: string; nameEn?: string; stock: number; priceOverride?: number | null; sortOrder: number }>> = {}
    variants.forEach((v, vi) => {
      if (v.options.length > 0) {
        variantOptionsMap[vi] = v.options.map((o, oi) => ({
          name: o.name,
          nameEn: o.nameEn || undefined,
          stock: o.stock,
          priceOverride: o.priceOverride,
          sortOrder: oi,
        }))
      }
    })
    formData.set('variantOptions', JSON.stringify(variantOptionsMap))

    // Attach option image files
    variants.forEach((v, vi) => {
      if (v.imageFile) {
        formData.set(`variantImage_${vi}`, v.imageFile)
      }
      v.options.forEach((o, oi) => {
        if (o.imageFile) {
          formData.set(`optionImage_${vi}_${oi}`, o.imageFile)
        }
      })
    })

    // Compress all images before upload
    const mainImage = formData.get('image')
    if (mainImage && mainImage instanceof File && mainImage.size > 0) {
      formData.set('image', await compressImage(mainImage))
    }
    for (const [key, value] of Array.from(formData.entries())) {
      if ((key.startsWith('variantImage_') || key.startsWith('optionImage_')) && value instanceof File) {
        formData.set(key, await compressImage(value))
      }
    }

    const result = await createProduct(formData)

    if (result.success) {
      router.push('/admin/products')
    } else {
      setError(result.error || null)
      setFieldErrors(result.errors || {})
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className={`flex items-center gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <Link href="/admin/products" className="text-gray-500 hover:text-gray-700">
          <ArrowRight className={`w-5 h-5 ${dir === 'rtl' ? '' : 'rotate-180'}`} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t.productManagement.addProduct}</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">المعلومات الأساسية</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {translate.warning && (
              <div className={`flex items-center justify-between bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-lg text-sm ${dir === 'rtl' ? 'flex-row-reverse text-right' : ''}`}>
                <span>{t.autoTranslate?.unavailable || 'الترجمة التلقائية غير متاحة حالياً'}</span>
                <button type="button" onClick={translate.dismissWarning} className="text-yellow-600 hover:text-yellow-800 ms-2 font-bold">✕</button>
              </div>
            )}

            <Input ref={nameArRef} label={t.productManagement.productName} name="name" required error={fieldErrors.name?.[0]} onBlur={(e) => translate.handleBlur(e.target.value, nameEnRef, 'nameEn')} />
            <div className="relative">
              <Input ref={nameEnRef} label={t.productManagement.productNameEn} name="nameEn" dir="ltr" error={fieldErrors.nameEn?.[0]} onInput={() => translate.markTouched('nameEn')} />
              <div className={`absolute top-0 ${dir === 'rtl' ? 'left-0' : 'right-0'} flex items-center gap-1`}>
                {translate.translatingField === 'nameEn' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                <button type="button" className="text-gray-400 hover:text-blue-600 p-1" onClick={() => translate.retry('nameEn', nameArRef.current?.value || '', nameEnRef)}><Languages className="w-4 h-4" /></button>
              </div>
            </div>

            <Textarea ref={descArRef} label={t.productManagement.description} name="description" error={fieldErrors.description?.[0]} onBlur={(e) => translate.handleBlur(e.target.value, descEnRef, 'descriptionEn')} />
            <div className="relative">
              <Textarea ref={descEnRef} label={t.productManagement.descriptionEn} name="descriptionEn" dir="ltr" error={fieldErrors.descriptionEn?.[0]} onInput={() => translate.markTouched('descriptionEn')} />
              <div className={`absolute top-0 ${dir === 'rtl' ? 'left-0' : 'right-0'} flex items-center gap-1`}>
                {translate.translatingField === 'descriptionEn' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                <button type="button" className="text-gray-400 hover:text-blue-600 p-1" onClick={() => translate.retry('descriptionEn', descArRef.current?.value || '', descEnRef)}><Languages className="w-4 h-4" /></button>
              </div>
            </div>

            <Textarea
              label="كلمات البحث (مرادفات، لهجات، أخطاء شائعة)"
              name="keywords"
              placeholder="مثال: بندورة، طماطم، شوكلاته، شوكولا — يفصل بينها بفاصلة أو مسافة"
              rows={2}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.productManagement.image}</label>
              <input type="file" name="image" accept="image/jpeg,image/png,image/webp" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            </div>
          </CardContent>
        </Card>

        {/* Categorization & Organization */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">التصنيف والتنظيم</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Brand */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الماركة (اختياري)</label>
              <select
                value={selectedBrandId}
                onChange={(e) => setSelectedBrandId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">— اختر ماركة —</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {lang === 'ar' ? b.name : (b.nameEn || b.name)}
                  </option>
                ))}
              </select>
            </div>

            {/* Primary Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الفئة الأساسية *</label>
              <div className="space-y-2">
                {Array.from({ length: getDropdownCount() }, (_, level) => {
                  const options = getChildrenAtLevel(level)
                  if (options.length === 0) return null
                  return (
                    <select
                      key={level}
                      value={selectedPath[level] || ''}
                      onChange={(e) => handleLevelChange(level, e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">— اختر صنف —</option>
                      {options.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {lang === 'ar' ? cat.name : (cat.nameEn || cat.name)}
                        </option>
                      ))}
                    </select>
                  )
                })}
              </div>
              <input type="hidden" name="categoryId" value={finalCategoryId} />
              {fieldErrors.categoryId && <p className="text-sm text-red-600 mt-1">{fieldErrors.categoryId[0]}</p>}
            </div>

            {/* Additional Categories */}
            {categoryTree.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">فئات إضافية (اختياري)</label>
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 bg-gray-50">
                  {categoryTree.map((cat) => (
                    <div key={cat.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={additionalCategoryIds.includes(cat.id)}
                        onChange={() => toggleAdditionalCategory(cat.id)}
                        className="rounded border-gray-300"
                      />
                      <label className="text-sm text-gray-700 cursor-pointer">
                        {lang === 'ar' ? cat.name : (cat.nameEn || cat.name)}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Supplier */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.supplierManagement?.supplier || 'المورد'}</label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">— اختر المورد —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {lang === 'ar' ? s.name : (s.nameEn || s.name)}
                    {s.isDefault ? ` ⭐` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags - Dynamic based on selected category */}
            {availableTags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">التصنيفات (اختياري)</label>
                <div className="border rounded-lg p-3 max-h-32 overflow-y-auto space-y-2 bg-gray-50">
                  {availableTags.map((tag) => (
                    <div key={tag.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedTagIds.includes(tag.id)}
                        onChange={() => toggleTag(tag.id)}
                        className="rounded border-gray-300"
                      />
                      <label className="text-sm text-gray-700 cursor-pointer">
                        {lang === 'ar' ? tag.name : (tag.nameEn || tag.name)}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Collections */}
            {collections.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">المجموعات (اختياري)</label>
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 bg-gray-50">
                  {collections.map((col) => (
                    <div key={col.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedCollectionIds.includes(col.id)}
                        onChange={() => toggleCollection(col.id)}
                        className="rounded border-gray-300"
                      />
                      <label className="text-sm text-gray-700 cursor-pointer">
                        {lang === 'ar' ? col.name : (col.nameEn || col.name)}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Variants & Options */}
        <Card>
          <CardHeader>
            <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <h2 className="text-lg font-semibold text-gray-900">الأحجام والنكهات</h2>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {variants.length} {variants.length === 1 ? 'حجم' : 'أحجام'}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <VariantsEditor
              variants={variants}
              onChange={setVariants}
              onPreview={(src, name) => setLightbox({ src, name })}
              unitTypes={unitTypes}
            />
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className={`flex items-center gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>{t.productManagement.addProduct}</Button>
          <Link href="/admin/products"><Button type="button" variant="outline">{t.common.cancel}</Button></Link>
        </div>
      </form>

      {lightbox && <ImageLightbox src={lightbox.src} filename={lightbox.name} onClose={() => setLightbox(null)} />}
    </div>
  )
}
