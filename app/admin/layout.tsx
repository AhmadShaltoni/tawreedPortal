import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { AdminSidebar } from './AdminSidebar'
import { Bell } from 'lucide-react'
import Link from 'next/link'
import { isStaffRole, hasPermission, routePermissionFor, defaultRouteFor } from '@/lib/permissions'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const user = session.user

  if (!isStaffRole(user.role)) {
    redirect('/')
  }

  // Enforce per-route permission. The pathname is injected by middleware.ts.
  const pathname = (await headers()).get('x-pathname') ?? '/admin'
  const required = routePermissionFor(pathname)

  if (required === 'staff') {
    // Staff management is SUPER_ADMIN-only, enforced by role (not a permission).
    if (user.role !== 'SUPER_ADMIN') redirect(defaultRouteFor(user))
  } else if (required && !hasPermission(user, required)) {
    redirect(defaultRouteFor(user))
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar role={user.role} permissions={user.permissions} />

      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <h1 className="text-lg font-semibold text-gray-900">
            لوحة تحكم المدير
          </h1>
          <div className="flex items-center gap-4">
            <Link 
              href="/admin/notifications" 
              className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <Bell className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {session.user.username?.charAt(0) || 'A'}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-700">{session.user.username}</span>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
