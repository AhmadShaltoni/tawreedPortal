'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { 
  Percent, 
  Calendar, 
  Pause, 
  Play, 
  Trash2, 
  Edit, 
  Package, 
  Layers, 
  FolderTree, 
  Globe 
} from 'lucide-react'
import { toggleDiscountCampaignStatus, deleteDiscountCampaign } from '@/actions/discount-campaigns'
import type { DiscountCampaignData } from '@/actions/discount-campaigns'

interface Props {
  initialCampaigns: DiscountCampaignData[]
}

const scopeLabels: Record<string, { label: string; icon: typeof Package }> = {
  ALL_PRODUCTS: { label: 'جميع المنتجات', icon: Globe },
  SPECIFIC_PRODUCTS: { label: 'منتجات محددة', icon: Package },
  COLLECTION: { label: 'قسم تسويقي', icon: Layers },
  CATEGORY: { label: 'فئة', icon: FolderTree },
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  PAUSED: 'bg-yellow-100 text-yellow-800',
  EXPIRED: 'bg-red-100 text-red-800',
  SCHEDULED: 'bg-blue-100 text-blue-800',
}

const statusLabels: Record<string, string> = {
  ACTIVE: 'فعال',
  PAUSED: 'متوقف',
  EXPIRED: 'منتهي',
  SCHEDULED: 'مجدول',
}

export default function DiscountCampaignsClient({ initialCampaigns }: Props) {
  const [campaigns, setCampaigns] = useState(initialCampaigns)
  const [loading, setLoading] = useState<string | null>(null)

  const handleToggle = async (id: string) => {
    setLoading(id)
    const result = await toggleDiscountCampaignStatus(id)
    if (result.success) {
      setCampaigns(prev => prev.map(c => {
        if (c.id === id) {
          return { ...c, status: c.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' }
        }
        return c
      }))
    }
    setLoading(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الحملة؟')) return
    setLoading(id)
    const result = await deleteDiscountCampaign(id)
    if (result.success) {
      setCampaigns(prev => prev.filter(c => c.id !== id))
    }
    setLoading(null)
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('ar-JO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getScopeDescription = (campaign: DiscountCampaignData) => {
    switch (campaign.scope) {
      case 'ALL_PRODUCTS':
        return 'جميع المنتجات'
      case 'SPECIFIC_PRODUCTS':
        return `${campaign._count?.products || 0} منتج`
      case 'COLLECTION':
        return campaign.collection?.name || 'قسم تسويقي'
      case 'CATEGORY':
        return campaign.category?.name || 'فئة'
      default:
        return ''
    }
  }

  if (campaigns.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-12 text-center">
        <Percent className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">لا توجد حملات خصم</h3>
        <p className="text-gray-500 mb-4">
          أنشئ حملة خصم جديدة لتطبيق تخفيضات على المنتجات
        </p>
        <Link href="/admin/discount-campaigns/new">
          <Button>إنشاء حملة خصم</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-right">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-sm font-medium text-gray-700">الحملة</th>
              <th className="px-4 py-3 text-sm font-medium text-gray-700">الخصم</th>
              <th className="px-4 py-3 text-sm font-medium text-gray-700">النطاق</th>
              <th className="px-4 py-3 text-sm font-medium text-gray-700">المدة</th>
              <th className="px-4 py-3 text-sm font-medium text-gray-700">الحالة</th>
              <th className="px-4 py-3 text-sm font-medium text-gray-700">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {campaigns.map((campaign) => {
              const ScopeIcon = scopeLabels[campaign.scope]?.icon || Package
              return (
                <tr key={campaign.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{campaign.name}</div>
                    {campaign.nameEn && (
                      <div className="text-sm text-gray-500">{campaign.nameEn}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-lg font-bold text-red-600">
                      {campaign.discountPercent}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ScopeIcon className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700">
                        {getScopeDescription(campaign)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-700">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(campaign.startDate)}
                      </div>
                      {campaign.endDate ? (
                        <div className="text-gray-500">
                          حتى {formatDate(campaign.endDate)}
                        </div>
                      ) : (
                        <div className="text-gray-400 text-xs">مفتوح المدة</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusColors[campaign.status] || 'bg-gray-100 text-gray-800'}`}>
                      {statusLabels[campaign.status] || campaign.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {(campaign.status === 'ACTIVE' || campaign.status === 'PAUSED') && (
                        <button
                          onClick={() => handleToggle(campaign.id)}
                          disabled={loading === campaign.id}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-50"
                          title={campaign.status === 'ACTIVE' ? 'إيقاف' : 'تفعيل'}
                        >
                          {campaign.status === 'ACTIVE' ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      <Link
                        href={`/admin/discount-campaigns/${campaign.id}`}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
                        title="تعديل"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(campaign.id)}
                        disabled={loading === campaign.id}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 disabled:opacity-50"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
