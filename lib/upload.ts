import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

async function uploadToCloudinary(file: File, folder: string): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.')
  }
  if (file.size > MAX_SIZE) {
    throw new Error('File too large. Maximum size is 5MB.')
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const base64 = `data:${file.type};base64,${buffer.toString('base64')}`

  const result = await cloudinary.uploader.upload(base64, {
    folder: `tawreed/${folder}`,
    resource_type: 'image',
  })

  return result.secure_url
}

function extractPublicId(url: string): string | null {
  try {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

async function deleteFromCloudinary(imageUrl: string): Promise<void> {
  if (!imageUrl || !imageUrl.includes('cloudinary')) return
  const publicId = extractPublicId(imageUrl)
  if (publicId) {
    try {
      await cloudinary.uploader.destroy(publicId)
    } catch {
      // Ignore deletion errors
    }
  }
}

// ============ PRODUCT IMAGES ============
export async function saveProductImage(file: File): Promise<string> {
  return uploadToCloudinary(file, 'products')
}

export async function deleteProductImage(imagePath: string): Promise<void> {
  if (!imagePath) return
  if (imagePath.includes('cloudinary')) {
    await deleteFromCloudinary(imagePath)
  }
  // Old local paths are ignored (no longer on filesystem)
}

// ============ CATEGORY IMAGES ============
export async function saveCategoryImage(file: File): Promise<string> {
  return uploadToCloudinary(file, 'categories')
}

export async function deleteCategoryImage(imagePath: string): Promise<void> {
  if (!imagePath) return
  if (imagePath.includes('cloudinary')) {
    await deleteFromCloudinary(imagePath)
  }
}
