import Link from 'next/link'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui'
import { getNotifications, getNotificationStats } from '@/actions/notifications'
import { NotificationListClient } from './NotificationListClient'

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: { page?: string; type?: string; unread?: string }
}) {
  const page = Number(searchParams.page) || 1
  const type = searchParams.type || undefined
  const unread = searchParams.unread === 'true'

  const [notificationsResult, statsResult] = await Promise.all([
    getNotifications(page, 20, {
      type: type,
      unread: unread,
    }),
    getNotificationStats(),
  ])

  const notifications =
    notificationsResult.success && 
    notificationsResult.data && 
    typeof notificationsResult.data === 'object' &&
    'notifications' in notificationsResult.data
      ? (notificationsResult.data as unknown as { notifications: any[] }).notifications
      : []
  const pagination =
    notificationsResult.success &&
    notificationsResult.data &&
    typeof notificationsResult.data === 'object' &&
    'pagination' in notificationsResult.data
      ? (notificationsResult.data as unknown as { pagination: any }).pagination
      : { page: 1, limit: 20, total: 0, pages: 1 }

  const stats =
    statsResult.success && statsResult.data && typeof statsResult.data === 'object'
      ? (statsResult.data as unknown as { total: number; sent: number; unread: number; byType: Record<string, number> })
      : null

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-8 h-8 text-blue-900" />
          <div>
            <h1 className="text-2xl font-bold text-blue-900">الإشعارات</h1>
            <p className="text-sm text-gray-600">إدارة وإرسال الإشعارات</p>
          </div>
        </div>
        <Link href="/admin/notifications/new">
          <Button variant="primary">إرسال إشعار جديد</Button>
        </Link>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">إجمالي الإشعارات</div>
            <div className="text-2xl font-bold text-blue-900 mt-1">
              {stats.total}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">المرسلة</div>
            <div className="text-2xl font-bold text-green-600 mt-1">
              {stats.sent}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">غير المقروءة</div>
            <div className="text-2xl font-bold text-orange-600 mt-1">
              {stats.unread}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">الأنواع</div>
            <div className="text-2xl font-bold text-purple-600 mt-1">
              {Object.keys(stats.byType || {}).length}
            </div>
          </div>
        </div>
      )}

      {/* Notification List */}
      <NotificationListClient
        notifications={notifications}
        pagination={pagination}
        currentType={type}
        currentUnread={unread}
      />
    </div>
  )
}
