'use client'

import Link from 'next/link'
import { Plus, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useLanguage } from '@/lib/LanguageContext'
import { reorderCategories } from '@/actions/categories'

interface Props {
  categories: Array<{
    id: string
    name: string
    nameEn: string | null
    slug: string
    image: string | null
    sortOrder: number
    isActive: boolean
    _count: { products: number }
  }>
}

export function CategoryListClient({ categories }: Props) {
  const { t, dir, lang } = useLanguage()

  async function handleMove(index: number, direction: 'up' | 'down') {
    const ordered = [...categories]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= ordered.length) return

    const temp = ordered[index]
    ordered[index] = ordered[swapIndex]
    ordered[swapIndex] = temp

    await reorderCategories(ordered.map((c) => c.id))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <h1 className="text-2xl font-bold text-gray-900">{t.categoryManagement.title}</h1>
        <Link href="/admin/categories/new">
          <Button variant="primary" className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <Plus className="w-4 h-4" />
            {t.categoryManagement.addCategory}
          </Button>
        </Link>
      </div>

      {/* Categories Table */}
      <Card>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-center text-gray-500 py-12">{t.categoryManagement.noCategories}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.categoryManagement.sortOrder}</th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.categoryManagement.image}</th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.categoryManagement.categoryName}</th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.categoryManagement.slug}</th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.categoryManagement.productsCount}</th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.userManagement.status}</th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.common.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat, index) => (
                    <tr key={cat.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3">
                        <div className={`flex items-center gap-1 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                          <button
                            onClick={() => handleMove(index, 'up')}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMove(index, 'down')}
                            disabled={index === categories.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <span className="text-gray-500 text-xs mx-1">{cat.sortOrder}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        {cat.image ? (
                          <img src={cat.image} alt={cat.name} className="w-12 h-12 object-cover rounded bg-gray-100" />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                            {t.common.noImage || 'بدون صورة'}
                          </div>
                        )}
                      </td>
                      <td className="py-3 font-medium text-gray-900">
                        {lang === 'ar' ? cat.name : (cat.nameEn || cat.name)}
                      </td>
                      <td className="py-3 text-gray-500 font-mono text-xs">{cat.slug}</td>
                      <td className="py-3 text-gray-700">{cat._count.products}</td>
                      <td className="py-3">
                        <Badge status={cat.isActive ? 'active' : 'inactive'}>
                          {cat.isActive ? t.productManagement.active : t.productManagement.inactive}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <Link href={`/admin/categories/${cat.id}`}>
                          <Button variant="ghost" size="sm">{t.common.edit}</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
