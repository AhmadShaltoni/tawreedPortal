import { getCurrentUser } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { getDiscountCampaign } from '@/actions/discount-campaigns'
import DiscountCampaignForm from '../DiscountCampaignForm'

export const metadata = {
  title: 'تعديل حملة الخصم',
}

export default async function EditDiscountCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()

  if (!user || user.role !== 'ADMIN') {
    redirect('/login')
  }

  const { id } = await params
  const result = await getDiscountCampaign(id)

  if (!result.success || !result.data) {
    notFound()
  }

  const campaign = result.data

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
        <h1 className="text-3xl font-bold">تعديل حملة الخصم</h1>
        <p className="text-gray-600 mt-1">{campaign.name}</p>
      </div>

      <DiscountCampaignForm
        collections={collections}
        categories={categories}
        products={products}
        initialData={{
          id: campaign.id,
          name: campaign.name,
          nameEn: campaign.nameEn,
          discountPercent: campaign.discountPercent,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          scope: campaign.scope,
          collectionId: campaign.collectionId,
          categoryId: campaign.categoryId,
          status: campaign.status,
          products: campaign.products,
        }}
      />
    </div>
  )
}
