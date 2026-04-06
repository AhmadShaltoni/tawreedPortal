'use client'

import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/LanguageContext'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  status?: string
  className?: string
}

export function Badge({ children, variant, status, className }: BadgeProps) {
  // Auto-map status strings to variants
  const statusToVariant: Record<string, BadgeProps['variant']> = {
    OPEN: 'success', IN_PROGRESS: 'info', CLOSED: 'default',
    CANCELLED: 'error', EXPIRED: 'warning',
    PENDING: 'warning', ACCEPTED: 'success', REJECTED: 'error', WITHDRAWN: 'default',
    CONFIRMED: 'info', PROCESSING: 'info', SHIPPED: 'info', DELIVERED: 'success',
    active: 'success', inactive: 'default',
    admin: 'info', buyer: 'success', supplier: 'warning',
  }

  const resolvedVariant = variant || (status ? statusToVariant[status] : undefined) || 'default'
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[resolvedVariant],
        className
      )}
    >
      {children}
    </span>
  )
}

// Status-specific badge helper with translations
export function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage()

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      // Request status
      OPEN: t.status.open,
      IN_PROGRESS: t.status.inProgress,
      CLOSED: t.status.closed,
      CANCELLED: t.status.cancelled,
      EXPIRED: t.status.expired,
      // Offer status
      PENDING: t.status.pending,
      ACCEPTED: t.status.accepted,
      REJECTED: t.status.rejected,
      WITHDRAWN: t.status.withdrawn,
      // Order status
      CONFIRMED: t.status.confirmed,
      PROCESSING: t.status.processing,
      SHIPPED: t.status.shipped,
      DELIVERED: t.status.delivered,
    }
    return labels[status] || status
  }

  const statusVariants: Record<string, BadgeProps['variant']> = {
    // Request status
    OPEN: 'success',
    IN_PROGRESS: 'info',
    CLOSED: 'default',
    CANCELLED: 'error',
    EXPIRED: 'warning',
    // Offer status
    PENDING: 'warning',
    ACCEPTED: 'success',
    REJECTED: 'error',
    WITHDRAWN: 'default',
    // Order status
    CONFIRMED: 'info',
    PROCESSING: 'info',
    SHIPPED: 'info',
    DELIVERED: 'success',
  }

  const variant = statusVariants[status] || 'default'

  return <Badge variant={variant}>{getStatusLabel(status)}</Badge>
}
