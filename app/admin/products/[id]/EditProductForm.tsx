'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
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
import { resolveProductImages } from '@/lib/upload-image-client'
import { loadDraft, clearDraft, useDraftAutosave, stripVariantFiles, hydrateVariant, type ProductDraft } from '@/lib/useProductDraft'
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
  const handlePreview = useCallback((src: string, name: string) => setLightbox({ src, name }), [])
  const imageInputRef = useRef<HTMLInputElement>(null)

  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null)

  const nameEnRef = useRef<HTMLInputElement>(null)
  const descEnRef = useRef<HTMLTextAreaElement>(null)
  const nameArRef = useRef<HTMLInputElement>(null)
  const descArRef = useRef<HTMLTextAreaElement>(null)
  const keywordsRef = useRef<HTMLTextAreaElement>(null)
  const translate = useAutoTranslate()

  // Cleanup object URL on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (mainImagePreview && mainImagePreview.startsWith('blob:')) URL.revokeObjectURL(mainImagePreview)
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

  // ---- Draft persistence (localStorage), keyed per product ----
  const DRAFT_KEY = `edit:${product.id}`
  const [pendingDraft, setPendingDraft] = useState<ProductDraft | null>(null)
  const [autosaveOn, setAutosaveOn] = useState(false)
  const [draftTick, setDraftTick] = useState(0)
  const bumpDraft = () => setDraftTick((n) => n + 1)
  // Debounced tick for high-frequency text input, so we don't re-render the
  // whole form (and the heavy VariantsEditor) on every keystroke.
  const inputBumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bumpDraftDebounced = () => {
    if (inputBumpTimer.current) clearTimeout(inputBumpTimer.current)
    inputBumpTimer.current = setTimeout(() => bumpDraft(), 400)
  }
  useEffect(() => () => { if (inputBumpTimer.current) clearTimeout(inputBumpTimer.current) }, [])

  useEffect(() => {
    const draft = loadDraft<ProductDraft>(DRAFT_KEY)
    if (draft) setPendingDraft(draft)
    else setAutosaveOn(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (autosaveOn) bumpDraft()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPath, selectedBrandId, selectedSupplierId, variants, mainImagePreview])

  useDraftAutosave<ProductDraft>(DRAFT_KEY, buildDraftSnapshot(), autosaveOn, draftTick)

  function buildDraftSnapshot(): ProductDraft {
    return {
      name: nameArRef.current?.value ?? product.name,
      nameEn: nameEnRef.current?.value ?? '',
      description: descArRef.current?.value ?? '',
      descriptionEn: descEnRef.current?.value ?? '',
      keywords: keywordsRef.current?.value ?? '',
      selectedPath,
      additionalCategoryIds: [],
      selectedBrandId,
      selectedSupplierId,
      selectedCollectionIds: [],
      selectedTagIds: [],
      variants: variants.map((v) => stripVariantFiles(v)),
      mainImageUrl: mainImagePreview && !mainImageFile ? mainImagePreview : null,
    }
  }

  function restoreDraft(draft: ProductDraft) {
    if (nameArRef.current) nameArRef.current.value = draft.name
    if (nameEnRef.current) nameEnRef.current.value = draft.nameEn
    if (descArRef.current) descArRef.current.value = draft.description
    if (descEnRef.current) descEnRef.current.value = draft.descriptionEn
    if (keywordsRef.current) keywordsRef.current.value = draft.keywords
    setSelectedPath(draft.selectedPath)
    setSelectedBrandId(draft.selectedBrandId)
    setSelectedSupplierId(draft.selectedSupplierId)
    if (draft.variants.length) setVariants(draft.variants.map((v) => hydrateVariant(v, unitTypes)))
    if (draft.mainImageUrl) setMainImagePreview(draft.mainImageUrl)
    setPendingDraft(null)
    setAutosaveOn(true)
  }

  function discardDraft() {
    clearDraft(DRAFT_KEY)
    setPendingDraft(null)
    setAutosaveOn(true)
  }

  function applyUploadedImages(resolved: { mainImageUrl: string | null; variantImageUrls: Record<string, string>; optionImageUrls: Record<string, string> }) {
    if (resolved.mainImageUrl) {
      setMainImageFile(null)
      setMainImagePreview(resolved.mainImageUrl)
    }
    setVariants((prev) =>
      prev.map((v, vi) => ({
        ...v,
        imageFile: null,
        existingImage: resolved.variantImageUrls[`variantImage_${vi}`] ?? v.existingImage,
        imagePreview: resolved.variantImageUrls[`variantImage_${vi}`] ?? v.imagePreview,
        options: v.options.map((o, oi) => ({
          ...o,
          imageFile: null,
          existingImage: resolved.optionImageUrls[`optionImage_${vi}_${oi}`] ?? o.existingImage,
          imagePreview: resolved.optionImageUrls[`optionImage_${vi}_${oi}`] ?? o.imagePreview,
        })),
      })),
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    // Guard against silently keeping the old category when the select is empty.
    // An empty categoryId is dropped server-side (partial update), which would
    // look like "the change didn't apply". Force an explicit selection instead.
    if (!finalCategoryId) {
      setError(null)
      setFieldErrors({ categoryId: [t.productManagement.selectCategory || 'اختر صنف'] })
      return
    }

    setIsSubmitting(true)
    setError(null)
    setFieldErrors({})
    // Freeze autosave for the duration of the save so a draft write can't land
    // after clearDraft() and resurrect the just-saved edits as a stale draft.
    setAutosaveOn(false)

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

    // The raw file input isn't used anymore; images go up via the API below.
    formData.delete('image')

    try {
      // 1) Upload new images individually (retried), reusing existing URLs.
      const resolved = await resolveProductImages(
        {
          mainImageFile,
          mainImageExisting: !mainImageFile ? (product.image ?? null) : null,
          variants: variants.map((v, vi) => ({
            imageFile: v.imageFile,
            existingImage: v.existingImage,
            label: v.size || `الحجم ${vi + 1}`,
            options: v.options.map((o, oi) => ({
              imageFile: o.imageFile,
              existingImage: o.existingImage,
              label: o.name || `خيار ${oi + 1}`,
            })),
          })),
        },
        (done, total) => setUploadProgress({ done, total }),
      )
      setUploadProgress(null)

      // 2) Persist uploaded URLs into state so a later retry never re-uploads.
      applyUploadedImages(resolved)

      // 3) Send only URLs (small JSON) to the save action. Only set the main
      //    image when the user actually chose a new one, so an unchanged image
      //    is left as-is by the action.
      if (mainImageFile && resolved.mainImageUrl) formData.set('image', resolved.mainImageUrl)
      formData.set('variantImageUrls', JSON.stringify(resolved.variantImageUrls))
      formData.set('optionImageUrls', JSON.stringify(resolved.optionImageUrls))

      const result = await updateProduct(product.id, formData)

      if (result.success) {
        clearDraft(DRAFT_KEY)
        router.push(listUrl)
      } else {
        setError(result.error || 'تعذّر حفظ التعديلات، حاول مجدداً')
        setFieldErrors(result.errors || {})
        setIsSubmitting(false)
        setAutosaveOn(true)
      }
    } catch (err) {
      setUploadProgress(null)
      setError(err instanceof Error ? err.message : 'فشل رفع الصور، تحقق من الاتصال وحاول مجدداً')
      setIsSubmitting(false)
      setAutosaveOn(true)
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

      {pendingDraft && (
        <div className={`flex items-center justify-between gap-4 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg mb-4 ${dir === 'rtl' ? 'flex-row-reverse text-right' : ''}`}>
          <span className="text-sm">لديك تعديلات غير محفوظة من جلسة سابقة. هل تريد استعادتها؟</span>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => restoreDraft(pendingDraft)} className="text-sm font-semibold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">استعادة</button>
            <button type="button" onClick={discardDraft} className="text-sm text-blue-700 hover:text-blue-900 px-2">تجاهل</button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 whitespace-pre-line">{error}</div>
      )}

      {uploadProgress && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg mb-4">
          <div className={`flex items-center justify-between text-sm mb-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <span>جارٍ رفع الصور…</span>
            <span>{uploadProgress.done} / {uploadProgress.total}</span>
          </div>
          <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 transition-all" style={{ width: `${uploadProgress.total ? (uploadProgress.done / uploadProgress.total) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} onInput={() => { if (autosaveOn) bumpDraftDebounced() }}>
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
              ref={keywordsRef}
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
              onPreview={handlePreview}
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
