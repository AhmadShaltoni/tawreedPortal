'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Trash2, Plus, X, Languages, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { useLanguage } from '@/lib/LanguageContext'
import { updateProduct, deleteProduct } from '@/actions/products'
import { useAutoTranslate } from '@/lib/useAutoTranslate'

interface UnitEntry {
  unit: string
  label: string
  labelEn: string
  piecesPerUnit: number
  price: number
  wholesalePrice: number | null
  compareAtPrice: number | null
  isDefault: boolean
}

interface VariantOption {
  name: string
  nameEn: string
  stock: number
  priceOverride: number | null
  imageFile: File | null
  imagePreview: string | null
  existingImage: string | null
}

interface VariantEntry {
  size: string
  sizeEn: string
  sku: string
  barcode: string
  stock: number
  minOrderQuantity: number
  isDefault: boolean
  imageFile: File | null
  imagePreview: string | null
  existingImage: string | null
  units: UnitEntry[]
  options: VariantOption[]
}

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

interface Props {
  product: {
    id: string
    name: string
    nameEn: string | null
    description: string | null
    descriptionEn: string | null
    image: string | null
    categoryId: string
    supplierId: string | null
    isActive: boolean
    variants?: ProductVariantData[]
  }
  categoryTree: CategoryNode[]
  suppliers: SupplierOption[]
}

const UNIT_OPTIONS = [
  { value: 'PIECE', label: 'حبة' },
  { value: 'DOZEN', label: 'دزينة' },
  { value: 'CARTON', label: 'كرتونة' },
  { value: 'BOX', label: 'صندوق' },
  { value: 'PACK', label: 'عبوة' },
  { value: 'KG', label: 'كيلو' },
  { value: 'GRAM', label: 'جرام' },
  { value: 'LITER', label: 'لتر' },
  { value: 'PALLET', label: 'طبلية' },
]

const UNIT_LABEL_MAP: Record<string, { ar: string; en: string; defaultPieces: number }> = {
  PIECE:  { ar: 'قطعة', en: 'Piece', defaultPieces: 1 },
  DOZEN:  { ar: 'دزينة', en: 'Dozen', defaultPieces: 12 },
  CARTON: { ar: 'كرتونة', en: 'Carton', defaultPieces: 1 },
  BOX:    { ar: 'صندوق', en: 'Box', defaultPieces: 1 },
  PACK:   { ar: 'عبوة', en: 'Pack', defaultPieces: 1 },
  KG:     { ar: 'كيلو', en: 'Kilogram', defaultPieces: 1 },
  GRAM:   { ar: 'جرام', en: 'Gram', defaultPieces: 1 },
  LITER:  { ar: 'لتر', en: 'Liter', defaultPieces: 1 },
  PALLET: { ar: 'طبلية', en: 'Pallet', defaultPieces: 1 },
}

function createDefaultUnit(): UnitEntry {
  return { unit: 'PIECE', label: 'قطعة', labelEn: 'Piece', piecesPerUnit: 1, price: 0, wholesalePrice: null, compareAtPrice: null, isDefault: true }
}

function createDefaultVariant(isDefault: boolean): VariantEntry {
  return { size: '', sizeEn: '', sku: '', barcode: '', stock: 1, minOrderQuantity: 1, isDefault, imageFile: null, imagePreview: null, existingImage: null, units: [createDefaultUnit()], options: [] }
}

function buildInitialVariants(product: Props['product']): VariantEntry[] {
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
        : [createDefaultUnit()],
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
  return [createDefaultVariant(true)]
}

export function EditProductForm({ product, categoryTree, suppliers }: Props) {
  const { t, dir, lang } = useLanguage()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(product.supplierId || '')

  const nameEnRef = useRef<HTMLInputElement>(null)
  const descEnRef = useRef<HTMLTextAreaElement>(null)
  const nameArRef = useRef<HTMLInputElement>(null)
  const descArRef = useRef<HTMLTextAreaElement>(null)
  const translate = useAutoTranslate()

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
  const [variants, setVariants] = useState<VariantEntry[]>(buildInitialVariants(product))

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

  function addVariant() {
    setVariants([...variants, createDefaultVariant(false)])
  }

  function removeVariant(vi: number) {
    if (variants.length <= 1) return
    const updated = variants.filter((_, i) => i !== vi)
    if (!updated.some((v) => v.isDefault)) updated[0].isDefault = true
    setVariants(updated)
  }

  function updateVariant(vi: number, field: keyof VariantEntry, value: string | number | boolean) {
    const updated = [...variants]
    if (field === 'isDefault' && value === true) {
      updated.forEach((v, i) => { v.isDefault = i === vi })
    } else {
      updated[vi] = { ...updated[vi], [field]: value }
    }
    setVariants(updated)
  }

  function addUnit(vi: number) {
    const updated = [...variants]
    updated[vi] = {
      ...updated[vi],
      units: [...updated[vi].units, { unit: 'DOZEN', label: 'دزينة', labelEn: 'Dozen', piecesPerUnit: 12, price: 0, wholesalePrice: null, compareAtPrice: null, isDefault: false }],
    }
    setVariants(updated)
  }

  function addVariantOption(vi: number) {
    const updated = [...variants]
    updated[vi] = { ...updated[vi], options: [...updated[vi].options, { name: '', nameEn: '', stock: 0, priceOverride: null, imageFile: null, imagePreview: null, existingImage: null }] }
    setVariants(updated)
  }

  function removeVariantOption(vi: number, oi: number) {
    const updated = [...variants]
    updated[vi] = { ...updated[vi], options: updated[vi].options.filter((_, i) => i !== oi) }
    setVariants(updated)
  }

  function updateVariantOption(vi: number, oi: number, field: keyof VariantOption, value: string | number | null) {
    const updated = [...variants]
    updated[vi].options[oi] = { ...updated[vi].options[oi], [field]: value }
    setVariants(updated)
  }

  function removeUnit(vi: number, ui: number) {
    const updated = [...variants]
    const units = updated[vi].units.filter((_, i) => i !== ui)
    if (!units.some((u) => u.isDefault) && units.length > 0) units[0].isDefault = true
    updated[vi] = { ...updated[vi], units }
    setVariants(updated)
  }

  function updateUnit(vi: number, ui: number, field: keyof UnitEntry, value: string | number | boolean) {
    const updated = [...variants]
    const units = [...updated[vi].units]
    if (field === 'unit') {
      const info = UNIT_LABEL_MAP[value as string]
      units[ui] = { ...units[ui], unit: value as string, label: info?.ar ?? '', labelEn: info?.en ?? '', piecesPerUnit: info?.defaultPieces ?? 1 }
    } else if (field === 'isDefault' && value === true) {
      units.forEach((u, i) => { u.isDefault = i === ui })
    } else {
      units[ui] = { ...units[ui], [field]: value }
    }
    updated[vi] = { ...updated[vi], units }
    setVariants(updated)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setFieldErrors({})

    const formData = new FormData(e.currentTarget)
    formData.set('isActive', String(product.isActive))
    formData.set('supplierId', selectedSupplierId)

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

    const result = await updateProduct(product.id, formData)

    if (result.success) {
      router.push('/admin/products')
    } else {
      setError(result.error || null)
      setFieldErrors(result.errors || {})
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!confirm(t.productManagement.confirmDelete)) return
    setIsDeleting(true)
    const result = await deleteProduct(product.id)
    if (result.success) {
      router.push('/admin/products')
    } else {
      setError(result.error || null)
      setIsDeleting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <Link href="/admin/products" className="text-gray-500 hover:text-gray-700">
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
            {product.image && (
              <div className="flex items-center gap-4">
                <Image src={product.image} alt={product.name} width={80} height={80} className="rounded-lg object-cover" />
                <p className="text-sm text-gray-500">{t.productManagement.image}</p>
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
              <input type="file" name="image" accept="image/jpeg,image/png,image/webp" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            </div>
          </CardContent>
        </Card>

        {/* Variants Section */}
        <Card className="mt-6">
          <CardHeader>
            <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <h2 className="text-lg font-semibold text-gray-900">{t.productManagement.variants}</h2>
              <button type="button" onClick={addVariant} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium">
                <Plus className="w-4 h-4" />
                {t.productManagement.addVariant}
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {variants.map((variant, vi) => (
              <div key={vi} className={`border-2 rounded-xl p-5 space-y-4 ${variant.isDefault ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200'}`}>
                <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" checked={variant.isDefault} onChange={() => updateVariant(vi, 'isDefault', true)} className="text-blue-600" />
                    <span className={variant.isDefault ? 'font-semibold text-blue-700' : 'text-gray-600'}>{t.productManagement.defaultVariant}</span>
                  </label>
                  {variants.length > 1 && (
                    <button type="button" onClick={() => removeVariant(vi)} className="text-red-500 hover:text-red-700 p-1" title={t.productManagement.removeVariant}>
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t.productManagement.variantSize}</label>
                    <input type="text" value={variant.size} onChange={(e) => updateVariant(vi, 'size', e.target.value)} placeholder="مثال: 2 كيلو" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t.productManagement.variantSizeEn}</label>
                    <input type="text" value={variant.sizeEn} onChange={(e) => updateVariant(vi, 'sizeEn', e.target.value)} placeholder="e.g., 2kg" dir="ltr" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>

                {/* Variant Image */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">صورة الحجم (اختياري)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        const updated = [...variants]
                        updated[vi] = {
                          ...updated[vi],
                          imageFile: file,
                          imagePreview: file ? URL.createObjectURL(file) : updated[vi].existingImage,
                          existingImage: file ? null : updated[vi].existingImage,
                        }
                        setVariants(updated)
                      }}
                      className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {(variant.imagePreview || variant.existingImage) && (
                      <div className="relative">
                        <img src={variant.imagePreview || variant.existingImage || ''} alt="" className="w-12 h-12 object-cover rounded-lg border" />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...variants]
                            updated[vi] = { ...updated[vi], imageFile: null, imagePreview: null, existingImage: null }
                            setVariants(updated)
                          }}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px]"
                        >×</button>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">صورة خاصة بهذا الحجم (مثال: صورة علبة زجاج مقابل حديد)</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t.productManagement.sku}</label>
                    <input type="text" value={variant.sku} onChange={(e) => updateVariant(vi, 'sku', e.target.value)} dir="ltr" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t.productManagement.barcode}</label>
                    <input type="text" value={variant.barcode} onChange={(e) => updateVariant(vi, 'barcode', e.target.value)} dir="ltr" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {variant.options.length === 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{t.productManagement.stock}</label>
                      <input type="number" min="0" value={variant.stock} onChange={(e) => updateVariant(vi, 'stock', parseInt(e.target.value) || 0)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t.productManagement.minOrderQuantity}</label>
                    <input type="number" min="1" value={variant.minOrderQuantity} onChange={(e) => updateVariant(vi, 'minOrderQuantity', parseInt(e.target.value) || 1)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
                  </div>
                </div>

                {/* Variant Options (Flavors) */}
                <div className="border-t pt-3 mt-3">
                  <div className={`flex items-center justify-between mb-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    <h4 className="text-sm font-semibold text-gray-700">النكهات / الخيارات (اختياري)</h4>
                    <button type="button" onClick={() => addVariantOption(vi)} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                      <Plus className="w-3 h-3" />
                      إضافة نكهة
                    </button>
                  </div>

                  {variant.options.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">لم يتم إضافة نكهات بعد. اضغط أعلاه لإضافة نكهات متعددة (مثل: أحمر، أخضر، إلخ)</p>
                  ) : (
                    <div className="space-y-2">
                      {variant.options.map((option, oi) => (
                        <div key={oi} className="border rounded-lg p-3 bg-gray-50/50 space-y-2">
                          <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                            <span className="text-xs font-medium text-gray-600">النكهة #{oi + 1}</span>
                            {variant.options.length > 1 && (
                              <button type="button" onClick={() => removeVariantOption(vi, oi)} className="text-red-400 hover:text-red-600">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">اسم النكهة (عربي) *</label>
                              <input type="text" value={option.name} onChange={(e) => updateVariantOption(vi, oi, 'name', e.target.value)} placeholder="مثال: أحمر" className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">اسم النكهة (إنجليزي)</label>
                              <input type="text" value={option.nameEn} onChange={(e) => updateVariantOption(vi, oi, 'nameEn', e.target.value)} placeholder="e.g., Red" dir="ltr" className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">المخزون المتاح *</label>
                              <input type="number" min="0" value={option.stock} onChange={(e) => updateVariantOption(vi, oi, 'stock', parseInt(e.target.value) || 0)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">إضافة سعر (اختياري)</label>
                              <input type="number" step="0.01" min="0" value={option.priceOverride ?? ''} onChange={(e) => updateVariantOption(vi, oi, 'priceOverride', e.target.value ? parseFloat(e.target.value) : null)} placeholder="مثال: 2.5" className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                            </div>
                          </div>
                          {/* Option Image Upload */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">صورة النكهة (اختياري)</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) => {
                                  const file = e.target.files?.[0] || null
                                  const updated = [...variants]
                                  updated[vi].options[oi] = {
                                    ...updated[vi].options[oi],
                                    imageFile: file,
                                    imagePreview: file ? URL.createObjectURL(file) : updated[vi].options[oi].existingImage,
                                    existingImage: file ? null : updated[vi].options[oi].existingImage,
                                  }
                                  setVariants(updated)
                                }}
                                className="w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                              />
                              {(option.imagePreview || option.existingImage) && (
                                <div className="relative">
                                  <img src={option.imagePreview || option.existingImage || ''} alt="" className="w-10 h-10 object-cover rounded border" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...variants]
                                      updated[vi].options[oi] = { ...updated[vi].options[oi], imageFile: null, imagePreview: null, existingImage: null }
                                      setVariants(updated)
                                    }}
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px]"
                                  >×</button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t pt-3 mt-3">
                  <div className={`flex items-center justify-between mb-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    <h4 className="text-sm font-semibold text-gray-700">{t.productManagement.sellingUnits}</h4>
                    <button type="button" onClick={() => addUnit(vi)} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                      <Plus className="w-3 h-3" />
                      {t.productManagement.addUnit}
                    </button>
                  </div>
                  <div className="space-y-3">
                    {variant.units.map((entry, ui) => (
                      <div key={ui} className={`border rounded-lg p-3 space-y-2 ${entry.isDefault ? 'border-green-300 bg-green-50/50' : 'border-gray-100 bg-gray-50/30'}`}>
                        <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                          <label className="flex items-center gap-2 text-xs">
                            <input type="radio" checked={entry.isDefault} onChange={() => updateUnit(vi, ui, 'isDefault', true)} className="text-green-600" />
                            <span className={entry.isDefault ? 'font-semibold text-green-700' : 'text-gray-500'}>{t.productManagement.defaultUnit}</span>
                          </label>
                          {variant.units.length > 1 && (
                            <button type="button" onClick={() => removeUnit(vi, ui)} className="text-red-400 hover:text-red-600 p-0.5" title={t.productManagement.removeUnit}>
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">{t.productManagement.unitType}</label>
                            <select value={entry.unit} onChange={(e) => updateUnit(vi, ui, 'unit', e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                              {UNIT_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                            </select>
                          </div>
                          {entry.unit !== 'PIECE' ? (
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">{t.productManagement.piecesPerUnit}</label>
                              <input type="number" min="1" value={entry.piecesPerUnit} onChange={(e) => updateUnit(vi, ui, 'piecesPerUnit', parseInt(e.target.value) || 1)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                            </div>
                          ) : <div />}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">{t.productManagement.unitPrice}</label>
                            <input type="number" step="0.01" min="0" value={entry.price || ''} onChange={(e) => updateUnit(vi, ui, 'price', parseFloat(e.target.value) || 0)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">{t.productManagement.unitWholesalePrice}</label>
                            <input type="number" step="0.01" min="0" value={entry.wholesalePrice ?? ''} onChange={(e) => updateUnit(vi, ui, 'wholesalePrice', e.target.value ? parseFloat(e.target.value) : null as unknown as number)} placeholder="اختياري" className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">{t.productManagement.unitCompareAtPrice}</label>
                            <input type="number" step="0.01" min="0" value={entry.compareAtPrice ?? ''} onChange={(e) => updateUnit(vi, ui, 'compareAtPrice', e.target.value ? parseFloat(e.target.value) : null as unknown as number)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                          </div>
                          <div />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">{t.productManagement.unitLabel}</label>
                            <input type="text" value={entry.label} onChange={(e) => updateUnit(vi, ui, 'label', e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">{t.productManagement.unitLabelEn}</label>
                            <input type="text" value={entry.labelEn} onChange={(e) => updateUnit(vi, ui, 'labelEn', e.target.value)} dir="ltr" className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className={`flex items-center gap-4 mt-6 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>{t.common.save}</Button>
          <Link href="/admin/products"><Button type="button" variant="outline">{t.common.cancel}</Button></Link>
        </div>
      </form>
    </div>
  )
}
