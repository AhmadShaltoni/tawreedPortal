import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getLoyaltyConfig, updateLoyaltyConfig } from '@/actions/loyalty-config'

export default async function LoyaltyConfigPage() {
  const session = await auth()

  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/login')
  }

  const configResponse = await getLoyaltyConfig()
  const config = configResponse.success ? configResponse.data : null

  const handleSubmit = async (formData: FormData) => {
    'use server'
    await updateLoyaltyConfig(formData)
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">إعدادات نظام الولاء</h1>
      <p className="text-gray-600 mb-8">تحكم بمعاملات النقاط والمكافآت على المنصة</p>

      <form action={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Points Per JOD */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">النقاط لكل دينار أردني</label>
            <input
              type="number"
              name="pointsPerJod"
              defaultValue={config?.pointsPerJod || 10}
              step="0.1"
              min="0.1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">كم نقطة يحصل العميل مقابل كل دينار</p>
          </div>

          {/* Min Points For Redemption */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">الحد الأدنى للاستردار</label>
            <input
              type="number"
              name="minPointsForRedemption"
              defaultValue={config?.minPointsForRedemption || 100}
              min="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">أقل عدد نقاط للاستردار</p>
          </div>

          {/* Max Points Per Month */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">الحد الأقصى للنقاط شهرياً</label>
            <input
              type="number"
              name="maxPointsPerMonth"
              defaultValue={config?.maxPointsPerMonth || 5000}
              min="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">أقصى نقاط يمكن تجميعها شهرياً</p>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <strong>ملاحظة:</strong> جميع التعديلات تطبق فوراً على النظام وتؤثر على جميع العملاء الجدد والقدامى
        </div>

        <div className="flex gap-3 justify-start">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
          >
            حفظ الإعدادات
          </button>
          <a
            href="/admin/loyalty/dashboard"
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg transition"
          >
            إلغاء
          </a>
        </div>
      </form>

      {/* Current Config Display */}
      <div className="bg-white rounded-lg shadow p-6 mt-8">
        <h2 className="text-lg font-semibold mb-4">الإعدادات الحالية</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-gray-600 text-sm">النقاط لكل دينار</p>
            <p className="text-2xl font-bold text-blue-900">{config?.pointsPerJod || 10}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-gray-600 text-sm">الحد الأدنى للاستردار</p>
            <p className="text-2xl font-bold text-green-900">{config?.minPointsForRedemption || 100}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-gray-600 text-sm">الحد الأقصى شهرياً</p>
            <p className="text-2xl font-bold text-purple-900">{config?.maxPointsPerMonth || 5000}</p>
          </div>
        </div>
      </div>
    </div>
  )
}