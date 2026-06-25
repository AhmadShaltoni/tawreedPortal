'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, X, Loader2, ChevronLeft, ChevronRight, Check, Package, Filter, Tag } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'

interface ProductItem {
  id: string
  name: string
  nameEn?: string | null
  image?: string | null
  isActive: boolean
  brandId?: string | null
  category?: { id: string; name: string } | null
}

interface PaginatedResponse {
  products: ProductItem[]
  total: number
  page: number
  totalPages: number
}

interface CategoryItem {
  id: string
  name: string
  nameEn?: string | null
}

interface BrandOption {
  id: string
  name: string
}

export function UnassignedProductManager({ brands }: { brands: BrandOption[] }) {
  const [products, setProducts] = useState<ProductItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [categories, setCategories] = useState<CategoryItem[]>([])

  // Selection / assignment
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [targetBrand, setTargetBrand] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)

  const loadProducts = useCallback(async (page = 1) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '30',
        onlyNoBrand: 'true',
      })
      if (searchQuery.trim()) params.set('q', searchQuery.trim())
      if (categoryFilter) params.set('categoryId', categoryFilter)

      const response = await fetch(`/api/admin/brands/search-products?${params}`)
      if (response.ok) {
        const data: PaginatedResponse = await response.json()
        setProducts(data.products)
        setTotal(data.total)
        setCurrentPage(data.page)
        setTotalPages(data.totalPages)
      }
    } catch (err) {
      console.error('Failed to load products:', err)
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, categoryFilter])

  // Load categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await fetch('/api/admin/brands/categories')
        if (response.ok) {
          const data = await response.json()
          setCategories(data)
        }
      } catch (err) {
        console.error('Failed to load categories:', err)
      }
    }
    loadCategories()
  }, [])

  // Load on filter change (debounced for search)
  useEffect(() => {
    if (searchQuery) {
      const timer = setTimeout(() => loadProducts(1), 300)
      return () => clearTimeout(timer)
    }
    loadProducts(1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, categoryFilter])

  function toggleSelection(productId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })
  }

  function selectAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const p of products) next.add(p.id)
      return next
    })
  }

  function deselectAll() {
    setSelected(new Set())
  }

  async function handleAssign() {
    if (selected.size === 0 || !targetBrand) return
    const targetName = brands.find((b) => b.id === targetBrand)?.name || ''
    if (!window.confirm(`إسناد ${selected.size} منتج إلى ماركة "${targetName}"؟`)) return

    setIsAssigning(true)
    try {
      const response = await fetch(`/api/admin/brands/${targetBrand}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: Array.from(selected) }),
      })
      if (!response.ok) throw new Error('Failed to assign products')

      // Remove assigned products from the unassigned list locally
      const assignedIds = new Set(selected)
      setProducts((prev) => prev.filter((p) => !assignedIds.has(p.id)))
      setTotal((prev) => Math.max(0, prev - assignedIds.size))
      setSelected(new Set())
      setTargetBrand('')
    } catch (err) {
      console.error('Error assigning products:', err)
      alert('فشل في إسناد المنتجات')
    } finally {
      setIsAssigning(false)
    }
  }

  function goToPage(page: number) {
    if (page < 1 || page > totalPages) return
    loadProducts(page)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="ابحث بالاسم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 pr-10 pl-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="relative sm:w-56">
              <Filter className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 pr-10 pl-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none bg-white"
              >
                <option value="">جميع الأقسام</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selection Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={selectAllOnPage}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                تحديد الكل في الصفحة
              </button>
              {selected.size > 0 && (
                <button
                  onClick={deselectAll}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  إلغاء التحديد
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500">{total} منتج بدون ماركة</p>
          </div>
        </CardContent>
      </Card>

      {/* Assign Action Bar */}
      {selected.size > 0 && (
        <div className="sticky top-0 z-10 bg-blue-50 border border-blue-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <span className="text-sm font-medium text-blue-800">
            تم تحديد {selected.size} منتج
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={targetBrand}
              onChange={(e) => setTargetBrand(e.target.value)}
              disabled={isAssigning}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="">اختر ماركة...</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAssign}
              disabled={isAssigning || !targetBrand}
            >
              {isAssigning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Tag className="w-4 h-4" />
              )}
              إسناد للماركة
            </Button>
          </div>
        </div>
      )}

      {/* Products List */}
      <Card>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">لا توجد منتجات بدون ماركة</p>
              {(searchQuery || categoryFilter) && (
                <p className="text-xs text-gray-400 mt-1">جرب تغيير الفلتر أو مصطلح البحث</p>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {products.map((product) => {
                const isSelected = selected.has(product.id)
                return (
                  <label
                    key={product.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-blue-50 border-blue-200'
                        : 'border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelection(product.id)}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-9 h-9 rounded object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded bg-gray-100 flex items-center justify-center">
                          <Package className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {product.category?.name || ''}
                          {product.nameEn && ` • ${product.nameEn}`}
                        </p>
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                <ChevronRight className="w-4 h-4" />
                السابق
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 7) {
                    pageNum = i + 1
                  } else if (currentPage <= 4) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 3) {
                    pageNum = totalPages - 6 + i
                  } else {
                    pageNum = currentPage - 3 + i
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`w-8 h-8 rounded text-sm ${
                        pageNum === currentPage
                          ? 'bg-blue-600 text-white font-medium'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                التالي
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
