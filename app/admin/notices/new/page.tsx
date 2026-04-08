import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import NewNoticeForm from './NewNoticeForm'

export const metadata = {
  title: 'إنشاء نوتس جديد',
}

export default async function NewNoticePage() {
  const user = await getCurrentUser()

  // Only admin can access
  if (!user || user.role !== 'ADMIN') {
    redirect('/login')
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">إنشاء نوتس جديد</h1>
      <NewNoticeForm />
    </div>
  )
}
