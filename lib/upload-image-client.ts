import { compressImage } from '@/lib/compress-image'

/**
 * Client-side image upload helpers.
 *
 * Each image is compressed then uploaded on its own to `/api/admin/upload`
 * (one small request), with automatic retries. The caller collects the
 * returned Cloudinary URLs and passes ONLY those to the save action — no image
 * bytes ever travel through the Server Action, so the body-size limit and
 * request timeout are never hit regardless of how many images a product has.
 */

const MAX_ATTEMPTS = 3
const CONCURRENCY = 3

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Upload one already-selected file, compressing + retrying. Returns the URL. */
export async function uploadImage(file: File, folder = 'products'): Promise<string> {
  const compressed = await compressImage(file)

  let lastError: Error | null = null
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const body = new FormData()
      body.set('file', compressed)
      body.set('folder', folder)

      const res = await fetch('/api/admin/upload', { method: 'POST', body })
      if (res.ok) {
        const data = (await res.json()) as { url?: string }
        if (data.url) return data.url
        throw new Error('استجابة غير صالحة من الخادم')
      }

      // 4xx = client error (bad type/size), no point retrying
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      const message = data.error || `فشل الرفع (${res.status})`
      if (res.status >= 400 && res.status < 500) {
        throw new Error(message)
      }
      lastError = new Error(message)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('فشل رفع الصورة')
      // Abort immediately on client-side validation errors.
      if (/Invalid file type|File too large|غير صالح|كبير/i.test(lastError.message)) {
        throw lastError
      }
    }

    if (attempt < MAX_ATTEMPTS) {
      await delay(500 * attempt)
    }
  }

  throw lastError ?? new Error('فشل رفع الصورة')
}

export interface UploadTask {
  /** The file to upload. */
  file: File
  /** Human-readable label used in error messages (e.g. size/option name). */
  label: string
  /** Destination folder (defaults to 'products'). */
  folder?: string
}

/**
 * Uploads many images with bounded concurrency, reporting progress.
 * Returns the URLs in the same order as `tasks`.
 * If any image fails after retries, throws an error naming that image.
 */
export async function uploadImagesWithProgress(
  tasks: UploadTask[],
  onProgress?: (done: number, total: number) => void,
): Promise<string[]> {
  const results = new Array<string>(tasks.length)
  let done = 0
  let nextIndex = 0

  onProgress?.(0, tasks.length)

  async function worker() {
    while (nextIndex < tasks.length) {
      const index = nextIndex++
      const task = tasks[index]
      try {
        results[index] = await uploadImage(task.file, task.folder ?? 'products')
      } catch (err) {
        const reason = err instanceof Error ? err.message : 'خطأ غير معروف'
        throw new Error(`فشل رفع صورة "${task.label}": ${reason}`)
      }
      done++
      onProgress?.(done, tasks.length)
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, worker)
  await Promise.all(workers)

  return results
}

// ---------------------------------------------------------------------------
// Product-specific helper: turn the form's variant/option image state into the
// URL maps the save action expects, uploading only the newly-selected files.
// ---------------------------------------------------------------------------

interface ImageBearer {
  imageFile: File | null
  existingImage: string | null
}

export interface ProductImageInput {
  /** Newly-selected main image file, if any. */
  mainImageFile: File | null
  /** Existing main image URL to keep when no new file was chosen. */
  mainImageExisting?: string | null
  variants: Array<
    ImageBearer & {
      /** Label for error messages, e.g. the size name. */
      label: string
      options: Array<ImageBearer & { label: string }>
    }
  >
}

export interface ResolvedProductImages {
  /** URL for the main image (new upload, kept existing, or null). */
  mainImageUrl: string | null
  /** Map keyed by "variantImage_{i}". */
  variantImageUrls: Record<string, string>
  /** Map keyed by "optionImage_{i}_{oi}". */
  optionImageUrls: Record<string, string>
}

/**
 * Uploads every newly-selected image (main / variant / option) and returns the
 * URL maps consumed by createProduct/updateProduct. Images that already have a
 * URL (existingImage) are reused without re-uploading. Progress is reported
 * across all uploads. Throws (naming the image) if any upload fails.
 */
export async function resolveProductImages(
  input: ProductImageInput,
  onProgress?: (done: number, total: number) => void,
): Promise<ResolvedProductImages> {
  const tasks: UploadTask[] = []
  // Remember where each task's URL should land once uploaded.
  const slots: Array<{ kind: 'main' } | { kind: 'variant'; key: string } | { kind: 'option'; key: string }> = []

  if (input.mainImageFile) {
    tasks.push({ file: input.mainImageFile, label: 'الصورة الرئيسية' })
    slots.push({ kind: 'main' })
  }

  input.variants.forEach((v, vi) => {
    if (v.imageFile) {
      tasks.push({ file: v.imageFile, label: v.label || `الحجم ${vi + 1}` })
      slots.push({ kind: 'variant', key: `variantImage_${vi}` })
    }
    v.options.forEach((o, oi) => {
      if (o.imageFile) {
        tasks.push({ file: o.imageFile, label: o.label || `${v.label} - خيار ${oi + 1}` })
        slots.push({ kind: 'option', key: `optionImage_${vi}_${oi}` })
      }
    })
  })

  const uploadedUrls = tasks.length ? await uploadImagesWithProgress(tasks, onProgress) : []

  const variantImageUrls: Record<string, string> = {}
  const optionImageUrls: Record<string, string> = {}
  let mainImageUrl: string | null = input.mainImageExisting ?? null

  // Start from existing (unchanged) images, then overlay newly uploaded ones.
  input.variants.forEach((v, vi) => {
    if (v.existingImage) variantImageUrls[`variantImage_${vi}`] = v.existingImage
    v.options.forEach((o, oi) => {
      if (o.existingImage) optionImageUrls[`optionImage_${vi}_${oi}`] = o.existingImage
    })
  })

  slots.forEach((slot, i) => {
    const url = uploadedUrls[i]
    if (slot.kind === 'main') mainImageUrl = url
    else if (slot.kind === 'variant') variantImageUrls[slot.key] = url
    else optionImageUrls[slot.key] = url
  })

  return { mainImageUrl, variantImageUrls, optionImageUrls }
}
