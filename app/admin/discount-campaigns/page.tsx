import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'
import { getAllDiscountCampaigns } from '@/actions/discount-campaigns'
import DiscountCampaignsClient from './DiscountCampaignsClient'

export const metadata = {
  title: 'حملات الخصم',
}

export default async function DiscountCampaignsPage() {
  const user = await getCurrentUser()

  if (!user || user.role !== 'ADMIN') {
    redirect('/login')
  }

  const result = await getAllDiscountCampaigns()
  const campaigns = result.success && result.data ? result.data : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">حملات الخصم</h1>
          <p className="text-gray-600 mt-1">
            إدارة الخصومات المؤقتة والدائمة على المنتجات
          </p>
        </div>
        <Link href="/admin/discount-campaigns/new">
          <Button>
            <Plus className="w-4 h-4 ml-2" />
            إنشاء حملة خصم جديدة
          </Button>
        </Link>
      </div>

      {/* List */}
      <DiscountCampaignsClient initialCampaigns={campaigns} />
    </div>
  )
}
