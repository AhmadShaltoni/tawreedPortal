'use client'

import React, { createContext, useContext, useCallback, useState } from 'react'
import type { CartItemWithProduct } from '@/types'

interface CartContextType {
  items: CartItemWithProduct[]
  total: number
  itemCount: number
  isLoading: boolean
  error: string | null
  
  // Operations
  addItem: (variantId: string, quantity: number, productUnitId?: string) => Promise<void>
  updateItem: (itemId: string, quantity: number) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  clearCart: () => Promise<void>
  restoreCart: () => Promise<void>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItemWithProduct[]>([])
  const [total, setTotal] = useState(0)
  const [itemCount, setItemCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Build headers with optional auth token
  const buildHeaders = (includeContentType = false): Record<string, string> => {
    const headers: Record<string, string> = {}
    const token = getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    if (includeContentType) {
      headers['Content-Type'] = 'application/json'
    }
    return headers
  }

  // Restore cart from API
  const restoreCart = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/v1/cart', {
        headers: buildHeaders(),
      })
      
      if (!response.ok) {
        // If 401, user might not be logged in - that's OK
        if (response.status === 401) {
          setItems([])
          setTotal(0)
          setItemCount(0)
          return
        }
        throw new Error('Failed to fetch cart')
      }

      const data = await response.json()
      setItems(data.items || [])
      setTotal(data.total || 0)
      setItemCount(data.itemCount || 0)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore cart'
      setError(errorMessage)
      setItems([])
      setTotal(0)
      setItemCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Add item to cart
  const addItem = useCallback(async (variantId: string, quantity: number, productUnitId?: string) => {
    setError(null)
    try {
      const response = await fetch('/api/v1/cart', {
        method: 'POST',
        headers: buildHeaders(true),
        body: JSON.stringify({ variantId, quantity, productUnitId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add item to cart')
      }

      // Restore cart to get updated state
      await restoreCart()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add item'
      setError(errorMessage)
      throw err
    }
  }, [restoreCart])

  // Update item quantity
  const updateItem = useCallback(async (itemId: string, quantity: number) => {
    setError(null)
    try {
      const response = await fetch(`/api/v1/cart/${itemId}`, {
        method: 'PATCH',
        headers: buildHeaders(true),
        body: JSON.stringify({ quantity }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update cart item')
      }

      // Restore cart to get updated state
      await restoreCart()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update item'
      setError(errorMessage)
      throw err
    }
  }, [restoreCart])

  // Remove item from cart
  const removeItem = useCallback(async (itemId: string) => {
    setError(null)
    try {
      const response = await fetch(`/api/v1/cart/${itemId}`, {
        method: 'DELETE',
        headers: buildHeaders(),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to remove item from cart')
      }

      // Restore cart to get updated state
      await restoreCart()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove item'
      setError(errorMessage)
      throw err
    }
  }, [restoreCart])

  // Clear entire cart
  const clearCart = useCallback(async () => {
    setError(null)
    try {
      const response = await fetch('/api/v1/cart', {
        method: 'DELETE',
        headers: buildHeaders(),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to clear cart')
      }

      setItems([])
      setTotal(0)
      setItemCount(0)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear cart'
      setError(errorMessage)
      throw err
    }
  }, [])

  const value: CartContextType = {
    items,
    total,
    itemCount,
    isLoading,
    error,
    addItem,
    updateItem,
    removeItem,
    clearCart,
    restoreCart,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}

// Helper to get JWT token from localStorage (if using mobile app)
// For web, session is handled automatically via cookies
function getToken(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('auth_token') || ''
}
