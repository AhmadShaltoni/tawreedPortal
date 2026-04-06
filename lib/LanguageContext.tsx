'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  type Language,
  defaultLanguage,
  getDirection,
  getTranslations,
  LANGUAGE_STORAGE_KEY,
  type TranslationKeys,
} from '@/lib/i18n'

interface LanguageContextType {
  lang: Language
  setLang: (lang: Language) => void
  dir: 'rtl' | 'ltr'
  t: TranslationKeys
  toggleLanguage: () => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(defaultLanguage)
  const [mounted, setMounted] = useState(false)

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null
    if (savedLang && (savedLang === 'ar' || savedLang === 'en')) {
      setLangState(savedLang)
    }
    setMounted(true)
  }, [])

  // Update HTML attributes when language changes
  useEffect(() => {
    if (!mounted) return
    
    const dir = getDirection(lang)
    document.documentElement.lang = lang
    document.documentElement.dir = dir
    
    // Save to localStorage
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
  }, [lang, mounted])

  const setLang = (newLang: Language) => {
    setLangState(newLang)
  }

  const toggleLanguage = () => {
    setLangState(prev => (prev === 'ar' ? 'en' : 'ar'))
  }

  const dir = getDirection(lang)
  const t = getTranslations(lang)

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <LanguageContext.Provider
        value={{
          lang: defaultLanguage,
          setLang,
          dir: 'rtl',
          t: getTranslations(defaultLanguage),
          toggleLanguage,
        }}
      >
        {children}
      </LanguageContext.Provider>
    )
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, dir, t, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
