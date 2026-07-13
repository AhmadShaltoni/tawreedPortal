'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Plus, Search, GripVertical, Trash2, X, FileDown, ArrowUpToLine, RotateCcw, FolderInput } from 'lucide-react'
import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useLanguage } from '@/lib/LanguageContext'
import { formatCurrency } from '@/lib/utils'
import { toggleProductActive, deleteProduct, reorderProducts, moveProductsToTop, moveProductsToPosition, moveProductsToCategory } from '@/actions/products'
import { getAllProductsForExport } from '@/actions/export-products'
import { generateProductsPDF, type ProductExportRow } from '@/lib/pdf-products'

interface CategoryNode {
  id: string
  name: string
  nameEn: string | null
  _count: { products: number; children: number }
  children: CategoryNode[]
}

interface Props {
  products: Array<{
    id: string
    name: string
    nameEn: string | null
    image: string | null
    isActive: boolean
    sortOrder: number
    category: { id: string; name: string; nameEn: string | null; parent?: { id: string; name: string; nameEn: string | null } | null }
    supplier: { id: string; name: string; nameEn: string | null } | null
    variants: Array<{
      id: string
      size: string
      sizeEn: string | null
      stock: number
      isDefault: boolean
      units: Array<{
        price: number
        isDefault: boolean
      }>
    }>
  }>
  categories: Array<{ id: string; name: string; nameEn: string | null; slug: string }>
  categoryTree: CategoryNode[]
  suppliers: Array<{ id: string; name: string; nameEn: string | null; isDefault: boolean }>
  total: number
  pages: number
  currentPage: number
  currentCategory?: string
  currentSearch?: string
  currentSupplier?: string
}

function flattenCategoryTree(nodes: CategoryNode[], lang: string, prefix = ''): { value: string; label: string }[] {
  const result: { value: string; label: string }[] = []
  for (const node of nodes) {
    const displayLabel = lang === 'ar' ? node.name : (node.nameEn || node.name)
    const fullLabel = prefix ? `${prefix} > ${displayLabel}` : displayLabel
    result.push({ value: node.id, label: fullLabel })
    if (node.children.length > 0) {
      result.push(...flattenCategoryTree(node.children, lang, fullLabel))
    }
  }
  return result
}

export function ProductListClient({
  products,
  categories,
  categoryTree,
  suppliers,
  total,
  pages,
  currentPage,
  currentCategory,
  currentSearch,
  currentSupplier,
}: Props) {
  const { t, dir, lang } = useLanguage()
  const router = useRouter()
  const [search, setSearch] = useState(currentSearch || '')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [orderedProducts, setOrderedProducts] = useState(products)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [movingToTop, setMovingToTop] = useState(false)
  const [targetPosition, setTargetPosition] = useState('')
  const [movingToPosition, setMovingToPosition] = useState(false)
  const [showMoveToCategoryModal, setShowMoveToCategoryModal] = useState(false)
  const [targetCategoryId, setTargetCategoryId] = useState('')
  const [movingToCategory, setMovingToCategory] = useState(false)
  const dragCounter = useRef<Record<string, number>>({})

  // Preserve current list state (page/filters) so edit pages can return here
  const listParams = new URLSearchParams()
  if (currentPage > 1) listParams.set('page', String(currentPage))
  if (currentCategory) listParams.set('category', currentCategory)
  if (currentSearch) listParams.set('search', currentSearch)
  if (currentSupplier) listParams.set('supplier', currentSupplier)
  const listQuery = listParams.toString()
  const editHref = (id: string) => `/admin/products/${id}${listQuery ? `?${listQuery}` : ''}`

  // Sync when products prop changes (e.g. after server refresh)
  if (products !== orderedProducts && !draggedId) {
    const productIds = products.map(p => p.id).join(',')
    const orderedIds = orderedProducts.map(p => p.id).join(',')
    if (productIds !== orderedIds || products.length !== orderedProducts.length) {
      setOrderedProducts(products)
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id)
      }
      return [...prev, id]
    })
  }

  async function handleMoveToTop() {
    if (selectedIds.length === 0) return
    setMovingToTop(true)
    await moveProductsToTop(selectedIds)
    setSelectedIds([])
    setMovingToTop(false)
    setTargetPosition('')
    router.push('/admin/products')
    router.refresh()
  }

  async function handleMoveToPosition() {
    const pos = parseInt(targetPosition)
    if (!pos || pos < 1 || selectedIds.length === 0) return
    setMovingToPosition(true)
    await moveProductsToPosition(selectedIds, pos)
    setSelectedIds([])
    setTargetPosition('')
    setMovingToPosition(false)
    router.push('/admin/products')
    router.refresh()
  }

  async function handleMoveToCategory() {
    if (!targetCategoryId || selectedIds.length === 0) return
    setMovingToCategory(true)
    await moveProductsToCategory(selectedIds, targetCategoryId)
    setSelectedIds([])
    setTargetCategoryId('')
    setMovingToCategory(false)
    setShowMoveToCategoryModal(false)
    router.refresh()
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (currentCategory) params.set('category', currentCategory)
    if (currentSupplier) params.set('supplier', currentSupplier)
    router.push(`/admin/products?${params.toString()}`)
  }

  async function handleExportPDF(includeWholesale: boolean) {
    setShowExportMenu(false)
    setExporting(true)
    try {
      const allProducts = await getAllProductsForExport({
        categoryId: currentCategory,
        supplierId: currentSupplier,
        search: currentSearch,
        includeDescendants: true,
      })

      const rows: ProductExportRow[] = []

      for (const p of allProducts) {
        if (p.variants.length === 0) {
          // Product with no variants - single row
          rows.push({
            name: p.name,
            image: p.image,
            stock: 0,
            unitInfo: '',
            wholesalePrice: '',
            appPrice: '',
          })
        } else {
          // Each variant is a separate row
          for (const v of p.variants) {
            const defaultUnit = v.units.find((u) => u.isDefault) || v.units[0]
            const variantName = v.size
              ? `${p.name} (${v.size})`
              : p.name

            const unitLabel = defaultUnit?.label && defaultUnit?.piecesPerUnit
              ? `${defaultUnit.label} (${defaultUnit.piecesPerUnit})`
              : defaultUnit?.label || ''

            rows.push({
              name: variantName,
              // Show each variant's own image so different sizes can display
              // different product shapes; fall back to the main product image.
              image: v.image || p.image,
              stock: v.stock,
              unitInfo: unitLabel,
              wholesalePrice: includeWholesale && defaultUnit?.wholesalePrice != null
                ? formatCurrency(defaultUnit.wholesalePrice)
                : '',
              appPrice: defaultUnit?.price != null
                ? formatCurrency(defaultUnit.price)
                : '',
            })
          }
        }
      }

      await generateProductsPDF(rows)
    } catch (error) {
      console.error('PDF export failed:', error)
    } finally {
      setExporting(false)
    }
  }

  function handleCategoryFilter(categoryId: string) {
    const params = new URLSearchParams()
    if (categoryId) params.set('category', categoryId)
    if (currentSearch) params.set('search', currentSearch)
    if (currentSupplier) params.set('supplier', currentSupplier)
    router.push(`/admin/products?${params.toString()}`)
  }

  function handleSupplierFilter(supplierId: string) {
    const params = new URLSearchParams()
    if (supplierId) params.set('supplier', supplierId)
    if (currentCategory) params.set('category', currentCategory)
    if (currentSearch) params.set('search', currentSearch)
    router.push(`/admin/products?${params.toString()}`)
  }

  async function handleToggleActive(id: string) {
    await toggleProductActive(id)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await deleteProduct(deleteTarget.id)
    setDeleteTarget(null)
    setDeleting(false)
    router.refresh()
  }

  const handleDragStart = useCallback((e: React.DragEvent<HTMLTableRowElement>, id: string) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
    // Make the drag image slightly transparent
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '0.5'
    }
  }, [])

  const handleDragEnd = useCallback((e: React.DragEvent<HTMLTableRowElement>) => {
    e.currentTarget.style.opacity = '1'
    setDraggedId(null)
    setDragOverId(null)
    dragCounter.current = {}
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLTableRowElement>, id: string) => {
    e.preventDefault()
    dragCounter.current[id] = (dragCounter.current[id] || 0) + 1
    setDragOverId(id)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLTableRowElement>, id: string) => {
    dragCounter.current[id] = (dragCounter.current[id] || 0) - 1
    if (dragCounter.current[id] <= 0) {
      dragCounter.current[id] = 0
      setDragOverId((prev) => (prev === id ? null : prev))
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLTableRowElement>, targetId: string) => {
    e.preventDefault()
    const sourceId = e.dataTransfer.getData('text/plain')
    if (!sourceId || sourceId === targetId) {
      setDraggedId(null)
      setDragOverId(null)
      dragCounter.current = {}
      return
    }

    // Reorder locally
    const newOrder = [...orderedProducts]
    const sourceIndex = newOrder.findIndex(p => p.id === sourceId)
    const targetIndex = newOrder.findIndex(p => p.id === targetId)
    if (sourceIndex === -1 || targetIndex === -1) return

    const movedProduct = newOrder[sourceIndex]
    const targetProduct = newOrder[targetIndex]
    const direction = sourceIndex > targetIndex ? 'up' : 'down'

    const [moved] = newOrder.splice(sourceIndex, 1)
    newOrder.splice(targetIndex, 0, moved)
    setOrderedProducts(newOrder)
    setDraggedId(null)
    setDragOverId(null)
    dragCounter.current = {}

    // Save to server - only move the dragged product to target's sortOrder
    setSaving(true)
    await reorderProducts(movedProduct.id, targetProduct.sortOrder, direction)
    setSaving(false)
    router.refresh()
  }, [orderedProducts, router])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <h1 className="text-2xl font-bold text-gray-900">{t.productManagement.title}</h1>
        <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowExportMenu((v) => !v)}
              disabled={exporting}
              className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
            >
              <FileDown className="w-4 h-4" />
              {exporting ? 'جاري التصدير...' : 'تصدير PDF'}
            </Button>
            {showExportMenu && !exporting && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowExportMenu(false)}
                />
                <div className={`absolute top-full mt-1 z-20 min-w-[220px] rounded-lg border border-gray-200 bg-white shadow-lg py-1 ${dir === 'rtl' ? 'right-0' : 'left-0'}`}>
                  <button
                    type="button"
                    onClick={() => handleExportPDF(true)}
                    className="block w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    تصدير مع سعر الجملة
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportPDF(false)}
                    className="block w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    تصدير بدون سعر الجملة
                  </button>
                </div>
              </>
            )}
          </div>
          <Link href="/admin/products/new">
            <Button variant="primary" className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <Plus className="w-4 h-4" />
              {t.productManagement.addProduct}
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className={`flex flex-col sm:flex-row gap-4 ${dir === 'rtl' ? 'sm:flex-row-reverse' : ''}`}>
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 ${dir === 'rtl' ? 'right-3' : 'left-3'}`} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.common.search}
                  className={`w-full border border-gray-300 rounded-lg py-2 ${dir === 'rtl' ? 'pr-10 pl-3' : 'pl-10 pr-3'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
              </div>
            </form>

            {/* Category filter - hierarchical */}
            <select
              value={currentCategory || ''}
              onChange={(e) => handleCategoryFilter(e.target.value)}
              className="border border-gray-300 rounded-lg py-2 px-3 min-w-[200px]"
            >
              <option value="">{t.productManagement.allCategories}</option>
              {flattenCategoryTree(categoryTree, lang).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Supplier filter */}
            {suppliers.length > 0 && (
              <select
                value={currentSupplier || ''}
                onChange={(e) => handleSupplierFilter(e.target.value)}
                className="border border-gray-300 rounded-lg py-2 px-3 min-w-[160px]"
              >
                <option value="">{t.supplierManagement?.allSuppliers || 'جميع الموردين'}</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {lang === 'ar' ? s.name : (s.nameEn || s.name)}
                  </option>
                ))}
              </select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selection Toolbar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-0 z-40 bg-blue-50 border border-blue-200 rounded-xl p-3 shadow-lg">
          <div className={`flex items-center justify-between flex-wrap gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <span className="bg-blue-600 text-white text-sm font-bold rounded-full w-7 h-7 flex items-center justify-center">
                {selectedIds.length}
              </span>
              <span className="text-sm font-medium text-blue-900">
                {lang === 'ar' ? 'منتج محدد' : 'selected'}
              </span>
            </div>
            <div className={`flex items-center gap-2 flex-wrap ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <Button
                variant="primary"
                size="sm"
                onClick={handleMoveToTop}
                disabled={movingToTop || movingToPosition}
                className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
              >
                <ArrowUpToLine className="w-4 h-4" />
                {movingToTop
                  ? (lang === 'ar' ? 'جاري النقل...' : 'Moving...')
                  : (lang === 'ar' ? 'نقل للبداية' : 'Move to top')
                }
              </Button>
              <div className={`flex items-center gap-1.5 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <span className="text-sm text-blue-800 whitespace-nowrap">
                  {selectedIds.length === 1
                    ? (lang === 'ar' ? 'نقل ليصبح رقم' : 'Move to #')
                    : (lang === 'ar' ? 'نقل ليبدأ من رقم' : 'Start from #')
                  }
                </span>
                <input
                  type="number"
                  min="1"
                  value={targetPosition}
                  onChange={(e) => setTargetPosition(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleMoveToPosition() }}
                  placeholder="#"
                  className="w-16 border border-blue-300 rounded-lg px-2 py-1 text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleMoveToPosition}
                  disabled={movingToPosition || movingToTop || !targetPosition}
                >
                  {movingToPosition ? '...' : (lang === 'ar' ? 'نقل' : 'Go')}
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSelectedIds([]); setTargetPosition('') }}
                className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
              >
                <RotateCcw className="w-4 h-4" />
                {lang === 'ar' ? 'إلغاء' : 'Clear'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMoveToCategoryModal(true)}
                className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
              >
                <FolderInput className="w-4 h-4" />
                {lang === 'ar' ? 'نقل لصنف' : 'Move to category'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Products Table */}
      <Card>
        <CardContent>
          {products.length === 0 ? (
            <p className="text-center text-gray-500 py-12">{t.productManagement.noProducts}</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                {saving && (
                  <div className={`text-xs text-blue-600 mb-2 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                    {t.common.loading}
                  </div>
                )}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className={`pb-3 font-medium text-gray-500 w-8 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}></th>
                      <th className={`pb-3 font-medium text-gray-500 w-10 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}></th>
                      <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.productManagement.image}</th>
                      <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.productManagement.productName}</th>
                      <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.productManagement.category}</th>
                      <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.supplierManagement?.supplier || 'المورد'}</th>
                      <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.productManagement.variants}</th>
                      <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.productManagement.price}</th>
                      <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.productManagement.stock}</th>
                      <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.userManagement.status}</th>
                      <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.common.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderedProducts.map((product) => {
                      const selectionIndex = selectedIds.indexOf(product.id)
                      const isSelected = selectionIndex !== -1
                      return (
                      <tr
                        key={product.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, product.id)}
                        onDragEnd={handleDragEnd}
                        onDragEnter={(e) => handleDragEnter(e, product.id)}
                        onDragLeave={(e) => handleDragLeave(e, product.id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, product.id)}
                        className={`border-b border-gray-100 transition-colors ${
                          draggedId === product.id
                            ? 'opacity-50'
                            : dragOverId === product.id && draggedId
                              ? 'bg-blue-50 border-t-2 border-t-blue-400'
                              : isSelected
                                ? 'bg-blue-50/50'
                                : product.variants.reduce((s, v) => s + v.stock, 0) <= 0
                                  ? 'bg-red-50 hover:bg-red-100'
                                  : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="py-3">
                          <button
                            type="button"
                            onClick={() => toggleSelect(product.id)}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-gray-300 text-transparent hover:border-blue-400'
                            }`}
                          >
                            {isSelected ? selectionIndex + 1 : ''}
                          </button>
                        </td>
                        <td className="py-3">
                          <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 flex justify-center">
                            <GripVertical className="w-5 h-5" />
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            {product.image ? (
                              <Image src={product.image} alt={product.name} width={48} height={48} className="object-cover w-full h-full" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">📦</div>
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          <Link href={editHref(product.id)} className="text-blue-600 hover:underline font-medium">
                            {lang === 'ar' ? product.name : (product.nameEn || product.name)}
                          </Link>
                        </td>
                        <td className="py-3 text-gray-600">
                          {product.category.parent
                            ? `${lang === 'ar' ? product.category.parent.name : (product.category.parent.nameEn || product.category.parent.name)} - ${lang === 'ar' ? product.category.name : (product.category.nameEn || product.category.name)}`
                            : (lang === 'ar' ? product.category.name : (product.category.nameEn || product.category.name))
                          }
                        </td>
                        <td className="py-3 text-gray-600 text-xs">
                          {product.supplier
                            ? (lang === 'ar' ? product.supplier.name : (product.supplier.nameEn || product.supplier.name))
                            : <span className="text-gray-400">—</span>
                          }
                        </td>
                        <td className="py-3 text-gray-600 text-xs">
                          {product.variants.length > 0 ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">{product.variants.length}</span>
                              <span>{product.variants.map(v => lang === 'ar' ? v.size : (v.sizeEn || v.size)).join(', ')}</span>
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-3 font-medium text-gray-900">
                          {(() => {
                            const allPrices = product.variants.flatMap(v => v.units.map(u => u.price))
                            if (allPrices.length === 0) return '—'
                            const min = Math.min(...allPrices)
                            const max = Math.max(...allPrices)
                            return min === max ? formatCurrency(min) : `${formatCurrency(min)} - ${formatCurrency(max)}`
                          })()}
                        </td>
                        <td className="py-3">
                          {(() => {
                            const totalStock = product.variants.reduce((s, v) => s + v.stock, 0)
                            return <span className={totalStock <= 0 ? 'text-red-600 font-medium' : 'text-gray-700'}>{totalStock}</span>
                          })()}
                        </td>
                        <td className="py-3">
                          <Badge status={product.isActive ? 'active' : 'inactive'}>
                            {product.isActive ? t.productManagement.active : t.productManagement.inactive}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                            <Link href={editHref(product.id)}>
                              <Button variant="ghost" size="sm">{t.common.edit}</Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(product.id)}
                            >
                              {product.isActive ? t.productManagement.inactive : t.productManagement.active}
                            </Button>
                            <button
                              onClick={() => setDeleteTarget({
                                id: product.id,
                                name: lang === 'ar' ? product.name : (product.nameEn || product.name),
                              })}
                              className="p-1.5 rounded text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                              title={t.common.delete}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-200">
                  {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                    <Link
                      key={p}
                      href={`/admin/products?page=${p}${currentCategory ? `&category=${currentCategory}` : ''}${currentSearch ? `&search=${encodeURIComponent(currentSearch)}` : ''}${currentSupplier ? `&supplier=${currentSupplier}` : ''}`}
                      className={`px-3 py-1 rounded ${p === currentPage ? 'bg-blue-900 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                      {p}
                    </Link>
                  ))}
                </div>
              )}

              <p className="text-sm text-gray-500 mt-2 text-center">
                {total} {t.admin.products}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteTarget(null)}>
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
            dir={dir}
          >
            <div className={`flex items-center justify-between mb-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-lg font-semibold text-gray-900">{t.common.delete}</h3>
              <button onClick={() => setDeleteTarget(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-2">{t.productManagement.confirmDelete}</p>
            <p className="text-gray-900 font-medium mb-6">{deleteTarget.name}</p>
            <div className={`flex gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                className="flex-1"
              >
                {t.common.cancel}
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1"
              >
                {deleting ? t.common.loading : t.common.delete}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Move to Category Modal */}
      {showMoveToCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowMoveToCategoryModal(false)}>
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
            dir={dir}
          >
            <div className={`flex items-center justify-between mb-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-lg font-semibold text-gray-900">
                {lang === 'ar' ? 'نقل المنتجات لصنف' : 'Move products to category'}
              </h3>
              <button onClick={() => setShowMoveToCategoryModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {lang === 'ar'
                ? `سيتم نقل ${selectedIds.length} منتج إلى الصنف المحدد`
                : `${selectedIds.length} products will be moved to the selected category`
              }
            </p>
            <select
              value={targetCategoryId}
              onChange={(e) => setTargetCategoryId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg py-2 px-3 mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{lang === 'ar' ? 'اختر الصنف...' : 'Select category...'}</option>
              {flattenCategoryTree(categoryTree, lang).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className={`flex gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <Button
                variant="outline"
                onClick={() => setShowMoveToCategoryModal(false)}
                className="flex-1"
              >
                {t.common.cancel}
              </Button>
              <Button
                variant="primary"
                onClick={handleMoveToCategory}
                disabled={movingToCategory || !targetCategoryId}
                className="flex-1"
              >
                {movingToCategory ? t.common.loading : (lang === 'ar' ? 'نقل' : 'Move')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
