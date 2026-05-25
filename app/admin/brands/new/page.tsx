import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { BrandForm } from '../components/BrandForm'

export default function NewBrandPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/brands" className="text-gray-500 hover:text-gray-700">
          <ArrowRight className="w-5 h-5 rotate-180" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ماركة جديدة</h1>
          <p className="text-sm text-gray-600 mt-1">أضف ماركة جديدة للمنصة</p>
        </div>
      </div>

      <BrandForm />
    </div>
  )
}
