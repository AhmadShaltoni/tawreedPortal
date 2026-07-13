'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, XCircle, Coins, Gift, Users, Loader2 } from 'lucide-react'
import {
  updateLoyaltyConfig,
  updateWelcomeBonusConfig,
  updateReferralConfig,
} from '@/actions/loyalty-config'

interface LoyaltyConfigData {
  isEnabled: boolean
  pointsPerJod: number
  calculationBase: number
  minOrderValue: number | null
  excludeDeliveryFees: boolean
  roundingMode: string
  earnTrigger?: string
}

interface WelcomeBonusData {
  isEnabled: boolean
  points: number
  trigger: string
}

interface ReferralConfigData {
  isEnabled: boolean
  inviterPoints: number
  inviteePoints: number
  trigger: string
}

interface Props {
  config: LoyaltyConfigData | null
  welcomeBonus: WelcomeBonusData | null
  referral: ReferralConfigData | null
}

type Feedback = { type: 'success' | 'error'; message: string } | null

function FeedbackBanner({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null
  const isSuccess = feedback.type === 'success'
  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium ${
        isSuccess ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
      }`}
    >
      {isSuccess ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
      {feedback.message}
    </div>
  )
}

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-lg transition font-medium"
    >
      {pending && <Loader2 className="w-4 h-4 animate-spin" />}
      حفظ الإعدادات
    </button>
  )
}

const inputClass =
  'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'

export function ConfigClient({ config, welcomeBonus, referral }: Props) {
  const [pointsFeedback, setPointsFeedback] = useState<Feedback>(null)
  const [welcomeFeedback, setWelcomeFeedback] = useState<Feedback>(null)
  const [referralFeedback, setReferralFeedback] = useState<Feedback>(null)
  const [isPendingPoints, startPoints] = useTransition()
  const [isPendingWelcome, startWelcome] = useTransition()
  const [isPendingReferral, startReferral] = useTransition()

  const handlePointsSubmit = (formData: FormData) => {
    setPointsFeedback(null)
    startPoints(async () => {
      const result = await updateLoyaltyConfig(formData)
      setPointsFeedback(
        result.success
          ? { type: 'success', message: 'تم حفظ إعدادات النقاط بنجاح ✓' }
          : { type: 'error', message: result.error || 'فشل في حفظ الإعدادات' }
      )
    })
  }

  const handleWelcomeSubmit = (formData: FormData) => {
    setWelcomeFeedback(null)
    startWelcome(async () => {
      const result = await updateWelcomeBonusConfig(formData)
      setWelcomeFeedback(
        result.success
          ? { type: 'success', message: 'تم حفظ إعدادات مكافأة الانضمام بنجاح ✓' }
          : { type: 'error', message: result.error || 'فشل في حفظ الإعدادات' }
      )
    })
  }

  const handleReferralSubmit = (formData: FormData) => {
    setReferralFeedback(null)
    startReferral(async () => {
      const result = await updateReferralConfig(formData)
      setReferralFeedback(
        result.success
          ? { type: 'success', message: 'تم حفظ إعدادات الدعوات بنجاح ✓' }
          : { type: 'error', message: result.error || 'فشل في حفظ الإعدادات' }
      )
    })
  }

  return (
    <div className="space-y-8">
      {/* ============ Points Engine ============ */}
      <form action={handlePointsSubmit} className="bg-white rounded-xl shadow p-6 space-y-5">
        <div className="flex items-center gap-2 border-b pb-4">
          <Coins className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">إعدادات النقاط</h2>
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            name="isEnabled"
            defaultChecked={config?.isEnabled ?? true}
            className="w-5 h-5 accent-blue-600"
          />
          <span className="font-medium text-gray-800">تفعيل نظام نقاط الولاء</span>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">النقاط لكل دينار أردني</label>
            <input
              type="number"
              name="pointsPerJod"
              defaultValue={config?.pointsPerJod ?? 10}
              step="0.1"
              min="0.1"
              className={inputClass}
              required
            />
            <p className="text-xs text-gray-500 mt-1">كم نقطة يحصل العميل مقابل كل دينار ينفقه</p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">أساس الاحتساب (دينار)</label>
            <input
              type="number"
              name="calculationBase"
              defaultValue={config?.calculationBase ?? 1}
              step="0.1"
              min="0.1"
              className={inputClass}
              required
            />
            <p className="text-xs text-gray-500 mt-1">تُحتسب النقاط لكل X دينار (عادةً 1)</p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">الحد الأدنى لقيمة الطلب (اختياري)</label>
            <input
              type="number"
              name="minOrderValue"
              defaultValue={config?.minOrderValue ?? ''}
              step="0.5"
              min="0"
              className={inputClass}
              placeholder="بدون حد أدنى"
            />
            <p className="text-xs text-gray-500 mt-1">الطلبات الأقل من هذه القيمة لا تمنح نقاطاً</p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">طريقة التقريب</label>
            <select name="roundingMode" defaultValue={config?.roundingMode ?? 'FLOOR'} className={inputClass}>
              <option value="FLOOR">تقريب للأسفل (10.9 → 10)</option>
              <option value="ROUND">تقريب لأقرب رقم (10.5 → 11)</option>
              <option value="CEIL">تقريب للأعلى (10.1 → 11)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">وقت منح النقاط</label>
            <select name="earnTrigger" defaultValue={config?.earnTrigger ?? 'ORDER_PLACED'} className={inputClass}>
              <option value="ORDER_PLACED">فور إنشاء الطلب (مع إشعار شكر فوري)</option>
              <option value="DELIVERED">عند تسليم الطلب</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">عند الإلغاء تُسترجع النقاط تلقائياً في الحالتين</p>
          </div>

          <div className="flex items-end pb-2">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                name="excludeDeliveryFees"
                defaultChecked={config?.excludeDeliveryFees ?? true}
                className="w-5 h-5 accent-blue-600"
              />
              <span className="text-sm font-medium text-gray-800">استثناء رسوم التوصيل من احتساب النقاط</span>
            </label>
          </div>
        </div>

        <FeedbackBanner feedback={pointsFeedback} />
        <SubmitButton pending={isPendingPoints} />
      </form>

      {/* ============ Welcome Bonus ============ */}
      <form action={handleWelcomeSubmit} className="bg-white rounded-xl shadow p-6 space-y-5">
        <div className="flex items-center gap-2 border-b pb-4">
          <Gift className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-bold text-gray-900">مكافأة الانضمام</h2>
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            name="isEnabled"
            defaultChecked={welcomeBonus?.isEnabled ?? true}
            className="w-5 h-5 accent-purple-600"
          />
          <span className="font-medium text-gray-800">تفعيل مكافأة الانضمام</span>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">عدد النقاط</label>
            <input
              type="number"
              name="points"
              defaultValue={welcomeBonus?.points ?? 100}
              min="0"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">وقت المنح</label>
            <select name="trigger" defaultValue={welcomeBonus?.trigger ?? 'SIGNUP'} className={inputClass}>
              <option value="SIGNUP">عند إنشاء الحساب</option>
              <option value="FIRST_DELIVERED_ORDER">عند تسليم أول طلب</option>
            </select>
          </div>
        </div>

        <FeedbackBanner feedback={welcomeFeedback} />
        <SubmitButton pending={isPendingWelcome} />
      </form>

      {/* ============ Referral Program ============ */}
      <form action={handleReferralSubmit} className="bg-white rounded-xl shadow p-6 space-y-5">
        <div className="flex items-center gap-2 border-b pb-4">
          <Users className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-bold text-gray-900">برنامج دعوة الأصدقاء</h2>
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            name="isEnabled"
            defaultChecked={referral?.isEnabled ?? true}
            className="w-5 h-5 accent-emerald-600"
          />
          <span className="font-medium text-gray-800">تفعيل برنامج الدعوات</span>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">نقاط الداعي</label>
            <input
              type="number"
              name="inviterPoints"
              defaultValue={referral?.inviterPoints ?? 50}
              min="0"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">نقاط المدعو</label>
            <input
              type="number"
              name="inviteePoints"
              defaultValue={referral?.inviteePoints ?? 50}
              min="0"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">وقت المنح</label>
            <select name="trigger" defaultValue={referral?.trigger ?? 'FIRST_DELIVERED_ORDER'} className={inputClass}>
              <option value="SIGNUP">عند إنشاء الحساب</option>
              <option value="FIRST_DELIVERED_ORDER">عند تسليم أول طلب</option>
            </select>
          </div>
        </div>

        <FeedbackBanner feedback={referralFeedback} />
        <SubmitButton pending={isPendingReferral} />
      </form>
    </div>
  )
}
