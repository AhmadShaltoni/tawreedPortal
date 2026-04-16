'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Trash2, Upload, X, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { useLanguage } from '@/lib/LanguageContext'
import { updateCategory, deleteCategory } from '@/actions/categories'

interface CategoryNode {
  id: string
  name: string
  nameEn: string | null
  slug: string
  parentId: string | null
  _count: { products: number; children: number }
  children: CategoryNode[]
}

interface Props {
  category: {
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
    parent: { id: string; name: string; nameEn: string | null; slug: string } | null
  }
  categoryTree: CategoryNode[]
}

// Build the path of ancestor ids from tree to a target id
function findPathInTree(nodes: CategoryNode[], targetId: string): string[] | null {
  for (const node of nodes) {
    if (node.id === targetId) return [node.id]
    if (node.children.length > 0) {
      const childPath = findPathInTree(node.children, targetId)
      if (childPath) return [node.id, ...childPath]
    }
  }
  return null
}

// Remove a category and all its descendants from the tree (to prevent circular reference)
function filterTree(nodes: CategoryNode[], excludeId: string): CategoryNode[] {
  return nodes
    .filter(n => n.id !== excludeId)
    .map(n => ({ ...n, children: filterTree(n.children, excludeId) }))
}

export function EditCategoryForm({ category, categoryTree }: Props) {
  const { t, dir, lang } = useLanguage()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(category.image)

  // Filter out the current category (and its descendants) from the tree to prevent circular moves
  const filteredTree = useMemo(() => filterTree(categoryTree, category.id), [categoryTree, category.id])

  // Initialize selectedPath from the current parentId
  const initialPath = useMemo(() => {
    if (!category.parentId) return []
    const path = findPathInTree(filteredTree, category.parentId)
    return path || []
  }, [category.parentId, filteredTree])

  const [selectedPath, setSelectedPath] = useState<string[]>(initialPath)

  function displayName(item: { name: string; nameEn: string | null }) {
    return lang === 'ar' ? item.name : (item.nameEn || item.name)
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  function handleRemoveImage() {
    setImagePreview(null)
    const imageInput = document.getElementById('category-image') as HTMLInputElement
    if (imageInput) imageInput.value = ''
  }

  // Cascading dropdown levels
  const dropdownLevels = useMemo(() => {
    const levels: { options: CategoryNode[]; selectedId: string | null }[] = []
    let currentChildren = filteredTree
    for (let i = 0; i < selectedPath.length; i++) {
      const selectedId = selectedPath[i]
      levels.push({ options: currentChildren, selectedId })
      const selected = currentChildren.find(c => c.id === selectedId)
      if (selected && selected.children.length > 0) {
        currentChildren = selected.children
      } else {
        break
      }
    }
    // Show next level if current selection has children
    if (currentChildren.length > 0) {
      const alreadyShown = levels.length > 0 && levels[levels.length - 1]?.options === currentChildren
      if (!alreadyShown) {
        levels.push({ options: currentChildren, selectedId: null })
      }
    }
    return levels
  }, [filteredTree, selectedPath])

  function handleLevelChange(levelIndex: number, categoryId: string) {
    if (categoryId === '') {
      setSelectedPath(prev => prev.slice(0, levelIndex))
    } else {
      setSelectedPath(prev => {
        const next = prev.slice(0, levelIndex)
        next[levelIndex] = categoryId
        return next
      })
    }
  }

  const selectedParentId = selectedPath.length > 0 ? selectedPath[selectedPath.length - 1] : null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    formData.set('isActive', String(category.isActive))
    // Always set parentId — empty string means move to root
    formData.set('parentId', selectedParentId || '')

    const result = await updateCategory(category.id, formData)

    if (result.success) {
      router.push('/admin/categories')
    } else {
      setError(result.error || null)
      setFieldErrors(result.errors || {})
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!confirm(t.categoryManagement.confirmDelete)) return
    const result = await deleteCategory(category.id)
    if (result.success) {
      router.push('/admin/categories')
    } else {
      setError(result.error || null)
    }
  }

  const canDelete = category._count.products === 0 && category._count.children === 0

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <Link href="/admin/categories" className="text-gray-500 hover:text-gray-700">
            <ArrowRight className={`w-5 h-5 ${dir === 'rtl' ? '' : 'rotate-180'}`} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{t.categoryManagement.editCategory}</h1>
        </div>
        <Button variant="danger" size="sm" onClick={handleDelete} disabled={!canDelete}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">{t.categoryManagement.editCategory}</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input 
              label={t.categoryManagement.categoryName} 
              name="name" 
              required 
              defaultValue={category.name} 
              error={fieldErrors.name?.[0]} 
            />
            <Input 
              label={t.categoryManagement.categoryNameEn} 
              name="nameEn" 
              dir="ltr" 
              defaultValue={category.nameEn || ''} 
              error={fieldErrors.nameEn?.[0]} 
            />
            <Input 
              label={t.categoryManagement.slug} 
              name="slug" 
              dir="ltr" 
              required 
              defaultValue={category.slug} 
              error={fieldErrors.slug?.[0]} 
            />

            {/* Image Upload Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {t.productManagement?.categoryImage || 'صورة الصنف'}
              </label>
              <div className={`border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition ${dir === 'rtl' ? 'rtl' : ''}`}>
                <input
                  type="file"
                  name="image"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                  id="category-image"
                />
                <label htmlFor="category-image" className="cursor-pointer flex flex-col items-center gap-2">
                  {imagePreview ? (
                    <>
                      <div className="relative">
                        <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            handleRemoveImage()
                          }}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="text-sm text-blue-600">{t.common?.changeImage || 'تغيير الصورة'}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400" />
                      <span className="text-sm text-gray-600">{t.productManagement?.uploadImage || 'اضغط لرفع صورة'}</span>
                      <span className="text-xs text-gray-500">{t.productManagement?.imageSizeLimit || 'JPEG, PNG أو WebP - حد أقصى 5MB'}</span>
                    </>
                  )}
                </label>
              </div>
              {fieldErrors.image && <p className="text-sm text-red-600">{fieldErrors.image[0]}</p>}
            </div>

            <Input 
              label={t.categoryManagement.sortOrder} 
              name="sortOrder" 
              type="number" 
              min="0" 
              defaultValue={category.sortOrder} 
              error={fieldErrors.sortOrder?.[0]} 
            />

            {/* Cascading Parent Category Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                {t.categoryManagement.parentCategory || 'الصنف الرئيسي'}
              </label>
              <p className="text-xs text-gray-500">
                {lang === 'ar'
                  ? 'اختر الصنف الرئيسي لنقل هذا الصنف، أو اتركه فارغاً ليكون صنفاً رئيسياً'
                  : 'Select a parent to move this category, or leave empty for root level'}
              </p>
              {dropdownLevels.map((level, idx) => (
                <div key={idx} className={`${idx > 0 ? 'ps-4 border-s-2 border-blue-200' : ''}`}>
                  <div className="relative">
                    <select
                      value={level.selectedId || ''}
                      onChange={(e) => handleLevelChange(idx, e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 appearance-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      dir={dir}
                    >
                      <option value="">
                        {idx === 0
                          ? (lang === 'ar' ? '— صنف رئيسي (بدون أب) —' : '— Root category (no parent) —')
                          : (lang === 'ar' ? '— بدون تحديد —' : '— None —')}
                      </option>
                      {level.options.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {displayName(cat)}
                          {cat.children.length > 0 ? ` (${cat.children.length})` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none ${dir === 'rtl' ? 'left-3' : 'right-3'}`} />
                  </div>
                </div>
              ))}
            </div>

            {/* Info section */}
            <div className="pt-2 space-y-1 text-sm text-gray-500">
              <p>{t.categoryManagement.subcategoriesCount || 'الأصناف الفرعية'}: {category._count.children}</p>
              <p>{t.categoryManagement.productsCount}: {category._count.products}</p>
            </div>
          </CardContent>
        </Card>

        <div className={`flex items-center gap-4 mt-6 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>{t.common.save}</Button>
          <Link href="/admin/categories">
            <Button type="button" variant="outline">{t.common.cancel}</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
