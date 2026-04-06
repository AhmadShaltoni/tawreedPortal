import { ar, type TranslationKeys } from './translations/ar'
import { en } from './translations/en'

export type { TranslationKeys }
export type Language = 'ar' | 'en'

export const translations: Record<Language, TranslationKeys> = {
  ar,
  en,
}

export const defaultLanguage: Language = 'ar'

export const languages: { code: Language; name: string; nativeName: string; dir: 'rtl' | 'ltr' }[] = [
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
]

/**
 * Get the direction for a language
 */
export function getDirection(lang: Language): 'rtl' | 'ltr' {
  return lang === 'ar' ? 'rtl' : 'ltr'
}

/**
 * Get translations for a specific language
 */
export function getTranslations(lang: Language): TranslationKeys {
  return translations[lang] || translations[defaultLanguage]
}

/**
 * Type-safe translation function
 * Usage: t(lang, 'nav', 'signIn') or t(lang, 'hero', 'title')
 */
export function t<
  K1 extends keyof TranslationKeys,
  K2 extends keyof TranslationKeys[K1]
>(
  lang: Language,
  section: K1,
  key: K2
): TranslationKeys[K1][K2] {
  const langTranslations = translations[lang] || translations[defaultLanguage]
  const sectionObj = langTranslations[section]
  if (typeof sectionObj === 'object' && sectionObj !== null) {
    return (sectionObj as Record<string, unknown>)[key as string] as TranslationKeys[K1][K2]
  }
  return sectionObj as TranslationKeys[K1][K2]
}

/**
 * Get a top-level translation value (for simple strings)
 * Usage: tValue(lang, 'brand')
 */
export function tValue<K extends keyof TranslationKeys>(
  lang: Language,
  key: K
): TranslationKeys[K] {
  const langTranslations = translations[lang] || translations[defaultLanguage]
  return langTranslations[key]
}

/**
 * Interpolate variables in translation strings
 * Usage: interpolate('Hello {name}!', { name: 'World' }) -> 'Hello World!'
 */
export function interpolate(
  template: string,
  variables: Record<string, string | number>
): string {
  return template.replace(/{(\w+)}/g, (_, key) => {
    return variables[key]?.toString() ?? `{${key}}`
  })
}

// Cookie name for storing language preference
export const LANGUAGE_COOKIE = 'tawreed-lang'

// Local storage key for language preference
export const LANGUAGE_STORAGE_KEY = 'tawreed-lang'
