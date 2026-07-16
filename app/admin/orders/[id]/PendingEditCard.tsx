'use client'

import { useState } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/lib/LanguageContext'
import { formatCurrency } from '@/lib/utils'
import { approveOrderEdit, rejectOrderEdit } from '@/actions/order-edits'
import { Pencil, Plus, Minus, Trash2, Check, X } from 'lucide-react'

interface DiffLine {
  productName: string
  productNameEn: string | null
  variantSize: string | null
  variantSizeEn: string | null
  variantOptionName: string | null
  variantOptionNameEn: string | null
  unitLabel: string | null
  unitLabelEn: string | null
  quantity: number
  pricePerUnit: number
  totalPrice: number
}

interface DiffChange { before: DiffLine; after: DiffLine; quantityDelta: number }
interface FieldChange { before: string | null; after: string | null }

export interface OrderEditDiff {
  added: DiffLine[]
  removed: DiffLine[]
  changed: DiffChange[]
  unchanged: DiffLine[]
  delivery: {
    address?: FieldChange
    addressDetails?: FieldChange
    city?: FieldChange
    notes?: FieldChange
  }
  totals: {
    before: { productsTotal: number; deliveryFee: number; grandTotal: number }
    after: { productsTotal: number; deliveryFee: number; grandTotal: number }
  }
}

interface Props {
  editRequest: {
    id: string
    diff: unknown
    estimatedTotal: number | null
    estimatedDeliveryFee: number | null
    buyerMessage: string | null
    createdAt: Date | string
  }
}

export function PendingEditCard({ editRequest }: Props) {
  const { lang, dir } = useLanguage()
  const ar = lang === 'ar'
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const diff = editRequest.diff as OrderEditDiff | null
  if (!diff) return null

  const lineName = (l: DiffLine) => {
    const base = ar ? l.productName : (l.productNameEn || l.productName)
    const size = ar ? l.variantSize : (l.variantSizeEn || l.variantSize)
    const opt = ar ? l.variantOptionName : (l.variantOptionNameEn || l.variantOptionName)
    const unit = ar ? l.unitLabel : (l.unitLabelEn || l.unitLabel)
    return [base, size, opt, unit].filter(Boolean).join(' · ')
  }

  async function handle(action: 'approve' | 'reject') {
    setBusy(action)
    setError(null)
    const fn = action === 'approve' ? approveOrderEdit : rejectOrderEdit
    const result = await fn(editRequest.id, note.trim() || undefined)
    if (!result.success) setError(result.error || 'Failed')
    setBusy(null)
  }

  const t = {
    title: ar ? 'طلب تعديل من العميل' : 'Customer edit request',
    subtitle: ar ? 'راجع التغييرات المطلوبة قبل القبول' : 'Review the requested changes before approving',
    added: ar ? 'إضافة' : 'Added',
    removed: ar ? 'إزالة' : 'Removed',
    changed: ar ? 'تعديل الكمية' : 'Quantity change',
    delivery: ar ? 'تغيير معلومات التوصيل' : 'Delivery changes',
    address: ar ? 'العنوان' : 'Address',
    addressDetails: ar ? 'تفاصيل العنوان' : 'Address details',
    city: ar ? 'المدينة' : 'City',
    notes: ar ? 'ملاحظات' : 'Notes',
    message: ar ? 'رسالة العميل' : 'Customer message',
    before: ar ? 'الحالي' : 'Current',
    after: ar ? 'بعد التعديل' : 'After',
    products: ar ? 'إجمالي المنتجات' : 'Products total',
    fee: ar ? 'رسوم التوصيل' : 'Delivery fee',
    grand: ar ? 'الإجمالي' : 'Grand total',
    approve: ar ? 'قبول وتطبيق التعديل' : 'Approve & apply',
    reject: ar ? 'رفض' : 'Reject',
    notePlaceholder: ar ? 'ملاحظة للعميل (اختياري)' : 'Note to customer (optional)',
    empty: ar ? '—' : '—',
  }

  return (
    <Card className="border-2 border-amber-300 bg-amber-50/40">
      <CardHeader className="bg-amber-100/60">
        <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <Pencil className="w-5 h-5 text-amber-700" />
          <div className={dir === 'rtl' ? 'text-right' : 'text-left'}>
            <h2 className="text-lg font-semibold text-amber-900">{t.title}</h2>
            <p className="text-xs text-amber-700">{t.subtitle}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {editRequest.buyerMessage && (
          <div className="p-3 bg-white border border-amber-200 rounded-lg">
            <p className="text-xs font-medium text-gray-500">{t.message}</p>
            <p className="text-sm text-gray-800 mt-0.5">{editRequest.buyerMessage}</p>
          </div>
        )}

        {diff.added.length > 0 && (
          <div>
            <p className="flex items-center gap-1 text-sm font-semibold text-green-700 mb-1"><Plus className="w-4 h-4" />{t.added}</p>
            <ul className="space-y-1">
              {diff.added.map((l, i) => (
                <li key={i} className="text-sm bg-green-50 border border-green-200 rounded px-3 py-1.5 flex justify-between gap-2">
                  <span className="text-gray-800">{lineName(l)}</span>
                  <span className="text-gray-600 whitespace-nowrap">×{l.quantity} · {formatCurrency(l.totalPrice)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {diff.changed.length > 0 && (
          <div>
            <p className="flex items-center gap-1 text-sm font-semibold text-blue-700 mb-1"><Pencil className="w-4 h-4" />{t.changed}</p>
            <ul className="space-y-1">
              {diff.changed.map((c, i) => (
                <li key={i} className="text-sm bg-blue-50 border border-blue-200 rounded px-3 py-1.5 flex justify-between gap-2">
                  <span className="text-gray-800">{lineName(c.after)}</span>
                  <span className="text-gray-600 whitespace-nowrap flex items-center gap-1">
                    <span className="line-through text-gray-400">×{c.before.quantity}</span>
                    <span className="font-medium">×{c.after.quantity}</span>
                    {c.quantityDelta > 0
                      ? <Plus className="w-3 h-3 text-green-600" />
                      : <Minus className="w-3 h-3 text-red-600" />}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {diff.removed.length > 0 && (
          <div>
            <p className="flex items-center gap-1 text-sm font-semibold text-red-700 mb-1"><Trash2 className="w-4 h-4" />{t.removed}</p>
            <ul className="space-y-1">
              {diff.removed.map((l, i) => (
                <li key={i} className="text-sm bg-red-50 border border-red-200 rounded px-3 py-1.5 flex justify-between gap-2 line-through text-gray-500">
                  <span>{lineName(l)}</span>
                  <span className="whitespace-nowrap">×{l.quantity}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {Object.keys(diff.delivery).length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">{t.delivery}</p>
            <div className="space-y-1 text-sm">
              {(['address', 'addressDetails', 'city', 'notes'] as const).map((k) => {
                const change = diff.delivery[k]
                if (!change) return null
                const label = t[k]
                return (
                  <div key={k} className="bg-white border border-gray-200 rounded px-3 py-1.5">
                    <span className="text-xs text-gray-500">{label}: </span>
                    <span className="line-through text-gray-400">{change.before || t.empty}</span>
                    <span className="mx-1">→</span>
                    <span className="font-medium text-gray-800">{change.after || t.empty}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Totals before → after */}
        <div className="bg-white border border-amber-200 rounded-lg p-3 text-sm">
          <div className="grid grid-cols-3 gap-2 items-center">
            <span className="text-gray-500 text-xs"></span>
            <span className="text-gray-500 text-xs text-center">{t.before}</span>
            <span className="text-amber-700 text-xs text-center font-medium">{t.after}</span>

            <span className="text-gray-600">{t.products}</span>
            <span className="text-center text-gray-500">{formatCurrency(diff.totals.before.productsTotal)}</span>
            <span className="text-center font-medium">{formatCurrency(diff.totals.after.productsTotal)}</span>

            <span className="text-gray-600">{t.fee}</span>
            <span className="text-center text-gray-500">{formatCurrency(diff.totals.before.deliveryFee)}</span>
            <span className="text-center font-medium">{formatCurrency(diff.totals.after.deliveryFee)}</span>

            <span className="text-gray-900 font-semibold">{t.grand}</span>
            <span className="text-center text-gray-500 line-through">{formatCurrency(diff.totals.before.grandTotal)}</span>
            <span className="text-center font-bold text-amber-700">{formatCurrency(diff.totals.after.grandTotal)}</span>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t.notePlaceholder}
          rows={2}
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
        />

        <div className={`flex gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <Button onClick={() => handle('approve')} disabled={busy !== null} className="flex-1 bg-green-600 hover:bg-green-700">
            <Check className="w-4 h-4" /> {busy === 'approve' ? '…' : t.approve}
          </Button>
          <Button variant="outline" onClick={() => handle('reject')} disabled={busy !== null} className="flex-1 border-red-300 text-red-600 hover:bg-red-50">
            <X className="w-4 h-4" /> {busy === 'reject' ? '…' : t.reject}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
