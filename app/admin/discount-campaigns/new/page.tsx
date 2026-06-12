import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import DiscountCampaignForm from '../DiscountCampaignForm'

export const metadata = {
  title: 'إنشاء حملة خصم جديدة',
}

export default async function NewDiscountCampaignPage() {
  const user = await getCurrentUser()

  if (!user || user.role !== 'ADMIN') {
    redirect('/login')
  }

  // Fetch collections and categories for scope selection
  const [collections, categories, products] = await Promise.all([
    db.collection.findMany({
      where: { isActive: true },
      select: { id: true, name: true, nameEn: true },
      orderBy: { sortOrder: 'asc' },
    }),
    db.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true, nameEn: true, depth: true },
      orderBy: { sortOrder: 'asc' },
    }),
    db.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, nameEn: true, image: true },
      orderBy: { sortOrder: 'asc' },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">إنشاء حملة خصم جديدة</h1>
        <p className="text-gray-600 mt-1">
          أنشئ خصم جديد على منتجات محددة أو فئة كاملة أو جميع المنتجات
        </p>
      </div>

      <DiscountCampaignForm
        collections={collections}
        categories={categories}
        products={products}
      />
    </div>
  )
}
