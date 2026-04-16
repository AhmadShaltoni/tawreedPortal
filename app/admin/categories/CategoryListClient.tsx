'use client'

import Link from 'next/link'
import { Plus, GripVertical, Trash2, X, FolderOpen, FileText, ChevronLeft, Home } from 'lucide-react'
import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useLanguage } from '@/lib/LanguageContext'
import { reorderCategories, deleteCategory } from '@/actions/categories'

interface BreadcrumbItem {
  id: string
  name: string
  nameEn: string | null
  slug: string
}

interface Props {
  categories: Array<{
    id: string
    name: string
    nameEn: string | null
    slug: string
    image: string | null
    sortOrder: number
    isActive: boolean
    parentId: string | null
    depth: number
    _count: { products: number; children: number }
  }>
  breadcrumb: BreadcrumbItem[]
  parentId: string | null
  parentName: string | null
  parentNameEn: string | null
}

export function CategoryListClient({ categories, breadcrumb, parentId, parentName, parentNameEn }: Props) {
  const { t, dir, lang } = useLanguage()
  const router = useRouter()
  const [orderedCategories, setOrderedCategories] = useState(categories)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const dragCounter = useRef<Record<string, number>>({})

  // Sync when categories prop changes
  if (categories !== orderedCategories && !draggedId) {
    const catIds = categories.map(c => c.id).join(',')
    const orderedIds = orderedCategories.map(c => c.id).join(',')
    if (catIds !== orderedIds || categories.length !== orderedCategories.length) {
      setOrderedCategories(categories)
    }
  }

  const handleDragStart = useCallback((e: React.DragEvent<HTMLTableRowElement>, id: string) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
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

    const newOrder = [...orderedCategories]
    const sourceIndex = newOrder.findIndex(c => c.id === sourceId)
    const targetIndex = newOrder.findIndex(c => c.id === targetId)
    if (sourceIndex === -1 || targetIndex === -1) return

    const [moved] = newOrder.splice(sourceIndex, 1)
    newOrder.splice(targetIndex, 0, moved)
    setOrderedCategories(newOrder)
    setDraggedId(null)
    setDragOverId(null)
    dragCounter.current = {}

    setSaving(true)
    await reorderCategories(newOrder.map(c => c.id))
    setSaving(false)
    router.refresh()
  }, [orderedCategories, router])

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const result = await deleteCategory(deleteTarget.id)
    if (!result.success) {
      alert(result.error)
    }
    setDeleteTarget(null)
    setDeleting(false)
    router.refresh()
  }

  function displayName(item: { name: string; nameEn: string | null }) {
    return lang === 'ar' ? item.name : (item.nameEn || item.name)
  }

  const addCategoryUrl = parentId
    ? `/admin/categories/new?parent=${parentId}`
    : '/admin/categories/new'

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      {breadcrumb.length > 0 && (
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
        </nav>
      )}

      {/* Header */}
      <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          {parentId && (
            <Link
              href={breadcrumb.length > 1 ? `/admin/categories?parent=${breadcrumb[breadcrumb.length - 2].id}` : '/admin/categories'}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronLeft className={`w-6 h-6 ${dir === 'rtl' ? '' : 'rotate-180'}`} />
            </Link>
          )}
          <h1 className="text-2xl font-bold text-gray-900">
            {parentId
              ? (lang === 'ar' ? parentName : (parentNameEn || parentName)) || t.categoryManagement.title
              : t.categoryManagement.title
            }
          </h1>
        </div>
        <Link href={addCategoryUrl}>
          <Button variant="primary" className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <Plus className="w-4 h-4" />
            {parentId ? (t.categoryManagement.addSubcategory || 'إضافة صنف فرعي') : t.categoryManagement.addCategory}
          </Button>
        </Link>
      </div>

      {/* Categories Table */}
      <Card>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {parentId
                  ? (t.categoryManagement.noSubcategories || 'لا توجد أصناف فرعية')
                  : t.categoryManagement.noCategories
                }
              </p>
              <Link href={addCategoryUrl} className="mt-4 inline-block">
                <Button variant="outline" className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <Plus className="w-4 h-4" />
                  {parentId ? (t.categoryManagement.addSubcategory || 'إضافة صنف فرعي') : t.categoryManagement.addCategory}
                </Button>
              </Link>
            </div>
          ) : (
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
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.categoryManagement.image}</th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.categoryManagement.categoryName}</th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.categoryManagement.slug}</th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.categoryManagement.subcategoriesCount || 'الفرعية'}</th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.categoryManagement.productsCount}</th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.userManagement.status}</th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.common.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {orderedCategories.map((cat) => {
                    const hasChildren = cat._count.children > 0
                    return (
                      <tr
                        key={cat.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, cat.id)}
                        onDragEnd={handleDragEnd}
                        onDragEnter={(e) => handleDragEnter(e, cat.id)}
                        onDragLeave={(e) => handleDragLeave(e, cat.id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, cat.id)}
                        className={`border-b border-gray-100 transition-colors ${
                          draggedId === cat.id
                            ? 'opacity-50'
                            : dragOverId === cat.id && draggedId
                              ? 'bg-blue-50 border-t-2 border-t-blue-400'
                              : 'hover:bg-gray-50'
                        } ${hasChildren ? 'cursor-pointer' : ''}`}
                      >
                        <td className="py-3">
                          <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 flex justify-center">
                            <GripVertical className="w-5 h-5" />
                          </div>
                        </td>
                        <td className="py-3">
                          {cat.image ? (
                            <img src={cat.image} alt={cat.name} className="w-12 h-12 object-cover rounded bg-gray-100" />
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-500">
                              {hasChildren ? <FolderOpen className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                            </div>
                          )}
                        </td>
                        <td className="py-3">
                          {hasChildren ? (
                            <Link
                              href={`/admin/categories?parent=${cat.id}`}
                              className="font-medium text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1"
                            >
                              {displayName(cat)}
                              <ChevronLeft className={`w-4 h-4 ${dir === 'rtl' ? '' : 'rotate-180'}`} />
                            </Link>
                          ) : (
                            <span className="font-medium text-gray-900">{displayName(cat)}</span>
                          )}
                        </td>
                        <td className="py-3 text-gray-500 font-mono text-xs">{cat.slug}</td>
                        <td className="py-3 text-gray-700">
                          {hasChildren ? (
                            <Link
                              href={`/admin/categories?parent=${cat.id}`}
                              className="text-blue-600 hover:underline"
                            >
                              {cat._count.children}
                            </Link>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 text-gray-700">{cat._count.products}</td>
                        <td className="py-3">
                          <Badge status={cat.isActive ? 'active' : 'inactive'}>
                            {cat.isActive ? t.productManagement.active : t.productManagement.inactive}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                            <Link href={`/admin/categories/${cat.id}`}>
                              <Button variant="ghost" size="sm">{t.common.edit}</Button>
                            </Link>
                            <button
                              onClick={() => setDeleteTarget({
                                id: cat.id,
                                name: displayName(cat),
                              })}
                              className="p-1.5 rounded text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                              title={t.common.delete}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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
            <p className="text-gray-600 mb-2">{t.categoryManagement.confirmDelete}</p>
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
