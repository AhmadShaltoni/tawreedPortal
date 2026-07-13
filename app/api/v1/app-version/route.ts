import { db } from '@/lib/db'
import {
  APP_PLATFORMS,
  AppPlatform,
  DEFAULT_STORE_URLS,
  DEFAULT_UPDATE_MESSAGE,
  compareVersions,
  getAppStoreInfo,
  isValidVersion,
} from '@/lib/app-version'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/v1/app-version?platform=ios&version=1.0.0
 * Public endpoint - used by the mobile app on launch/foreground to decide
 * whether to show the update popup.
 *
 * - `updateRequired`  → current version < minVersion (blocking modal)
 * - `updateAvailable` → current version < latestVersion (optional prompt)
 *
 * For iOS the configured versions are capped at the version actually live on
 * the App Store (iTunes Lookup API), so users are never asked to update to a
 * release that has not propagated to the store yet.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const platform = (searchParams.get('platform') || '').toLowerCase()
    const currentVersion = (searchParams.get('version') || '').trim()

    if (!APP_PLATFORMS.includes(platform as AppPlatform)) {
      return NextResponse.json(
        { success: false, error: 'منصة غير صحيحة (ios أو android)' },
        { status: 400 }
      )
    }

    // Lazily create the config row with safe defaults (no popup: 1.0.0/1.0.0)
    const config = await db.appVersionConfig.upsert({
      where: { platform },
      update: {},
      create: {
        platform,
        storeUrl: DEFAULT_STORE_URLS[platform as AppPlatform],
      },
    })

    let minVersion = config.minVersion
    let latestVersion = config.latestVersion
    let storeUrl = config.storeUrl

    // iOS safety net: never prompt beyond what is actually on the App Store
    if (platform === 'ios') {
      const storeInfo = await getAppStoreInfo()
      if (storeInfo) {
        if (compareVersions(storeInfo.version, latestVersion) < 0) {
          latestVersion = storeInfo.version
        }
        if (compareVersions(storeInfo.version, minVersion) < 0) {
          minVersion = storeInfo.version
        }
        if (!storeUrl && storeInfo.trackViewUrl) {
          storeUrl = storeInfo.trackViewUrl
        }
      }
    }

    const hasValidCurrent = isValidVersion(currentVersion)
    const updateRequired =
      config.isActive &&
      hasValidCurrent &&
      compareVersions(currentVersion, minVersion) < 0
    const updateAvailable =
      config.isActive &&
      hasValidCurrent &&
      compareVersions(currentVersion, latestVersion) < 0

    return NextResponse.json({
      success: true,
      data: {
        platform,
        minVersion,
        latestVersion,
        storeUrl,
        message: config.message || DEFAULT_UPDATE_MESSAGE,
        updateRequired,
        updateAvailable,
      },
    })
  } catch (error) {
    console.error('[api/v1/app-version] GET error:', error)
    return NextResponse.json(
      { success: false, error: 'فشل في جلب معلومات الإصدار' },
      { status: 500 }
    )
  }
}
