'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useLanguage } from '@/lib/LanguageContext'
import { formatDate } from '@/lib/utils'
import { toggleUserActive } from '@/actions/users'

interface Props {
  users: Array<{
    id: string
    email: string | null
    username: string
    phone: string | null
    role: string
    storeName: string | null
    city: string | null
    isActive: boolean
    createdAt: Date
    _count: { buyerOrders: number }
  }>
  total: number
  pages: number
  currentPage: number
  currentRole?: string
  currentSearch?: string
}

export function UserListClient({ users, total, pages, currentPage, currentRole, currentSearch }: Props) {
  const { t, dir } = useLanguage()
  const router = useRouter()
  const [search, setSearch] = useState(currentSearch || '')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (currentRole) params.set('role', currentRole)
    router.push(`/admin/users?${params.toString()}`)
  }

  function handleRoleFilter(role: string) {
    const params = new URLSearchParams()
    if (role) params.set('role', role)
    if (currentSearch) params.set('search', currentSearch)
    router.push(`/admin/users?${params.toString()}`)
  }

  async function handleToggleActive(id: string) {
    await toggleUserActive(id)
  }

  return (
    <div className="space-y-6">
      <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <h1 className="text-2xl font-bold text-gray-900">{t.userManagement.title}</h1>
        <Link href="/admin/users/new">
          <Button variant="primary" className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <Plus className="w-4 h-4" />
            {t.userManagement.addUser}
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className={`flex flex-col sm:flex-row gap-4 ${dir === 'rtl' ? 'sm:flex-row-reverse' : ''}`}>
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 ${dir === 'rtl' ? 'right-3' : 'left-3'}`} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.common.search}
                  className={`w-full border border-gray-300 rounded-lg py-2 ${dir === 'rtl' ? 'pr-10 pl-3' : 'pl-10 pr-3'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
              </div>
            </form>
            <select
              value={currentRole || ''}
              onChange={(e) => handleRoleFilter(e.target.value)}
              className="border border-gray-300 rounded-lg py-2 px-3 min-w-[200px]"
            >
              <option value="">{t.userManagement.allRoles}</option>
              <option value="BUYER">{t.roles.buyer}</option>
              <option value="SUPPLIER">{t.roles.supplier}</option>
              <option value="ADMIN">{t.roles.admin}</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-center text-gray-500 py-12">{t.userManagement.noUsers}</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.userManagement.name}</th>
                      <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.userManagement.email}</th>
                      <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.userManagement.role}</th>
                      <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.userManagement.city}</th>
                      <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.userManagement.ordersCount}</th>
                      <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.userManagement.status}</th>
                      <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.common.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3">
                          <div>
                            <p className="font-medium text-gray-900">{user.username}</p>
                            {user.storeName && <p className="text-xs text-gray-500">{user.storeName}</p>}
                          </div>
                        </td>
                        <td className="py-3 text-gray-600">{user.email}</td>
                        <td className="py-3">
                          <Badge status={user.role === 'ADMIN' ? 'admin' : user.role === 'BUYER' ? 'buyer' : 'supplier'}>
                            {t.roles[user.role.toLowerCase() as keyof typeof t.roles]}
                          </Badge>
                        </td>
                        <td className="py-3 text-gray-600">{user.city || '-'}</td>
                        <td className="py-3 text-gray-700">{user._count.buyerOrders}</td>
                        <td className="py-3">
                          <Badge status={user.isActive ? 'active' : 'inactive'}>
                            {user.isActive ? t.userManagement.active : t.userManagement.inactive}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <Button variant="ghost" size="sm" onClick={() => handleToggleActive(user.id)}>
                            {user.isActive ? t.userManagement.inactive : t.userManagement.active}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-200">
                  {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                    <Link
                      key={p}
                      href={`/admin/users?page=${p}${currentRole ? `&role=${currentRole}` : ''}${currentSearch ? `&search=${currentSearch}` : ''}`}
                      className={`px-3 py-1 rounded ${p === currentPage ? 'bg-blue-900 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                      {p}
                    </Link>
                  ))}
                </div>
              )}
              <p className="text-sm text-gray-500 mt-2 text-center">{total} {t.admin.users}</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
