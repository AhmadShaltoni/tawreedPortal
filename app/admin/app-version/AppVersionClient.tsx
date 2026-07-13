'use client'

import { useState } from 'react'
import {
  updateAppVersionConfig,
  type AppVersionConfigType,
  type AppVersionInput,
} from '@/actions/app-version'
import type { AppPlatform } from '@/lib/app-version'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Apple, Smartphone, CheckCircle2, AlertTriangle } from 'lucide-react'

interface Props {
  initialConfigs: AppVersionConfigType[]
}

const PLATFORM_LABELS: Record<string, string> = {
  ios: 'آيفون (App Store)',
  android: 'أندرويد (Google Play)',
}

function PlatformForm({ config }: { config: AppVersionConfigType }) {
  const [form, setForm] = useState<AppVersionInput>({
    minVersion: config.minVersion,
    latestVersion: config.latestVersion,
    storeUrl: config.storeUrl,
    message: config.message || '',
    isActive: config.isActive,
  })
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setFeedback(null)

    const result = await updateAppVersionConfig(
      config.platform as AppPlatform,
      form
    )

    setFeedback(
      result.success
        ? { type: 'success', text: result.message || 'تم الحفظ بنجاح' }
        : { type: 'error', text: result.error || 'فشل في الحفظ' }
    )
    setSaving(false)
  }

  const Icon = config.platform === 'ios' ? Apple : Smartphone

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className="w-6 h-6 text-primary-800" />
            <h2 className="text-lg font-semibold">
              {PLATFORM_LABELS[config.platform] || config.platform}
            </h2>
          </div>
          {config.platform === 'ios' && (
            <span className="text-sm text-gray-500">
              {config.liveStoreVersion
                ? `الإصدار الحالي على المتجر: ${config.liveStoreVersion}`
                : 'تعذر جلب إصدار المتجر'}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input
              label="آخر إصدار متوفر على المتجر"
              value={form.latestVersion}
              onChange={(e) =>
                setForm({ ...form, latestVersion: e.target.value })
              }
              placeholder="مثال: 1.1.0"
              dir="ltr"
            />
            <p className="mt-1 text-xs text-gray-500 leading-relaxed">
              {config.platform === 'ios' ? (
                <>
                  من أين؟ لا حاجة للبحث — انسخ الرقم الظاهر أعلاه
                  &quot;الإصدار الحالي على المتجر&quot; (يُجلب تلقائياً من App
                  Store).
                  <br />
                  ماذا تضع؟ نفس رقم الإصدار الذي رفعته في{' '}
                  <code className="bg-gray-100 px-1 rounded">app.json</code>{' '}
                  (expo.version) بعد أن يصبح <b>منشوراً فعلياً</b> على المتجر،
                  وليس فقط تحت المراجعة.
                </>
              ) : (
                <>
                  من أين؟ افتح{' '}
                  <a
                    href="https://play.google.com/console"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    Google Play Console
                  </a>{' '}
                  ← التطبيق ← الإصدار (Production)، أو افتح صفحة التطبيق على
                  Play Store مباشرة لترى رقم الإصدار المنشور فعلياً.
                  <br />
                  ماذا تضع؟ نفس رقم الإصدار الذي رفعته في{' '}
                  <code className="bg-gray-100 px-1 rounded">app.json</code>{' '}
                  (expo.version) بعد أن يصبح <b>منشوراً فعلياً</b> ومتاحاً
                  للتحميل، وليس فقط تحت المراجعة.
                </>
              )}
            </p>
          </div>

          <div>
            <Input
              label="أقل إصدار مسموح (أقدم منه = تحديث إجباري)"
              value={form.minVersion}
              onChange={(e) =>
                setForm({ ...form, minVersion: e.target.value })
              }
              placeholder="مثال: 1.0.0"
              dir="ltr"
            />
            <p className="mt-1 text-xs text-gray-500 leading-relaxed">
              من أين؟ لا يوجد مصدر خارجي — هذا قرار منك أنت. هو أقدم نسخة ما
              زلت موافقاً على بقاء المستخدمين عليها بدون إجبارهم على التحديث.
              <br />
              ماذا تضع؟ اتركه مساوياً أو أقل من &quot;آخر إصدار&quot; في
              الوضع العادي. ارفعه فقط عند وجود سبب حقيقي للإجبار (مثل تغيير
              كاسر في الـ API أو ثغرة أمنية)، وبعد التأكد أن النسخة الجديدة
              متاحة فعلياً على المتجر.
            </p>
          </div>
        </div>

        <div>
          <Input
            label="رابط المتجر"
            value={form.storeUrl}
            onChange={(e) => setForm({ ...form, storeUrl: e.target.value })}
            placeholder="https://..."
            dir="ltr"
          />
          <p className="mt-1 text-xs text-gray-500 leading-relaxed">
            {config.platform === 'ios' ? (
              <>
                من أين؟ رابط صفحة التطبيق على App Store (مثال:{' '}
                <code className="bg-gray-100 px-1 rounded">
                  https://apps.apple.com/jo/app/...
                </code>
                ). يُملأ تلقائياً عند أول حفظ إن تُرك فارغاً.
              </>
            ) : (
              <>
                من أين؟ رابط صفحة التطبيق على Google Play (مثال:{' '}
                <code className="bg-gray-100 px-1 rounded">
                  https://play.google.com/store/apps/details?id=tawreedApp.com.jo
                </code>
                ). هذا هو الرابط الذي يُفتح للمستخدم عند الضغط على &quot;حدّث
                الآن&quot;.
              </>
            )}
          </p>
        </div>

        <Textarea
          label="رسالة النافذة المنبثقة (اختياري)"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="يوجد تحديث جديد لتطبيق توريد. قم بالتحديث الآن للحصول على جميع الميزات."
          rows={2}
        />

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="w-4 h-4 accent-primary-800"
          />
          <span className="text-sm">تفعيل التحقق من التحديث لهذه المنصة</span>
        </label>

        {feedback && (
          <div
            className={`flex items-center gap-2 text-sm rounded-lg p-3 ${
              feedback.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            {feedback.text}
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AppVersionClient({ initialConfigs }: Props) {
  return (
    <div className="space-y-6">
      {/* How it works */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900 space-y-1">
        <p className="font-semibold">كيف يعمل النظام؟</p>
        <p>
          • إذا كان إصدار المستخدم أقدم من <b>أقل إصدار مسموح</b> → تظهر نافذة
          تحديث <b>إجبارية</b> لا يمكن إغلاقها.
        </p>
        <p>
          • إذا كان أقدم من <b>آخر إصدار</b> فقط → تظهر نافذة تحديث اختيارية
          (يمكن تأجيلها).
        </p>
        <p>
          • إذا كان لدى المستخدم آخر إصدار → لا تظهر أي نافذة إطلاقاً.
        </p>
        <p>
          • لنظام iOS يتم التحقق تلقائياً من الإصدار الموجود فعلياً على App
          Store، ولن يُطلب من المستخدم تحديث غير متوفر. لأندرويد: لا تغيّر{' '}
          <b>آخر إصدار</b> إلا بعد التأكد من ظهور التحديث على Google Play.
        </p>
        <p>
          • لإرسال إشعار push للمستخدمين عن التحديث الجديد، استخدم صفحة{' '}
          <a href="/admin/notifications" className="underline font-semibold">
            الإشعارات
          </a>
          .
        </p>
      </div>

      {initialConfigs.map((config) => (
        <PlatformForm key={config.platform} config={config} />
      ))}
    </div>
  )
}
