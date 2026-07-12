'use client'

import { useEffect, useState } from 'react'
import { X, Download, Loader2 } from 'lucide-react'

interface ImageLightboxProps {
  src: string
  filename?: string
  onClose: () => void
}

export function ImageLightbox({ src, filename = 'image', onClose }: ImageLightboxProps) {
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const res = await fetch(src)
      if (!res.ok) throw new Error('fetch failed')
      const blob = await res.blob()
      const ext = blob.type.split('/')[1]?.split('+')[0] || 'jpg'
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = filename.includes('.') ? filename : `${filename}.${ext}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objectUrl)
    } catch {
      window.open(src, '_blank')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="max-h-[75vh] max-w-[90vw] rounded-lg bg-white object-contain shadow-2xl" />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            تحميل الصورة
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-lg bg-white/90 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white"
          >
            <X className="h-4 w-4" />
            إغلاق
          </button>
        </div>
      </div>
    </div>
  )
}
