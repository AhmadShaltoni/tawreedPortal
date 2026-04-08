'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { disableNotice, enableNotice, deleteNotice } from '@/actions/notices'
import { Edit, Trash2, Eye } from 'lucide-react'

interface Notice {
  id: string
  text: string
  backgroundColor: string
  textColor: string
  isMobileOnly: boolean
  isActive: boolean
  createdAt: Date | string
  updatedAt: Date | string
}

interface NoticeListClientProps {
  initialNotices: Notice[]
}

export default function NoticeListClient({
  initialNotices,
}: NoticeListClientProps) {
  const router = useRouter()
  const [notices, setNotices] = useState<Notice[]>(initialNotices)
  const [loading, setLoading] = useState<string | null>(null)

  const handleToggle = async (id: string, isActive: boolean) => {
    setLoading(id)
    try {
      const action = isActive ? disableNotice : enableNotice
      const result = await action(id)

      if (result.success) {
        setNotices(
          notices.map((notice) =>
            notice.id === id
              ? { ...notice, isActive: !notice.isActive }
              : notice
          )
        )
        router.refresh()
      } else {
        alert(result.error || 'حدث خطأ')
      }
    } catch (error) {
      alert('حدث خطأ')
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا النوتس؟')) {
      return
    }

    setLoading(id)
    try {
      const result = await deleteNotice(id)

      if (result.success) {
        setNotices(notices.filter((notice) => notice.id !== id))
        router.refresh()
      } else {
        alert(result.error || 'حدث خطأ')
      }
    } catch (error) {
      alert('حدث خطأ')
    } finally {
      setLoading(null)
    }
  }

  if (notices.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-gray-500 mb-4">لا توجد أي نوتس حالياً</p>
        <Link href="/admin/notices/new">
          <Button>إنشاء النوتس الأول</Button>
        </Link>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {notices.map((notice) => (
        <Card
          key={notice.id}
          className="p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-start justify-between gap-4">
            {/* Preview */}
            <div className="flex-1">
              <div
                className="p-3 rounded-lg mb-4 text-sm md:text-base"
                style={{
                  backgroundColor: notice.backgroundColor,
                  color: notice.textColor,
                }}
              >
                {notice.text}
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant={notice.isActive ? 'default' : 'warning'}
                >
                  {notice.isActive ? 'نشط' : 'معطل'}
                </Badge>
                <span className="text-xs text-gray-500">
                  {new Date(notice.createdAt).toLocaleDateString('ar-JO')}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Link href={`/admin/notices/${notice.id}`}>
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4" />
                </Button>
              </Link>

              <Button
                variant={notice.isActive ? 'outline' : 'secondary'}
                size="sm"
                onClick={() => handleToggle(notice.id, notice.isActive)}
                disabled={loading === notice.id}
              >
                {loading === notice.id ? (
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(notice.id)}
                disabled={loading === notice.id}
              >
                {loading === notice.id ? (
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
