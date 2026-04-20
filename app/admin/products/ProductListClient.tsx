'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Plus, Search, GripVertical, Trash2, X } from 'lucide-react'
import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useLanguage } from '@/lib/LanguageContext'
import { formatCurrency } from '@/lib/utils'
import { toggleProductActive, deleteProduct, reorderProducts } from '@/actions/products'

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
  const dragCounter = useRef<Record<string, number>>({})

  // Sync when products prop changes (e.g. after server refresh)
  if (products !== orderedProducts && !draggedId) {
    const productIds = products.map(p => p.id).join(',')
    const orderedIds = orderedProducts.map(p => p.id).join(',')
    if (productIds !== orderedIds || products.length !== orderedProducts.length) {
      setOrderedProducts(products)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (currentCategory) params.set('category', currentCategory)
    if (currentSupplier) params.set('supplier', currentSupplier)
    router.push(`/admin/products?${params.toString()}`)
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

    const [moved] = newOrder.splice(sourceIndex, 1)
    newOrder.splice(targetIndex, 0, moved)
    setOrderedProducts(newOrder)
    setDraggedId(null)
    setDragOverId(null)
    dragCounter.current = {}

    // Save to server
    setSaving(true)
    await reorderProducts(newOrder.map(p => p.id))
    setSaving(false)
    router.refresh()
  }, [orderedProducts, router])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <h1 className="text-2xl font-bold text-gray-900">{t.productManagement.title}</h1>
        <Link href="/admin/products/new">
          <Button variant="primary" className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <Plus className="w-4 h-4" />
            {t.productManagement.addProduct}
          </Button>
        </Link>
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
                    {orderedProducts.map((product) => (
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
                              : product.variants.reduce((s, v) => s + v.stock, 0) <= 0
                                ? 'bg-red-50 hover:bg-red-100'
                                : 'hover:bg-gray-50'
                        }`}
                      >
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
                          <Link href={`/admin/products/${product.id}`} className="text-blue-600 hover:underline font-medium">
                            {lang === 'ar' ? product.name : (product.nameEn || product.name)}
                          </Link>
                        </td>
                        <td className="py-3 text-gray-600">
                          {lang === 'ar' ? product.category.name : (product.category.nameEn || product.category.name)}
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
                            <Link href={`/admin/products/${product.id}`}>
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
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-200">
                  {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                    <Link
                      key={p}
                      href={`/admin/products?page=${p}${currentCategory ? `&category=${currentCategory}` : ''}${currentSearch ? `&search=${currentSearch}` : ''}`}
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
    </div>
  )
}
