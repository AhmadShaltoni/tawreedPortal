import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import EditNoticeForm from './EditNoticeForm'

export const metadata = {
  title: 'تعديل النوتس',
}

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditNoticePage({ params }: PageProps) {
  const { id } = await params
  const user = await getCurrentUser()

  // Only admin can access
  if (!user || user.role !== 'ADMIN') {
    redirect('/login')
  }

  // Fetch notice
  const notice = await db.notice.findUnique({
    where: { id },
  })

  if (!notice) {
    redirect('/admin/notices')
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">تعديل النوتس</h1>
      <EditNoticeForm notice={notice} />
    </div>
  )
}
