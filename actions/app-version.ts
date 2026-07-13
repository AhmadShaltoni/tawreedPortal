'use server'

import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import {
  APP_PLATFORMS,
  AppPlatform,
  DEFAULT_STORE_URLS,
  compareVersions,
  getAppStoreInfo,
  isValidVersion,
} from '@/lib/app-version'
import { z } from 'zod'
import type { ActionResponse } from '@/types'

export interface AppVersionConfigType {
  id: string
  platform: string
  minVersion: string
  latestVersion: string
  storeUrl: string
  message: string | null
  isActive: boolean
  updatedAt: Date
  /** Version currently live on the App Store (iOS only, null if lookup failed) */
  liveStoreVersion: string | null
}

const versionField = z
  .string()
  .trim()
  .refine(isValidVersion, 'صيغة الإصدار يجب أن تكون مثل 1.2.0')

const appVersionSchema = z
  .object({
    minVersion: versionField,
    latestVersion: versionField,
    storeUrl: z.string().trim().url('رابط المتجر غير صحيح').or(z.literal('')),
    message: z.string().trim().max(500, 'الرسالة يجب أن لا تتجاوز 500 حرف'),
    isActive: z.boolean(),
  })
  .refine((d) => compareVersions(d.minVersion, d.latestVersion) <= 0, {
    message: 'أقل إصدار مسموح لا يمكن أن يكون أحدث من آخر إصدار',
    path: ['minVersion'],
  })

export type AppVersionInput = z.infer<typeof appVersionSchema>

/**
 * Get version configs for both platforms (admin only).
 * Creates default rows on first access.
 */
export async function getAppVersionConfigs(): Promise<
  ActionResponse<AppVersionConfigType[]>
> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'غير مصرح بالدخول' }
    }

    const storeInfo = await getAppStoreInfo()

    const configs = await Promise.all(
      APP_PLATFORMS.map((platform) =>
        db.appVersionConfig.upsert({
          where: { platform },
          update: {},
          create: { platform, storeUrl: DEFAULT_STORE_URLS[platform] },
        })
      )
    )

    return {
      success: true,
      data: configs.map((c) => ({
        ...c,
        liveStoreVersion: c.platform === 'ios' ? (storeInfo?.version ?? null) : null,
      })),
    }
  } catch (error) {
    console.error('[app-version.getAppVersionConfigs]', error)
    return { success: false, error: 'فشل في جلب إعدادات الإصدارات' }
  }
}

/**
 * Update the version config for one platform (admin only).
 */
export async function updateAppVersionConfig(
  platform: AppPlatform,
  input: AppVersionInput
): Promise<ActionResponse<AppVersionConfigType>> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'غير مصرح بالدخول' }
    }

    if (!APP_PLATFORMS.includes(platform)) {
      return { success: false, error: 'منصة غير صحيحة' }
    }

    const validated = appVersionSchema.safeParse(input)
    if (!validated.success) {
      const firstError = validated.error.issues[0]?.message || 'بيانات غير صحيحة'
      return { success: false, error: firstError }
    }

    const config = await db.appVersionConfig.upsert({
      where: { platform },
      update: {
        minVersion: validated.data.minVersion,
        latestVersion: validated.data.latestVersion,
        storeUrl: validated.data.storeUrl,
        message: validated.data.message || null,
        isActive: validated.data.isActive,
      },
      create: {
        platform,
        minVersion: validated.data.minVersion,
        latestVersion: validated.data.latestVersion,
        storeUrl: validated.data.storeUrl || DEFAULT_STORE_URLS[platform],
        message: validated.data.message || null,
        isActive: validated.data.isActive,
      },
    })

    return {
      success: true,
      data: { ...config, liveStoreVersion: null },
      message: 'تم حفظ إعدادات الإصدار بنجاح',
    }
  } catch (error) {
    console.error('[app-version.updateAppVersionConfig]', error)
    return { success: false, error: 'فشل في حفظ إعدادات الإصدار' }
  }
}
