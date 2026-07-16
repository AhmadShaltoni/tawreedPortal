'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Package, 
  FolderTree, 
  ShoppingCart, 
  Users, 
  Bell,
  StickyNote,
  Ticket,
  Settings,
  Package2,
  Truck,
  BarChart3,
  Gift,
  Sparkles,
  Megaphone,
  Percent,
  Boxes,
  CloudDownload,
  ShieldCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/LanguageContext'
import { hasPermission, type PermissionKey } from '@/lib/permissions'

interface AdminSidebarProps {
  role: string
  permissions: string[]
}

export function AdminSidebar({ role, permissions }: AdminSidebarProps) {
  const pathname = usePathname()
  const { t, dir } = useLanguage()

  const allLinks: { href: string; label: string; icon: typeof LayoutDashboard; exact?: boolean; perm: PermissionKey }[] = [
    { href: '/admin', label: t.admin.dashboard, icon: LayoutDashboard, exact: true, perm: 'dashboard' },
    { href: '/admin/products', label: t.admin.products, icon: Package, perm: 'products' },
    { href: '/admin/brands', label: t.admin.brands || 'الماركات', icon: Sparkles, perm: 'brands' },
    { href: '/admin/suppliers', label: t.admin.suppliers || 'الموردين', icon: Truck, perm: 'suppliers' },
    { href: '/admin/categories', label: t.admin.categories, icon: FolderTree, perm: 'categories' },
    { href: '/admin/units', label: t.admin.units || 'وحدات البيع', icon: Boxes, perm: 'units' },
    { href: '/admin/orders', label: t.admin.orders, icon: ShoppingCart, perm: 'orders' },
    { href: '/admin/delivery', label: 'التوصيل', icon: Package2, perm: 'delivery' },
    { href: '/admin/users', label: t.admin.users, icon: Users, perm: 'users' },
    { href: '/admin/notifications', label: t.admin.notifications, icon: Bell, perm: 'notifications' },
    { href: '/admin/notices', label: t.admin.notices, icon: StickyNote, perm: 'notices' },
    { href: '/admin/coupons', label: t.admin.coupons, icon: Ticket, perm: 'coupons' },
    { href: '/admin/discount-campaigns', label: 'حملات الخصم', icon: Percent, perm: 'discount-campaigns' },
    { href: '/admin/marketing-sections', label: t.admin.marketingSections || 'أقسام التسويق', icon: Megaphone, perm: 'marketing-sections' },
    { href: '/admin/revenue', label: t.admin.revenue || 'الإيرادات والأرباح', icon: BarChart3, perm: 'revenue' },
    { href: '/admin/loyalty/dashboard', label: t.admin.loyalty || 'نظام الولاء', icon: Gift, perm: 'loyalty' },
    { href: '/admin/app-version', label: 'تحديثات التطبيق', icon: CloudDownload, perm: 'app-version' },
  ]

  const subject = { role, permissions }
  const links = allLinks.filter((link) => hasPermission(subject, link.perm))

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
        <div className={`mb-6 px-3 py-2 bg-blue-50 rounded-lg ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
          <p className="text-xs text-blue-600 uppercase tracking-wider">{t.sidebar.loggedInAs}</p>
          <p className="text-sm font-medium text-blue-900">
            {role === 'SUPER_ADMIN' ? 'مدير عام' : role === 'DELIVERY' ? 'مندوب توصيل' : t.roles.admin}
          </p>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {links.map((link) => {
            const isActive = link.exact 
              ? pathname === link.href
              : pathname === link.href || pathname.startsWith(link.href + '/')
            
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

        {/* Staff management — SUPER_ADMIN only */}
        {role === 'SUPER_ADMIN' && (
          <div className="mt-8 pt-8 border-t border-gray-200">
            <Link
              href="/admin/staff"
              className={cn(
                `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${dir === 'rtl' ? 'flex-row-reverse' : ''}`,
                pathname === '/admin/staff' || pathname.startsWith('/admin/staff/')
                  ? 'bg-blue-900 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <ShieldCheck className="w-5 h-5" />
              <span>الموظفون والصلاحيات</span>
            </Link>
          </div>
        )}

        {/* Settings */}
        <div className={role === 'SUPER_ADMIN' ? 'mt-2' : 'mt-8 pt-8 border-t border-gray-200'}>
          <Link
            href="/admin/settings"
            className={cn(
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${dir === 'rtl' ? 'flex-row-reverse' : ''}`,
              pathname === '/admin/settings'
                ? 'bg-blue-900 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            )}
          >
            <Settings className="w-5 h-5" />
            <span>{t.admin.settings}</span>
          </Link>
        </div>
      </div>
    </aside>
  )
}
