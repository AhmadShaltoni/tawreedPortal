'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { useLanguage } from '@/lib/LanguageContext'
import { updateProduct, deleteProduct } from '@/actions/products'

interface Props {
  product: {
    id: string
    name: string
    nameEn: string | null
    description: string | null
    descriptionEn: string | null
    price: number
    compareAtPrice: number | null
    image: string | null
    categoryId: string
    unit: string
    sku: string | null
    barcode: string | null
    stock: number
    minOrderQuantity: number
    isActive: boolean
  }
  categories: Array<{ id: string; name: string; nameEn: string | null; slug: string }>
}

const UNIT_OPTIONS = [
  { value: 'KG', label: 'كيلو' },
  { value: 'GRAM', label: 'جرام' },
  { value: 'LITER', label: 'لتر' },
  { value: 'PIECE', label: 'حبة' },
  { value: 'PACK', label: 'عبوة' },
  { value: 'BOX', label: 'صندوق' },
  { value: 'CARTON', label: 'كرتون' },
  { value: 'DOZEN', label: 'درزن' },
]

export function EditProductForm({ product, categories }: Props) {
  const { t, dir, lang } = useLanguage()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setFieldErrors({})

    const formData = new FormData(e.currentTarget)
    formData.set('isActive', String(product.isActive))

    const result = await updateProduct(product.id, formData)

    if (result.success) {
      router.push('/admin/products')
    } else {
      setError(result.error || null)
      setFieldErrors(result.errors || {})
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!confirm(t.productManagement.confirmDelete)) return
    setIsDeleting(true)
    const result = await deleteProduct(product.id)
    if (result.success) {
      router.push('/admin/products')
    } else {
      setError(result.error || null)
      setIsDeleting(false)
    }
  }

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: lang === 'ar' ? c.name : (c.nameEn || c.name),
  }))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <Link href="/admin/products" className="text-gray-500 hover:text-gray-700">
            <ArrowRight className={`w-5 h-5 ${dir === 'rtl' ? '' : 'rotate-180'}`} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{t.productManagement.editProduct}</h1>
        </div>
        <Button variant="danger" size="sm" onClick={handleDelete} isLoading={isDeleting}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">{t.productManagement.editProduct}</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current image */}
            {product.image && (
              <div className="flex items-center gap-4">
                <Image src={product.image} alt={product.name} width={80} height={80} className="rounded-lg object-cover" />
                <p className="text-sm text-gray-500">{t.productManagement.image}</p>
              </div>
            )}

            <Input label={t.productManagement.productName} name="name" required defaultValue={product.name} error={fieldErrors.name?.[0]} />
            <Input label={t.productManagement.productNameEn} name="nameEn" dir="ltr" defaultValue={product.nameEn || ''} error={fieldErrors.nameEn?.[0]} />
            <Textarea label={t.productManagement.description} name="description" defaultValue={product.description || ''} error={fieldErrors.description?.[0]} />
            <Textarea label={t.productManagement.descriptionEn} name="descriptionEn" dir="ltr" defaultValue={product.descriptionEn || ''} error={fieldErrors.descriptionEn?.[0]} />

            <div className="grid grid-cols-2 gap-4">
              <Input label={t.productManagement.price} name="price" type="number" step="0.01" min="0" required defaultValue={product.price} error={fieldErrors.price?.[0]} />
              <Input label={t.productManagement.compareAtPrice} name="compareAtPrice" type="number" step="0.01" min="0" defaultValue={product.compareAtPrice || ''} error={fieldErrors.compareAtPrice?.[0]} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select label={t.productManagement.category} name="categoryId" options={categoryOptions} required defaultValue={product.categoryId} error={fieldErrors.categoryId?.[0]} />
              <Select label={t.productManagement.unit} name="unit" options={UNIT_OPTIONS} required defaultValue={product.unit} error={fieldErrors.unit?.[0]} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label={t.productManagement.stock} name="stock" type="number" min="0" required defaultValue={product.stock} error={fieldErrors.stock?.[0]} />
              <Input label={t.productManagement.minOrderQuantity} name="minOrderQuantity" type="number" min="1" required defaultValue={product.minOrderQuantity} error={fieldErrors.minOrderQuantity?.[0]} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label={t.productManagement.sku} name="sku" dir="ltr" defaultValue={product.sku || ''} error={fieldErrors.sku?.[0]} />
              <Input label={t.productManagement.barcode} name="barcode" dir="ltr" defaultValue={product.barcode || ''} error={fieldErrors.barcode?.[0]} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.productManagement.image}</label>
              <input
                type="file"
                name="image"
                accept="image/jpeg,image/png,image/webp"
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </CardContent>
        </Card>

        <div className={`flex items-center gap-4 mt-6 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>{t.common.save}</Button>
          <Link href="/admin/products">
            <Button type="button" variant="outline">{t.common.cancel}</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
