'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Select, Textarea, Card, CardHeader, CardContent } from '@/components/ui'
import { createOffer } from '@/actions/offers'
import { UNIT_LABELS, type Unit } from '@/types'

interface SubmitOfferFormProps {
  requestId: string
  requestUnit: Unit
  requestQuantity: number
}

export function SubmitOfferForm({ requestId, requestUnit, requestQuantity }: SubmitOfferFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [pricePerUnit, setPricePerUnit] = useState('')
  const [quantity, setQuantity] = useState(requestQuantity.toString())

  // Calculate total price
  const totalPrice = (parseFloat(pricePerUnit) || 0) * (parseFloat(quantity) || 0)

  // Default valid until - 7 days from now
  const defaultValidUntil = new Date()
  defaultValidUntil.setDate(defaultValidUntil.getDate() + 7)
  const defaultValidUntilStr = defaultValidUntil.toISOString().split('T')[0]

  const unitOptions = Object.entries(UNIT_LABELS).map(([value, label]) => ({
    value,
    label,
  }))

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError('')
    setFieldErrors({})

    const result = await createOffer(formData)

    if (result.success) {
      router.push('/supplier/offers')
      router.refresh()
    } else {
      if (result.errors) {
        setFieldErrors(result.errors)
      }
      setError(result.error || 'Failed to submit offer')
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Submit Your Offer</h2>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="requestId" value={requestId} />

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="pricePerUnit"
              name="pricePerUnit"
              type="number"
              label="Price per Unit (SAR)"
              placeholder="e.g., 10.50"
              required
              min="0.01"
              step="0.01"
              value={pricePerUnit}
              onChange={(e) => setPricePerUnit(e.target.value)}
              error={fieldErrors.pricePerUnit?.[0]}
            />
            <Input
              id="quantity"
              name="quantity"
              type="number"
              label="Quantity"
              placeholder="e.g., 500"
              required
              min="1"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              error={fieldErrors.quantity?.[0]}
            />
          </div>

          <Select
            id="unit"
            name="unit"
            label="Unit"
            options={unitOptions}
            defaultValue={requestUnit}
            required
            error={fieldErrors.unit?.[0]}
          />

          {/* Total Price Display */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total Offer Price</p>
            <p className="text-2xl font-bold text-blue-900">
              {totalPrice.toLocaleString('en-SA', { style: 'currency', currency: 'SAR' })}
            </p>
          </div>

          <Input
            id="deliveryDays"
            name="deliveryDays"
            type="number"
            label="Delivery Time (days)"
            placeholder="e.g., 3"
            required
            min="1"
            error={fieldErrors.deliveryDays?.[0]}
          />

          <Textarea
            id="deliveryNotes"
            name="deliveryNotes"
            label="Delivery Notes (Optional)"
            placeholder="e.g., Free delivery within city limits"
            rows={2}
            error={fieldErrors.deliveryNotes?.[0]}
          />

          <Textarea
            id="notes"
            name="notes"
            label="Additional Notes (Optional)"
            placeholder="Any other information for the buyer..."
            rows={2}
            error={fieldErrors.notes?.[0]}
          />

          <Input
            id="validUntil"
            name="validUntil"
            type="date"
            label="Offer Valid Until"
            defaultValue={defaultValidUntilStr}
            required
            error={fieldErrors.validUntil?.[0]}
          />

          <Button type="submit" variant="secondary" className="w-full" isLoading={isLoading}>
            Submit Offer
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
