import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { isAdminLike } from '@/lib/permissions'
import {
  saveProductImage,
  saveCategoryImage,
  saveBrandImage,
  saveCollectionImage,
  saveNotificationImage,
} from '@/lib/upload'

// Allow enough time for a single image upload to Cloudinary
export const maxDuration = 60

const SAVERS = {
  products: saveProductImage,
  categories: saveCategoryImage,
  brands: saveBrandImage,
  collections: saveCollectionImage,
  notifications: saveNotificationImage,
} as const

type Folder = keyof typeof SAVERS

/**
 * Uploads a SINGLE image and returns its Cloudinary URL.
 *
 * Images are uploaded here — one small request each — instead of being sent
 * through a Server Action. This keeps every request well under the body-size
 * limit and avoids long, sequential uploads inside the save action (which was
 * the cause of the 505 / "Server Components render" errors on image-heavy
 * products). The client uploads images individually (with retries) and then
 * passes only the resulting URLs to createProduct/updateProduct.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!isAdminLike(user?.role)) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'لم يتم إرسال أي صورة' }, { status: 400 })
  }

  const folderParam = (formData.get('folder') as string | null) || 'products'
  const save = SAVERS[folderParam as Folder] ?? saveProductImage

  try {
    const url = await save(file)
    return NextResponse.json({ url })
  } catch (err) {
    // saveXImage throws user-friendly messages for bad type/size (Arabic-safe below)
    const message = err instanceof Error ? err.message : 'فشل رفع الصورة'
    // Invalid type/size are client errors (400); everything else is a server error.
    const isClientError = /Invalid file type|File too large/i.test(message)
    return NextResponse.json(
      { error: isClientError ? message : 'تعذّر رفع الصورة إلى الخادم، حاول مجدداً' },
      { status: isClientError ? 400 : 500 },
    )
  }
}
