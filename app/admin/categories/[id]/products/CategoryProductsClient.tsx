'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Home, Trash2, FolderInput, X, Package } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useLanguage } from '@/lib/LanguageContext'
import { formatCurrency } from '@/lib/utils'
import { moveProductsToCategory, removeProductsFromCategory } from '@/actions/products'

interface CategoryNode {
  id: string
  name: string
  nameEn: string | null
  _count: { products: number; children: number }
  children: CategoryNode[]
}

interface BreadcrumbItem {
  id: string
  name: string
  nameEn: string | null
  slug: string
}

interface Props {
  category: {
    id: string
    name: string
    nameEn: string | null
    slug: string
    _count: { products: number; children: number }
  }
  products: Array<{
    id: string
    name: string
    nameEn: string | null
    image: string | null
    isActive: boolean
    sortOrder: number
    category: { id: string; name: string; nameEn: string | null }
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
  categoryTree: CategoryNode[]
  breadcrumb: BreadcrumbItem[]
}

function flattenCategoryTree(nodes: CategoryNode[], lang: string, excludeId: string, prefix = ''): { value: string; label: string }[] {
  const result: { value: string; label: string }[] = []
  for (const node of nodes) {
    if (node.id === excludeId) continue
    const displayLabel = lang === 'ar' ? node.name : (node.nameEn || node.name)
    const fullLabel = prefix ? `${prefix} > ${displayLabel}` : displayLabel
    result.push({ value: node.id, label: fullLabel })
    if (node.children.length > 0) {
      result.push(...flattenCategoryTree(node.children, lang, excludeId, fullLabel))
    }
  }
  return result
}

export function CategoryProductsClient({ category, products, categoryTree, breadcrumb }: Props) {
  const { t, dir, lang } = useLanguage()
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [targetCategoryId, setTargetCategoryId] = useState('')
  const [processing, setProcessing] = useState(false)

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function toggleSelectAll() {
    if (selectedIds.length === products.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(products.map((p) => p.id))
    }
  }

  async function handleMoveToCategory() {
    if (!targetCategoryId || selectedIds.length === 0) return
    setProcessing(true)
    await moveProductsToCategory(selectedIds, targetCategoryId)
    setSelectedIds([])
    setShowMoveModal(false)
    setTargetCategoryId('')
    setProcessing(false)
    router.refresh()
  }

  async function handleDeleteProducts() {
    if (selectedIds.length === 0) return
    setProcessing(true)
    await removeProductsFromCategory(selectedIds)
    setSelectedIds([])
    setShowDeleteModal(false)
    setProcessing(false)
    router.refresh()
  }

  function displayName(item: { name: string; nameEn: string | null }) {
    return lang === 'ar' ? item.name : (item.nameEn || item.name)
  }

  const categoryOptions = flattenCategoryTree(categoryTree, lang, category.id)

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className={`flex items-center gap-1 text-sm text-gray-500 flex-wrap ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <Link
          href="/admin/categories"
          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>{t.categoryManagement.rootCategories || 'الأصناف الرئيسية'}</span>
        </Link>
        {breadcrumb.map((item, idx) => (
          <span key={item.id} className={`flex items-center gap-1 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <ChevronLeft className={`w-4 h-4 text-gray-400 ${dir === 'rtl' ? '' : 'rotate-180'}`} />
            {idx === breadcrumb.length - 1 ? (
              <span className="font-medium text-gray-900">{displayName(item)}</span>
            ) : (
              <Link
                href={`/admin/categories?parent=${item.id}`}
                className="hover:text-blue-600 transition-colors"
              >
                {displayName(item)}
              </Link>
            )}
          </span>
        ))}
        <span className={`flex items-center gap-1 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <ChevronLeft className={`w-4 h-4 text-gray-400 ${dir === 'rtl' ? '' : 'rotate-180'}`} />
          <span className="font-medium text-blue-600">
            {lang === 'ar' ? 'المنتجات' : 'Products'}
          </span>
        </span>
      </nav>

      {/* Header */}
      <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <Link
            href={category._count.children > 0 ? `/admin/categories?parent=${category.id}` : '/admin/categories'}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronLeft className={`w-6 h-6 ${dir === 'rtl' ? '' : 'rotate-180'}`} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {lang === 'ar' ? `منتجات: ${category.name}` : `Products: ${category.nameEn || category.name}`}
            </h1>
            <p className="text-sm text-gray-500">
              {products.length} {lang === 'ar' ? 'منتج' : 'products'}
            </p>
          </div>
        </div>
      </div>

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
                onClick={() => setShowMoveModal(true)}
                className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
              >
                <FolderInput className="w-4 h-4" />
                {lang === 'ar' ? 'نقل لصنف آخر' : 'Move to category'}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
                className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
              >
                <Trash2 className="w-4 h-4" />
                {lang === 'ar' ? 'حذف المحدد' : 'Delete selected'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds([])}
              >
                {lang === 'ar' ? 'إلغاء التحديد' : 'Clear'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Products Table */}
      <Card>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                {lang === 'ar' ? 'لا توجد منتجات في هذا الصنف' : 'No products in this category'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className={`pb-3 font-medium text-gray-500 w-10 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                      <input
                        type="checkbox"
                        checked={selectedIds.length === products.length && products.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                      {t.productManagement.image}
                    </th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                      {t.productManagement.productName}
                    </th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                      {t.supplierManagement?.supplier || 'المورد'}
                    </th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                      {t.productManagement.price}
                    </th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                      {t.productManagement.stock}
                    </th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                      {t.userManagement.status}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const isSelected = selectedIds.includes(product.id)
                    return (
                      <tr
                        key={product.id}
                        className={`border-b border-gray-100 transition-colors ${
                          isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(product.id)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
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
                          <Link href={`/admin/products/${product.id}`} className="text-blue-600 hover:underline font-medium">
                            {lang === 'ar' ? product.name : (product.nameEn || product.name)}
                          </Link>
                        </td>
                        <td className="py-3 text-gray-600 text-xs">
                          {product.supplier
                            ? (lang === 'ar' ? product.supplier.name : (product.supplier.nameEn || product.supplier.name))
                            : <span className="text-gray-400">—</span>
                          }
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
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Move to Category Modal */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowMoveModal(false)}>
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
            dir={dir}
          >
            <div className={`flex items-center justify-between mb-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-lg font-semibold text-gray-900">
                {lang === 'ar' ? 'نقل المنتجات لصنف آخر' : 'Move products to category'}
              </h3>
              <button onClick={() => setShowMoveModal(false)} className="text-gray-400 hover:text-gray-600">
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
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className={`flex gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <Button
                variant="outline"
                onClick={() => setShowMoveModal(false)}
                className="flex-1"
              >
                {t.common.cancel}
              </Button>
              <Button
                variant="primary"
                onClick={handleMoveToCategory}
                disabled={processing || !targetCategoryId}
                className="flex-1"
              >
                {processing ? t.common.loading : (lang === 'ar' ? 'نقل' : 'Move')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDeleteModal(false)}>
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
            dir={dir}
          >
            <div className={`flex items-center justify-between mb-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-lg font-semibold text-red-600">
                {lang === 'ar' ? 'حذف المنتجات' : 'Delete products'}
              </h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-2">
              {lang === 'ar'
                ? `هل أنت متأكد من حذف ${selectedIds.length} منتج؟ لا يمكن التراجع عن هذا الإجراء.`
                : `Are you sure you want to delete ${selectedIds.length} products? This action cannot be undone.`
              }
            </p>
            <div className={`flex gap-3 mt-6 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1"
              >
                {t.common.cancel}
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteProducts}
                disabled={processing}
                className="flex-1"
              >
                {processing ? t.common.loading : t.common.delete}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
