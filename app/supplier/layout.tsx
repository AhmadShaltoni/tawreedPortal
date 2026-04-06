import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Sidebar } from '@/components/layout/Sidebar'
import { UserMenu } from '@/components/layout/UserMenu'
import { Bell } from 'lucide-react'
import Link from 'next/link'

export default async function SupplierLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  if (session.user.role !== 'SUPPLIER') {
    redirect('/buyer')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar role="SUPPLIER" />
      
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <h1 className="text-lg font-semibold text-gray-900">
            Supplier Dashboard
          </h1>
          <div className="flex items-center gap-4">
            <Link 
              href="/supplier/notifications" 
              className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full" />
            </Link>
            <UserMenu user={session.user} />
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
