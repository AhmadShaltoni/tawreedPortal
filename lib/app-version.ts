/**
 * App version utilities for the mobile force-update flow.
 *
 * Safety rule: users must NEVER be prompted to update to a version that is
 * not actually live on the store. For iOS we verify against the official
 * iTunes Lookup API and cap the configured versions at the real store
 * version. Google Play has no official lookup API, so Android relies on the
 * admin only setting `latestVersion` after the release is live on Play.
 */

export const APP_PLATFORMS = ['ios', 'android'] as const
export type AppPlatform = (typeof APP_PLATFORMS)[number]

export const IOS_BUNDLE_ID = 'tawreed.app.com'
export const ANDROID_PACKAGE = 'tawreedApp.com.jo'

export const DEFAULT_STORE_URLS: Record<AppPlatform, string> = {
  ios: '', // Filled from iTunes lookup (trackViewUrl) or by admin
  android: `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`,
}

export const DEFAULT_UPDATE_MESSAGE =
  'يوجد تحديث جديد لتطبيق توريد. قم بالتحديث الآن للحصول على جميع الميزات.'

/**
 * Compare two "x.y.z" version strings.
 * Returns -1 if a < b, 0 if equal, 1 if a > b.
 * Missing segments are treated as 0 (so "1.2" === "1.2.0").
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0)
  const len = Math.max(pa.length, pb.length)

  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff > 0 ? 1 : -1
  }
  return 0
}

export function isValidVersion(v: string): boolean {
  return /^\d+(\.\d+){0,2}$/.test(v.trim())
}

interface AppStoreInfo {
  version: string
  trackViewUrl: string
}

// In-memory cache of the iTunes lookup (per server instance)
let iosStoreCache: { info: AppStoreInfo | null; fetchedAt: number } | null = null
const IOS_CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

/**
 * Fetch the version currently live on the App Store for our bundle id.
 * Returns null when the lookup fails (network error, app not found) —
 * callers must fall back to the admin-configured values.
 */
export async function getAppStoreInfo(): Promise<AppStoreInfo | null> {
  if (iosStoreCache && Date.now() - iosStoreCache.fetchedAt < IOS_CACHE_TTL_MS) {
    return iosStoreCache.info
  }

  try {
    const res = await fetch(
      `https://itunes.apple.com/lookup?bundleId=${IOS_BUNDLE_ID}&country=jo`,
      { signal: AbortSignal.timeout(5000), cache: 'no-store' }
    )
    if (!res.ok) throw new Error(`iTunes lookup HTTP ${res.status}`)

    const json = (await res.json()) as {
      resultCount: number
      results: { version?: string; trackViewUrl?: string }[]
    }

    const result = json.resultCount > 0 ? json.results[0] : null
    const info: AppStoreInfo | null =
      result?.version && isValidVersion(result.version)
        ? { version: result.version, trackViewUrl: result.trackViewUrl ?? '' }
        : null

    iosStoreCache = { info, fetchedAt: Date.now() }
    return info
  } catch (error) {
    console.warn('[app-version] iTunes lookup failed:', error)
    // Cache the failure briefly so we don't hammer the API on every request
    iosStoreCache = { info: null, fetchedAt: Date.now() - IOS_CACHE_TTL_MS + 5 * 60 * 1000 }
    return null
  }
}
