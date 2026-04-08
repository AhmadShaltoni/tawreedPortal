'use client'

import Link from 'next/link'
import { Package2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { LanguageToggle } from '@/components/ui/LanguageToggle'
import { UserMenu } from './UserMenu'
import { useLanguage } from '@/lib/LanguageContext'

interface HeaderClientProps {
  user?: {
    id: string
    username?: string | null
    email?: string | null
    role: string
    storeName?: string | null
  } | null
}

export function HeaderClient({ user }: HeaderClientProps) {
  const { t, dir } = useLanguage()

  return (
    <header className={`bg-white border-b border-gray-200 ${dir === 'rtl' ? 'flex-row' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center h-16 ${dir === 'rtl' ? 'flex-row' : ''}`}>
          {/* Logo & Navigation Group */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link href="/" className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center">
                <Package2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-blue-900 font-zain-logo">{t.brand}</span>
            </Link>

            {/* Navigation */}
            <nav className={`hidden md:flex items-center gap-8 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <Link href="/#features" className="text-gray-600 hover:text-blue-900 transition-colors">
                {t.nav.features}
              </Link>
              <Link href="/#how-it-works" className="text-gray-600 hover:text-blue-900 transition-colors">
                {t.nav.howItWorks}
              </Link>
              <Link href="/#about" className="text-gray-600 hover:text-blue-900 transition-colors">
                {t.nav.about}
              </Link>
            </nav>
          </div>

          {/* Auth buttons & Language Toggle */}
          <div className={`flex items-center gap-2 sm:gap-4 ${dir === 'rtl' ? 'flex-row-reverse ms-auto' : 'ms-auto'}`}>
            <LanguageToggle />
            {user ? (
              <UserMenu user={user} />
            ) : (
              <>
                <Link href="/login" className="hidden sm:block">
                  <Button variant="ghost">{t.nav.signIn}</Button>
                </Link>
                <Link href="/register">
                  <Button variant="primary" className="text-xs sm:text-base px-3 py-1.5 sm:px-4 sm:py-2">{t.nav.getStarted}</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
