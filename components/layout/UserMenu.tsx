'use client'

import { useState } from 'react'
import Link from 'next/link'
import { User, LogOut, LayoutDashboard, ChevronDown } from 'lucide-react'
import { logoutUser } from '@/actions/auth'
import { useLanguage } from '@/lib/LanguageContext'

interface UserMenuProps {
  user: {
    id: string
    username?: string | null
    email?: string | null
    role: string
    storeName?: string | null
  }
}

export function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { t, dir } = useLanguage()

  const dashboardLink = user.role === 'ADMIN' ? '/admin' : user.role === 'BUYER' ? '/buyer' : '/supplier'
  const displayName = user.username || 'User'
  const roleLabel = user.role === 'ADMIN' ? t.roles.admin : user.role === 'BUYER' ? t.roles.buyer : t.roles.supplier

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
      >
        <div className="w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-medium">
            {displayName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className={`hidden sm:block ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
          <p className="text-sm font-medium text-gray-900">{displayName}</p>
          <p className="text-xs text-gray-500">{roleLabel}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 ${dir === 'rtl' ? 'rtl-flip' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          <div className={`absolute mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20 ${dir === 'rtl' ? 'left-0' : 'right-0'}`}>
            <div className="px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900">{displayName}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
              {user.storeName && (
                <p className="text-xs text-blue-900 mt-1">{user.storeName}</p>
              )}
            </div>
            <div className="py-2">
              <Link
                href={dashboardLink}
                className={`flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
                onClick={() => setIsOpen(false)}
              >
                <LayoutDashboard className="w-4 h-4" />
                {t.nav.dashboard}
              </Link>
              <Link
                href="/profile"
                className={`flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
                onClick={() => setIsOpen(false)}
              >
                <User className="w-4 h-4" />
                {t.nav.profile}
              </Link>
              <form action={logoutUser}>
                <button
                  type="submit"
                  className={`flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
                >
                  <LogOut className={`w-4 h-4 ${dir === 'rtl' ? 'rtl-flip' : ''}`} />
                  {t.nav.signOut}
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
