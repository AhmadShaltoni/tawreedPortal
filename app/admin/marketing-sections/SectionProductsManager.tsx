'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Search, Plus, X, Package, Check } from 'lucide-react'
import { addProductsToMarketingSection, removeProductFromMarketingSection } from '@/actions/marketing-sections'
import { useRouter } from 'next/navigation'

interface ProductData {
  id: string
  name: string
  nameEn: string | null
  image: string | null
  isActive: boolean
  category: { id: string; name: string; nameEn: string | null } | null
  brand: { id: string; name: string; nameEn: string | null } | null
  variants: {
    id: string
    size: string
    sizeEn: string | null
    units: { id: string; price: number; compareAtPrice: number | null; label: string; labelEn: string | null }[]
  }[]
}

interface Props {
  sectionId: string
  products: ProductData[]
}

export function SectionProductsManager({ sectionId, products }: Props) {
  const router = useRouter()
  const [showSelector, setShowSelector] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [allProducts, setAllProducts] = useState<ProductData[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState<string | null>(null)
  const [addingSelected, setAddingSelected] = useState(false)

  // IDs of products already in this section
  const existingIds = new Set(products.map(p => p.id))

  // Load all products when selector is opened
  useEffect(() => {
    if (showSelector && allProducts.length === 0) {
      loadAllProducts()
    }
  }, [showSelector])

  const loadAllProducts = async () => {
    setLoadingProducts(true)
    try {
      const res = await fetch(`/api/v1/admin/marketing-sections/search-products?q=&all=true&exclude=${products.map(p => p.id).join(',')}`)
      const data = await res.json()
      setAllProducts(data.products || [])
    } catch {
      setAllProducts([])
    }
    setLoadingProducts(false)
  }

  const handleToggleSelect = (productId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(productId)) {
        newSet.delete(productId)
      } else {
        newSet.add(productId)
      }
      return newSet
    })
  }

  const handleAddSelected = async () => {
    if (selectedIds.size === 0) return
    setAddingSelected(true)
    await addProductsToMarketingSection(sectionId, Array.from(selectedIds))
    setSelectedIds(new Set())
    setShowSelector(false)
    setAllProducts([])
    setAddingSelected(false)
    router.refresh()
  }

  const handleRemoveProduct = async (productId: string) => {
    if (!confirm('هل أنت متأكد من إزالة هذا المنتج من القسم؟')) return
    setLoading(productId)
    await removeProductFromMarketingSection(sectionId, productId)
    setLoading(null)
    router.refresh()
  }

  // Filter products based on search
  const filteredProducts = searchQuery.trim()
    ? allProducts.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.nameEn && p.nameEn.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.brand?.name && p.brand.name.includes(searchQuery)) ||
        (p.category?.name && p.category.name.includes(searchQuery))
      )
    : allProducts

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">المنتجات المرتبطة</h2>
          <p className="text-sm text-gray-500">{products.length} منتج في هذا القسم</p>
        </div>
        <button
          onClick={() => { setShowSelector(!showSelector); setSelectedIds(new Set()) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          إضافة منتجات
        </button>
      </div>

      {/* Product Selector Panel */}
      {showSelector && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          {/* Search + Actions */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث عن منتج..."
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {selectedIds.size > 0 && (
              <button
                onClick={handleAddSelected}
                disabled={addingSelected}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                إضافة ({selectedIds.size})
              </button>
            )}
            <button
              onClick={() => { setShowSelector(false); setSelectedIds(new Set()); setSearchQuery('') }}
              className="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              إغلاق
            </button>
          </div>

          {/* Products Grid */}
          {loadingProducts ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">جاري تحميل المنتجات...</p>
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
              {filteredProducts.map((product) => {
                const isSelected = selectedIds.has(product.id)
                return (
                  <div
                    key={product.id}
                    onClick={() => handleToggleSelect(product.id)}
                    className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-100 bg-white hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    {/* Checkbox indicator */}
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'border-green-500 bg-green-500' : 'border-gray-300'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>

                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {product.image ? (
                        <Image src={product.image} alt={product.name} width={40} height={40} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-gray-400" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {product.category?.name || ''} {product.brand?.name ? `• ${product.brand.name}` : ''}
                      </p>
                    </div>
                    {product.variants[0]?.units[0] && (
                      <span className="text-xs font-medium text-green-700 flex-shrink-0">
                        {product.variants[0].units[0].price.toFixed(2)} د.أ
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              {searchQuery ? 'لا توجد نتائج مطابقة للبحث' : 'لا توجد منتجات متاحة'}
            </p>
          )}

          {/* Selected count footer */}
          {selectedIds.size > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                تم اختيار <span className="font-bold text-green-700">{selectedIds.size}</span> منتج
              </p>
              <button
                onClick={handleAddSelected}
                disabled={addingSelected}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {addingSelected ? 'جاري الإضافة...' : `إضافة ${selectedIds.size} منتج للقسم`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Current Products List */}
      {products.length === 0 ? (
        <div className="text-center py-8">
          <Package className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">لا توجد منتجات في هذا القسم</p>
          <p className="text-sm text-gray-400">اضغط على &quot;إضافة منتجات&quot; لربط منتجات بهذا القسم</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map((product) => (
            <div
              key={product.id}
              className={`flex items-center gap-3 p-3 rounded-lg border border-gray-200 ${
                loading === product.id ? 'opacity-50' : ''
              } ${!product.isActive ? 'opacity-60 bg-gray-50' : 'bg-white'}`}
            >
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                {product.image ? (
                  <Image src={product.image} alt={product.name} width={48} height={48} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-gray-400" /></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                <p className="text-xs text-gray-500">
                  {product.brand?.name || ''} {product.variants[0]?.size ? `• ${product.variants[0].size}` : ''}
                </p>
                {product.variants[0]?.units[0] && (
                  <p className="text-xs font-medium text-green-700">
                    {product.variants[0].units[0].price.toFixed(2)} د.أ
                  </p>
                )}
              </div>
              <button
                onClick={() => handleRemoveProduct(product.id)}
                disabled={loading === product.id}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="إزالة من القسم"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
