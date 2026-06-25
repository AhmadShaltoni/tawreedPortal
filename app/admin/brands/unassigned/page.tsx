import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { db } from '@/lib/db'
import { UnassignedProductManager } from '../components/UnassignedProductManager'

export const dynamic = 'force-dynamic'

export default async function UnassignedProductsPage() {
  const brands = await db.brand.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { sortOrder: 'asc' },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/brands" className="text-gray-500 hover:text-gray-700">
          <ArrowRight className="w-5 h-5 rotate-180" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">منتجات بدون ماركة</h1>
          <p className="text-sm text-gray-600">حدّد المنتجات وقم بإسنادها إلى ماركة لتسهيل التصنيف</p>
        </div>
      </div>

      <UnassignedProductManager brands={brands} />
    </div>
  )
}
