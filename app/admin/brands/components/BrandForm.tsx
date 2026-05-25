'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { createBrand, updateBrand } from '@/actions/brands'

interface BrandData {
  id: string  // Required when editing
  name: string
  nameEn?: string | null
  slug: string
  logo?: string | null
  description?: string | null
  descriptionEn?: string | null
  isActive?: boolean
  sortOrder?: number
  createdAt?: Date
  updatedAt?: Date
}

interface Props {
  brand?: BrandData | null
}

export function BrandForm({ brand }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(brand?.logo || null)
  const [slug, setSlug] = useState<string>(brand?.slug || '')
  const [name, setName] = useState<string>(brand?.name || '')

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setName(value)
    // Auto-generate slug if not brand edit mode
    if (!brand) {
      const autoSlug = value
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
      setSlug(autoSlug)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setFieldErrors({})

    const formData = new FormData(e.currentTarget)
    // Ensure name and slug are in FormData (they're controlled inputs)
    formData.set('name', name)
    formData.set('slug', slug)
    
    if (logoFile) {
      formData.set('logo', logoFile)
    }
    // Add isActive from checkbox
    const isActiveCheckbox = (e.currentTarget.querySelector('input[name="isActive"]') as HTMLInputElement)
    if (isActiveCheckbox) {
      formData.set('isActive', isActiveCheckbox.checked ? 'true' : 'false')
    }

    const result = brand ? await updateBrand(brand.id, formData) : await createBrand(formData)

    if (result.success) {
      router.push(brand ? `/admin/brands/${brand.id}` : '/admin/brands')
    } else {
      setError(result.error || null)
      setFieldErrors(result.errors || {})
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">معلومات الماركة</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name AR */}
          <Input
            label="اسم الماركة (عربي) *"
            name="name"
            value={name}
            onChange={handleNameChange}
            required
            error={fieldErrors.name?.[0]}
          />

          {/* Name EN */}
          <Input
            label="اسم الماركة (إنجليزي)"
            name="nameEn"
            defaultValue={brand?.nameEn || ''}
            dir="ltr"
            error={fieldErrors.nameEn?.[0]}
          />

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رابط المعرّف (Slug) *</label>
            <input
              type="text"
              name="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="auto-generated"
              dir="ltr"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">يُولّد تلقائياً من الاسم إن لم يُدخل</p>
            {fieldErrors.slug && <p className="text-sm text-red-600 mt-1">{fieldErrors.slug[0]}</p>}
          </div>

          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">شعار الماركة</label>
            {logoPreview && (
              <div className="mb-3">
                <img src={logoPreview} alt="Logo preview" className="w-24 h-24 rounded-lg object-cover border border-gray-200" />
              </div>
            )}
            <input
              type="file"
              name="logo"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleLogoChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="text-xs text-gray-500 mt-1">JPG, PNG أو WebP - الحد الأقصى 5MB</p>
          </div>

          {/* Active Status */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={brand?.isActive ?? true}
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
            />
            <span className="text-sm text-gray-700">تفعيل هذه الماركة</span>
          </label>
        </CardContent>
      </Card>

      {/* Buttons */}
      <div className="flex items-center gap-4">
        <Button type="submit" variant="primary" isLoading={isSubmitting}>
          {brand ? 'حفظ التغييرات' : 'إضافة الماركة'}
        </Button>
        <Link href={brand ? `/admin/brands/${brand.id}` : '/admin/brands'}>
          <Button type="button" variant="outline">
            إلغاء
          </Button>
        </Link>
      </div>
    </form>
  )
}
