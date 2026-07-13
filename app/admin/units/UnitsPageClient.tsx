'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Boxes, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/lib/LanguageContext'
import { createUnitType, updateUnitType, deleteUnitType } from '@/actions/unit-types'

interface UnitTypeRow {
  id: string
  code: string
  name: string
  nameEn: string | null
  defaultPieces: number
  isActive: boolean
  sortOrder: number
  usageCount: number
}

interface Props {
  unitTypes: UnitTypeRow[]
}

const inputCls = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500'

export function UnitsPageClient({ unitTypes }: Props) {
  const { dir } = useLanguage()
  const router = useRouter()
  const rowDir = dir === 'rtl' ? 'flex-row-reverse' : ''

  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  // null = closed, 'new' = add form, otherwise = id of unit being edited
  const [editing, setEditing] = useState<'new' | string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<UnitTypeRow | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Form fields
  const [formName, setFormName] = useState('')
  const [formNameEn, setFormNameEn] = useState('')
  const [formPieces, setFormPieces] = useState(1)

  function openAdd() {
    setFormName('')
    setFormNameEn('')
    setFormPieces(1)
    setError(null)
    setEditing('new')
  }

  function openEdit(ut: UnitTypeRow) {
    setFormName(ut.name)
    setFormNameEn(ut.nameEn || '')
    setFormPieces(ut.defaultPieces)
    setError(null)
    setEditing(ut.id)
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSaving(true)
    setError(null)

    const formData = new FormData()
    formData.set('name', formName.trim())
    formData.set('nameEn', formNameEn.trim())
    formData.set('defaultPieces', String(formPieces || 1))

    const result = editing === 'new'
      ? await createUnitType(formData)
      : await updateUnitType(editing as string, formData)

    setIsSaving(false)
    if (result.success) {
      setEditing(null)
      router.refresh()
    } else {
      setError(result.error || Object.values(result.errors || {})[0]?.[0] || 'حدث خطأ')
    }
  }

  async function handleToggleActive(ut: UnitTypeRow) {
    setTogglingId(ut.id)
    setError(null)
    const formData = new FormData()
    formData.set('isActive', ut.isActive ? 'false' : 'true')
    const result = await updateUnitType(ut.id, formData)
    setTogglingId(null)
    if (result.success) {
      router.refresh()
    } else {
      setError(result.error || 'حدث خطأ')
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    setIsSaving(true)
    setError(null)
    const result = await deleteUnitType(confirmDelete.id)
    setIsSaving(false)
    setConfirmDelete(null)
    if (result.success) {
      router.refresh()
    } else {
      setError(result.error || 'حدث خطأ')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex items-center justify-between ${rowDir}`}>
        <div className={dir === 'rtl' ? 'text-right' : 'text-left'}>
          <h1 className="text-3xl font-bold text-gray-900">وحدات البيع</h1>
          <p className="text-sm text-gray-600 mt-1">
            إدارة أنواع الوحدات المتاحة عند إضافة وتعديل المنتجات (حبة، دزينة، كرتونة...)
          </p>
        </div>
        <Button variant="primary" className="inline-flex items-center gap-2" onClick={openAdd}>
          <Plus className="w-4 h-4" />
          وحدة جديدة
        </Button>
      </div>

      {error && !editing && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {unitTypes.length === 0 ? (
          <div className="text-center py-12">
            <Boxes className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-4">لم يتم إضافة أي وحدات بعد</p>
            <Button variant="primary" size="sm" onClick={openAdd}>إضافة الوحدة الأولى</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-gray-900">الوحدة</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-gray-900">القطع الافتراضية</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-gray-900">الاستخدام</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-gray-900">الحالة</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-gray-900">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {unitTypes.map((ut) => (
                  <tr key={ut.id} className={`hover:bg-gray-50 transition-colors ${!ut.isActive ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                          <Boxes className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{ut.name}</p>
                          {ut.nameEn && <p className="text-xs text-gray-500" dir="ltr">{ut.nameEn}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {ut.defaultPieces > 1 ? `${ut.defaultPieces} قطعة` : 'قطعة واحدة'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${ut.usageCount > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-500'}`}>
                        {ut.usageCount > 0 ? `مستخدمة في ${ut.usageCount} وحدة بيع` : 'غير مستخدمة'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(ut)}
                        disabled={togglingId === ut.id}
                        title={ut.isActive ? 'اضغط للتعطيل' : 'اضغط للتفعيل'}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                          ut.isActive
                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {togglingId === ut.id ? <Loader2 className="w-3 h-3 animate-spin" /> : '●'}
                        {ut.isActive ? 'مفعلة' : 'معطلة'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          title="تعديل"
                          onClick={() => openEdit(ut)}
                          className="p-2 hover:bg-yellow-50 rounded-lg text-yellow-600 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title={ut.usageCount > 0 ? 'لا يمكن الحذف — الوحدة مستخدمة في منتجات' : 'حذف'}
                          onClick={() => ut.usageCount === 0 && setConfirmDelete(ut)}
                          disabled={ut.usageCount > 0}
                          className={`p-2 rounded-lg transition-colors ${
                            ut.usageCount > 0
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-red-500 hover:bg-red-50'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">
        ملاحظة: الوحدة المستخدمة في منتجات لا يمكن حذفها، لكن يمكن تعطيلها فتختفي من قائمة الاختيار عند إضافة منتج جديد دون التأثير على المنتجات الحالية.
      </p>

      {/* Add / Edit modal */}
      {editing !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !isSaving && setEditing(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className={`flex items-center justify-between mb-4 ${rowDir}`}>
              <h3 className="text-lg font-bold text-gray-900">
                {editing === 'new' ? 'إضافة وحدة جديدة' : 'تعديل الوحدة'}
              </h3>
              <button type="button" onClick={() => setEditing(null)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-3">{error}</div>
            )}

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم الوحدة (عربي) *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="مثال: كرتونة"
                  className={inputCls}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم الوحدة (إنجليزي)</label>
                <input
                  type="text"
                  value={formNameEn}
                  onChange={(e) => setFormNameEn(e.target.value)}
                  placeholder="e.g., Carton"
                  dir="ltr"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">عدد القطع الافتراضي</label>
                <input
                  type="number"
                  min="1"
                  value={formPieces}
                  onChange={(e) => setFormPieces(parseInt(e.target.value) || 1)}
                  className={inputCls}
                />
                <p className="text-[11px] text-gray-400 mt-1">يُعبّأ تلقائياً في حقل «عدد القطع» عند اختيار هذه الوحدة في المنتج (مثال: دزينة = 12)</p>
              </div>

              <div className={`flex items-center gap-2 pt-2 ${dir === 'rtl' ? 'flex-row-reverse' : 'justify-end'}`}>
                <Button type="submit" variant="primary" isLoading={isSaving}>
                  {editing === 'new' ? 'إضافة' : 'حفظ التعديلات'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>إلغاء</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className={`flex items-center gap-3 ${rowDir}`}>
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 text-red-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </span>
              <h3 className={`text-base font-bold text-gray-900 flex-1 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                حذف الوحدة
              </h3>
            </div>
            <p className={`text-sm text-gray-600 mt-3 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
              هل أنت متأكد من حذف وحدة{' '}
              <span className="font-semibold text-gray-900">«{confirmDelete.name}»</span>؟
              لن تظهر بعد الآن في قائمة الوحدات عند إضافة أو تعديل المنتجات.
            </p>
            <div className={`flex items-center gap-2 mt-5 ${dir === 'rtl' ? 'flex-row-reverse' : 'justify-end'}`}>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'جاري الحذف...' : 'حذف'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
