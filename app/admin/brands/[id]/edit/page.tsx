import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BrandForm } from '../../components/BrandForm'
import { db } from '@/lib/db'

export default async function EditBrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const brand = await db.brand.findUnique({
    where: { id },
  })

  if (!brand) {
    notFound()
  }

  // Convert Prisma object to plain object for Client Component
  const plainBrand = {
    id: brand.id,
    name: brand.name,
    nameEn: brand.nameEn,
    slug: brand.slug,
    logo: brand.logo,
    description: brand.description,
    descriptionEn: brand.descriptionEn,
    isActive: brand.isActive,
    sortOrder: brand.sortOrder,
    createdAt: brand.createdAt,
    updatedAt: brand.updatedAt,
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/admin/brands/${id}`} className="text-gray-500 hover:text-gray-700">
          <ArrowRight className="w-5 h-5 rotate-180" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">تعديل الماركة</h1>
          <p className="text-sm text-gray-600 mt-1">{brand.name}</p>
        </div>
      </div>

      <BrandForm brand={plainBrand} />
    </div>
  )
}
