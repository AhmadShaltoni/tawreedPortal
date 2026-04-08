import { getAllNotices } from '@/actions/notices'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'
import NoticeListClient from './NoticeListClient'

export const metadata = {
  title: 'إدارة النوتس',
}

export default async function NoticesPage() {
  const user = await getCurrentUser()

  // Only admin can access
  if (!user || user.role !== 'ADMIN') {
    redirect('/login')
  }

  const result = await getAllNotices(true)
  const notices = result.success && result.data ? result.data : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إدارة النوتس والإعلانات</h1>
          <p className="text-gray-600 mt-1">
            أضف ورتب الإعلانات التي تظهر على الصفحة الرئيسية
          </p>
        </div>
        <Link href="/admin/notices/new">
          <Button>
            <Plus className="w-4 h-4 ml-2" />
            إضافة نوتس جديد
          </Button>
        </Link>
      </div>

      {/* List */}
      <NoticeListClient initialNotices={notices} />
    </div>
  )
}
