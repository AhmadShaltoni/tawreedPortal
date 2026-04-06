'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Select, Textarea, Card, CardHeader, CardContent } from '@/components/ui'
import { updateOrderStatus } from '@/actions/orders'
import type { OrderStatus } from '@/types'

interface UpdateOrderStatusFormProps {
  orderId: string
  currentStatus: OrderStatus
}

const STATUS_TRANSITIONS: Record<OrderStatus, { value: OrderStatus; label: string }[]> = {
  CONFIRMED: [
    { value: 'PROCESSING', label: 'Start Processing' },
    { value: 'CANCELLED', label: 'Cancel Order' },
  ],
  PROCESSING: [
    { value: 'SHIPPED', label: 'Mark as Shipped' },
    { value: 'CANCELLED', label: 'Cancel Order' },
  ],
  SHIPPED: [
    { value: 'DELIVERED', label: 'Mark as Delivered' },
  ],
  DELIVERED: [],
  CANCELLED: [],
}

export function UpdateOrderStatusForm({ orderId, currentStatus }: UpdateOrderStatusFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const availableStatuses = STATUS_TRANSITIONS[currentStatus] || []

  if (availableStatuses.length === 0) {
    return null
  }

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError('')

    const result = await updateOrderStatus(formData)

    if (result.success) {
      router.refresh()
    } else {
      setError(result.error || 'Failed to update status')
    }
    setIsLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Update Status</h2>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="orderId" value={orderId} />

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Select
            id="status"
            name="status"
            label="New Status"
            options={availableStatuses}
            placeholder="Select new status"
            required
          />

          <Textarea
            id="note"
            name="note"
            label="Note (Optional)"
            placeholder="Add a note about this status change..."
            rows={2}
          />

          <Button type="submit" variant="secondary" className="w-full" isLoading={isLoading}>
            Update Status
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
