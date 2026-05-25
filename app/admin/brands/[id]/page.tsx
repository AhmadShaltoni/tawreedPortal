import { ArrowRight, Plus } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { Button } from '@/components/ui/Button'
import { BrandProductManager } from '../components/BrandProductManager'

export const dynamic = 'force-dynamic'

export default async function BrandDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const brand = await db.brand.findUnique({
    where: { id },
    include: {
      _count: {
        select: { products: true },
      },
    },
  })

  if (!brand) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/brands" className="text-gray-500 hover:text-gray-700">
            <ArrowRight className="w-5 h-5 rotate-180" />
          </Link>
          <div className="flex items-center gap-3">
            {brand.logo && (
              <img src={brand.logo} alt={brand.name} className="w-12 h-12 rounded-lg object-cover border border-gray-200" />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{brand.name}</h1>
              <p className="text-sm text-gray-600">{brand.nameEn}</p>
            </div>
          </div>
        </div>
        <Link href={`/admin/brands/${id}/edit`}>
          <Button variant="outline">تعديل الماركة</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">إجمالي المنتجات</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{brand._count.products}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">الحالة</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">
            {brand.isActive ? <span className="text-green-600">● مفعل</span> : <span className="text-gray-600">● معطل</span>}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">تاريخ الإضافة</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">
            {new Date(brand.createdAt).toLocaleDateString('ar-JO')}
          </p>
        </div>
      </div>

      {/* Product Manager */}
      <BrandProductManager brandId={id} />
    </div>
  )
}
