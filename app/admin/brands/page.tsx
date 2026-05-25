import Link from 'next/link'
import { Plus, Edit, Trash2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getBrands, deleteBrand } from '@/actions/brands'
import { BrandDeleteForm } from '@/app/admin/brands/components/BrandDeleteForm'
import { formatCurrency } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function BrandsPage() {
  const brands = await getBrands({})

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">الماركات</h1>
          <p className="text-sm text-gray-600 mt-1">إدارة الماركات والمنتجات المرتبطة بها</p>
        </div>
        <Link href="/admin/brands/new">
          <Button variant="primary" className="inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            ماركة جديدة
          </Button>
        </Link>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {brands.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm mb-4">لم يتم إضافة أي ماركات بعد</p>
            <Link href="/admin/brands/new">
              <Button variant="primary" size="sm">
                إضافة الماركة الأولى
              </Button>
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-right px-6 py-3 text-sm font-semibold text-gray-900">الماركة</th>
                <th className="text-right px-6 py-3 text-sm font-semibold text-gray-900">العدد</th>
                <th className="text-right px-6 py-3 text-sm font-semibold text-gray-900">الحالة</th>
                <th className="text-right px-6 py-3 text-sm font-semibold text-gray-900">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {brands.map((brand: any) => (
                <tr key={brand.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {brand.logo && (
                        <img src={brand.logo} alt={brand.name} className="w-10 h-10 rounded object-cover" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{brand.name}</p>
                        <p className="text-xs text-gray-500">{brand.nameEn}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                      {brand._count.products} منتج
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {brand.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                        ● مفعل
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 text-gray-600 text-xs font-medium">
                        ● معطل
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/brands/${brand.id}`} title="عرض المنتجات">
                        <button className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                      </Link>
                      <Link href={`/admin/brands/${brand.id}/edit`} title="تعديل">
                        <button className="p-2 hover:bg-yellow-50 rounded-lg text-yellow-600 transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                      </Link>
                      <BrandDeleteForm brandId={brand.id} />{' '}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
