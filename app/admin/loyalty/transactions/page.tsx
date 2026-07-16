import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getLoyaltyTransactions } from '@/actions/loyalty-points'
import { History, TrendingUp, TrendingDown } from 'lucide-react'
import { isAdminLike } from '@/lib/permissions'

export default async function TransactionsPage() {
  const session = await auth()

  if (!session?.user || !isAdminLike(session.user.role)) {
    redirect('/login')
  }

  const transactions = await getLoyaltyTransactions(100)

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-2">سجل حركات النقاط</h1>
      <p className="text-gray-600 mb-8">جميع عمليات النقاط على المنصة</p>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <History className="w-5 h-5" />
            آخر {transactions?.length || 0} عملية
          </h2>
        </div>

        {transactions && transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-3">المستخدم</th>
                  <th className="px-4 py-3">النقاط</th>
                  <th className="px-4 py-3">النوع</th>
                  <th className="px-4 py-3">الوصف</th>
                  <th className="px-4 py-3">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{transaction.user?.username || 'غير معروف'}</td>
                    <td className={`px-4 py-3 font-semibold ${transaction.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <div className="flex items-center gap-1">
                        {transaction.points > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {transaction.points > 0 ? '+' : ''}{transaction.points}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded text-xs font-semibold ${
                        transaction.type.startsWith('EARN') ? 'bg-green-100 text-green-800' :
                        transaction.type === 'REDEEM' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {transaction.type.startsWith('EARN') ? 'اكتساب' : transaction.type === 'REDEEM' ? 'استرداد' : 'أخرى'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{transaction.description}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(transaction.createdAt).toLocaleDateString('ar-JO', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-600">
            <History className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>لا توجد عمليات حتى الآن</p>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm">إجمالي العمليات</p>
          <p className="text-2xl font-bold text-blue-900">{transactions?.length || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm">النقاط المكتسبة</p>
          <p className="text-2xl font-bold text-green-900">
            {transactions?.filter(t => t.points > 0).reduce((sum, t) => sum + t.points, 0).toLocaleString('ar-JO') || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm">النقاط المستردة</p>
          <p className="text-2xl font-bold text-red-900">
            {Math.abs(transactions?.filter(t => t.points < 0).reduce((sum, t) => sum + t.points, 0) || 0).toLocaleString('ar-JO')}
          </p>
        </div>
      </div>
    </div>
  )
}