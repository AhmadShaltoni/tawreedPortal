'use client'

import { Globe } from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'

export function LanguageToggle() {
  const { lang, toggleLanguage } = useLanguage()

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 rounded-lg hover:bg-gray-100 transition-colors"
      aria-label={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
    >
      <Globe className="h-4 w-4" />
      <span>{lang === 'ar' ? 'EN' : 'عربي'}</span>
    </button>
  )
}
