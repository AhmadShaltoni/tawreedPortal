'use client'

import { useState, useEffect } from 'react'
import { Boxes, ChevronDown, ChevronsDownUp, ChevronsUpDown, Palette, Plus, Star, Trash2, X } from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'

export interface UnitEntry {
  unit: string
  label: string
  labelEn: string
  piecesPerUnit: number
  price: number
  wholesalePrice: number | null
  compareAtPrice: number | null
  isDefault: boolean
}

export interface VariantOption {
  name: string
  nameEn: string
  stock: number
  priceOverride: number | null
  imageFile: File | null
  imagePreview: string | null
  existingImage: string | null
}

export interface VariantEntry {
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

// Admin-managed unit type (loaded from the UnitType table via /admin/units)
export interface UnitTypeOption {
  id: string
  code: string
  name: string
  nameEn: string | null
  defaultPieces: number
}

export function createDefaultUnit(unitTypes: UnitTypeOption[]): UnitEntry {
  const first = unitTypes[0]
  return {
    unit: first?.code ?? 'PIECE',
    label: first?.name ?? 'قطعة',
    labelEn: first?.nameEn ?? 'Piece',
    piecesPerUnit: first?.defaultPieces ?? 1,
    price: 0,
    wholesalePrice: null,
    compareAtPrice: null,
    isDefault: true,
  }
}

export function createDefaultVariant(isDefault: boolean, unitTypes: UnitTypeOption[]): VariantEntry {
  return { size: '', sizeEn: '', sku: '', barcode: '', stock: 1, minOrderQuantity: 1, isDefault, imageFile: null, imagePreview: null, existingImage: null, units: [createDefaultUnit(unitTypes)], options: [] }
}

const inputCls = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
const inputSm = 'w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500'

interface Props {
  variants: VariantEntry[]
  onChange: (variants: VariantEntry[]) => void
  onPreview: (src: string, name: string) => void
  unitTypes: UnitTypeOption[]
}

export function VariantsEditor({ variants, onChange, onPreview, unitTypes }: Props) {
  const { t, dir, lang } = useLanguage()
  const rowDir = dir === 'rtl' ? 'flex-row-reverse' : ''
  // With multiple existing sizes, start collapsed so the list reads as a clean summary
  const [collapsed, setCollapsed] = useState<boolean[]>(() => variants.map(() => variants.length > 1))
  // Index of the variant pending delete confirmation (null = dialog closed)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  // Floating hover preview for flavor thumbnails (fixed-positioned to escape overflow-hidden)
  const [hoverPreview, setHoverPreview] = useState<{ src: string; name: string; x: number; y: number; below: boolean } | null>(null)

  function showHoverPreview(e: React.MouseEvent<HTMLElement>, src: string, name: string) {
    const rect = e.currentTarget.getBoundingClientRect()
    const below = rect.top < 180
    setHoverPreview({
      src,
      name,
      x: rect.left + rect.width / 2,
      y: below ? rect.bottom + 8 : rect.top - 8,
      below,
    })
  }

  useEffect(() => {
    if (confirmDelete === null) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setConfirmDelete(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirmDelete])

  const allCollapsed = variants.length > 0 && variants.every((_, i) => collapsed[i])

  function toggleCollapsed(vi: number) {
    setCollapsed((prev) => {
      const next = [...prev]
      next[vi] = !next[vi]
      return next
    })
  }

  function expandVariant(vi: number) {
    setCollapsed((prev) => {
      if (!prev[vi]) return prev
      const next = [...prev]
      next[vi] = false
      return next
    })
  }

  function toggleAll() {
    setCollapsed(variants.map(() => !allCollapsed))
  }

  function addVariant() {
    onChange([...variants, createDefaultVariant(false, unitTypes)])
    setCollapsed((prev) => [...prev, false])
  }

  function removeVariant(vi: number) {
    if (variants.length <= 1) return
    const updated = variants.filter((_, i) => i !== vi)
    if (!updated.some((v) => v.isDefault)) updated[0] = { ...updated[0], isDefault: true }
    onChange(updated)
    setCollapsed((prev) => prev.filter((_, i) => i !== vi))
  }

  function updateVariant(vi: number, field: keyof VariantEntry, value: string | number | boolean | File | null) {
    const updated = [...variants]
    if (field === 'isDefault' && value === true) {
      updated.forEach((v, i) => { updated[i] = { ...v, isDefault: i === vi } })
    } else {
      updated[vi] = { ...updated[vi], [field]: value }
    }
    onChange(updated)
  }

  function setVariantImage(vi: number, file: File | null) {
    const updated = [...variants]
    updated[vi] = {
      ...updated[vi],
      imageFile: file,
      imagePreview: file ? URL.createObjectURL(file) : updated[vi].existingImage,
      existingImage: file ? null : updated[vi].existingImage,
    }
    onChange(updated)
  }

  function clearVariantImage(vi: number) {
    const updated = [...variants]
    updated[vi] = { ...updated[vi], imageFile: null, imagePreview: null, existingImage: null }
    onChange(updated)
  }

  function addVariantOption(vi: number) {
    const updated = [...variants]
    updated[vi] = { ...updated[vi], options: [...updated[vi].options, { name: '', nameEn: '', stock: 0, priceOverride: null, imageFile: null, imagePreview: null, existingImage: null }] }
    onChange(updated)
  }

  function removeVariantOption(vi: number, oi: number) {
    const updated = [...variants]
    updated[vi] = { ...updated[vi], options: updated[vi].options.filter((_, i) => i !== oi) }
    onChange(updated)
  }

  function updateVariantOption(vi: number, oi: number, field: keyof VariantOption, value: string | number | null) {
    const updated = [...variants]
    const options = [...updated[vi].options]
    options[oi] = { ...options[oi], [field]: value }
    updated[vi] = { ...updated[vi], options }
    onChange(updated)
  }

  function setOptionImage(vi: number, oi: number, file: File | null) {
    const updated = [...variants]
    const options = [...updated[vi].options]
    options[oi] = {
      ...options[oi],
      imageFile: file,
      imagePreview: file ? URL.createObjectURL(file) : options[oi].existingImage,
      existingImage: file ? null : options[oi].existingImage,
    }
    updated[vi] = { ...updated[vi], options }
    onChange(updated)
  }

  function clearOptionImage(vi: number, oi: number) {
    const updated = [...variants]
    const options = [...updated[vi].options]
    options[oi] = { ...options[oi], imageFile: null, imagePreview: null, existingImage: null }
    updated[vi] = { ...updated[vi], options }
    onChange(updated)
  }

  function addUnit(vi: number) {
    const updated = [...variants]
    // Prefer the first unit type not already used in this variant
    const usedCodes = new Set(updated[vi].units.map((u) => u.unit))
    const nextType = unitTypes.find((ut) => !usedCodes.has(ut.code)) ?? unitTypes[0]
    updated[vi] = {
      ...updated[vi],
      units: [...updated[vi].units, {
        unit: nextType?.code ?? 'PIECE',
        label: nextType?.name ?? '',
        labelEn: nextType?.nameEn ?? '',
        piecesPerUnit: nextType?.defaultPieces ?? 1,
        price: 0,
        wholesalePrice: null,
        compareAtPrice: null,
        isDefault: false,
      }],
    }
    onChange(updated)
  }

  function removeUnit(vi: number, ui: number) {
    const updated = [...variants]
    const units = updated[vi].units.filter((_, i) => i !== ui)
    if (!units.some((u) => u.isDefault) && units.length > 0) units[0] = { ...units[0], isDefault: true }
    updated[vi] = { ...updated[vi], units }
    onChange(updated)
  }

  function updateUnit(vi: number, ui: number, field: keyof UnitEntry, value: string | number | boolean) {
    const updated = [...variants]
    const units = [...updated[vi].units]
    if (field === 'unit') {
      const info = unitTypes.find((ut) => ut.code === value)
      units[ui] = { ...units[ui], unit: value as string, label: info?.name ?? '', labelEn: info?.nameEn ?? '', piecesPerUnit: info?.defaultPieces ?? 1 }
    } else if (field === 'isDefault' && value === true) {
      units.forEach((u, i) => { units[i] = { ...u, isDefault: i === ui } })
    } else {
      units[ui] = { ...units[ui], [field]: value }
    }
    updated[vi] = { ...updated[vi], units }
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      {variants.length > 1 && (
        <div className={`flex ${dir === 'rtl' ? 'justify-start' : 'justify-end'}`}>
          <button type="button" onClick={toggleAll} className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 font-medium">
            {allCollapsed ? <ChevronsUpDown className="w-3.5 h-3.5" /> : <ChevronsDownUp className="w-3.5 h-3.5" />}
            {allCollapsed ? 'توسيع الكل' : 'طي الكل'}
          </button>
        </div>
      )}

      {variants.map((variant, vi) => {
        const isCollapsed = !!collapsed[vi]
        const variantImage = variant.imagePreview || variant.existingImage
        return (
          <div key={vi} className={`rounded-xl border-2 overflow-hidden ${variant.isDefault ? 'border-blue-400 shadow-sm' : 'border-gray-200'}`}>
            {/* ===== Variant header (always visible summary) ===== */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => toggleCollapsed(vi)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCollapsed(vi) } }}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none transition-colors ${variant.isDefault ? 'bg-blue-50 hover:bg-blue-100/70' : 'bg-gray-50 hover:bg-gray-100'} ${rowDir}`}
            >
              <span className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${variant.isDefault ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-700'}`}>
                {vi + 1}
              </span>

              {variantImage && (
                <img src={variantImage} alt="" className="w-9 h-9 rounded-lg object-cover border border-gray-200 shrink-0" />
              )}

              <div className={`min-w-0 flex-1 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                <div className={`flex items-center gap-2 ${rowDir}`}>
                  <span className={`text-sm font-semibold truncate ${variant.size ? 'text-gray-900' : 'text-gray-400'}`}>
                    {variant.size || `حجم ${vi + 1} — بدون اسم`}
                  </span>
                  {variant.isDefault && (
                    <span className="text-[10px] font-semibold bg-blue-600 text-white px-2 py-0.5 rounded-full shrink-0">{t.productManagement.defaultVariant}</span>
                  )}
                </div>
                <div className={`flex items-center gap-1.5 mt-1 ${rowDir}`}>
                  <span className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full ${variant.options.length > 0 ? 'bg-violet-100 text-violet-800' : 'bg-gray-100 text-gray-400'}`}>
                    <Palette className="w-3 h-3" />
                    {variant.options.length > 0 ? `${variant.options.length} نكهة` : 'بدون نكهات'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    <Boxes className="w-3 h-3" />
                    {variant.units.length} {variant.units.length === 1 ? 'وحدة بيع' : 'وحدات بيع'}
                  </span>
                </div>

                {/* Flavor thumbnails strip */}
                {variant.options.length > 0 && (
                  <div className={`flex items-start gap-2 mt-2 flex-wrap ${rowDir}`}>
                    {variant.options.map((option, oi) => {
                      const optionImage = option.imagePreview || option.existingImage
                      const optionName = option.name || `نكهة ${oi + 1}`
                      return optionImage ? (
                        <button
                          key={oi}
                          type="button"
                          title={`عرض صورة ${optionName}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            setHoverPreview(null)
                            onPreview(optionImage, `صورة-${optionName}`)
                          }}
                          onMouseEnter={(e) => showHoverPreview(e, optionImage, optionName)}
                          onMouseLeave={() => setHoverPreview(null)}
                          className="flex flex-col items-center gap-0.5 w-11 shrink-0 cursor-zoom-in group"
                        >
                          <img
                            src={optionImage}
                            alt={optionName}
                            className="w-9 h-9 rounded-lg object-cover border border-violet-200 transition-all group-hover:ring-2 group-hover:ring-violet-400 group-hover:scale-105"
                          />
                          <span className="w-full text-[9px] leading-tight text-gray-500 text-center truncate">{optionName}</span>
                        </button>
                      ) : (
                        <div key={oi} className="flex flex-col items-center gap-0.5 w-11 shrink-0">
                          <span className="w-9 h-9 rounded-lg bg-violet-50 border border-dashed border-violet-300 flex items-center justify-center">
                            <Palette className="w-4 h-4 text-violet-400" />
                          </span>
                          <span className="w-full text-[9px] leading-tight text-gray-500 text-center truncate">{optionName}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {!variant.isDefault && (
                <button
                  type="button"
                  title="تعيين كحجم افتراضي"
                  onClick={(e) => { e.stopPropagation(); updateVariant(vi, 'isDefault', true) }}
                  className="p-1.5 text-gray-400 hover:text-blue-600 shrink-0"
                >
                  <Star className="w-4 h-4" />
                </button>
              )}
              {variants.length > 1 && (
                <button
                  type="button"
                  title={t.productManagement.removeVariant}
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(vi) }}
                  className="p-1.5 text-red-400 hover:text-red-600 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
            </div>

            {/* ===== Variant body ===== */}
            <div
              className={`p-4 space-y-4 bg-white border-t ${variant.isDefault ? 'border-blue-100' : 'border-gray-100'} ${isCollapsed ? 'hidden' : ''}`}
              onInvalidCapture={() => expandVariant(vi)}
            >
              {/* --- Size basic info --- */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t.productManagement.variantSize} (عربي) *</label>
                  <input type="text" value={variant.size} onChange={(e) => updateVariant(vi, 'size', e.target.value)} placeholder="مثال: 1 لتر" className={inputCls} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t.productManagement.variantSizeEn}</label>
                  <input type="text" value={variant.sizeEn} onChange={(e) => updateVariant(vi, 'sizeEn', e.target.value)} placeholder="e.g., 1L" dir="ltr" className={inputCls} />
                </div>
              </div>

              {/* Variant image */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">صورة الحجم (اختياري)</label>
                <div className={`flex items-center gap-3 ${rowDir}`}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setVariantImage(vi, e.target.files?.[0] || null)}
                    className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {variantImage && (
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        title="عرض الصورة"
                        onClick={() => onPreview(variantImage, `صورة-${variant.size || `الحجم-${vi + 1}`}`)}
                        className="block cursor-zoom-in"
                      >
                        <img src={variantImage} alt="" className="w-12 h-12 object-cover rounded-lg border hover:opacity-80 transition-opacity" />
                      </button>
                      <button
                        type="button"
                        onClick={() => clearVariantImage(vi)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px]"
                      >×</button>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 mt-1">صورة خاصة بهذا الحجم (مثال: صورة علبة زجاج مقابل حديد)</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t.productManagement.sku}</label>
                  <input type="text" value={variant.sku} onChange={(e) => updateVariant(vi, 'sku', e.target.value)} dir="ltr" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t.productManagement.barcode}</label>
                  <input type="text" value={variant.barcode} onChange={(e) => updateVariant(vi, 'barcode', e.target.value)} dir="ltr" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t.productManagement.minOrderQuantity} *</label>
                  <input type="number" min="1" value={variant.minOrderQuantity} onChange={(e) => updateVariant(vi, 'minOrderQuantity', parseInt(e.target.value) || 1)} className={inputCls} required />
                </div>
              </div>

              {variant.options.length === 0 ? (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t.productManagement.stock} (إجمالي) *</label>
                  <input type="number" min="0" value={variant.stock} onChange={(e) => updateVariant(vi, 'stock', parseInt(e.target.value) || 0)} className={inputCls} required />
                </div>
              ) : (
                <p className="text-[11px] text-violet-800 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
                  المخزون يُدار لكل نكهة على حدة في قسم النكهات أدناه
                </p>
              )}

              {/* ===== Flavors panel (violet) ===== */}
              <div className="rounded-xl border border-violet-200 overflow-hidden">
                <div className={`flex items-center justify-between px-3 py-2 bg-violet-50 border-b border-violet-200 ${rowDir}`}>
                  <div className={`flex items-center gap-2 ${rowDir}`}>
                    <Palette className="w-4 h-4 text-violet-600" />
                    <h4 className="text-sm font-semibold text-violet-900">النكهات / الخيارات</h4>
                    {variant.options.length > 0 && (
                      <span className="text-[11px] font-semibold bg-violet-200 text-violet-800 px-1.5 py-0.5 rounded-full">{variant.options.length}</span>
                    )}
                  </div>
                  <span className="text-[11px] text-violet-600">اختياري</span>
                </div>

                <div className="p-3 space-y-3 bg-violet-50/30">
                  {variant.options.length === 0 && (
                    <p className="text-xs text-gray-500">لا توجد نكهات لهذا الحجم. أضف نكهات متعددة (مثل: أحمر، أخضر، فراولة...) وسيُدار المخزون لكل نكهة.</p>
                  )}

                  {variant.options.map((option, oi) => {
                    const optionImage = option.imagePreview || option.existingImage
                    return (
                      <div key={oi} className={`rounded-lg border border-violet-200 bg-white overflow-hidden ${dir === 'rtl' ? 'border-r-4 border-r-violet-400' : 'border-l-4 border-l-violet-400'}`}>
                        {/* Flavor header */}
                        <div className={`flex items-center gap-2 px-3 py-2 bg-violet-50/60 border-b border-violet-100 ${rowDir}`}>
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold shrink-0">{oi + 1}</span>
                          {optionImage && (
                            <img src={optionImage} alt="" className="w-6 h-6 rounded object-cover border border-violet-200 shrink-0" />
                          )}
                          <span className={`text-xs font-semibold flex-1 min-w-0 truncate ${option.name ? 'text-gray-800' : 'text-gray-400'} ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                            {option.name || `نكهة ${oi + 1} — بدون اسم`}
                          </span>
                          <button type="button" title="حذف النكهة" onClick={() => removeVariantOption(vi, oi)} className="p-1 text-red-400 hover:text-red-600 shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="p-3 space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">اسم النكهة (عربي) *</label>
                              <input type="text" value={option.name} onChange={(e) => updateVariantOption(vi, oi, 'name', e.target.value)} placeholder="مثال: أحمر" className={inputSm} required />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">اسم النكهة (إنجليزي)</label>
                              <input type="text" value={option.nameEn} onChange={(e) => updateVariantOption(vi, oi, 'nameEn', e.target.value)} placeholder="e.g., Red" dir="ltr" className={inputSm} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">المخزون المتاح *</label>
                              <input type="number" min="0" value={option.stock} onChange={(e) => updateVariantOption(vi, oi, 'stock', parseInt(e.target.value) || 0)} className={inputSm} required />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">إضافة سعر (اختياري)</label>
                              <input type="number" step="0.01" min="0" value={option.priceOverride ?? ''} onChange={(e) => updateVariantOption(vi, oi, 'priceOverride', e.target.value ? parseFloat(e.target.value) : null)} placeholder="مثال: 2.5" className={inputSm} />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">صورة النكهة (اختياري)</label>
                            <div className={`flex items-center gap-2 ${rowDir}`}>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) => setOptionImage(vi, oi, e.target.files?.[0] || null)}
                                className="w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                              />
                              {optionImage && (
                                <div className="relative shrink-0">
                                  <button
                                    type="button"
                                    title="عرض الصورة"
                                    onClick={() => onPreview(optionImage, `صورة-${option.name || `النكهة-${oi + 1}`}`)}
                                    className="block cursor-zoom-in"
                                  >
                                    <img src={optionImage} alt="" className="w-10 h-10 object-cover rounded border hover:opacity-80 transition-opacity" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => clearOptionImage(vi, oi)}
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px]"
                                  >×</button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  <button
                    type="button"
                    onClick={() => addVariantOption(vi)}
                    className="w-full flex items-center justify-center gap-1.5 border-2 border-dashed border-violet-300 rounded-lg py-2 text-xs font-medium text-violet-700 hover:bg-violet-100/60 hover:border-violet-400 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    إضافة نكهة
                  </button>
                </div>
              </div>

              {/* ===== Selling units panel (emerald) ===== */}
              <div className="rounded-xl border border-emerald-200 overflow-hidden">
                <div className={`flex items-center justify-between px-3 py-2 bg-emerald-50 border-b border-emerald-200 ${rowDir}`}>
                  <div className={`flex items-center gap-2 ${rowDir}`}>
                    <Boxes className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-sm font-semibold text-emerald-900">{t.productManagement.sellingUnits}</h4>
                    <span className="text-[11px] font-semibold bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded-full">{variant.units.length}</span>
                  </div>
                </div>

                <div className="p-3 space-y-3 bg-emerald-50/30">
                  {variant.units.map((entry, ui) => (
                    <div key={ui} className={`rounded-lg bg-white overflow-hidden border ${entry.isDefault ? 'border-emerald-300' : 'border-emerald-100'} ${dir === 'rtl' ? 'border-r-4' : 'border-l-4'} ${dir === 'rtl' ? (entry.isDefault ? 'border-r-emerald-500' : 'border-r-emerald-200') : (entry.isDefault ? 'border-l-emerald-500' : 'border-l-emerald-200')}`}>
                      {/* Unit header */}
                      <div className={`flex items-center gap-2 px-3 py-2 border-b border-emerald-100 ${entry.isDefault ? 'bg-emerald-50' : 'bg-gray-50/60'} ${rowDir}`}>
                        <label className={`flex items-center gap-2 text-xs cursor-pointer flex-1 min-w-0 ${rowDir}`}>
                          <input type="radio" checked={entry.isDefault} onChange={() => updateUnit(vi, ui, 'isDefault', true)} className="text-emerald-600 shrink-0" />
                          <span className={`truncate ${entry.isDefault ? 'font-semibold text-emerald-700' : 'text-gray-600'}`}>
                            {entry.label || `وحدة ${ui + 1}`}
                            {entry.piecesPerUnit > 1 ? ` (${entry.piecesPerUnit} قطعة)` : ''}
                            {entry.price > 0 ? ` — ${entry.price} د.أ` : ''}
                          </span>
                          {entry.isDefault && (
                            <span className="text-[10px] font-semibold bg-emerald-600 text-white px-1.5 py-0.5 rounded-full shrink-0">{t.productManagement.defaultUnit}</span>
                          )}
                        </label>
                        {variant.units.length > 1 && (
                          <button type="button" title={t.productManagement.removeUnit} onClick={() => removeUnit(vi, ui)} className="p-1 text-red-400 hover:text-red-600 shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="p-3 space-y-2">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">{t.productManagement.unitType}</label>
                            <select value={entry.unit} onChange={(e) => updateUnit(vi, ui, 'unit', e.target.value)} className={inputSm}>
                              {!unitTypes.some((ut) => ut.code === entry.unit) && (
                                <option value={entry.unit}>{entry.label || entry.unit}</option>
                              )}
                              {unitTypes.map((ut) => (
                                <option key={ut.code} value={ut.code}>
                                  {lang === 'ar' ? ut.name : (ut.nameEn || ut.name)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">{t.productManagement.piecesPerUnit}</label>
                            <input type="number" min="1" value={entry.piecesPerUnit} onChange={(e) => updateUnit(vi, ui, 'piecesPerUnit', parseInt(e.target.value) || 1)} className={inputSm} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">{t.productManagement.unitPrice} *</label>
                            <input type="number" step="0.01" min="0" value={entry.price || ''} onChange={(e) => updateUnit(vi, ui, 'price', parseFloat(e.target.value) || 0)} className={inputSm} required />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">{t.productManagement.unitWholesalePrice}</label>
                            <input type="number" step="0.01" min="0" value={entry.wholesalePrice ?? ''} onChange={(e) => updateUnit(vi, ui, 'wholesalePrice', e.target.value ? parseFloat(e.target.value) : null as unknown as number)} placeholder="اختياري" className={inputSm} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">{t.productManagement.unitCompareAtPrice}</label>
                            <input type="number" step="0.01" min="0" value={entry.compareAtPrice ?? ''} onChange={(e) => updateUnit(vi, ui, 'compareAtPrice', e.target.value ? parseFloat(e.target.value) : null as unknown as number)} className={inputSm} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">{t.productManagement.unitLabel} (عربي)</label>
                            <input type="text" value={entry.label} onChange={(e) => updateUnit(vi, ui, 'label', e.target.value)} className={inputSm} required />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">{t.productManagement.unitLabelEn}</label>
                            <input type="text" value={entry.labelEn} onChange={(e) => updateUnit(vi, ui, 'labelEn', e.target.value)} dir="ltr" className={inputSm} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => addUnit(vi)}
                    className="w-full flex items-center justify-center gap-1.5 border-2 border-dashed border-emerald-300 rounded-lg py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100/60 hover:border-emerald-400 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t.productManagement.addUnit}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {/* Add new size */}
      <button
        type="button"
        onClick={addVariant}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-blue-300 rounded-xl py-3 text-sm font-medium text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-colors"
      >
        <Plus className="w-4 h-4" />
        {t.productManagement.addVariant}
      </button>

      {/* Floating hover preview for flavor thumbnails */}
      {hoverPreview && (
        <div
          className={`fixed z-[60] pointer-events-none -translate-x-1/2 ${hoverPreview.below ? '' : '-translate-y-full'}`}
          style={{ left: hoverPreview.x, top: hoverPreview.y }}
        >
          <div className="bg-white rounded-xl border border-gray-200 shadow-xl p-1.5">
            <img src={hoverPreview.src} alt={hoverPreview.name} className="w-36 h-36 object-cover rounded-lg" />
            <p className="text-[11px] font-medium text-gray-700 text-center mt-1 max-w-36 truncate">{hoverPreview.name}</p>
          </div>
        </div>
      )}

      {/* Delete size confirmation dialog */}
      {confirmDelete !== null && variants[confirmDelete] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center gap-3 ${rowDir}`}>
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 text-red-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </span>
              <h3 className={`text-base font-bold text-gray-900 flex-1 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                {t.productManagement.removeVariant}
              </h3>
            </div>
            <p className={`text-sm text-gray-600 mt-3 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
              هل أنت متأكد من حذف الحجم{' '}
              <span className="font-semibold text-gray-900">
                {variants[confirmDelete].size ? `«${variants[confirmDelete].size}»` : `رقم ${confirmDelete + 1}`}
              </span>
              ؟ سيتم حذف جميع النكهات ووحدات البيع الخاصة به.
            </p>
            <p className={`text-[11px] text-gray-400 mt-1.5 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
              لن يُطبَّق الحذف نهائياً إلا بعد حفظ المنتج.
            </p>
            <div className={`flex items-center gap-2 mt-5 ${dir === 'rtl' ? 'flex-row-reverse' : 'justify-end'}`}>
              <button
                type="button"
                onClick={() => { removeVariant(confirmDelete); setConfirmDelete(null) }}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
              >
                {t.productManagement.removeVariant}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                {t.common.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
