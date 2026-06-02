'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  ChevronRight,
  Users,
  DollarSign,
  ShoppingCart,
  MapPin,
  Search,
  Calendar,
  Phone,
  Store,
  BarChart3,
  ArrowLeft,
} from 'lucide-react'
import type { DiscountCodeWithFullReport, DiscountCodeUsageUser } from '@/types'

interface Props {
  coupon: DiscountCodeWithFullReport
}

export default function CouponReportClient({ coupon }: Props) {
  const [searchQuery, setSearchQuery] = useState('')

  // Compute stats
  const stats = useMemo(() => {
    const totalUsages = coupon._count.usages
    const totalDiscount = coupon.usages.reduce((sum, u) => sum + u.discountAmount, 0)
    const totalOrderValue = coupon.usages.reduce((sum, u) => sum + u.orderTotal, 0)

    // Unique users
    const uniqueUserIds = new Set(coupon.usages.map((u) => u.user.id))
    const uniqueUsers = uniqueUserIds.size

    // City distribution
    const cityMap: Record<string, number> = {}
    coupon.usages.forEach((u) => {
      const city = u.user.cityRef?.name || u.user.city || 'غير محدد'
      cityMap[city] = (cityMap[city] || 0) + 1
    })

    return { totalUsages, totalDiscount, totalOrderValue, uniqueUsers, cityMap }
  }, [coupon])

  // Filter usages by search
  const filteredUsages = useMemo(() => {
    if (!searchQuery.trim()) return coupon.usages
    const q = searchQuery.toLowerCase()
    return coupon.usages.filter(
      (u) =>
        u.user.username.toLowerCase().includes(q) ||
        u.user.phone.includes(q) ||
        (u.user.storeName && u.user.storeName.toLowerCase().includes(q)) ||
        (u.user.city && u.user.city.toLowerCase().includes(q)) ||
        (u.user.cityRef?.name && u.user.cityRef.name.includes(q)) ||
        (u.user.areaRef?.name && u.user.areaRef.name.includes(q))
    )
  }, [coupon.usages, searchQuery])

  // Get unique users for the "users" tab view
  const uniqueUsersData = useMemo(() => {
    const userMap = new Map<string, { user: DiscountCodeUsageUser; usageCount: number; totalDiscount: number; totalOrders: number; firstUsage: Date; lastUsage: Date }>()
    
    coupon.usages.forEach((u) => {
      const existing = userMap.get(u.user.id)
      if (existing) {
        existing.usageCount += 1
        existing.totalDiscount += u.discountAmount
        existing.totalOrders += u.orderTotal
        if (new Date(u.createdAt) < new Date(existing.firstUsage)) {
          existing.firstUsage = new Date(u.createdAt)
        }
        if (new Date(u.createdAt) > new Date(existing.lastUsage)) {
          existing.lastUsage = new Date(u.createdAt)
        }
      } else {
        userMap.set(u.user.id, {
          user: u.user,
          usageCount: 1,
          totalDiscount: u.discountAmount,
          totalOrders: u.orderTotal,
          firstUsage: new Date(u.createdAt),
          lastUsage: new Date(u.createdAt),
        })
      }
    })

    let users = Array.from(userMap.values())
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      users = users.filter(
        (item) =>
          item.user.username.toLowerCase().includes(q) ||
          item.user.phone.includes(q) ||
          (item.user.storeName && item.user.storeName.toLowerCase().includes(q)) ||
          (item.user.city && item.user.city.toLowerCase().includes(q)) ||
          (item.user.cityRef?.name && item.user.cityRef.name.includes(q)) ||
          (item.user.areaRef?.name && item.user.areaRef.name.includes(q))
      )
    }

    return users
  }, [coupon.usages, searchQuery])

  const [activeTab, setActiveTab] = useState<'usages' | 'users'>('users')

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/coupons" className="text-blue-600 hover:underline">
          إدارة أكواد الخصم
        </Link>
        <ChevronRight className="w-4 h-4" />
        <Link href={`/admin/coupons/${coupon.id}`} className="text-blue-600 hover:underline">
          {coupon.code}
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-600">التقرير</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            تقرير كود الخصم
          </h1>
          <p className="text-gray-600 mt-1">
            تقرير تفصيلي لاستخدامات الكود{' '}
            <span className="font-mono font-bold bg-gray-100 px-2 py-0.5 rounded">
              {coupon.code}
            </span>
          </p>
        </div>
        <Link href="/admin/coupons">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 ml-2" />
            العودة
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي الاستخدامات</p>
              <p className="text-2xl font-bold">{stats.totalUsages}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">عدد المستخدمين</p>
              <p className="text-2xl font-bold">{stats.uniqueUsers}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي الخصومات</p>
              <p className="text-2xl font-bold">{stats.totalDiscount.toFixed(2)} <span className="text-sm font-normal">د.أ</span></p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي قيمة الطلبات</p>
              <p className="text-2xl font-bold">{stats.totalOrderValue.toFixed(2)} <span className="text-sm font-normal">د.أ</span></p>
            </div>
          </div>
        </Card>
      </div>

      {/* Coupon Info */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          معلومات الكود
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">نسبة الخصم:</span>
            <p className="font-bold text-green-600 text-lg">{coupon.discountPercent}%</p>
          </div>
          <div>
            <span className="text-gray-500">النوع:</span>
            <p className="font-medium">
              {coupon.isSingleUse ? 'مرة واحدة لكل مستخدم' : 'متعدد الاستخدام'}
            </p>
          </div>
          <div>
            <span className="text-gray-500">الحد الأقصى:</span>
            <p className="font-medium">
              {coupon.maxUsage ? `${stats.totalUsages} / ${coupon.maxUsage}` : 'غير محدود'}
            </p>
          </div>
          <div>
            <span className="text-gray-500">الحالة:</span>
            <Badge variant={coupon.isActive ? 'default' : 'warning'}>
              {coupon.isActive ? 'نشط' : 'معطل'}
            </Badge>
          </div>
          {coupon.minOrderAmount && (
            <div>
              <span className="text-gray-500">الحد الأدنى للطلب:</span>
              <p className="font-medium">{coupon.minOrderAmount} د.أ</p>
            </div>
          )}
          {coupon.startDate && (
            <div>
              <span className="text-gray-500">تاريخ البداية:</span>
              <p className="font-medium">{new Date(coupon.startDate).toLocaleDateString('ar-JO')}</p>
            </div>
          )}
          {coupon.endDate && (
            <div>
              <span className="text-gray-500">تاريخ الانتهاء:</span>
              <p className="font-medium">{new Date(coupon.endDate).toLocaleDateString('ar-JO')}</p>
            </div>
          )}
        </div>
      </Card>

      {/* City Distribution */}
      {Object.keys(stats.cityMap).length > 0 && (
        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-gray-600" />
            توزيع المدن
          </h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats.cityMap)
              .sort((a, b) => b[1] - a[1])
              .map(([city, count]) => (
                <div
                  key={city}
                  className="flex items-center gap-2 bg-gray-50 border rounded-lg px-4 py-2"
                >
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{city}</span>
                  <Badge variant="info">{count}</Badge>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Search & Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Users className="w-4 h-4 inline ml-1" />
            المستخدمين ({stats.uniqueUsers})
          </button>
          <button
            onClick={() => setActiveTab('usages')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === 'usages'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <ShoppingCart className="w-4 h-4 inline ml-1" />
            سجل الاستخدامات ({stats.totalUsages})
          </button>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="بحث بالاسم أو الهاتف أو المدينة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <Card className="overflow-hidden">
          {uniqueUsersData.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>لا توجد نتائج</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-right py-3 px-4 font-semibold">#</th>
                    <th className="text-right py-3 px-4 font-semibold">اسم المستخدم</th>
                    <th className="text-right py-3 px-4 font-semibold">رقم الهاتف</th>
                    <th className="text-right py-3 px-4 font-semibold">اسم المتجر</th>
                    <th className="text-right py-3 px-4 font-semibold">المدينة</th>
                    <th className="text-right py-3 px-4 font-semibold">المنطقة</th>
                    <th className="text-right py-3 px-4 font-semibold">العنوان</th>
                    <th className="text-right py-3 px-4 font-semibold">عدد الاستخدامات</th>
                    <th className="text-right py-3 px-4 font-semibold">إجمالي الخصم</th>
                    <th className="text-right py-3 px-4 font-semibold">إجمالي الطلبات</th>
                    <th className="text-right py-3 px-4 font-semibold">تاريخ التسجيل</th>
                    <th className="text-right py-3 px-4 font-semibold">أول استخدام</th>
                    <th className="text-right py-3 px-4 font-semibold">آخر استخدام</th>
                  </tr>
                </thead>
                <tbody>
                  {uniqueUsersData.map((item, index) => (
                    <tr key={item.user.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-400">{index + 1}</td>
                      <td className="py-3 px-4 font-medium">{item.user.username}</td>
                      <td className="py-3 px-4 font-mono text-xs" dir="ltr">
                        {item.user.phone}
                      </td>
                      <td className="py-3 px-4">{item.user.storeName || '—'}</td>
                      <td className="py-3 px-4">
                        {item.user.cityRef?.name || item.user.city || '—'}
                      </td>
                      <td className="py-3 px-4">
                        {item.user.areaRef?.name || '—'}
                      </td>
                      <td className="py-3 px-4 text-xs max-w-[200px] truncate">
                        {item.user.address || item.user.businessAddress || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="info">{item.usageCount}</Badge>
                      </td>
                      <td className="py-3 px-4 text-green-600 font-medium">
                        {item.totalDiscount.toFixed(2)} د.أ
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {item.totalOrders.toFixed(2)} د.أ
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">
                        {new Date(item.user.createdAt).toLocaleDateString('ar-JO')}
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">
                        {new Date(item.firstUsage).toLocaleDateString('ar-JO')}
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">
                        {new Date(item.lastUsage).toLocaleDateString('ar-JO')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Usages Tab */}
      {activeTab === 'usages' && (
        <Card className="overflow-hidden">
          {filteredUsages.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>لا توجد استخدامات</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-right py-3 px-4 font-semibold">#</th>
                    <th className="text-right py-3 px-4 font-semibold">اسم المستخدم</th>
                    <th className="text-right py-3 px-4 font-semibold">رقم الهاتف</th>
                    <th className="text-right py-3 px-4 font-semibold">اسم المتجر</th>
                    <th className="text-right py-3 px-4 font-semibold">المدينة</th>
                    <th className="text-right py-3 px-4 font-semibold">المنطقة</th>
                    <th className="text-right py-3 px-4 font-semibold">مبلغ الطلب</th>
                    <th className="text-right py-3 px-4 font-semibold">مبلغ الخصم</th>
                    <th className="text-right py-3 px-4 font-semibold">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsages.map((usage, index) => (
                    <tr key={usage.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-400">{index + 1}</td>
                      <td className="py-3 px-4 font-medium">{usage.user.username}</td>
                      <td className="py-3 px-4 font-mono text-xs" dir="ltr">
                        {usage.user.phone}
                      </td>
                      <td className="py-3 px-4">{usage.user.storeName || '—'}</td>
                      <td className="py-3 px-4">
                        {usage.user.cityRef?.name || usage.user.city || '—'}
                      </td>
                      <td className="py-3 px-4">
                        {usage.user.areaRef?.name || '—'}
                      </td>
                      <td className="py-3 px-4">{usage.orderTotal.toFixed(2)} د.أ</td>
                      <td className="py-3 px-4 text-green-600 font-medium">
                        {usage.discountAmount.toFixed(2)} د.أ
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">
                        {new Date(usage.createdAt).toLocaleDateString('ar-JO')}{' '}
                        {new Date(usage.createdAt).toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
