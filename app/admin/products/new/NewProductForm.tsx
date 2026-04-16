'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { useLanguage } from '@/lib/LanguageContext'
import { createProduct } from '@/actions/products'

interface CategoryNode {
  id: string
  name: string
  nameEn: string | null
  _count: { products: number; children: number }
  children: CategoryNode[]
}

interface Props {
  categoryTree: CategoryNode[]
}

interface UnitEntry {
  unit: string
  label: string
  labelEn: string
  piecesPerUnit: number
  price: number
  compareAtPrice: number | null
  isDefault: boolean
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
  CARTON: { ar: 'كرتونةة', en: 'Carton', defaultPieces: 1 },
  BOX:    { ar: 'صندوق', en: 'Box', defaultPieces: 1 },
  PACK:   { ar: 'عبوة', en: 'Pack', defaultPieces: 1 },
  KG:     { ar: 'كيلو', en: 'Kilogram', defaultPieces: 1 },
  GRAM:   { ar: 'جرام', en: 'Gram', defaultPieces: 1 },
  LITER:  { ar: 'لتر', en: 'Liter', defaultPieces: 1 },
  PALLET: { ar: 'طبلية', en: 'Pallet', defaultPieces: 1 },
}

export function NewProductForm({ categoryTree }: Props) {
  const { t, dir, lang } = useLanguage()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedPath, setSelectedPath] = useState<string[]>([])
  const [units, setUnits] = useState<UnitEntry[]>([
    { unit: 'PIECE', label: 'قطعة', labelEn: 'Piece', piecesPerUnit: 1, price: 0, compareAtPrice: null, isDefault: true },
  ])

  // --- Cascading category helpers ---
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

  const finalCategoryId = selectedPath.length > 0 ? selectedPath[selectedPath.length - 1] : ''

  function addUnit() {
    setUnits([...units, { unit: 'DOZEN', label: 'دزينة', labelEn: 'Dozen', piecesPerUnit: 12, price: 0, compareAtPrice: null, isDefault: false }])
  }

  function removeUnit(index: number) {
    if (units.length <= 1) return
    const updated = units.filter((_, i) => i !== index)
    // If removed was default, make first one default
    if (!updated.some((u) => u.isDefault)) updated[0].isDefault = true
    setUnits(updated)
  }

  function updateUnit(index: number, field: keyof UnitEntry, value: string | number | boolean) {
    const updated = [...units]
    if (field === 'unit') {
      const info = UNIT_LABEL_MAP[value as string]
      updated[index] = {
        ...updated[index],
        unit: value as string,
        label: info?.ar ?? '',
        labelEn: info?.en ?? '',
        piecesPerUnit: info?.defaultPieces ?? 1,
      }
    } else if (field === 'isDefault' && value === true) {
      // Only one default
      updated.forEach((u, i) => { u.isDefault = i === index })
    } else {
      const updatedEntry = { ...updated[index], [field]: value }
      updated[index] = updatedEntry
    }
    setUnits(updated)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setFieldErrors({})

    const formData = new FormData(e.currentTarget)
    formData.set('isActive', 'true')

    // Set price and unit from default unit entry
    const defaultUnit = units.find((u) => u.isDefault) || units[0]
    formData.set('price', String(defaultUnit.price))
    formData.set('unit', defaultUnit.unit)

    // Add units as JSON
    const unitsPayload = units.map((u, i) => ({
      ...u,
      sortOrder: i,
    }))
    formData.set('units', JSON.stringify(unitsPayload))

    // DEBUG: Log what we're sending
    console.log('[NewProductForm] Units state:', JSON.stringify(units))
    console.log('[NewProductForm] Units payload:', JSON.stringify(unitsPayload))
    console.log('[NewProductForm] formData units:', formData.get('units'))
    console.log('[NewProductForm] All formData keys:', [...formData.keys()])

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
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className={`flex items-center gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <Link href="/admin/products" className="text-gray-500 hover:text-gray-700">
          <ArrowRight className={`w-5 h-5 ${dir === 'rtl' ? '' : 'rotate-180'}`} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t.productManagement.addProduct}</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">{t.productManagement.addProduct}</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Product Name AR */}
            <Input
              label={t.productManagement.productName}
              name="name"
              required
              error={fieldErrors.name?.[0]}
            />

            {/* Product Name EN */}
            <Input
              label={t.productManagement.productNameEn}
              name="nameEn"
              dir="ltr"
              error={fieldErrors.nameEn?.[0]}
            />

            {/* Description AR */}
            <Textarea
              label={t.productManagement.description}
              name="description"
              error={fieldErrors.description?.[0]}
            />

            {/* Description EN */}
            <Textarea
              label={t.productManagement.descriptionEn}
              name="descriptionEn"
              dir="ltr"
              error={fieldErrors.descriptionEn?.[0]}
            />

            {/* Category - Cascading selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.productManagement.category}</label>
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
                      <option value="">— {t.productManagement.selectCategory || 'اختر صنف'} —</option>
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

            {/* Selling Units - right after category */}
            <div className="border-t pt-4 mt-4">
              <div className={`flex items-center justify-between mb-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <h3 className="text-base font-semibold text-gray-900">{t.productManagement.sellingUnits}</h3>
                <button
                  type="button"
                  onClick={addUnit}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  {t.productManagement.addUnit}
                </button>
              </div>
              <div className="space-y-3">
                {units.map((entry, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 space-y-3 ${entry.isDefault ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200'}`}
                  >
                    <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          checked={entry.isDefault}
                          onChange={() => updateUnit(index, 'isDefault', true)}
                          className="text-blue-600"
                        />
                        <span className={entry.isDefault ? 'font-semibold text-blue-700' : 'text-gray-600'}>
                          {t.productManagement.defaultUnit}
                        </span>
                      </label>
                      {units.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeUnit(index)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title={t.productManagement.removeUnit}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Unit Type */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{t.productManagement.unitType}</label>
                        <select
                          value={entry.unit}
                          onChange={(e) => updateUnit(index, 'unit', e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                          {UNIT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Pieces per unit - shown only when unit is NOT PIECE */}
                      {entry.unit !== 'PIECE' ? (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">{t.productManagement.piecesPerUnit}</label>
                          <input
                            type="number"
                            min="1"
                            value={entry.piecesPerUnit}
                            onChange={(e) => updateUnit(index, 'piecesPerUnit', parseInt(e.target.value) || 1)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      ) : <div />}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Unit Price */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{t.productManagement.unitPrice}</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={entry.price || ''}
                          onChange={(e) => updateUnit(index, 'price', parseFloat(e.target.value) || 0)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          required
                        />
                      </div>

                      {/* Compare at Price per unit */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{t.productManagement.unitCompareAtPrice}</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={entry.compareAtPrice ?? ''}
                          onChange={(e) => updateUnit(index, 'compareAtPrice', e.target.value ? parseFloat(e.target.value) : null as unknown as number)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Label AR */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{t.productManagement.unitLabel}</label>
                        <input
                          type="text"
                          value={entry.label}
                          onChange={(e) => updateUnit(index, 'label', e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          required
                        />
                      </div>

                      {/* Label EN */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{t.productManagement.unitLabelEn}</label>
                        <input
                          type="text"
                          value={entry.labelEn}
                          onChange={(e) => updateUnit(index, 'labelEn', e.target.value)}
                          dir="ltr"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stock & Min Order */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t.productManagement.stock}
                name="stock"
                type="number"
                min="1"
                defaultValue="1"
                required
                error={fieldErrors.stock?.[0]}
              />
              <Input
                label={t.productManagement.minOrderQuantity}
                name="minOrderQuantity"
                type="number"
                min="1"
                defaultValue="1"
                required
                error={fieldErrors.minOrderQuantity?.[0]}
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.productManagement.image}</label>
              <input
                type="file"
                name="image"
                accept="image/jpeg,image/png,image/webp"
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className={`flex items-center gap-4 mt-6 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {t.productManagement.addProduct}
          </Button>
          <Link href="/admin/products">
            <Button type="button" variant="outline">{t.common.cancel}</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
