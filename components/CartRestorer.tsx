'use client'

import { useEffect } from 'react'
import { useCart } from '@/lib/CartContext'

/**
 * CartRestorer - Automatically restores cart when user is authenticated
 * Place this in layouts that require cart functionality
 */
export function CartRestorer() {
  const { restoreCart } = useCart()

  useEffect(() => {
    // Restore cart when component mounts (user logs in)
    restoreCart()
  }, [restoreCart])

  return null // This component doesn't render anything
}
