import imageCompression from 'browser-image-compression'

const defaultOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/webp' as const,
}

export async function compressImage(file: File): Promise<File> {
  // Skip if already small enough (< 200KB)
  if (file.size <= 200 * 1024) return file

  const compressed = await imageCompression(file, defaultOptions)
  // Ensure the result is a proper File with correct type and name
  if (compressed.type !== 'image/webp' || !compressed.name.endsWith('.webp')) {
    const name = file.name.replace(/\.[^.]+$/, '.webp')
    return new File([compressed], name, { type: 'image/webp' })
  }
  return compressed
}

export async function compressImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map(compressImage))
}
