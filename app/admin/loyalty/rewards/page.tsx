import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getRewards } from '@/actions/loyalty-rewards'
import { RewardsClient } from './RewardsClient'

export default async function RewardsPage() {
  const session = await auth()

  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/login')
  }

  const [rewards, products] = await Promise.all([
    getRewards(),
    db.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, image: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-2">إدارة المكافآت</h1>
      <p className="text-gray-600 mb-8">
        أضف مكافآت يستبدلها العملاء بنقاطهم: خصم ثابت، خصم نسبة، توصيل مجاني، أو منتج مجاني يظهر في الطلب كجائزة بقيمة 0
      </p>

      <RewardsClient
        rewards={rewards as never}
        products={products}
      />
    </div>
  )
}
