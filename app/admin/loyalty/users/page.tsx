import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getTopLoyalCustomers } from '@/actions/loyalty-analytics'
import { Users, Medal, Award, Trophy } from 'lucide-react'

export default async function LoyalUsersPage() {
  const session = await auth()

  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/login')
  }

  const topCustomers = await getTopLoyalCustomers(50)

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-2">أفضل العملاء ولاءً</h1>
      <p className="text-gray-600 mb-8">العملاء الأكثر نشاطاً في برنامج الولاء</p>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4 border-t-4 border-yellow-400">
          <p className="text-gray-600 text-sm">🥇 VIP (1000+ نقطة)</p>
          <p className="text-2xl font-bold">{topCustomers?.filter(c => c.currentBalance >= 1000).length || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-t-4 border-gray-400">
          <p className="text-gray-600 text-sm">🥈 Gold (500-999)</p>
          <p className="text-2xl font-bold">{topCustomers?.filter(c => c.currentBalance >= 500 && c.currentBalance < 1000).length || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-t-4 border-orange-400">
          <p className="text-gray-600 text-sm">🥉 Silver (100-499)</p>
          <p className="text-2xl font-bold">{topCustomers?.filter(c => c.currentBalance >= 100 && c.currentBalance < 500).length || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-t-4 border-blue-400">
          <p className="text-gray-600 text-sm">إجمالي النقاط</p>
          <p className="text-2xl font-bold">{(topCustomers?.reduce((sum, c) => sum + c.currentBalance, 0) || 0).toLocaleString('ar-JO')}</p>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            أفضل {topCustomers?.length || 0} عميل
          </h2>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-3">الترتيب</th>
                  <th className="px-4 py-3">الاسم</th>
                  <th className="px-4 py-3">المدينة</th>
                  <th className="px-4 py-3">النقاط</th>
                  <th className="px-4 py-3">المستوى</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {topCustomers.map((customer, index) => {
                  let level = '🔵 جديد'
                  let levelColor = 'bg-blue-100 text-blue-800'
                  
                  if (customer.totalEarned >= 1000) {
                    level = '🥇 VIP'
                    levelColor = 'bg-yellow-100 text-yellow-800'
                  } else if (customer.totalEarned >= 500) {
                    level = '🥈 Gold'
                    levelColor = 'bg-gray-100 text-gray-800'
                  } else if (customer.totalEarned >= 100) {
                    level = '🥉 Silver'
                    levelColor = 'bg-orange-100 text-orange-800'
                  }

                  return (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-bold text-lg">
                        {index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                      </td>
                      <td className="px-4 py-3 font-medium">{customer.user?.username || 'غير معروف'}</td>
                      <td className="px-4 py-3 text-gray-600">{customer.user?.city || '-'}</td>
                      <td className="px-4 py-3 font-bold text-blue-600">{customer.totalEarned.toLocaleString('ar-JO')}</td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded text-xs font-semibold ${levelColor}`}>
                          {level}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
      </div>

      {/* Program Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">معلومات البرنامج</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• النقاط تُمنح عند توصيل الطلب فقط</li>
            <li>• النقاط لا تنتهي صلاحيتها</li>
            <li>• يمكن استردار النقاط في أي وقت</li>
          </ul>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-2">مستويات العضوية</h3>
          <ul className="text-sm text-green-800 space-y-1">
            <li>🥇 <strong>VIP:</strong> 1000+ نقطة</li>
            <li>🥈 <strong>Gold:</strong> 500-999 نقطة</li>
            <li>🥉 <strong>Silver:</strong> 100-499 نقطة</li>
          </ul>
        </div>
      </div>
    </div>
  )
}