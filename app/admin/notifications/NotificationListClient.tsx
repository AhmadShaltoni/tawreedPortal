'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLanguage } from '@/lib/LanguageContext'
import { Button } from '@/components/ui'
import { Badge } from '@/components/ui/Badge'
import { Trash2, Eye, EyeOff } from 'lucide-react'
import { deleteNotification, markNotificationAsRead } from '@/actions/notifications'
import { useState } from 'react'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  linkUrl?: string | null
  isRead: boolean
  isSent: boolean
  createdAt: Date
  user: {
    id: string
    phone: string
    username: string
    storeName?: string | null
    role: string
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

export function NotificationListClient({
  notifications,
  pagination,
  currentType,
  currentUnread,
}: {
  notifications: Notification[]
  pagination: Pagination
  currentType?: string
  currentUnread?: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { dir } = useLanguage()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [marking, setMarking] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الإشعار؟')) return

    setDeleting(id)
    try {
      const result = await deleteNotification(id)
      if (result.success) {
        router.refresh()
      } else {
        alert('حدث خطأ في حذف الإشعار')
      }
    } finally {
      setDeleting(null)
    }
  }

  const handleMarkAsRead = async (id: string, isRead: boolean) => {
    if (isRead) return

    setMarking(id)
    try {
      const result = await markNotificationAsRead(id)
      if (result.success) {
        router.refresh()
      }
    } finally {
      setMarking(null)
    }
  }

  const handleFilter = (newType?: string | null, newUnread?: boolean) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', '1')

    if (newType) {
      params.set('type', newType)
    } else {
      params.delete('type')
    }

    if (newUnread) {
      params.set('unread', 'true')
    } else {
      params.delete('unread')
    }

    router.push(`/admin/notifications?${params.toString()}`)
  }

  const notificationTypes = [
    { value: 'NEW_ORDER', label: 'طلب جديد' },
    { value: 'ORDER_UPDATE', label: 'تحديث الطلب' },
    { value: 'ORDER_STATUS_CHANGE', label: 'تغيير حالة الطلب' },
    { value: 'OFFER_ACCEPTED', label: 'عرض مقبول' },
    { value: 'OFFER_REJECTED', label: 'عرض مرفوض' },
    { value: 'SYSTEM', label: 'نظام' },
  ]

  const typeLabel = (type: string) => {
    return notificationTypes.find((t) => t.value === type)?.label || type
  }

  const statusColor = (type: string) => {
    const colors: Record<string, string> = {
      NEW_ORDER: 'bg-blue-100 text-blue-800',
      ORDER_UPDATE: 'bg-purple-100 text-purple-800',
      ORDER_STATUS_CHANGE: 'bg-green-100 text-green-800',
      OFFER_ACCEPTED: 'bg-emerald-100 text-emerald-800',
      OFFER_REJECTED: 'bg-red-100 text-red-800',
      SYSTEM: 'bg-gray-100 text-gray-800',
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className={`flex items-center gap-2 flex-wrap ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <button
          onClick={() => handleFilter(undefined, false)}
          className={`px-3 py-1 text-sm rounded-full transition-colors ${
            !currentType && !currentUnread
              ? 'bg-blue-900 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          الكل
        </button>

        <button
          onClick={() => handleFilter(undefined, true)}
          className={`px-3 py-1 text-sm rounded-full transition-colors ${
            currentUnread
              ? 'bg-blue-900 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          غير المقروءة
        </button>

        <div className="w-px h-5 bg-gray-300" />

        {notificationTypes.map((type) => (
          <button
            key={type.value}
            onClick={() => handleFilter(type.value, false)}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              currentType === type.value
                ? 'bg-blue-900 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {type.label}
          </button>
        ))}

        {(currentType || currentUnread) && (
          <button
            onClick={() => handleFilter(undefined, false)}
            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-full hover:bg-red-200"
          >
            مسح الفلترة
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {notifications.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className={`px-6 py-3 text-sm font-semibold text-gray-700 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                    العنوان
                  </th>
                  <th className={`px-6 py-3 text-sm font-semibold text-gray-700 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                    النوع
                  </th>
                  <th className={`px-6 py-3 text-sm font-semibold text-gray-700 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                    المستقبل
                  </th>
                  <th className={`px-6 py-3 text-sm font-semibold text-gray-700 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                    الحالة
                  </th>
                  <th className={`px-6 py-3 text-sm font-semibold text-gray-700 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                    التاريخ
                  </th>
                  <th className={`px-6 py-3 text-sm font-semibold text-gray-700 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {notifications.map((notification) => (
                  <tr key={notification.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <div>
                        <div className="font-medium text-gray-900">
                          {notification.title}
                        </div>
                        <div className="text-sm text-gray-600 truncate">
                          {notification.message}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant="default" className={statusColor(notification.type)}>
                        {typeLabel(notification.type)}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <div className="font-medium text-gray-900">
                        {notification.user.storeName || notification.user.username}
                      </div>
                      <div className="text-xs text-gray-600">
                        {notification.user.phone}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="space-y-1">
                        <Badge
                          className={
                            notification.isSent
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }
                        >
                          {notification.isSent ? 'تم الإرسال' : 'قيد الانتظار'}
                        </Badge>
                        <Badge
                          className={
                            notification.isRead
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }
                        >
                          {notification.isRead ? 'مقروء' : 'غير مقروء'}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {new Date(notification.createdAt).toLocaleDateString(
                        'ar-JO'
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <div className={`flex gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        {!notification.isRead && (
                          <button
                            onClick={() =>
                              handleMarkAsRead(notification.id, notification.isRead)
                            }
                            disabled={marking === notification.id}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                            title="تحديد كمقروء"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification.id)}
                          disabled={deleting === notification.id}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">لا توجد إشعارات</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className={`flex items-center justify-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(
            (page) => (
              <Link
                key={page}
                href={`/admin/notifications?page=${page}${currentType ? `&type=${currentType}` : ''}${currentUnread ? '&unread=true' : ''}`}
              >
                <button
                  className={`px-3 py-1 rounded transition-colors ${
                    pagination.page === page
                      ? 'bg-blue-900 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {page}
                </button>
              </Link>
            )
          )}
        </div>
      )}
    </div>
  )
}
