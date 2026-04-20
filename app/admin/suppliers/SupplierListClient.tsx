'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Plus, Trash2, X, Star, Edit2, Package, Phone, Mail, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useLanguage } from '@/lib/LanguageContext'
import { formatCurrency } from '@/lib/utils'
import { createSupplier, updateSupplier, deleteSupplier, setDefaultSupplier } from '@/actions/suppliers'

interface SupplierData {
  id: string
  name: string
  nameEn: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  isDefault: boolean
  isActive: boolean
  createdAt: Date
  _count: { products: number }
}

interface ProductData {
  id: string
  name: string
  nameEn: string | null
  image: string | null
  isActive: boolean
  category: { id: string; name: string; nameEn: string | null }
  variants: Array<{
    id: string
    size: string
    sizeEn: string | null
    stock: number
    isDefault: boolean
    units: Array<{ price: number; isDefault: boolean }>
  }>
}

interface Props {
  suppliers: SupplierData[]
  selectedSupplierId?: string
  supplierProducts: ProductData[] | null
}

export function SupplierListClient({ suppliers, selectedSupplierId, supplierProducts }: Props) {
  const { t, dir, lang } = useLanguage()
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<SupplierData | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SupplierData | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    const result = editingSupplier
      ? await updateSupplier(editingSupplier.id, formData)
      : await createSupplier(formData)

    if (result.success) {
      setShowForm(false)
      setEditingSupplier(null)
      router.refresh()
    } else {
      setError(result.error || 'حدث خطأ')
    }
    setIsSubmitting(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const result = await deleteSupplier(deleteTarget.id)
    if (result.success) {
      setDeleteTarget(null)
      router.refresh()
    } else {
      setError(result.error || 'حدث خطأ')
      setDeleting(false)
    }
    setDeleting(false)
  }

  async function handleSetDefault(id: string) {
    const result = await setDefaultSupplier(id)
    if (result.success) {
      router.refresh()
    } else {
      setError(result.error || 'حدث خطأ')
    }
  }

  function handleFilterBySupplier(supplierId: string) {
    if (supplierId) {
      router.push(`/admin/suppliers?supplier=${supplierId}`)
    } else {
      router.push('/admin/suppliers')
    }
  }

  const sm = t.supplierManagement || {} as Record<string, string>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <h1 className="text-2xl font-bold text-gray-900">{sm.title || 'إدارة الموردين'}</h1>
        <Button
          variant="primary"
          className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
          onClick={() => { setShowForm(true); setEditingSupplier(null); setError(null) }}
        >
          <Plus className="w-4 h-4" />
          {sm.addSupplier || 'إضافة مورد'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowForm(false); setEditingSupplier(null) }}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()} dir={dir}>
            <div className={`flex items-center justify-between mb-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-lg font-semibold text-gray-900">
                {editingSupplier ? (sm.editSupplier || 'تعديل المورد') : (sm.addSupplier || 'إضافة مورد')}
              </h3>
              <button onClick={() => { setShowForm(false); setEditingSupplier(null) }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label={sm.supplierName || 'اسم المورد'} name="name" required defaultValue={editingSupplier?.name || ''} />
              <Input label={sm.supplierNameEn || 'اسم المورد (إنجليزي)'} name="nameEn" dir="ltr" defaultValue={editingSupplier?.nameEn || ''} />
              <Input label={sm.phone || 'رقم الهاتف'} name="phone" dir="ltr" defaultValue={editingSupplier?.phone || ''} />
              <Input label={sm.email || 'البريد الإلكتروني'} name="email" type="email" dir="ltr" defaultValue={editingSupplier?.email || ''} />
              <Input label={sm.city || 'المدينة'} name="city" defaultValue={editingSupplier?.city || ''} />
              <Input label={sm.address || 'العنوان'} name="address" defaultValue={editingSupplier?.address || ''} />

              <div className={`flex gap-3 pt-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <Button type="submit" variant="primary" isLoading={isSubmitting}>
                  {editingSupplier ? (t.common.save || 'حفظ') : (sm.addSupplier || 'إضافة مورد')}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingSupplier(null) }}>
                  {t.common.cancel || 'إلغاء'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-12">
            {sm.noSuppliers || 'لا يوجد موردين'}
          </div>
        ) : (
          suppliers.map((supplier) => (
            <Card
              key={supplier.id}
              className={`relative transition-all ${supplier.isDefault ? 'ring-2 ring-yellow-400 bg-yellow-50/30' : ''} ${
                selectedSupplierId === supplier.id ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              {supplier.isDefault && (
                <div className={`absolute top-3 ${dir === 'rtl' ? 'left-3' : 'right-3'}`}>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                    <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                    {sm.defaultSupplier || 'افتراضي'}
                  </span>
                </div>
              )}
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{supplier.name}</h3>
                    {supplier.nameEn && <p className="text-sm text-gray-500" dir="ltr">{supplier.nameEn}</p>}
                  </div>

                  <div className="space-y-1 text-sm text-gray-600">
                    {supplier.phone && (
                      <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <span dir="ltr">{supplier.phone}</span>
                      </div>
                    )}
                    {supplier.email && (
                      <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        <span dir="ltr">{supplier.email}</span>
                      </div>
                    )}
                    {supplier.city && (
                      <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        <span>{supplier.city}</span>
                      </div>
                    )}
                  </div>

                  <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    <Package className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-blue-700">
                      {supplier._count.products} {sm.productsCount || 'منتج'}
                    </span>
                  </div>

                  <div className={`flex items-center gap-2 pt-2 border-t border-gray-100 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    {!supplier.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(supplier.id)}
                        className="text-xs"
                      >
                        <Star className="w-3 h-3 me-1" />
                        {sm.setAsDefault || 'تعيين كافتراضي'}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFilterBySupplier(supplier.id)}
                      className="text-xs"
                    >
                      <Package className="w-3 h-3 me-1" />
                      {sm.viewProducts || 'عرض المنتجات'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setEditingSupplier(supplier); setShowForm(true); setError(null) }}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <button
                      onClick={() => setDeleteTarget(supplier)}
                      className="p-1.5 rounded text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Filtered Products Section */}
      {selectedSupplierId && (
        <div className="space-y-4">
          <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <h2 className="text-lg font-semibold text-gray-900">
              {sm.supplierProducts || 'منتجات المورد'}: {suppliers.find(s => s.id === selectedSupplierId)?.name}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => handleFilterBySupplier('')}>
              <X className="w-4 h-4 me-1" />
              {sm.clearFilter || 'إلغاء الفلتر'}
            </Button>
          </div>

          <Card>
            <CardContent>
              {!supplierProducts || supplierProducts.length === 0 ? (
                <p className="text-center text-gray-500 py-8">{sm.noProductsForSupplier || 'لا يوجد منتجات لهذا المورد'}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.productManagement?.image || 'الصورة'}</th>
                        <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.productManagement?.productName || 'اسم المنتج'}</th>
                        <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.productManagement?.category || 'الصنف'}</th>
                        <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.productManagement?.price || 'السعر'}</th>
                        <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.productManagement?.stock || 'المخزون'}</th>
                        <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.common?.actions || 'إجراءات'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplierProducts.map((product) => (
                        <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden">
                              {product.image ? (
                                <Image src={product.image} alt={product.name} width={40} height={40} className="object-cover w-full h-full" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">📦</div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 font-medium text-gray-900">
                            {lang === 'ar' ? product.name : (product.nameEn || product.name)}
                          </td>
                          <td className="py-3 text-gray-600">
                            {lang === 'ar' ? product.category.name : (product.category.nameEn || product.category.name)}
                          </td>
                          <td className="py-3 font-medium text-gray-900">
                            {(() => {
                              const allPrices = product.variants.flatMap(v => v.units.map(u => u.price))
                              if (allPrices.length === 0) return '—'
                              const min = Math.min(...allPrices)
                              const max = Math.max(...allPrices)
                              return min === max ? formatCurrency(min) : `${formatCurrency(min)} - ${formatCurrency(max)}`
                            })()}
                          </td>
                          <td className="py-3">
                            {(() => {
                              const totalStock = product.variants.reduce((s, v) => s + v.stock, 0)
                              return <span className={totalStock <= 0 ? 'text-red-600 font-medium' : 'text-gray-700'}>{totalStock}</span>
                            })()}
                          </td>
                          <td className="py-3">
                            <Link href={`/admin/products/${product.id}`}>
                              <Button variant="ghost" size="sm">{t.common?.edit || 'تعديل'}</Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()} dir={dir}>
            <div className={`flex items-center justify-between mb-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-lg font-semibold text-gray-900">{t.common?.delete || 'حذف'}</h3>
              <button onClick={() => setDeleteTarget(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-2">{sm.confirmDelete || 'هل أنت متأكد من حذف هذا المورد؟'}</p>
            <p className="text-gray-900 font-medium mb-2">{deleteTarget.name}</p>
            {deleteTarget._count.products > 0 && (
              <p className="text-amber-600 text-sm mb-4">
                ⚠️ {sm.hasProducts || 'هذا المورد مرتبط بـ'} {deleteTarget._count.products} {sm.productsCount || 'منتج'}
              </p>
            )}
            <div className={`flex gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1">
                {t.common?.cancel || 'إلغاء'}
              </Button>
              <Button variant="danger" onClick={handleDelete} disabled={deleting} className="flex-1">
                {deleting ? (t.common?.loading || 'جاري...') : (t.common?.delete || 'حذف')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
