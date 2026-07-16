import { getAppVersionConfigs } from '@/actions/app-version'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AppVersionClient from './AppVersionClient'
import { isAdminLike } from '@/lib/permissions'

export const metadata = {
  title: 'إدارة تحديثات التطبيق',
}

export default async function AppVersionPage() {
  const user = await getCurrentUser()

  // Only admin can access
  if (!user || !isAdminLike(user.role)) {
    redirect('/login')
  }

  const result = await getAppVersionConfigs()
  const configs = result.success && result.data ? result.data : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">إدارة تحديثات التطبيق</h1>
        <p className="text-gray-600 mt-1">
          تحكم بالنافذة المنبثقة للتحديث في تطبيق الجوال — فعّل التحديث الإجباري
          فقط بعد التأكد من توفر الإصدار الجديد على المتجر
        </p>
      </div>

      <AppVersionClient initialConfigs={configs} />
    </div>
  )
}
