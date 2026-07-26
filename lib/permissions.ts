// Central definition of dashboard permissions and role-based access rules.
//
// Roles:
//   SUPER_ADMIN — full access to every section + staff management. Ignores `permissions`.
//   ADMIN       — access limited to the permission keys granted in `user.permissions`.
//   DELIVERY    — fixed access to orders only.
//   BUYER/SUPPLIER — no dashboard access.
//
// Staff management (`/admin/staff`) is NOT a grantable permission: it is always
// restricted to SUPER_ADMIN and enforced by role, not by a permission key.

export type StaffRole = 'ADMIN' | 'SUPER_ADMIN' | 'DELIVERY'
export type UserRole = 'BUYER' | 'SUPPLIER' | StaffRole

export type PermissionKey =
  | 'dashboard'
  | 'products'
  | 'brands'
  | 'suppliers'
  | 'categories'
  | 'units'
  | 'orders'
  | 'delivery'
  | 'users'
  | 'notifications'
  | 'notices'
  | 'coupons'
  | 'discount-campaigns'
  | 'marketing-sections'
  | 'revenue'
  | 'loyalty'
  | 'app-version'

// Ordered catalog used to render the permission picker in the staff form.
export const PERMISSION_CATALOG: { key: PermissionKey; label: string }[] = [
  { key: 'dashboard', label: 'الرئيسية والإحصائيات' },
  { key: 'products', label: 'المنتجات' },
  { key: 'brands', label: 'الماركات' },
  { key: 'suppliers', label: 'الموردون' },
  { key: 'categories', label: 'التصنيفات' },
  { key: 'units', label: 'وحدات البيع' },
  { key: 'orders', label: 'الطلبات' },
  { key: 'delivery', label: 'التوصيل' },
  { key: 'users', label: 'المستخدمون' },
  { key: 'notifications', label: 'الإشعارات' },
  { key: 'notices', label: 'اللافتات (Notices)' },
  { key: 'coupons', label: 'أكواد الخصم' },
  { key: 'discount-campaigns', label: 'حملات الخصم' },
  { key: 'marketing-sections', label: 'أقسام التسويق' },
  { key: 'revenue', label: 'الإيرادات والأرباح' },
  { key: 'loyalty', label: 'نظام الولاء' },
  { key: 'app-version', label: 'تحديثات التطبيق' },
]

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_CATALOG.map((p) => p.key)

// Permissions a DELIVERY representative always has (not customizable).
const DELIVERY_PERMISSIONS: PermissionKey[] = ['orders']

// Longest-prefix-first mapping of dashboard routes to the permission they require.
// `/admin` (exact) and `/admin/staff` are handled specially (see routePermissionFor).
const ROUTE_PERMISSIONS: { prefix: string; permission: PermissionKey }[] = [
  { prefix: '/admin/products', permission: 'products' },
  { prefix: '/admin/brands', permission: 'brands' },
  { prefix: '/admin/suppliers', permission: 'suppliers' },
  { prefix: '/admin/categories', permission: 'categories' },
  { prefix: '/admin/units', permission: 'units' },
  { prefix: '/admin/orders', permission: 'orders' },
  { prefix: '/admin/delivery', permission: 'delivery' },
  { prefix: '/admin/users', permission: 'users' },
  { prefix: '/admin/notifications', permission: 'notifications' },
  { prefix: '/admin/notices', permission: 'notices' },
  { prefix: '/admin/coupons', permission: 'coupons' },
  { prefix: '/admin/discount-campaigns', permission: 'discount-campaigns' },
  { prefix: '/admin/marketing-sections', permission: 'marketing-sections' },
  { prefix: '/admin/revenue', permission: 'revenue' },
  { prefix: '/admin/loyalty', permission: 'loyalty' },
  { prefix: '/admin/app-version', permission: 'app-version' },
  // Settings is available to any staff member who can see the dashboard.
  { prefix: '/admin/settings', permission: 'dashboard' },
]

export function isStaffRole(role: string | null | undefined): role is StaffRole {
  return role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'DELIVERY'
}

// True for full-admin roles (ADMIN + SUPER_ADMIN). Used at defensive checkpoints
// that previously compared `role === 'ADMIN'` so SUPER_ADMIN keeps full access.
// (DELIVERY is intentionally excluded; grant it access via specific permissions.)
export function isAdminLike(role: string | null | undefined): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN'
}

interface PermissionSubject {
  role: string
  permissions?: string[] | null
}

// Whether a user may access a given permission-gated area.
export function hasPermission(user: PermissionSubject | null | undefined, key: PermissionKey): boolean {
  if (!user) return false
  if (user.role === 'SUPER_ADMIN') return true
  if (user.role === 'DELIVERY') return DELIVERY_PERMISSIONS.includes(key)
  if (user.role === 'ADMIN') {
    if (key === 'dashboard') return true // every full-admin lands on the dashboard
    return (user.permissions ?? []).includes(key)
  }
  return false
}

// Required permission for a dashboard pathname. Returns:
//   PermissionKey — a normal gated route
//   'staff'       — the staff-management area (SUPER_ADMIN only)
//   null          — unmapped route (treated as dashboard-level)
export function routePermissionFor(pathname: string): PermissionKey | 'staff' | null {
  if (pathname === '/admin' || pathname === '/admin/') return 'dashboard'
  if (pathname === '/admin/staff' || pathname.startsWith('/admin/staff/')) return 'staff'

  for (const { prefix, permission } of ROUTE_PERMISSIONS) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) return permission
  }
  return null
}

// Landing route a staff user should be sent to when they hit a page they can't access.
export function defaultRouteFor(user: PermissionSubject): string {
  if (user.role === 'DELIVERY') return '/admin/orders'
  return '/admin'
}

// Canonical dashboard home for ANY role. Use this instead of hard-coded binary
// redirects: a layout that guards for a single role must send every other role
// to its own home, otherwise non-matching roles (e.g. staff on /buyer) bounce
// between dashboards forever — an infinite redirect loop.
export function homeRouteFor(user: PermissionSubject): string {
  if (user.role === 'BUYER') return '/buyer'
  if (user.role === 'SUPPLIER') return '/supplier'
  return defaultRouteFor(user) // staff → /admin (or /admin/orders for DELIVERY)
}
