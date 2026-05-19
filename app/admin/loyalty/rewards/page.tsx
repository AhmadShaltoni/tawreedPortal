import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getRewards, createReward, deleteReward } from '@/actions/loyalty-rewards'
import { Gift, Trash2, Plus } from 'lucide-react'

export default async function RewardsPage() {
  const session = await auth()

  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/login')
  }

  const rewards = await getRewards()

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-2">إدارة المكافآت</h1>
      <p className="text-gray-600 mb-8">أضف وأدر المكافآت التي يمكن للعملاء استردارها بنقاطهم</p>

      {/* Rewards List */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Gift className="w-5 h-5" />
            المكافآت المتاحة ({rewards?.length || 0})
          </h2>
        </div>

        {rewards && rewards.length > 0 ? (
          <div className="divide-y">
            {rewards.map((reward) => (
              <div key={reward.id} className="p-4 hover:bg-gray-50 flex justify-between items-center">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{reward.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{reward.description}</p>
                  <div className="flex gap-4 mt-3 text-sm">
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded">
                      {reward.pointsCost} نقطة
                    </span>
                    <span className={`px-3 py-1 rounded ${reward.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {reward.isActive ? '✓ فعال' : '✗ معطل'}
                    </span>
                  </div>
                </div>
                <form
                  action={async () => {
                    'use server'
                    await deleteReward(reward.id)
                  }}
                  className="ml-4"
                >
                  <button
                    type="submit"
                    className="bg-red-100 hover:bg-red-200 text-red-700 p-2 rounded transition"
                    title="حذف المكافأة"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-gray-600">
            <Gift className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>لا توجد مكافآت متاحة حالياً</p>
          </div>
        )}
      </div>

      {/* Add New Reward */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          إضافة مكافأة جديدة
        </h2>

        <form
          action={async (formData) => {
            'use server'
            await createReward(formData)
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">اسم المكافأة</label>
              <input
                name="title"
                type="text"
                placeholder="مثال: خصم 50 دينار"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">عدد النقاط المطلوبة</label>
              <input
                name="pointsCost"
                type="number"
                placeholder="مثال: 500"
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">الوصف</label>
            <textarea
              name="description"
              placeholder="صف المكافأة بالتفصيل..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              name="isActive"
              type="checkbox"
              defaultChecked
              className="w-4 h-4"
            />
            <label className="text-sm">تفعيل هذه المكافأة الآن</label>
          </div>

          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition"
          >
            إضافة المكافأة
          </button>
        </form>
      </div>
    </div>
  )
}