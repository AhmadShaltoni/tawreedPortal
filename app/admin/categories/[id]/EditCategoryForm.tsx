'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Trash2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { useLanguage } from '@/lib/LanguageContext'
import { updateCategory, deleteCategory } from '@/actions/categories'

interface Props {
  category: {
    id: string
    name: string
    nameEn: string | null
    slug: string
    image: string | null
    sortOrder: number
    isActive: boolean
    _count: { products: number }
  }
}

export function EditCategoryForm({ category }: Props) {
  const { t, dir } = useLanguage()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(category.image)

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    formData.set('isActive', String(category.isActive))

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

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <Link href="/admin/categories" className="text-gray-500 hover:text-gray-700">
            <ArrowRight className={`w-5 h-5 ${dir === 'rtl' ? '' : 'rotate-180'}`} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{t.categoryManagement.editCategory}</h1>
        </div>
        <Button variant="danger" size="sm" onClick={handleDelete} disabled={category._count.products > 0}>
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
            <p className="text-sm text-gray-500">{t.categoryManagement.productsCount}: {category._count.products}</p>
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
