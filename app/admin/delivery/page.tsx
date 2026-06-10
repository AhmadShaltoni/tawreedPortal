import Link from 'next/link'
import { getDeliveryStats, getDeliveryConfig, getDeliveryZones, getDeliveryPromotions } from '@/actions/delivery'
import { Truck, MapPin, Gift, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

export default async function DeliveryPage() {
  const [stats, config, zones, promotions] = await Promise.all([
    getDeliveryStats(),
    getDeliveryConfig(),
    getDeliveryZones(),
    getDeliveryPromotions(),
  ])

  const now = new Date()
  const activePromotions = promotions.filter(
    (p) => p.isActive && p.startDate <= now && p.endDate >= now
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">إدارة التوصيل</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/delivery/settings"
            className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            الإعدادات العامة
          </Link>
        </div>
      </div>

      {/* Global Status Banner */}
      {!config.isEnabled && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">التوصيل معطّل حالياً</p>
            <p className="text-xs text-red-600">لن يتمكن العملاء من إتمام الطلبات. قم بتفعيل التوصيل من الإعدادات العامة.</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">مناطق مفعّلة</p>
                <p className="text-xl font-bold text-gray-900">{stats.activeZones} / {stats.totalCities}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">متوسط الرسوم</p>
                <p className="text-xl font-bold text-gray-900">{stats.avgFee} د.أ</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Gift className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">عروض فعّالة</p>
                <p className="text-xl font-bold text-gray-900">{stats.activePromotions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">توصيل مجاني</p>
                <p className="text-xl font-bold text-gray-900">{stats.freeDeliveryPercent}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/delivery/zones" className="block bg-white rounded-xl border p-5 hover:border-blue-300 hover:shadow-sm transition-all">
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">إدارة المناطق</h3>
          </div>
          <p className="text-sm text-gray-500">تعديل أسعار التوصيل لكل محافظة، تفعيل/تعطيل المناطق</p>
          <p className="text-xs text-blue-600 mt-2">{zones.length} منطقة معرّفة</p>
        </Link>

        <Link href="/admin/delivery/promotions" className="block bg-white rounded-xl border p-5 hover:border-purple-300 hover:shadow-sm transition-all">
          <div className="flex items-center gap-3 mb-2">
            <Gift className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">عروض التوصيل</h3>
          </div>
          <p className="text-sm text-gray-500">إنشاء عروض توصيل مجاني أو مخفّض لفترة محددة</p>
          <p className="text-xs text-purple-600 mt-2">{activePromotions.length} عرض فعّال</p>
        </Link>

        <Link href="/admin/delivery/settings" className="block bg-white rounded-xl border p-5 hover:border-gray-400 hover:shadow-sm transition-all">
          <div className="flex items-center gap-3 mb-2">
            <Truck className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">الإعدادات العامة</h3>
          </div>
          <p className="text-sm text-gray-500">الرسوم الافتراضية، عتبة التوصيل المجاني، الحد الأدنى</p>
          <p className="text-xs text-gray-500 mt-2">
            {config.isEnabled ? (
              <span className="text-green-600">✓ مفعّل</span>
            ) : (
              <span className="text-red-600">✗ معطّل</span>
            )}
            {' • '} الافتراضي: {config.defaultFee} د.أ
          </p>
        </Link>
      </div>

      {/* Zones Summary Table */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">المحافظات والرسوم</h2>
          <Link href="/admin/delivery/zones" className="text-sm text-blue-600 hover:underline">
            عرض الكل وتعديل
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-gray-600">المحافظة</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">الرسوم</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">الحالة</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">عتبة المجاني</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {zones.map((zone) => (
                <tr key={zone.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{zone.city.name}</td>
                  <td className="px-4 py-3">
                    {zone.fee === 0 ? (
                      <span className="text-green-600 font-medium">مجاني</span>
                    ) : (
                      <span>{zone.fee} د.أ</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!zone.isActive ? (
                      <span className="inline-flex items-center gap-1 text-red-600 text-xs">
                        <XCircle className="w-3 h-3" /> معطّل
                      </span>
                    ) : !zone.isVisible ? (
                      <span className="inline-flex items-center gap-1 text-yellow-600 text-xs">
                        <AlertTriangle className="w-3 h-3" /> مخفي
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                        <CheckCircle className="w-3 h-3" /> مفعّل
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {zone.freeDeliveryThreshold ? `${zone.freeDeliveryThreshold} د.أ` : '—'}
                  </td>
                </tr>
              ))}
              {zones.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    لم يتم تعريف مناطق توصيل بعد.{' '}
                    <Link href="/admin/delivery/zones" className="text-blue-600 hover:underline">
                      ابدأ الآن
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
