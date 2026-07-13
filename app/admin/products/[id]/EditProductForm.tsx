'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Trash2, X, Languages, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { useLanguage } from '@/lib/LanguageContext'
import { updateProduct, deleteProduct } from '@/actions/products'
import { useAutoTranslate } from '@/lib/useAutoTranslate'
import { compressImage } from '@/lib/compress-image'
import { ImageLightbox } from '@/components/ui/ImageLightbox'
import { VariantsEditor, createDefaultUnit, createDefaultVariant, type VariantEntry, type UnitTypeOption } from '@/components/admin/VariantsEditor'

interface ProductUnitData {
  id: string
  unit: string
  label: string
  labelEn: string | null
  piecesPerUnit: number
  price: number
  wholesalePrice: number | null
  compareAtPrice: number | null
  isDefault: boolean
  sortOrder: number
}

interface ProductVariantData {
  id: string
  size: string
  sizeEn: string | null
  image: string | null
  sku: string | null
  barcode: string | null
  stock: number
  minOrderQuantity: number
  isDefault: boolean
  isActive: boolean
  sortOrder: number
  units: ProductUnitData[]
  options: ProductOptionData[]
}

interface ProductOptionData {
  id: string
  name: string
  nameEn: string | null
  image: string | null
  stock: number
  priceOverride: number | null
  sortOrder: number
}

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

interface Props {
  product: {
    id: string
    name: string
    nameEn: string | null
    description: string | null
    descriptionEn: string | null
    keywords?: string | null
    image: string | null
    categoryId: string
    supplierId: string | null
    brandId?: string | null
    isActive: boolean
    variants?: ProductVariantData[]
  }
  categoryTree: CategoryNode[]
  suppliers: SupplierOption[]
  brands: BrandOption[]
  unitTypes: UnitTypeOption[]
}

function buildInitialVariants(product: Props['product'], unitTypes: UnitTypeOption[]): VariantEntry[] {
  if (product.variants && product.variants.length > 0) {
    return product.variants.map((v) => ({
      size: v.size,
      sizeEn: v.sizeEn || '',
      sku: v.sku || '',
      barcode: v.barcode || '',
      stock: v.stock,
      minOrderQuantity: v.minOrderQuantity,
      isDefault: v.isDefault,
      imageFile: null,
      imagePreview: v.image || null,
      existingImage: v.image || null,
      units: v.units.length > 0
        ? v.units.map((u) => ({
            unit: u.unit,
            label: u.label,
            labelEn: u.labelEn || '',
            piecesPerUnit: u.piecesPerUnit,
            price: u.price,
            wholesalePrice: u.wholesalePrice ?? null,
            compareAtPrice: u.compareAtPrice ?? null,
            isDefault: u.isDefault,
          }))
        : [createDefaultUnit(unitTypes)],
      options: v.options
        ? v.options.map((o) => ({
            name: o.name,
            nameEn: o.nameEn || '',
            stock: o.stock,
            priceOverride: o.priceOverride ?? null,
            imageFile: null,
            imagePreview: o.image || null,
            existingImage: o.image || null,
          }))
        : [],
    }))
  }
  return [createDefaultVariant(true, unitTypes)]
}

export function EditProductForm({ product, categoryTree, suppliers, brands, unitTypes }: Props) {
  const { t, dir, lang } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  // Return to the same list page/filters the user came from
  const listUrl = `/admin/products${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(product.supplierId || '')
  const [selectedBrandId, setSelectedBrandId] = useState<string>(product.brandId || '')
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null)
  const [mainImageFile, setMainImageFile] = useState<File | null>(null)
  const [lightbox, setLightbox] = useState<{ src: string; name: string } | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const nameEnRef = useRef<HTMLInputElement>(null)
  const descEnRef = useRef<HTMLTextAreaElement>(null)
  const nameArRef = useRef<HTMLInputElement>(null)
  const descArRef = useRef<HTMLTextAreaElement>(null)
  const translate = useAutoTranslate()

  // Cleanup object URL on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (mainImagePreview) URL.revokeObjectURL(mainImagePreview)
    }
  }, [mainImagePreview])

  useEffect(() => {
    if (product.nameEn) translate.markTouched('nameEn')
    if (product.descriptionEn) translate.markTouched('descriptionEn')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function findNodeInTree(nodes: CategoryNode[], id: string): CategoryNode | null {
    for (const node of nodes) {
      if (node.id === id) return node
      const found = findNodeInTree(node.children, id)
      if (found) return found
    }
    return null
  }

  function buildPathToNode(nodes: CategoryNode[], targetId: string, currentPath: string[] = []): string[] | null {
    for (const node of nodes) {
      if (node.id === targetId) return [...currentPath, node.id]
      if (node.children.length > 0) {
        const found = buildPathToNode(node.children, targetId, [...currentPath, node.id])
        if (found) return found
      }
    }
    return null
  }

  const [selectedPath, setSelectedPath] = useState<string[]>(() => {
    return buildPathToNode(categoryTree, product.categoryId) || []
  })
  const [variants, setVariants] = useState<VariantEntry[]>(() => buildInitialVariants(product, unitTypes))

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

  const finalCategoryId = selectedPath.length > 0 ? selectedPath[selectedPath.length - 1] : ''

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setFieldErrors({})

    const formData = new FormData(e.currentTarget)
    formData.set('isActive', String(product.isActive))
    formData.set('supplierId', selectedSupplierId)
    formData.set('brandId', selectedBrandId)

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

    // Attach variant image files (new uploads) and preserve existing
    const existingVariantImages: Record<string, string> = {}
    const existingOptionImages: Record<string, string> = {}
    variants.forEach((v, vi) => {
      if (v.imageFile) {
        formData.set(`variantImage_${vi}`, v.imageFile)
      } else if (v.existingImage) {
        existingVariantImages[`variantImage_${vi}`] = v.existingImage
      }
      v.options.forEach((o, oi) => {
        if (o.imageFile) {
          formData.set(`optionImage_${vi}_${oi}`, o.imageFile)
        } else if (o.existingImage) {
          existingOptionImages[`optionImage_${vi}_${oi}`] = o.existingImage
        }
      })
    })
    formData.set('existingVariantImages', JSON.stringify(existingVariantImages))
    formData.set('existingOptionImages', JSON.stringify(existingOptionImages))

    // Replace the file input's value with the managed file state
    formData.delete('image')
    if (mainImageFile) {
      formData.set('image', mainImageFile)
    }

    try {
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

      const result = await updateProduct(product.id, formData)

      if (result.success) {
        router.push(listUrl)
      } else {
        setError(result.error || null)
        setFieldErrors(result.errors || {})
        setIsSubmitting(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء رفع الصورة')
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!confirm(t.productManagement.confirmDelete)) return
    setIsDeleting(true)
    const result = await deleteProduct(product.id)
    if (result.success) {
      router.push(listUrl)
    } else {
      setError(result.error || null)
      setIsDeleting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <Link href={listUrl} className="text-gray-500 hover:text-gray-700">
            <ArrowRight className={`w-5 h-5 ${dir === 'rtl' ? '' : 'rotate-180'}`} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{t.productManagement.editProduct}</h1>
        </div>
        <Button variant="danger" size="sm" onClick={handleDelete} isLoading={isDeleting}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">{t.productManagement.editProduct}</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {(mainImagePreview || product.image) && (
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Image src={mainImagePreview || product.image!} alt={product.name} width={80} height={80} className="rounded-lg object-cover" />
                  {mainImagePreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setMainImagePreview(null)
                        setMainImageFile(null)
                        if (imageInputRef.current) imageInputRef.current.value = ''
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {mainImagePreview ? 'صورة جديدة' : t.productManagement.image}
                </p>
              </div>
            )}

            {translate.warning && (
              <div className={`flex items-center justify-between bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-lg text-sm ${dir === 'rtl' ? 'flex-row-reverse text-right' : ''}`}>
                <span>{t.autoTranslate?.unavailable || 'الترجمة التلقائية غير متاحة حالياً بسبب مشكلة في الاتصال. يمكنك متابعة الإدخال يدوياً.'}</span>
                <button type="button" onClick={translate.dismissWarning} className="text-yellow-600 hover:text-yellow-800 ms-2 font-bold">✕</button>
              </div>
            )}

            <Input ref={nameArRef} label={t.productManagement.productName} name="name" required defaultValue={product.name} error={fieldErrors.name?.[0]} onBlur={(e) => translate.handleBlur(e.target.value, nameEnRef, 'nameEn')} />
            <div className="relative">
              <Input ref={nameEnRef} label={t.productManagement.productNameEn} name="nameEn" dir="ltr" defaultValue={product.nameEn || ''} error={fieldErrors.nameEn?.[0]} onInput={() => translate.markTouched('nameEn')} />
              <div className={`absolute top-0 ${dir === 'rtl' ? 'left-0' : 'right-0'} flex items-center gap-1`}>
                {translate.translatingField === 'nameEn' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                <button type="button" title={t.autoTranslate?.retryTranslate || 'ترجمة'} className="text-gray-400 hover:text-blue-600 p-1 transition-colors" onClick={() => translate.retry('nameEn', nameArRef.current?.value || '', nameEnRef)}><Languages className="w-4 h-4" /></button>
              </div>
            </div>

            <Textarea ref={descArRef} label={t.productManagement.description} name="description" defaultValue={product.description || ''} error={fieldErrors.description?.[0]} onBlur={(e) => translate.handleBlur(e.target.value, descEnRef, 'descriptionEn')} />
            <div className="relative">
              <Textarea ref={descEnRef} label={t.productManagement.descriptionEn} name="descriptionEn" dir="ltr" defaultValue={product.descriptionEn || ''} error={fieldErrors.descriptionEn?.[0]} onInput={() => translate.markTouched('descriptionEn')} />
              <div className={`absolute top-0 ${dir === 'rtl' ? 'left-0' : 'right-0'} flex items-center gap-1`}>
                {translate.translatingField === 'descriptionEn' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                <button type="button" title={t.autoTranslate?.retryTranslate || 'ترجمة'} className="text-gray-400 hover:text-blue-600 p-1 transition-colors" onClick={() => translate.retry('descriptionEn', descArRef.current?.value || '', descEnRef)}><Languages className="w-4 h-4" /></button>
              </div>
            </div>

            <Textarea
              label="كلمات البحث (مرادفات، لهجات، أخطاء شائعة)"
              name="keywords"
              defaultValue={product.keywords || ''}
              placeholder="مثال: بندورة، طماطم، شوكلاته، شوكولا — يفصل بينها بفاصلة أو مسافة"
              rows={2}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.productManagement.category}</label>
              <div className="space-y-2">
                {Array.from({ length: getDropdownCount() }, (_, level) => {
                  const options = getChildrenAtLevel(level)
                  if (options.length === 0) return null
                  return (
                    <select key={level} value={selectedPath[level] || ''} onChange={(e) => handleLevelChange(level, e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                      <option value="">— {t.productManagement.selectCategory || 'اختر صنف'} —</option>
                      {options.map((cat) => (
                        <option key={cat.id} value={cat.id}>{lang === 'ar' ? cat.name : (cat.nameEn || cat.name)}</option>
                      ))}
                    </select>
                  )
                })}
              </div>
              <input type="hidden" name="categoryId" value={finalCategoryId} />
              {fieldErrors.categoryId && <p className="text-sm text-red-600 mt-1">{fieldErrors.categoryId[0]}</p>}
            </div>

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

            {/* Supplier */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.supplierManagement?.supplier || 'المورد'}</label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">— {t.supplierManagement?.selectSupplier || 'اختر المورد'} —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {lang === 'ar' ? s.name : (s.nameEn || s.name)}
                    {s.isDefault ? ` ⭐` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.productManagement.image}</label>
              <input
                ref={imageInputRef}
                type="file"
                name="image"
                accept="image/jpeg,image/png,image/webp"
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setMainImageFile(file)
                    setMainImagePreview(URL.createObjectURL(file))
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Variants Section */}
        <Card className="mt-6">
          <CardHeader>
            <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <h2 className="text-lg font-semibold text-gray-900">{t.productManagement.variants}</h2>
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

        <div className={`flex items-center gap-4 mt-6 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>{t.common.save}</Button>
          <Link href={listUrl}><Button type="button" variant="outline">{t.common.cancel}</Button></Link>
        </div>
      </form>

      {lightbox && <ImageLightbox src={lightbox.src} filename={lightbox.name} onClose={() => setLightbox(null)} />}
    </div>
  )
}
