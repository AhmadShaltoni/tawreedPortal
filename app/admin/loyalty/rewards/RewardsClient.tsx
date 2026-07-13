'use client'

import { useMemo, useState, useTransition } from 'react'
import Image from 'next/image'
import {
  Gift, Trash2, Plus, Pencil, X, CheckCircle2, XCircle, Loader2,
  Percent, Truck, Package, BadgePercent, Search,
} from 'lucide-react'
import { createReward, updateReward, deleteReward, toggleRewardActive } from '@/actions/loyalty-rewards'

type RewardType = 'FIXED_DISCOUNT' | 'PERCENTAGE_DISCOUNT' | 'FREE_DELIVERY' | 'FREE_PRODUCT' | 'CUSTOM'

interface ProductOption {
  id: string
  name: string
  image: string | null
}

interface RewardItem {
  id: string
  name: string
  nameEn: string | null
  description: string | null
  descriptionEn: string | null
  rewardType: RewardType
  pointsCost: number
  discountValue: number
  maxDiscountCap: number | null
  minOrderValue: number | null
  expirationDays: number
  usageLimit: number | null
  totalRedeemed: number
  isActive: boolean
  productId: string | null
  product: { id: string; name: string; nameEn: string | null; image: string | null; isActive: boolean } | null
}

interface Props {
  rewards: RewardItem[]
  products: ProductOption[]
}

const TYPE_META: Record<RewardType, { label: string; color: string; icon: React.ReactNode }> = {
  FIXED_DISCOUNT: { label: 'خصم ثابت (د.أ)', color: 'bg-blue-100 text-blue-800', icon: <BadgePercent className="w-4 h-4" /> },
  PERCENTAGE_DISCOUNT: { label: 'خصم نسبة %', color: 'bg-purple-100 text-purple-800', icon: <Percent className="w-4 h-4" /> },
  FREE_DELIVERY: { label: 'توصيل مجاني', color: 'bg-emerald-100 text-emerald-800', icon: <Truck className="w-4 h-4" /> },
  FREE_PRODUCT: { label: 'منتج مجاني 🎁', color: 'bg-orange-100 text-orange-800', icon: <Package className="w-4 h-4" /> },
  CUSTOM: { label: 'مكافأة خاصة', color: 'bg-gray-100 text-gray-800', icon: <Gift className="w-4 h-4" /> },
}

type Feedback = { type: 'success' | 'error'; message: string } | null

const inputClass =
  'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'

function rewardValueLabel(reward: RewardItem): string {
  switch (reward.rewardType) {
    case 'FIXED_DISCOUNT':
      return `خصم ${reward.discountValue} د.أ`
    case 'PERCENTAGE_DISCOUNT':
      return `خصم ${reward.discountValue}%${reward.maxDiscountCap ? ` (بحد أقصى ${reward.maxDiscountCap} د.أ)` : ''}`
    case 'FREE_DELIVERY':
      return 'توصيل مجاني للطلب'
    case 'FREE_PRODUCT':
      return reward.product ? `منتج مجاني: ${reward.product.name}` : 'منتج مجاني'
    default:
      return reward.description || 'مكافأة خاصة'
  }
}

function ProductPicker({
  products,
  value,
  onChange,
}: {
  products: ProductOption[]
  value: string
  onChange: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const selected = products.find((p) => p.id === value) ?? null
  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return products.slice(0, 30)
    return products.filter((p) => p.name.includes(q)).slice(0, 30)
  }, [products, query])

  return (
    <div className="relative">
      <div
        className={`${inputClass} flex items-center justify-between cursor-pointer bg-white`}
        onClick={() => setOpen(!open)}
      >
        <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
          {selected ? selected.name : 'اختر المنتج المقدم كجائزة…'}
        </span>
        <Search className="w-4 h-4 text-gray-400" />
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-auto">
          <div className="p-2 sticky top-0 bg-white border-b">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن منتج…"
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
            />
          </div>
          {filtered.length === 0 ? (
            <p className="p-3 text-sm text-gray-500 text-center">لا توجد نتائج</p>
          ) : (
            filtered.map((p) => (
              <div
                key={p.id}
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-blue-50 ${p.id === value ? 'bg-blue-50' : ''}`}
                onClick={() => {
                  onChange(p.id)
                  setOpen(false)
                }}
              >
                <div className="w-8 h-8 bg-gray-100 rounded overflow-hidden shrink-0">
                  {p.image ? (
                    <Image src={p.image} alt={p.name} width={32} height={32} className="object-cover w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs">📦</div>
                  )}
                </div>
                <span className="text-sm text-gray-800">{p.name}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function RewardForm({
  products,
  editing,
  onDone,
}: {
  products: ProductOption[]
  editing: RewardItem | null
  onDone: () => void
}) {
  const [type, setType] = useState<RewardType>(editing?.rewardType ?? 'FIXED_DISCOUNT')
  const [productId, setProductId] = useState(editing?.productId ?? '')
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (formData: FormData) => {
    setFeedback(null)
    formData.set('type', type)
    formData.set('productId', productId)
    if (editing) formData.set('id', editing.id)

    startTransition(async () => {
      const result = editing ? await updateReward(formData) : await createReward(formData)
      if (result.success) {
        setFeedback({ type: 'success', message: editing ? 'تم تحديث المكافأة بنجاح ✓' : 'تمت إضافة المكافأة بنجاح ✓' })
        setTimeout(onDone, 800)
      } else {
        setFeedback({ type: 'error', message: result.error || 'حدث خطأ' })
      }
    })
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {/* Reward type selector */}
      <div>
        <label className="block text-sm font-semibold mb-2">نوع المكافأة</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {(['FIXED_DISCOUNT', 'PERCENTAGE_DISCOUNT', 'FREE_DELIVERY', 'FREE_PRODUCT'] as RewardType[]).map((tp) => (
            <button
              key={tp}
              type="button"
              onClick={() => setType(tp)}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition ${
                type === tp
                  ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              {TYPE_META[tp].icon}
              {TYPE_META[tp].label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2">اسم المكافأة (عربي)</label>
          <input
            name="title"
            type="text"
            defaultValue={editing?.name ?? ''}
            placeholder="مثال: كرتونة شيبس تمساح مجاناً"
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">الاسم (إنجليزي — اختياري)</label>
          <input
            name="titleEn"
            type="text"
            defaultValue={editing?.nameEn ?? ''}
            placeholder="e.g. Free chips carton"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">عدد النقاط المطلوبة</label>
          <input
            name="pointsCost"
            type="number"
            defaultValue={editing?.pointsCost ?? ''}
            placeholder="مثال: 500"
            min="1"
            className={inputClass}
            required
          />
        </div>

        {(type === 'FIXED_DISCOUNT' || type === 'PERCENTAGE_DISCOUNT') && (
          <div>
            <label className="block text-sm font-semibold mb-2">
              {type === 'FIXED_DISCOUNT' ? 'قيمة الخصم (د.أ)' : 'نسبة الخصم (%)'}
            </label>
            <input
              name="discountValue"
              type="number"
              defaultValue={editing?.discountValue || ''}
              placeholder={type === 'FIXED_DISCOUNT' ? 'مثال: 5' : 'مثال: 10'}
              min="0.1"
              max={type === 'PERCENTAGE_DISCOUNT' ? 100 : undefined}
              step="0.1"
              className={inputClass}
              required
            />
          </div>
        )}

        {type === 'PERCENTAGE_DISCOUNT' && (
          <div>
            <label className="block text-sm font-semibold mb-2">حد أقصى للخصم بالدينار (اختياري)</label>
            <input
              name="maxDiscountCap"
              type="number"
              defaultValue={editing?.maxDiscountCap ?? ''}
              placeholder="مثال: 10"
              min="0"
              step="0.5"
              className={inputClass}
            />
          </div>
        )}

        {type === 'FREE_PRODUCT' && (
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-2">المنتج المقدم كجائزة</label>
            <ProductPicker products={products} value={productId} onChange={setProductId} />
            <p className="text-xs text-gray-500 mt-1">
              يُضاف المنتج تلقائياً للطلب بقيمة 0 د.أ عند استخدام الكوبون
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold mb-2">صلاحية الكوبون (أيام)</label>
          <input
            name="validityDays"
            type="number"
            defaultValue={editing?.expirationDays ?? 30}
            min="1"
            className={inputClass}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">الحد الأدنى لقيمة الطلب (اختياري)</label>
          <input
            name="minOrderAmount"
            type="number"
            defaultValue={editing?.minOrderValue ?? ''}
            placeholder="بدون حد أدنى"
            min="0"
            step="0.5"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">أقصى عدد استبدالات لكل عميل (اختياري)</label>
          <input
            name="maxRedemptionsPerUser"
            type="number"
            defaultValue={editing?.usageLimit ?? ''}
            placeholder="بدون حد"
            min="1"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">الوصف (يظهر للعميل في التطبيق)</label>
        <textarea
          name="description"
          defaultValue={editing?.description ?? ''}
          placeholder="صف المكافأة بالتفصيل…"
          rows={2}
          className={inputClass}
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input name="isActive" type="checkbox" defaultChecked={editing?.isActive ?? true} className="w-5 h-5 accent-green-600" />
        <span className="text-sm font-medium">مفعّلة (تظهر للعملاء في التطبيق)</span>
      </label>

      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {feedback.message}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-lg transition font-medium"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {editing ? 'حفظ التعديلات' : 'إضافة المكافأة'}
        </button>
        {editing && (
          <button
            type="button"
            onClick={onDone}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2.5 rounded-lg transition"
          >
            إلغاء
          </button>
        )}
      </div>
    </form>
  )
}

export function RewardsClient({ rewards, products }: Props) {
  const [editing, setEditing] = useState<RewardItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [listFeedback, setListFeedback] = useState<Feedback>(null)
  const [isPending, startTransition] = useTransition()

  const handleDelete = (reward: RewardItem) => {
    if (!confirm(`هل أنت متأكد من حذف المكافأة "${reward.name}"؟`)) return
    setListFeedback(null)
    startTransition(async () => {
      const result = await deleteReward(reward.id)
      setListFeedback(
        result.success
          ? { type: 'success', message: 'تم حذف المكافأة' }
          : { type: 'error', message: result.error || 'فشل الحذف — قد تكون مستخدمة في استبدالات سابقة، عطّلها بدلاً من حذفها' }
      )
    })
  }

  const handleToggle = (reward: RewardItem) => {
    setListFeedback(null)
    startTransition(async () => {
      const result = await toggleRewardActive(reward.id)
      if (!result.success) {
        setListFeedback({ type: 'error', message: result.error || 'فشل تحديث الحالة' })
      }
    })
  }

  const startEdit = (reward: RewardItem) => {
    setEditing(reward)
    setShowForm(true)
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }

  const closeForm = () => {
    setEditing(null)
    setShowForm(false)
  }

  return (
    <div className="space-y-8">
      {/* Rewards list */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Gift className="w-5 h-5 text-orange-500" />
            المكافآت ({rewards.length})
          </h2>
          <button
            onClick={() => {
              setEditing(null)
              setShowForm(true)
            }}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" />
            مكافأة جديدة
          </button>
        </div>

        {listFeedback && (
          <div className="px-6 pt-4">
            <div
              className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium ${
                listFeedback.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {listFeedback.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              {listFeedback.message}
            </div>
          </div>
        )}

        {rewards.length > 0 ? (
          <div className="divide-y">
            {rewards.map((reward) => {
              const meta = TYPE_META[reward.rewardType]
              return (
                <div key={reward.id} className="p-4 hover:bg-gray-50 flex items-center gap-4">
                  {/* Product/reward image */}
                  <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                    {reward.product?.image ? (
                      <Image src={reward.product.image} alt={reward.name} width={56} height={56} className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-2xl">🎁</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{reward.name}</h3>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
                        {meta.icon}
                        {meta.label}
                      </span>
                      {!reward.isActive && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600">معطّلة</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{rewardValueLabel(reward)}</p>
                    <div className="flex gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold">{reward.pointsCost} نقطة</span>
                      <span>صلاحية الكوبون: {reward.expirationDays} يوم</span>
                      {reward.minOrderValue ? <span>حد أدنى: {reward.minOrderValue} د.أ</span> : null}
                      <span>استُبدلت {reward.totalRedeemed} مرة</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggle(reward)}
                      disabled={isPending}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        reward.isActive
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      title={reward.isActive ? 'اضغط للتعطيل' : 'اضغط للتفعيل'}
                    >
                      {reward.isActive ? '✓ مفعّلة' : 'معطّلة'}
                    </button>
                    <button
                      onClick={() => startEdit(reward)}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 p-2 rounded-lg transition"
                      title="تعديل"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(reward)}
                      disabled={isPending}
                      className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg transition"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-10 text-center text-gray-500">
            <Gift className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>لا توجد مكافآت بعد — أضف أول مكافأة ليراها عملاؤك في التطبيق</p>
          </div>
        )}
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              {editing ? <Pencil className="w-5 h-5 text-blue-600" /> : <Plus className="w-5 h-5 text-green-600" />}
              {editing ? `تعديل: ${editing.name}` : 'إضافة مكافأة جديدة'}
            </h2>
            <button onClick={closeForm} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <RewardForm key={editing?.id ?? 'new'} products={products} editing={editing} onDone={closeForm} />
        </div>
      )}
    </div>
  )
}
