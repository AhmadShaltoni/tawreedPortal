'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { useLanguage } from '@/lib/LanguageContext'
import { createProduct } from '@/actions/products'

interface Props {
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

export function NewProductForm({ categories }: Props) {
  const { t, dir, lang } = useLanguage()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setFieldErrors({})

    const formData = new FormData(e.currentTarget)
    formData.set('isActive', 'true')

    const result = await createProduct(formData)

    if (result.success) {
      router.push('/admin/products')
    } else {
      setError(result.error || null)
      setFieldErrors(result.errors || {})
      setIsSubmitting(false)
    }
  }

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: lang === 'ar' ? c.name : (c.nameEn || c.name),
  }))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className={`flex items-center gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <Link href="/admin/products" className="text-gray-500 hover:text-gray-700">
          <ArrowRight className={`w-5 h-5 ${dir === 'rtl' ? '' : 'rotate-180'}`} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t.productManagement.addProduct}</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">{t.productManagement.addProduct}</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Product Name AR */}
            <Input
              label={t.productManagement.productName}
              name="name"
              required
              error={fieldErrors.name?.[0]}
            />

            {/* Product Name EN */}
            <Input
              label={t.productManagement.productNameEn}
              name="nameEn"
              dir="ltr"
              error={fieldErrors.nameEn?.[0]}
            />

            {/* Description AR */}
            <Textarea
              label={t.productManagement.description}
              name="description"
              error={fieldErrors.description?.[0]}
            />

            {/* Description EN */}
            <Textarea
              label={t.productManagement.descriptionEn}
              name="descriptionEn"
              dir="ltr"
              error={fieldErrors.descriptionEn?.[0]}
            />

            {/* Price & Compare at Price */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t.productManagement.price}
                name="price"
                type="number"
                step="0.01"
                min="0"
                required
                error={fieldErrors.price?.[0]}
              />
              <Input
                label={t.productManagement.compareAtPrice}
                name="compareAtPrice"
                type="number"
                step="0.01"
                min="0"
                error={fieldErrors.compareAtPrice?.[0]}
              />
            </div>

            {/* Category & Unit */}
            <div className="grid grid-cols-2 gap-4">
              <Select
                label={t.productManagement.category}
                name="categoryId"
                options={categoryOptions}
                required
                error={fieldErrors.categoryId?.[0]}
              />
              <Select
                label={t.productManagement.unit}
                name="unit"
                options={UNIT_OPTIONS}
                required
                error={fieldErrors.unit?.[0]}
              />
            </div>

            {/* Stock & Min Order */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t.productManagement.stock}
                name="stock"
                type="number"
                min="0"
                defaultValue="0"
                required
                error={fieldErrors.stock?.[0]}
              />
              <Input
                label={t.productManagement.minOrderQuantity}
                name="minOrderQuantity"
                type="number"
                min="1"
                defaultValue="1"
                required
                error={fieldErrors.minOrderQuantity?.[0]}
              />
            </div>

            {/* SKU & Barcode */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t.productManagement.sku}
                name="sku"
                dir="ltr"
                error={fieldErrors.sku?.[0]}
              />
              <Input
                label={t.productManagement.barcode}
                name="barcode"
                dir="ltr"
                error={fieldErrors.barcode?.[0]}
              />
            </div>

            {/* Image Upload */}
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

        {/* Submit */}
        <div className={`flex items-center gap-4 mt-6 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {t.productManagement.addProduct}
          </Button>
          <Link href="/admin/products">
            <Button type="button" variant="outline">{t.common.cancel}</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
