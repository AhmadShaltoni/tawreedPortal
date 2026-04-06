'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button, Input, Select, Textarea, Card, CardContent } from '@/components/ui'
import { createRequest } from '@/actions/requests'
import { CATEGORY_LABELS, UNIT_LABELS } from '@/types'

export default function NewRequestPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  const categoryOptions = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
    value,
    label,
  }))

  const unitOptions = Object.entries(UNIT_LABELS).map(([value, label]) => ({
    value,
    label,
  }))

  // Set default expiry date to 7 days from now
  const defaultExpiryDate = new Date()
  defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 7)
  const defaultExpiry = defaultExpiryDate.toISOString().split('T')[0]

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError('')
    setFieldErrors({})

    const result = await createRequest(formData)

    if (result.success && result.data) {
      router.push(`/buyer/requests/${result.data.id}`)
    } else {
      if (result.errors) {
        setFieldErrors(result.errors)
      }
      setError(result.error || 'Failed to create request')
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/buyer/requests" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to requests
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create New Request</h1>
        <p className="text-gray-600">Post your product needs and receive offers from suppliers</p>
      </div>

      {/* Form */}
      <Card>
        <CardContent className="p-6">
          <form action={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Basic Info */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              <div className="space-y-4">
                <Input
                  id="title"
                  name="title"
                  label="Request Title"
                  placeholder="e.g., Looking for 500kg White Sugar"
                  required
                  error={fieldErrors.title?.[0]}
                />
                <Textarea
                  id="description"
                  name="description"
                  label="Description (Optional)"
                  placeholder="Add any additional details about your requirements..."
                  error={fieldErrors.description?.[0]}
                />
              </div>
            </div>

            {/* Product Details */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Product Details</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <Select
                  id="category"
                  name="category"
                  label="Category"
                  placeholder="Select category"
                  options={categoryOptions}
                  required
                  error={fieldErrors.category?.[0]}
                />
                <Input
                  id="productName"
                  name="productName"
                  label="Product Name"
                  placeholder="e.g., White Sugar, Basmati Rice"
                  required
                  error={fieldErrors.productName?.[0]}
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
                  error={fieldErrors.quantity?.[0]}
                />
                <Select
                  id="unit"
                  name="unit"
                  label="Unit"
                  placeholder="Select unit"
                  options={unitOptions}
                  required
                  error={fieldErrors.unit?.[0]}
                />
                <Input
                  id="brand"
                  name="brand"
                  label="Preferred Brand (Optional)"
                  placeholder="e.g., Any, Local Brand"
                  error={fieldErrors.brand?.[0]}
                />
                <Input
                  id="specifications"
                  name="specifications"
                  label="Specifications (Optional)"
                  placeholder="e.g., Organic, Imported"
                  error={fieldErrors.specifications?.[0]}
                />
              </div>
            </div>

            {/* Delivery Details */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Delivery Details</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <Select
                  id="deliveryCity"
                  name="deliveryCity"
                  label="Delivery City"
                  placeholder="Select city"
                  options={[
                    { value: 'amman', label: 'Amman' },
                    { value: 'irbid', label: 'Irbid' },
                    { value: 'zarqa', label: 'Zarqa' },
                    { value: 'aqaba', label: 'Aqaba' },
                    { value: 'madaba', label: 'Madaba' },
                  ]}
                  required
                  error={fieldErrors.deliveryCity?.[0]}
                />
                <Input
                  id="deliveryAddress"
                  name="deliveryAddress"
                  label="Delivery Address (Optional)"
                  placeholder="Full address"
                  error={fieldErrors.deliveryAddress?.[0]}
                />
                <Input
                  id="deliveryDeadline"
                  name="deliveryDeadline"
                  type="date"
                  label="Preferred Delivery Date (Optional)"
                  error={fieldErrors.deliveryDeadline?.[0]}
                />
                <Input
                  id="maxBudget"
                  name="maxBudget"
                  type="number"
                  label="Maximum Budget (SAR) - Optional"
                  placeholder="e.g., 5000"
                  min="0"
                  step="any"
                  error={fieldErrors.maxBudget?.[0]}
                />
              </div>
            </div>

            {/* Request Settings */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Request Settings</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  id="expiresAt"
                  name="expiresAt"
                  type="date"
                  label="Request Expires On"
                  defaultValue={defaultExpiry}
                  required
                  error={fieldErrors.expiresAt?.[0]}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                After this date, suppliers will no longer be able to submit offers
              </p>
            </div>

            {/* Submit */}
            <div className="border-t pt-6 flex gap-4">
              <Link href="/buyer/requests" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" className="flex-1" isLoading={isLoading}>
                Create Request
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
