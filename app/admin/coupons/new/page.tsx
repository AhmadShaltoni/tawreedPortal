import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import NewCouponForm from './NewCouponForm'

export const metadata = {
  title: 'إنشاء كود خصم جديد',
}

export default async function NewCouponPage() {
  const user = await getCurrentUser()

  if (!user || user.role !== 'ADMIN') {
    redirect('/login')
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">إنشاء كود خصم جديد</h1>
      <NewCouponForm />
    </div>
  )
}
