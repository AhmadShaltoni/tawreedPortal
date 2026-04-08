'use client'

import { useEffect, useState } from 'react'

interface Notice {
  id: string
  text: string
  backgroundColor: string
  textColor: string
  isMobileOnly?: boolean
}

export function NoticesBar() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  // Fetch notices on mount - website only (isMobileOnly = false)
  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const response = await fetch('/api/notices/website')
        const data = await response.json()

        if (data.success && Array.isArray(data.data)) {
          setNotices(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch notices:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNotices()
  }, [])

  // Rotate notices every 10 seconds
  useEffect(() => {
    if (notices.length === 0) return

    const timerId = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % notices.length)
    }, 10000) // 10 seconds

    return () => clearInterval(timerId)
  }, [notices.length])

  // Return null if no notices or still loading
  if (loading || notices.length === 0) {
    return null
  }

  const currentNotice = notices[currentIndex]

  return (
    <div
      className="w-full py-3 px-4 text-sm md:text-base transition-all duration-500"
      style={{
        backgroundColor: currentNotice.backgroundColor,
        color: currentNotice.textColor,
      }}
    >
      <div className="max-w-7xl mx-auto text-center">
        <p>{currentNotice.text}</p>
      </div>

      {/* Indicators */}
      {notices.length > 1 && (
        <div className="flex items-center justify-center gap-1 mt-2">
          {notices.map((_, index) => (
            <div
              key={index}
              className={`h-1 transition-all duration-500 ${
                index === currentIndex ? 'bg-white/80 w-4' : 'bg-white/30 w-2'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
