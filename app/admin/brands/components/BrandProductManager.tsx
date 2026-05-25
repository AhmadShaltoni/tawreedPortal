'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, X, Plus, Trash2, Loader2, ChevronLeft, ChevronRight, Check, Package, Filter } from 'lucide-react'
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

type Tab = 'current' | 'add'

export function BrandProductManager({ brandId }: { brandId: string }) {
  // Active tab
  const [activeTab, setActiveTab] = useState<Tab>('current')

  // Current brand products
  const [brandProducts, setBrandProducts] = useState<ProductItem[]>([])
  const [isLoadingBrandProducts, setIsLoadingBrandProducts] = useState(true)

  // All products (for adding)
  const [allProducts, setAllProducts] = useState<ProductItem[]>([])
  const [isLoadingAll, setIsLoadingAll] = useState(false)
  const [totalProducts, setTotalProducts] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [categories, setCategories] = useState<CategoryItem[]>([])

  // Selection
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [isAdding, setIsAdding] = useState(false)

  // Removing
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())

  // Load brand products
  const loadBrandProducts = useCallback(async () => {
    setIsLoadingBrandProducts(true)
    try {
      const response = await fetch(`/api/admin/brands/${brandId}/products`)
      if (response.ok) {
        const data = await response.json()
        setBrandProducts(data)
      }
    } catch (err) {
      console.error('Failed to load brand products:', err)
    } finally {
      setIsLoadingBrandProducts(false)
    }
  }, [brandId])

  // Load all products with filters
  const loadAllProducts = useCallback(async (page = 1) => {
    setIsLoadingAll(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '30',
        brandId,
        excludeBrand: 'true',
      })
      if (searchQuery.trim()) params.set('q', searchQuery.trim())
      if (categoryFilter) params.set('categoryId', categoryFilter)

      const response = await fetch(`/api/admin/brands/search-products?${params}`)
      if (response.ok) {
        const data: PaginatedResponse = await response.json()
        setAllProducts(data.products)
        setTotalProducts(data.total)
        setCurrentPage(data.page)
        setTotalPages(data.totalPages)
      }
    } catch (err) {
      console.error('Failed to load products:', err)
    } finally {
      setIsLoadingAll(false)
    }
  }, [brandId, searchQuery, categoryFilter])

  // Load categories for filter
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

  // Load brand products on mount
  useEffect(() => {
    loadBrandProducts()
  }, [loadBrandProducts])

  // Load all products when tab changes to "add" or filters change
  useEffect(() => {
    if (activeTab === 'add') {
      // Debounce only for search query changes
      if (searchQuery) {
        const timer = setTimeout(() => {
          loadAllProducts(1)
        }, 300)
        return () => clearTimeout(timer)
      } else {
        loadAllProducts(1)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, searchQuery, categoryFilter])

  function toggleSelection(productId: string) {
    setSelectedProducts((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      return next
    })
  }

  function selectAllOnPage() {
    setSelectedProducts((prev) => {
      const next = new Set(prev)
      const brandProductIds = new Set(brandProducts.map(p => p.id))
      for (const p of allProducts) {
        if (!brandProductIds.has(p.id)) {
          next.add(p.id)
        }
      }
      return next
    })
  }

  function deselectAll() {
    setSelectedProducts(new Set())
  }

  async function handleAddProducts() {
    if (selectedProducts.size === 0) return

    setIsAdding(true)
    try {
      const response = await fetch(`/api/admin/brands/${brandId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: Array.from(selectedProducts) }),
      })

      if (!response.ok) throw new Error('Failed to add products')

      const updatedProducts = await response.json()
      setBrandProducts(updatedProducts)
      setSelectedProducts(new Set())
      // Reload the browse list to reflect changes
      loadAllProducts(currentPage)
    } catch (err) {
      console.error('Error adding products:', err)
      alert('فشل في إضافة المنتجات')
    } finally {
      setIsAdding(false)
    }
  }

  async function handleRemoveProduct(productId: string) {
    if (!window.confirm('هل تريد إزالة هذا المنتج من الماركة؟')) return

    setRemovingIds((prev) => new Set(prev).add(productId))
    try {
      const response = await fetch(`/api/admin/brands/${brandId}/products/${productId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to remove product')

      setBrandProducts((prev) => prev.filter((p) => p.id !== productId))
    } catch (err) {
      console.error('Error removing product:', err)
      alert('فشل في إزالة المنتج')
    } finally {
      setRemovingIds((prev) => {
        const next = new Set(prev)
        next.delete(productId)
        return next
      })
    }
  }

  function goToPage(page: number) {
    if (page < 1 || page > totalPages) return
    loadAllProducts(page)
  }

  const brandProductIds = new Set(brandProducts.map(p => p.id))

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('current')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'current'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            منتجات الماركة ({brandProducts.length})
          </span>
        </button>
        <button
          onClick={() => setActiveTab('add')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'add'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            إضافة منتجات
          </span>
        </button>
      </div>

      {/* Current Products Tab */}
      {activeTab === 'current' && (
        <Card>
          <CardContent>
            {isLoadingBrandProducts ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : brandProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">لم يتم إضافة أي منتجات بعد</p>
                <p className="text-xs text-gray-400 mt-1">اضغط على &quot;إضافة منتجات&quot; لتصفح وإضافة المنتجات</p>
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-4"
                  onClick={() => setActiveTab('add')}
                >
                  <Plus className="w-4 h-4" />
                  إضافة منتجات
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {brandProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Package className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{product.name}</p>
                        {product.nameEn && (
                          <p className="text-xs text-gray-500 truncate">{product.nameEn}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveProduct(product.id)}
                      disabled={removingIds.has(product.id)}
                      className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                      title="إزالة المنتج من الماركة"
                    >
                      {removingIds.has(product.id) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Products Tab */}
      {activeTab === 'add' && (
        <div className="space-y-4">
          {/* Filters Bar */}
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
                  {selectedProducts.size > 0 && (
                    <button
                      onClick={deselectAll}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      إلغاء التحديد
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {totalProducts} منتج متاح
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Selected Products Action Bar */}
          {selectedProducts.size > 0 && (
            <div className="sticky top-0 z-10 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between shadow-sm">
              <span className="text-sm font-medium text-blue-800">
                تم تحديد {selectedProducts.size} منتج
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddProducts}
                disabled={isAdding}
              >
                {isAdding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                إضافة للماركة
              </Button>
            </div>
          )}

          {/* Products Grid */}
          <Card>
            <CardContent>
              {isLoadingAll ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : allProducts.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">لا توجد منتجات متاحة</p>
                  {(searchQuery || categoryFilter) && (
                    <p className="text-xs text-gray-400 mt-1">جرب تغيير الفلتر أو مصطلح البحث</p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {allProducts.map((product) => {
                    const isAlreadyInBrand = brandProductIds.has(product.id)
                    const isSelected = selectedProducts.has(product.id)

                    return (
                      <label
                        key={product.id}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${
                          isAlreadyInBrand
                            ? 'bg-green-50 border-green-200 cursor-default opacity-60'
                            : isSelected
                            ? 'bg-blue-50 border-blue-200'
                            : 'border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                        }`}
                      >
                        {/* Checkbox */}
                        <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                          isAlreadyInBrand
                            ? 'bg-green-100 border-green-300'
                            : isSelected
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300 bg-white'
                        }`}>
                          {(isAlreadyInBrand || isSelected) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>

                        {/* Product Info */}
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

                        {/* Status */}
                        {isAlreadyInBrand && (
                          <span className="text-xs text-green-600 font-medium flex-shrink-0">مضاف ✓</span>
                        )}

                        {/* Hidden checkbox for accessibility */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => !isAlreadyInBrand && toggleSelection(product.id)}
                          disabled={isAlreadyInBrand}
                          className="sr-only"
                        />
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
      )}
    </div>
  )
}
