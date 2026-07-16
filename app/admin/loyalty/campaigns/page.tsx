import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getCampaigns, createCampaign, deleteCampaign } from '@/actions/loyalty-campaigns'
import { Zap, Trash2, Plus } from 'lucide-react'
import { isAdminLike } from '@/lib/permissions'

export default async function CampaignsPage() {
  const session = await auth()

  if (!session?.user || !isAdminLike(session.user.role)) {
    redirect('/login')
  }

  const campaigns = await getCampaigns()

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-2">إدارة الحملات</h1>
      <p className="text-gray-600 mb-8">أنشئ حملات لتحفيز العملاء على الشراء والتفاعل</p>

      {/* Campaigns List */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="w-5 h-5" />
            الحملات النشطة ({campaigns?.length || 0})
          </h2>
        </div>

        {campaigns && campaigns.length > 0 ? (
          <div className="divide-y">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{campaign.description}</p>
                    <div className="flex gap-4 mt-3 text-sm">
                      <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded">
                        الهدف: {campaign.targetValue.toLocaleString('ar-JO')}
                      </span>
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded">
                        {campaign.rewardValue} نقطة
                      </span>
                      <span className={`px-3 py-1 rounded ${campaign.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {campaign.isActive ? '✓ نشطة' : '✗ موقوفة'}
                      </span>
                    </div>
                    {campaign.startDate && (
                      <p className="text-xs text-gray-500 mt-2">
                        من: {new Date(campaign.startDate).toLocaleDateString('ar-JO')} 
                        {campaign.endDate && ` إلى: ${new Date(campaign.endDate).toLocaleDateString('ar-JO')}`}
                      </p>
                    )}
                  </div>
                  <form
                    action={async () => {
                      'use server'
                      await deleteCampaign(campaign.id)
                    }}
                    className="ml-4"
                  >
                    <button
                      type="submit"
                      className="bg-red-100 hover:bg-red-200 text-red-700 p-2 rounded transition"
                      title="حذف الحملة"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-gray-600">
            <Zap className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>لا توجد حملات حالياً</p>
          </div>
        )}
      </div>

      {/* Add New Campaign */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          إضافة حملة جديدة
        </h2>

        <form
          action={async (formData) => {
            'use server'
            await createCampaign(formData)
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">عنوان الحملة</label>
              <input
                name="name"
                type="text"
                placeholder="مثال: حملة الربيع"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">الهدف (القيمة بالدينار)</label>
              <input
                name="targetValue"
                type="number"
                placeholder="مثال: 1000"
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">النقاط المكتسبة عند تحقيق الهدف</label>
              <input
                name="rewardValue"
                type="number"
                placeholder="مثال: 100"
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">نوع الهدف</label>
              <select
                name="goalType"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="SPEND_AMOUNT">مبلغ الشراء</option>
                <option value="ORDER_COUNT">عدد الطلبات</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">الوصف</label>
            <textarea
              name="description"
              placeholder="صف الحملة وشروطها..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">تاريخ البداية</label>
              <input
                name="startDate"
                type="date"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">تاريخ النهاية</label>
              <input
                name="endDate"
                type="date"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              name="isActive"
              type="checkbox"
              defaultChecked
              className="w-4 h-4"
            />
            <label className="text-sm">تفعيل هذه الحملة الآن</label>
          </div>

          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition"
          >
            إنشاء الحملة
          </button>
        </form>
      </div>
    </div>
  )
}