import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

const PRODUCTS_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'products')
const CATEGORIES_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'categories')
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

// ============ PRODUCT IMAGES ============
export async function saveProductImage(file: File): Promise<string> {
  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.')
  }

  // Validate file size
  if (file.size > MAX_SIZE) {
    throw new Error('File too large. Maximum size is 5MB.')
  }

  // Ensure upload directory exists
  await mkdir(PRODUCTS_UPLOAD_DIR, { recursive: true })

  // Generate unique filename
  const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1]
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`
  const filepath = path.join(PRODUCTS_UPLOAD_DIR, filename)

  // Write file
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(filepath, buffer)

  // Return relative path for storage in DB
  return `/uploads/products/${filename}`
}

export async function deleteProductImage(imagePath: string): Promise<void> {
  if (!imagePath || !imagePath.startsWith('/uploads/products/')) return

  const filepath = path.join(process.cwd(), 'public', imagePath)
  try {
    await unlink(filepath)
  } catch {
    // File may not exist, ignore
  }
}

// ============ CATEGORY IMAGES ============
export async function saveCategoryImage(file: File): Promise<string> {
  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.')
  }

  // Validate file size
  if (file.size > MAX_SIZE) {
    throw new Error('File too large. Maximum size is 5MB.')
  }

  // Ensure upload directory exists
  await mkdir(CATEGORIES_UPLOAD_DIR, { recursive: true })

  // Generate unique filename
  const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1]
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`
  const filepath = path.join(CATEGORIES_UPLOAD_DIR, filename)

  // Write file
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(filepath, buffer)

  // Return relative path for storage in DB
  return `/uploads/categories/${filename}`
}

export async function deleteCategoryImage(imagePath: string): Promise<void> {
  if (!imagePath || !imagePath.startsWith('/uploads/categories/')) return

  const filepath = path.join(process.cwd(), 'public', imagePath)
  try {
    await unlink(filepath)
  } catch {
    // File may not exist, ignore
  }
}
