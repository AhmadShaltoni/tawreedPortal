/**
 * Arabic → English translation service using MyMemory free API.
 * https://mymemory.translated.net/doc/spec.php
 *
 * - Free tier: 5 000 chars/day (anonymous), 50 000 with email param
 * - No API key required
 * - CORS-friendly
 */

const MYMEMORY_API = 'https://api.mymemory.translated.net/get'

/** Max characters sent per request to avoid abuse and keep responses fast. */
const MAX_TEXT_LENGTH = 500

/** Simple in-memory cache so repeated translations are instant. */
const cache = new Map<string, string>()

/**
 * Translate Arabic text to English.
 * Returns the translated string, or `null` if the input is empty.
 * Throws on network / API errors — callers should handle gracefully.
 */
export async function translateArabicToEnglish(
  text: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const trimmed = text.trim()
  if (!trimmed) return null

  // Return cached result when available
  if (cache.has(trimmed)) return cache.get(trimmed)!

  // Limit length to keep the request small
  const limited = trimmed.slice(0, MAX_TEXT_LENGTH)

  const url = new URL(MYMEMORY_API)
  url.searchParams.set('q', limited)
  url.searchParams.set('langpair', 'ar|en')

  const res = await fetch(url.toString(), {
    signal: signal ?? AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    throw new Error(`Translation API returned ${res.status}`)
  }

  const data = await res.json()
  const translated: string | undefined = data?.responseData?.translatedText

  if (!translated || data?.responseStatus !== 200) {
    throw new Error('Translation API returned an invalid response')
  }

  // Cache for future lookups
  cache.set(trimmed, translated)

  return translated
}
