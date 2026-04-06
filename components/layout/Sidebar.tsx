'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  FileText, 
  ShoppingCart, 
  Bell,
  Package2,
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/LanguageContext'

interface SidebarProps {
  role: 'BUYER' | 'SUPPLIER' | 'ADMIN'
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const { t, dir } = useLanguage()

  const buyerLinks = [
    { href: '/buyer', label: t.sidebar.dashboard, icon: LayoutDashboard },
    { href: '/buyer/requests', label: t.sidebar.myRequests, icon: FileText },
    { href: '/buyer/orders', label: t.sidebar.orders, icon: ShoppingCart },
    { href: '/buyer/notifications', label: t.sidebar.notifications, icon: Bell },
  ]

  const supplierLinks = [
    { href: '/supplier', label: t.sidebar.dashboard, icon: LayoutDashboard },
    { href: '/supplier/requests', label: t.sidebar.browseRequests, icon: FileText },
    { href: '/supplier/offers', label: t.sidebar.myOffers, icon: Package2 },
    { href: '/supplier/orders', label: t.sidebar.orders, icon: ShoppingCart },
    { href: '/supplier/notifications', label: t.sidebar.notifications, icon: Bell },
  ]

  const adminLinks = [
    { href: '/admin', label: t.sidebar.dashboard, icon: LayoutDashboard },
    { href: '/admin/products', label: t.sidebar.myRequests, icon: Package2 },
    { href: '/admin/orders', label: t.sidebar.orders, icon: ShoppingCart },
    { href: '/admin/notifications', label: t.sidebar.notifications, icon: Bell },
  ]

  const links = role === 'ADMIN' ? adminLinks : role === 'BUYER' ? buyerLinks : supplierLinks

  return (
    <aside className={`w-64 bg-white border-gray-200 min-h-screen ${dir === 'rtl' ? 'border-l' : 'border-r'}`}>
      <div className="p-4">
        {/* Logo */}
        <Link href="/" className={`flex items-center gap-2 mb-8 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center">
            <Package2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-zain-logo text-blue-900">{t.brand}</span>
        </Link>

        {/* Role indicator */}
        <div className={`mb-6 px-3 py-2 bg-gray-100 rounded-lg ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
          <p className="text-xs text-gray-500 uppercase tracking-wider">{t.sidebar.loggedInAs}</p>
          <p className="text-sm font-medium text-gray-900">
            {role === 'BUYER' ? t.roles.buyer : t.roles.supplier}
          </p>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {links.map((link) => {
            const isActive = pathname === link.href || 
              (link.href !== '/buyer' && link.href !== '/supplier' && pathname.startsWith(link.href))
            
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${dir === 'rtl' ? 'flex-row-reverse' : ''}`,
                  isActive
                    ? 'bg-blue-900 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <link.icon className="w-5 h-5" />
                <span>{link.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Settings */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <Link
            href="/settings"
            className={cn(
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${dir === 'rtl' ? 'flex-row-reverse' : ''}`,
              pathname === '/settings'
                ? 'bg-blue-900 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            )}
          >
            <Settings className="w-5 h-5" />
            <span>{t.sidebar.settings}</span>
          </Link>
        </div>
      </div>
    </aside>
  )
}
