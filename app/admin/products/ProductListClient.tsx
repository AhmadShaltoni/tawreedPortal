'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useLanguage } from '@/lib/LanguageContext'
import { formatCurrency } from '@/lib/utils'
import { toggleProductActive } from '@/actions/products'

interface Props {
  products: Array<{
    id: string
    name: string
    nameEn: string | null
    price: number
    stock: number
    image: string | null
    isActive: boolean
    category: { id: string; name: string; nameEn: string | null }
  }>
  categories: Array<{ id: string; name: string; nameEn: string | null; slug: string }>
  total: number
  pages: number
  currentPage: number
  currentCategory?: string
  currentSearch?: string
}

export function ProductListClient({
  products,
  categories,
  total,
  pages,
  currentPage,
  currentCategory,
  currentSearch,
}: Props) {
  const { t, dir, lang } = useLanguage()
  const router = useRouter()
  const [search, setSearch] = useState(currentSearch || '')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (currentCategory) params.set('category', currentCategory)
    router.push(`/admin/products?${params.toString()}`)
  }

  function handleCategoryFilter(categoryId: string) {
    const params = new URLSearchParams()
    if (categoryId) params.set('category', categoryId)
    if (currentSearch) params.set('search', currentSearch)
    router.push(`/admin/products?${params.toString()}`)
  }

  async function handleToggleActive(id: string) {
    await toggleProductActive(id)
  }

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

            {/* Category filter */}
            <select
              value={currentCategory || ''}
              onChange={(e) => handleCategoryFilter(e.target.value)}
              className="border border-gray-300 rounded-lg py-2 px-3 min-w-[200px]"
            >
              <option value="">{t.productManagement.allCategories}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {lang === 'ar' ? cat.name : (cat.nameEn || cat.name)}
                </option>
              ))}
            </select>
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
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.productManagement.image}</th>
                      <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.productManagement.productName}</th>
                      <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.productManagement.category}</th>
                      <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.productManagement.price}</th>
                      <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.productManagement.stock}</th>
                      <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.userManagement.status}</th>
                      <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.common.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
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
                        <td className="py-3 font-medium text-gray-900">
                          {formatCurrency(product.price)}
                        </td>
                        <td className="py-3">
                          <span className={product.stock <= 0 ? 'text-red-600 font-medium' : 'text-gray-700'}>
                            {product.stock}
                          </span>
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
    </div>
  )
}
